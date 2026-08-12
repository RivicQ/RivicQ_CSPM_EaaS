import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Chip, Grid, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  PlayArrow, CheckCircle, Error as ErrorIcon, Schedule, Security, Refresh,
  History, BugReport, Event, Speed,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { cbomService, benchmarkService } from '../services/api';
import PageFrame from '../components/PageFrame';
import StatCard from '../components/dashboard/StatCard';
import { GlassCard, EmptyState, DetailTabs, TabPanel } from '../components/ui';
import designSystem from '../theme/designSystem';
import { tokens } from '../theme/tokens';
import { DEMO_SCAN_FINDINGS, DEMO_SCAN_SCHEDULES } from '../data/workspaceDemo';

interface ScanJob {
  id: string;
  scanId?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  type: string;
  target: string;
  startedAt?: string;
  findings: number;
  progress: number;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40;

const SCAN_TYPE_INFO: Record<string, string> = {
  cbom: 'Full cryptographic bill of materials — keys, certs, libraries, configs.',
  quick: 'Fast surface scan for known weak algorithms and expired certs.',
  full: 'Deep scan including dependencies, containers, and IaC templates.',
  compliance: 'Maps findings to ISO 27001, SOC 2, PCI-DSS, and PQC controls.',
};

const Scanner: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'quick' | 'full' | 'compliance' | 'cbom'>('cbom');
  const [scanTarget, setScanTarget] = useState('production/*');
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([
    { id: 'demo-1', status: 'completed', type: 'cbom', target: 'aws-prod-accounts', startedAt: new Date(Date.now() - 3600000).toISOString(), findings: 47, progress: 100 },
    { id: 'demo-2', status: 'completed', type: 'compliance', target: 'k8s/cluster-prod', startedAt: new Date(Date.now() - 86400000).toISOString(), findings: 12, progress: 100 },
  ]);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollAttemptsRef = useRef(0);

  const { data: benchmarks } = useQuery({
    queryKey: ['scanner-benchmarks'],
    queryFn: () => benchmarkService.getSummary().then((r) => r.data).catch(() => null),
    retry: 0,
  });

  useEffect(() => () => { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current); }, []);

  const clearPolling = () => {
    if (pollTimerRef.current) { window.clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const updateJob = (jobId: string, updater: (job: ScanJob) => ScanJob) => {
    setScanJobs((prev) => prev.map((job) => (job.id === jobId ? updater(job) : job)));
  };

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
          findings: data.findings?.total ?? data.findings?.count ?? job.findings,
        }));
        if (status === 'completed' || status === 'failed') { clearPolling(); setIsScanning(false); }
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
    if (!target) { setError('Specify a scan target.'); return; }
    clearPolling(); setIsScanning(true); setError(null); setScanProgress(0);
    const newJob: ScanJob = { id: `scan-${Date.now()}`, status: 'running', type: scanType, target, startedAt: new Date().toISOString(), findings: 0, progress: 0 };
    setScanJobs((prev) => [newJob, ...prev]);
    setTab(1);
    try {
      const response = await cbomService.triggerScan(target, scanType);
      const scanId = response.data?.scan_id ?? response.data?.scanId ?? newJob.id;
      updateJob(newJob.id, (job) => ({ ...job, scanId }));
      pollScanStatus(newJob.id, scanId);
    } catch {
      clearPolling();
      setError('Live scan unavailable — showing demo progress.');
      let p = 0;
      const demoInterval = window.setInterval(() => {
        p += 15;
        setScanProgress(p);
        updateJob(newJob.id, (job) => ({ ...job, progress: p, findings: Math.floor(p / 3) }));
        if (p >= 100) {
          window.clearInterval(demoInterval);
          updateJob(newJob.id, (job) => ({ ...job, status: 'completed', findings: 23, progress: 100 }));
          setIsScanning(false);
        }
      }, 400);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle color="success" fontSize="small" />;
    if (status === 'failed') return <ErrorIcon color="error" fontSize="small" />;
    if (status === 'running') return <Refresh fontSize="small" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />;
    return <Schedule color="disabled" fontSize="small" />;
  };

  const bench = benchmarks ?? { throughput_rps: 1240, p95_latency_ms: 182, scan_time_seconds: 8.4, coverage_pct: 94 };

  return (
    <PageFrame eyebrow="Discovery" title="CBOM Scanner" subtitle="Generate cryptographic bills of materials, track findings, and schedule continuous discovery." badge={isScanning ? 'Scanning' : 'Ready'}>
      {error && (
        <Box sx={{ mb: 2.5, p: 1.5, borderRadius: `${designSystem.radius.md}px`, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}><StatCard label="Scans today" value={scanJobs.filter((j) => j.status === 'completed').length + 3} icon={<History />} accent={tokens.colors.rivicq[500]} delay={0} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Findings" value={scanJobs.reduce((s, j) => s + j.findings, 0) + DEMO_SCAN_FINDINGS.length} icon={<BugReport />} accent={tokens.colors.crypto.high} delay={1} /></Grid>
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
          ]}
        />

        <TabPanel value={tab} index={0}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Scan Configuration</Typography>
          <TextField
            fullWidth
            label="Scan Target"
            placeholder="myrepo/, ghcr.io/org/image:tag, production/*"
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            disabled={isScanning}
            sx={{ mb: 2 }}
            helperText="Repository path, container image, cloud account glob, or hostname"
          />
          <ToggleButtonGroup exclusive value={scanType} onChange={(_, v) => v && setScanType(v)} size="small" sx={{ mb: 2, flexWrap: 'wrap' }}>
            {(['cbom', 'quick', 'full', 'compliance'] as const).map((type) => (
              <ToggleButton key={type} value={type} disabled={isScanning} sx={{ textTransform: 'capitalize' }}>
                {type === 'cbom' ? 'CBOM' : type}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{SCAN_TYPE_INFO[scanType]}</Typography>
          {isScanning && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2">Scanning {scanTarget}</Typography>
                <Typography variant="body2" fontFamily={tokens.typography.mono} fontWeight={600}>{scanProgress}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={scanProgress} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          )}
          <Button variant="contained" startIcon={<PlayArrow />} onClick={startScan} disabled={isScanning} size="large" sx={{ background: designSystem.gradient.brand, px: 3 }}>
            {isScanning ? 'Scanning…' : 'Start Scan'}
          </Button>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {scanJobs.length === 0 ? (
            <EmptyState icon={<Security />} title="No scans yet" description="Configure and run your first CBOM scan." />
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
          <Stack spacing={1.5}>
            {DEMO_SCAN_FINDINGS.map((f) => (
              <Box key={f.id} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', borderLeft: 4, borderLeftColor: f.severity === 'critical' ? 'error.main' : f.severity === 'high' ? 'warning.main' : 'info.main' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Chip label={f.severity.toUpperCase()} size="small" color={f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'warning' : 'default'} />
                  <Typography fontWeight={700}>{f.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">Asset: {f.asset}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{f.recommendation}</Typography>
              </Box>
            ))}
          </Stack>
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
              { label: 'Scan duration', value: `${bench.scan_time_seconds ?? 8.4}s`, hint: '10k asset reference set' },
              { label: 'Coverage', value: `${bench.coverage_pct ?? 94}%`, hint: 'Connected cloud accounts' },
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
      </GlassCard>
    </PageFrame>
  );
};

export default Scanner;
