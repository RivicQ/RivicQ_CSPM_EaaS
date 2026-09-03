import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Grid, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { GitHub, PlayArrow, CheckCircle, Error as ErrorIcon, Schedule, Security, Refresh,
  History, BugReport, Event, Speed, Language, Lock, Dns, Storage, Memory,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { cbomService, benchmarkService } from '../services/api';
import PageFrame from '../components/PageFrame';
import StatCard from '../components/dashboard/StatCard';
import { GlassCard, EmptyState, DetailTabs, TabPanel } from '../components/ui';
import designSystem from '../theme/designSystem';
import { tokens } from '../theme/tokens';
import { DEMO_SCAN_FINDINGS, DEMO_SCAN_SCHEDULES } from '../data/workspaceDemo';
import GitHubRepoScanPanel from '../components/GitHubRepoScanPanel';
import ScanReportPanel, { ClientArchitectureView, PQCReadinessView } from '../components/scanner/ScanReportPanel';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';

interface ScanJob {
  id: string;
  scanId?: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'pending';
  type: string;
  target: string;
  startedAt?: string;
  findings: number;
  progress: number;
}

interface PolicyGate {
  decision?: string;
  failed?: boolean;
  reasons?: string[];
  warnings?: string[];
}

interface ScanFinding {
  id?: string;
  severity: string;
  title: string;
  asset?: string;
  target_label?: string;
  recommendation?: string;
  remediation?: string;
  [key: string]: unknown;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40;

const SCAN_TYPE_INFO: Record<string, string> = {
  cbom: 'Host CBOM — TLS, SSH, and HTTP cryptographic discovery.',
  website: 'Public website: TLS on 443 plus HTTPS headers/cookies. SSH is skipped.',
  host: 'Hostname: TLS, SSH, and HTTP. Use for servers that are not a public website.',
  ip: 'IP address: TLS, SSH, and HTTP on the host.',
  server: 'Server: same network discovery as host/IP, labeled as a server asset.',
  pod: 'Kubernetes pod: declared namespace/workload inventory. Add @host for TLS. Live apiserver attach is Enterprise.',
  hardware: 'Declared HSM/TPM/QSIC inventory. Not firmware reverse-engineering. QSIC is a research ASIC.',
  quick: 'Fast surface scan for known weak algorithms and expired certs.',
  full: 'Deep scan including SSH, HTTP(S), and (for local paths) SBOM.',
  compliance: 'Maps findings to ISO 27001, SOC 2, PCI-DSS, and PQC controls (mappings, not certifications).',
};

type TargetClass = 'website' | 'host' | 'ip' | 'server' | 'pod' | 'hardware';

const TARGET_CLASSES: Array<{ id: TargetClass; label: string; placeholder: string; icon: React.ReactNode; community: boolean }> = [
  { id: 'website', label: 'Website', placeholder: 'https://example.com', icon: <Language sx={{ fontSize: 16 }} />, community: true },
  { id: 'host', label: 'Host', placeholder: 'api.internal.example', icon: <Dns sx={{ fontSize: 16 }} />, community: true },
  { id: 'ip', label: 'IP', placeholder: '192.0.2.10', icon: <Dns sx={{ fontSize: 16 }} />, community: true },
  { id: 'server', label: 'Server', placeholder: 'app-01.prod.local', icon: <Storage sx={{ fontSize: 16 }} />, community: true },
  { id: 'pod', label: 'K8s pod', placeholder: 'pod://prod/api@example.com', icon: <Memory sx={{ fontSize: 16 }} />, community: true },
  { id: 'hardware', label: 'Hardware', placeholder: 'qsic://research', icon: <Lock sx={{ fontSize: 16 }} />, community: true },
];

const WEBSITE_PRESETS = ['https://example.com', 'https://www.wikipedia.org'];

const RESOURCE_LABELS: Array<{ key: string; label: string }> = [
  { key: 'tls', label: 'TLS' },
  { key: 'https', label: 'HTTPS' },
  { key: 'http', label: 'HTTP' },
  { key: 'ssh', label: 'SSH' },
  { key: 'sbom', label: 'SBOM' },
  { key: 'k8s', label: 'K8s' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'qiskit', label: 'Qiskit score' },
];

const mapApiScan = (s: any): ScanJob => ({
  id: s.id ?? s.scan_id,
  scanId: s.scan_id ?? s.id,
  status: s.status ?? 'pending',
  type: s.scan_type ?? 'cbom',
  target: s.target ?? '',
  startedAt: s.created_at,
  findings: s.findings?.total ?? 0,
  progress: s.progress ?? (s.status === 'completed' ? 100 : 0),
});

const Scanner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { edition, isDemo } = useAuth();
  const paid = isPaidEdition(edition);
  const [tab, setTab] = useState(() => (searchParams.get('tab') === 'github' ? 5 : 0));
  const [isScanning, setIsScanning] = useState(false);
  const [targetClass, setTargetClass] = useState<TargetClass>('website');
  const [scanType, setScanType] = useState<'quick' | 'full' | 'compliance' | 'cbom' | 'website' | 'host' | 'ip' | 'server' | 'pod' | 'hardware'>('website');
  const [scanTarget, setScanTarget] = useState('https://example.com');
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [liveFindings, setLiveFindings] = useState<ScanFinding[]>([]);
  const [policyGate, setPolicyGate] = useState<PolicyGate | null>(null);
  const [enabledResources, setEnabledResources] = useState<Record<string, boolean>>({});
  const [qiskitEstate, setQiskitEstate] = useState<number | null>(null);
  const [auditOverall, setAuditOverall] = useState<number | null>(null);
  const [architecture, setArchitecture] = useState<ClientArchitectureView | null>(null);
  const [readiness, setReadiness] = useState<PQCReadinessView | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollAttemptsRef = useRef(0);

  useEffect(() => {
    if (searchParams.get('tab') === 'github') setTab(5);
  }, [searchParams]);

  const { data: scanList, refetch: refetchScans } = useQuery({
    queryKey: ['cbom-scans'],
    queryFn: () => cbomService.listScans().then((r) => r.data).catch(() => null),
    refetchInterval: 15_000,
  });

  const { data: findingsData, refetch: refetchFindings } = useQuery({
    queryKey: ['cbom-findings'],
    queryFn: () => cbomService.getScanFindings().then((r) => r.data).catch(() => null),
    refetchInterval: 15_000,
  });

  const { data: benchmarksRaw } = useQuery({
    queryKey: ['scanner-benchmarks'],
    queryFn: () => benchmarkService.getSummary().then((r) => r.data).catch(() => null),
    retry: 0,
  });

  useEffect(() => {
    if (scanList?.scans?.length) {
      setScanJobs(scanList.scans.map(mapApiScan));
    }
  }, [scanList]);

  useEffect(() => {
    if (findingsData?.findings?.length) {
      setLiveFindings(findingsData.findings);
    }
  }, [findingsData]);

  useEffect(() => () => { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current); }, []);

  const clearPolling = () => {
    if (pollTimerRef.current) { window.clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const updateJob = (jobId: string, updater: (job: ScanJob) => ScanJob) => {
    setScanJobs((prev) => prev.map((job) => (job.id === jobId ? updater(job) : job)));
  };

  const refreshScanData = useCallback(() => {
    refetchScans();
    refetchFindings();
  }, [refetchScans, refetchFindings]);

  const pollScanStatus = (jobId: string, scanId: string) => {
    clearPolling();
    pollAttemptsRef.current = 0;
    pollTimerRef.current = window.setInterval(async () => {
      pollAttemptsRef.current += 1;
      try {
        const response = await cbomService.getScanStatus(scanId);
        const data = response.data ?? response;
        const status = data.status ?? 'running';
        const progress = typeof data.progress === 'number' ? data.progress : status === 'completed' ? 100 : Math.min(pollAttemptsRef.current * 10, 95);
        setScanProgress(progress);
        updateJob(jobId, (job) => ({
          ...job,
          status: status === 'failed' ? 'failed' : status === 'completed' ? 'completed' : 'running',
          progress,
          findings: data.findings?.total ?? job.findings,
        }));
        if (data.finding_items?.length) {
          setLiveFindings(data.finding_items);
        }
        if (data.resources && typeof data.resources === 'object') {
          setEnabledResources(data.resources);
        }
        if (status === 'completed' || status === 'failed') {
          clearPolling();
          setIsScanning(false);
          refreshScanData();
          if (status === 'completed') {
            cbomService.getScanIntelligence(scanId).then((intel) => {
              const gate = intel.data?.gate;
              if (gate) setPolicyGate(gate);
              if (intel.data?.client_architecture) setArchitecture(intel.data.client_architecture);
              if (intel.data?.pqc_readiness) setReadiness(intel.data.pqc_readiness);
            }).catch(() => undefined);
            cbomService.getScanQiskit(scanId).then((qiskitResp) => {
              const payload = qiskitResp.data ?? {};
              const q = payload.qiskit ?? payload;
              if (typeof q.estate_score === 'number') setQiskitEstate(q.estate_score);
              if (typeof payload.audit_score?.overall === 'number') setAuditOverall(payload.audit_score.overall);
              setEnabledResources((prev) => ({
                ...prev,
                ...(payload.resources || q.resources || {}),
                qiskit: true,
              }));
            }).catch(() => undefined);
          }
        }
      } catch {
        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          clearPolling(); setIsScanning(false);
          updateJob(jobId, (job) => ({ ...job, status: 'failed' }));
          setError('Scan polling timed out.');
        }
      }
    }, POLL_INTERVAL_MS);
  };

  const startScan = async () => {
    const target = scanTarget.trim();
    if (!target) { setError('Specify a scan target (website, host, IP, server, pod://ns/name, or qsic://).'); return; }
    const looksLikeWebsite = /^(https?:\/\/|www\.)/i.test(target);
    const looksLikeIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(target) || target.includes(':') && target.includes('.');
    let resolvedType = scanType;
    if (targetClass === 'website' || (looksLikeWebsite && targetClass === 'host')) resolvedType = 'website';
    else if (targetClass === 'ip' || (looksLikeIP && targetClass === 'host')) resolvedType = 'ip';
    else if (targetClass === 'host' || targetClass === 'server' || targetClass === 'pod' || targetClass === 'hardware') {
      resolvedType = targetClass;
    } else if (looksLikeWebsite && scanType === 'cbom') {
      resolvedType = 'website';
    }
    if (!paid && resolvedType === 'compliance') resolvedType = 'cbom';
    clearPolling(); setIsScanning(true); setError(null); setScanProgress(0);
    setPolicyGate(null); setQiskitEstate(null); setAuditOverall(null); setEnabledResources({});
    setArchitecture(null); setReadiness(null);
    const newJob: ScanJob = { id: `scan-${Date.now()}`, status: 'running', type: resolvedType, target, startedAt: new Date().toISOString(), findings: 0, progress: 0 };
    setScanJobs((prev) => [newJob, ...prev]);
    setTab(1);
    try {
      const response = await cbomService.triggerScan(target, resolvedType);
      const scanId = response.data?.scan_id ?? response.data?.scanId ?? newJob.id;
      updateJob(newJob.id, (job) => ({ ...job, scanId, id: scanId }));
      pollScanStatus(scanId, scanId);
    } catch {
      clearPolling(); setIsScanning(false);
      setError('Could not reach the CBOM scan API. Start the backend on :9090 or use GitHub Pages demo mode.');
      setScanJobs((prev) => prev.filter((j) => j.id !== newJob.id));
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle color="success" fontSize="small" />;
    if (status === 'failed') return <ErrorIcon color="error" fontSize="small" />;
    if (status === 'running') return <Refresh fontSize="small" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />;
    return <Schedule color="disabled" fontSize="small" />;
  };

  const benchList = benchmarksRaw?.benchmarks ?? [];
  const bench = benchList[0] ?? benchmarksRaw ?? { throughput_rps: 1240, p95_latency_ms: 182, scan_time_seconds: 8.4, coverage_pct: 94 };

  const findings: ScanFinding[] = liveFindings.length
    ? liveFindings
    : (findingsData?.source === 'cbom_scans' ? [] : DEMO_SCAN_FINDINGS as ScanFinding[]);
  const totalFindings = findings.length || scanJobs.reduce((s, j) => s + j.findings, 0);
  const completedScans = scanJobs.filter((j) => j.status === 'completed').length;

  return (
    <PageFrame eyebrow="Security Cloud" title="CBOM Scanner" subtitle="Discover cryptography on websites, hosts, IPs, servers, and declared Kubernetes pods. Mitigate with NIST PQC mappings. Report is CBOM + Qiskit/audit scores — not a certification. QSIC hardware is declared inventory, not a shipped chip." badge={isScanning ? 'Scanning' : (isDemo ? 'Demo · limited' : 'Ready')}>
      {error && (
        <Box sx={{ mb: 2.5, p: 1.5, borderRadius: `${designSystem.radius.md}px`, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}><StatCard label="Completed scans" value={completedScans} icon={<History />} accent={tokens.colors.rivicq[500]} delay={0} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Findings" value={totalFindings} icon={<BugReport />} accent={tokens.colors.crypto.high} delay={1} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Coverage" value={`${bench.coverage_pct ?? 94}%`} icon={<Security />} accent={tokens.colors.crypto.low} delay={2} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Scan time" value={`${bench.scan_time_seconds ?? 8.4}s`} icon={<Speed />} accent={tokens.colors.rivicq[700]} delay={3} /></Grid>
      </Grid>

      <GlassCard glow={tokens.colors.rivicq[500]} delay={0}>
        <DetailTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: 'New Scan', icon: <PlayArrow fontSize="small" /> },
            { label: 'History', icon: <History fontSize="small" /> },
            { label: 'Findings', icon: <BugReport fontSize="small" /> },
            { label: 'Schedules', icon: <Event fontSize="small" /> },
            { label: 'Benchmarks', icon: <Speed fontSize="small" /> },
            { label: 'GitHub', icon: <GitHub fontSize="small" /> },
          ]}
        />

        <TabPanel value={tab} index={0}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Scan Configuration</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {TARGET_CLASSES.map((c) => (
              <Chip
                key={c.id}
                icon={c.icon as React.ReactElement}
                label={c.label}
                clickable
                disabled={isScanning}
                color={targetClass === c.id ? 'primary' : 'default'}
                variant={targetClass === c.id ? 'filled' : 'outlined'}
                onClick={() => {
                  setTargetClass(c.id);
                  setScanType(c.id);
                  setScanTarget(c.placeholder);
                }}
              />
            ))}
          </Stack>
          {isDemo && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Live demo is Community-limited: website, host/IP, server, declared pods, and QSIC catalog. Multi-cloud, SSO, and the DORA pack stay on Enterprise.
            </Alert>
          )}
          <TextField
            fullWidth
            label="Scan Target"
            placeholder="https://example.com, 192.0.2.10, pod://prod/api@host, or qsic://research"
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            disabled={isScanning}
            sx={{ mb: 1.5 }}
            helperText="Website → TLS+HTTPS. Host/IP/server → TLS+SSH+HTTP. Pod → declared k8s inventory. Hardware → QSIC/HSM catalog."
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {WEBSITE_PRESETS.map((url) => (
              <Chip
                key={url}
                icon={<Language sx={{ fontSize: 16 }} />}
                label={url}
                clickable
                disabled={isScanning}
                variant={scanTarget === url ? 'filled' : 'outlined'}
                color={scanTarget === url ? 'primary' : 'default'}
                onClick={() => { setScanTarget(url); setScanType('website'); }}
              />
            ))}
            <Chip
              icon={<Lock sx={{ fontSize: 16 }} />}
              label="./ local repo"
              clickable
              disabled={isScanning}
              variant={scanTarget === './' ? 'filled' : 'outlined'}
              onClick={() => { setScanTarget('./'); setScanType('cbom'); setTargetClass('host'); }}
            />
          </Stack>
          <ToggleButtonGroup exclusive value={scanType} onChange={(_, v) => v && setScanType(v)} size="small" sx={{ mb: 2, flexWrap: 'wrap' }}>
            {(['website', 'host', 'ip', 'server', 'pod', 'hardware', 'quick', 'full'] as const).map((type) => (
              <ToggleButton key={type} value={type} disabled={isScanning || (!paid && type === 'full')} sx={{ textTransform: 'capitalize' }}>
                {type}
              </ToggleButton>
            ))}
            {paid && (
              <ToggleButton value="compliance" disabled={isScanning} sx={{ textTransform: 'capitalize' }}>compliance</ToggleButton>
            )}
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{SCAN_TYPE_INFO[scanType]}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {RESOURCE_LABELS.map((r) => {
              const on = Boolean(enabledResources[r.key]);
              return (
                <Chip
                  key={r.key}
                  size="small"
                  label={r.label}
                  color={on ? 'success' : 'default'}
                  variant={on ? 'filled' : 'outlined'}
                />
              );
            })}
          </Stack>
          {(qiskitEstate != null || auditOverall != null) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {qiskitEstate != null ? `Qiskit estate score: ${qiskitEstate}/100. ` : ''}
              {auditOverall != null ? `Audit score: ${auditOverall}/100 (policy gate + Qiskit profile — not a certification).` : ''}
            </Alert>
          )}
          <ScanReportPanel architecture={architecture} readiness={readiness} />
          {isScanning && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2">Scanning {scanTarget}</Typography>
                <Typography variant="body2" fontFamily={tokens.typography.mono} fontWeight={600}>{scanProgress}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={scanProgress} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          )}
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" startIcon={<PlayArrow />} onClick={startScan} disabled={isScanning} size="large" sx={{ background: designSystem.gradient.brand, px: 3 }}>
              {isScanning ? 'Scanning…' : 'Start CBOM Scan'}
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={refreshScanData}>Refresh</Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {scanJobs.length === 0 ? (
            <EmptyState icon={<Security />} title="No scans yet" description="Run a CBOM scan against a hostname or local repository." action={{ label: 'New Scan', onClick: () => setTab(0) }} />
          ) : (
            <Stack spacing={1.25}>
              {scanJobs.map((job) => (
                <Box key={job.id} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    {statusIcon(job.status)}
                    <Typography fontWeight={700}>{job.type.toUpperCase()}</Typography>
                    <Chip label={job.target} size="small" variant="outlined" />
                    <Chip label={job.status} size="small" color={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'primary'} />
                    {job.status === 'completed' && <Chip label={`${job.findings} findings`} size="small" />}
                  </Stack>
                  {job.status === 'running' && <LinearProgress variant="determinate" value={job.progress} sx={{ mt: 1.5, height: 4, borderRadius: 2 }} />}
                  {job.startedAt && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>{new Date(job.startedAt).toLocaleString()}</Typography>}
                </Box>
              ))}
            </Stack>
          )}
        </TabPanel>

        <TabPanel value={tab} index={2}>
          {policyGate && (
            <Alert severity={policyGate.failed ? 'error' : 'success'} sx={{ mb: 2 }}>
              Policy gate: {policyGate.decision ?? 'ALLOW'}
              {policyGate.reasons?.[0] ? ` — ${policyGate.reasons[0]}` : ''}
            </Alert>
          )}
          {(qiskitEstate != null || auditOverall != null) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {qiskitEstate != null ? `Qiskit estate score ${qiskitEstate}/100. ` : ''}
              {auditOverall != null ? `Audit score ${auditOverall}/100 (mappings, not a certification).` : ''}
            </Alert>
          )}
          <ScanReportPanel architecture={architecture} readiness={readiness} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {RESOURCE_LABELS.map((r) => (
              <Chip key={r.key} size="small" label={r.label} color={enabledResources[r.key] ? 'success' : 'default'} variant={enabledResources[r.key] ? 'filled' : 'outlined'} />
            ))}
          </Stack>
          {findings.length === 0 ? (
            <EmptyState icon={<BugReport />} title="No findings yet" description="Complete a website or CBOM scan to populate TLS, HTTPS header, SSH, and SBOM detections." action={{ label: 'Run Scan', onClick: () => setTab(0) }} />
          ) : (
            <Stack spacing={1.5}>
              {findings.map((f, idx) => (
                <Box key={f.id ?? `finding-${idx}`} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', borderLeft: 4, borderLeftColor: f.severity === 'critical' ? 'error.main' : f.severity === 'high' ? 'warning.main' : 'info.main' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Chip label={(f.severity || 'info').toUpperCase()} size="small" color={f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'warning' : 'default'} />
                    <Typography fontWeight={700}>{f.title}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Asset: {f.asset ?? f.target_label ?? '—'}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{f.recommendation ?? f.remediation}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Stack spacing={1.5}>
            {DEMO_SCAN_SCHEDULES.map((sch) => (
              <Box key={sch.id} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight={700}>{sch.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{sch.cron} · {sch.target}</Typography>
                </Box>
                <Chip label={sch.type} size="small" variant="outlined" />
                <Chip label={sch.status} size="small" color={sch.status === 'active' ? 'success' : 'default'} />
                <Typography variant="caption" color="text.secondary">Next: {sch.nextRun}</Typography>
                <Button size="small" variant="outlined">{sch.status === 'active' ? 'Pause' : 'Enable'}</Button>
              </Box>
            ))}
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Grid container spacing={2}>
            {[
              { label: 'Throughput', value: `${bench.throughput_rps ?? 1240} req/s`, hint: 'Scanner API capacity' },
              { label: 'P95 latency', value: `${bench.p95_latency_ms ?? 182} ms`, hint: 'End-to-end scan orchestration' },
              { label: 'Scan duration', value: `${bench.scan_time_seconds ?? 8.4}s`, hint: 'Per reference asset set' },
              { label: 'Coverage', value: `${bench.coverage_pct ?? 94}%`, hint: 'Connected targets' },
            ].map((item) => (
              <Grid item xs={12} sm={6} key={item.label}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="overline" color="text.secondary">{item.label}</Typography>
                  <Typography variant="h5" fontWeight={800}>{item.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.hint}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <GitHubRepoScanPanel />
        </TabPanel>
      </GlassCard>
    </PageFrame>
  );
};

export default Scanner;
