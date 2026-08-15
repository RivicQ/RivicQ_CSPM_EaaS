import React, { useState } from 'react';
import {
  Alert, Box, Button, Chip, Grid, LinearProgress, Stack, Step, StepLabel, Stepper, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { GitHub, PlayArrow, Refresh, Security, VerifiedUser } from '@mui/icons-material';
import { gitHubScanService } from '../services/api';
import { EmptyState } from './ui';
import designSystem from '../theme/designSystem';
import dashboardDesign from '../theme/dashboardDesign';
import { tokens } from '../theme/tokens';

type Stage = { id: string; label: string; status: string };

type Finding = {
  id?: string;
  file_path?: string;
  line_number?: number;
  finding_type?: string;
  algorithm?: string;
  severity?: string;
  description?: string;
  remediation?: string;
  evidence?: string;
  owasp?: string;
  cwe?: string;
  cve?: string;
  tool?: string;
  compliance?: string[];
  demo?: boolean;
};

type RepoItem = { full_name: string };

type ScanRepo = {
  status?: string;
  error?: string;
  demo?: boolean;
  pqc_readiness?: number;
  file_count?: number;
  commit_sha?: string;
  default_branch?: string;
  languages?: string[];
  stages?: Stage[];
  crypto_findings?: Finding[];
  sbom?: Array<{ name: string; version?: string; type?: string }>;
  cbom?: Array<{ name: string; type?: string }>;
  summary?: { total_findings?: number; critical?: number; high?: number; medium?: number; low?: number };
};

type ScanPayload = {
  scan_id?: string;
  status?: string;
  stage?: string;
  stages?: Stage[];
  error?: string;
  demo?: boolean;
  repos?: ScanRepo[];
};

const TERMINAL = new Set(['completed', 'failed', 'completed_with_warnings', 'partial', 'cancelled']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const severityColor = (severity?: string) => {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL') return dashboardDesign.severity.critical;
  if (s === 'HIGH') return dashboardDesign.severity.high;
  if (s === 'MEDIUM') return dashboardDesign.severity.medium;
  if (s === 'LOW') return dashboardDesign.severity.low;
  return tokens.colors.crypto.info;
};

const GitHubRepoScanPanel: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [repo, setRepo] = useState('rivicq/demo-vulnerable-app');
  const [org, setOrg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [result, setResult] = useState<ScanPayload | null>(null);
  const [demo, setDemo] = useState(false);

  const listRepos = async () => {
    setError(null);
    try {
      const { data } = await gitHubScanService.listRepos(org || undefined);
      setRepos(data?.repos ?? []);
      setDemo(!!data?.demo);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || 'Could not list GitHub repositories. Configure GITHUB_TOKEN or DEMO_MODE.');
    }
  };

  const runScan = async () => {
    const target = repo.trim();
    if (!target) {
      setError('Enter owner/repo');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await gitHubScanService.scanRepos([target], 'crypto', true);
      const scanId = data?.scan_id as string | undefined;
      let payload: ScanPayload = data;
      setResult(payload);
      setDemo(!!data?.demo);
      if (scanId) {
        for (let i = 0; i < 90; i += 1) {
          const statusResp = await gitHubScanService.getScanStatus(scanId);
          payload = statusResp.data;
          setResult(payload);
          setDemo(!!payload?.demo || !!payload?.repos?.[0]?.demo);
          if (payload?.status && TERMINAL.has(payload.status)) break;
          await sleep(1000);
        }
      }
      if (payload?.status === 'failed') {
        setError(payload.error || payload.repos?.[0]?.error || 'GitHub scan failed. This is not a completed scan.');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || 'GitHub scan failed. This is not a completed scan.');
    } finally {
      setLoading(false);
    }
  };

  const scan = result?.repos?.[0];
  const stages: Stage[] = scan?.stages?.length ? scan.stages : (result?.stages ?? []);
  const findings: Finding[] = scan?.crypto_findings ?? [];
  const failed = result?.status === 'failed' || scan?.status === 'failed';
  const liveStage = result?.stage || result?.status;
  const activeStep = Math.max(0, stages.findIndex((s) => s.status !== 'completed'));
  const stepIndex = activeStep === -1 || stages.every((s) => s.status === 'completed') ? stages.length : activeStep;

  const metrics = [
    { label: 'Findings', value: scan?.summary?.total_findings ?? 0, accent: tokens.colors.rivicq[500] },
    { label: 'Critical', value: scan?.summary?.critical ?? 0, accent: dashboardDesign.severity.critical },
    { label: 'High', value: scan?.summary?.high ?? 0, accent: dashboardDesign.severity.high },
    { label: 'PQC %', value: scan?.pqc_readiness ?? 0, accent: tokens.colors.crypto.quantum },
    { label: 'Files', value: scan?.file_count ?? 0, accent: tokens.colors.rivicq[700] },
  ];

  const controls = (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${designSystem.radius.md}px`,
            display: 'grid',
            placeItems: 'center',
            background: designSystem.gradient.brand,
            color: '#fff',
          }}
        >
          <GitHub />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.02em">
            GitHub repository intelligence
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Authorized contents → SAST · SCA · SBOM · CBOM · secrets · IaC · PQC
          </Typography>
        </Box>
      </Stack>

      {demo && (
        <Alert severity="info" icon={<VerifiedUser fontSize="inherit" />}>
          Demo fixture — synthetic findings from embedded test files, not a customer tenant.
        </Alert>
      )}
      {error && <Alert severity="warning">{error}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField size="small" label="Organisation (optional)" value={org} onChange={(e) => setOrg(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 180 } }} />
        <Button variant="outlined" startIcon={<Refresh />} onClick={listRepos} sx={{ minHeight: 44 }}>
          Discover repos
        </Button>
      </Stack>
      {repos.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {repos.slice(0, 12).map((r) => (
            <Chip key={r.full_name} label={r.full_name} size="small" onClick={() => setRepo(r.full_name)} variant={r.full_name === repo ? 'filled' : 'outlined'} color={r.full_name === repo ? 'primary' : 'default'} />
          ))}
        </Stack>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField fullWidth size="small" label="owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
        <Button
          variant="contained"
          startIcon={loading ? <Refresh /> : <PlayArrow />}
          onClick={runScan}
          disabled={loading}
          sx={{ minWidth: { sm: 180 }, minHeight: 44, background: designSystem.gradient.brand, px: 2.5 }}
        >
          {loading ? 'Scanning…' : 'Scan repository'}
        </Button>
      </Stack>
      {loading && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Live stage: {liveStage || 'queued'}
          </Typography>
          <LinearProgress sx={{ mt: 0.75, height: 6, borderRadius: 99 }} />
        </Box>
      )}
    </Stack>
  );

  const pipeline = stages.length > 0 && (
    <Box sx={{ pt: 1 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Analyzer pipeline
      </Typography>
      <Box sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
        <Stepper
          activeStep={Math.min(stepIndex, Math.max(stages.length - 1, 0))}
          orientation={isDesktop ? 'vertical' : 'horizontal'}
          alternativeLabel={!isDesktop}
          sx={{ minWidth: isDesktop ? 0 : Math.max(stages.length * 88, 320) }}
        >
          {stages.map((s) => (
            <Step key={s.id} completed={s.status === 'completed'}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
    </Box>
  );

  const results = (
    <Stack spacing={1.5}>
      {failed && (
        <Alert severity="error">Scan failed: {scan?.error || result?.error || 'unknown error'}. Status is not complete.</Alert>
      )}
      {scan && !failed && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(5, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            {metrics.map((m) => (
              <Box key={m.label} sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover', minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                <Typography fontWeight={800} sx={{ color: m.accent, fontSize: { xs: '1.05rem', md: '1.15rem' }, lineHeight: 1.2 }}>{m.value}</Typography>
              </Box>
            ))}
          </Box>
          {(scan.languages?.length || scan.default_branch) && (
            <Typography variant="caption" color="text.secondary">
              {scan.default_branch && <>Branch {scan.default_branch} · </>}
              {scan.commit_sha && <>SHA {scan.commit_sha.slice(0, 8)} · </>}
              {scan.languages?.join(', ')}
            </Typography>
          )}
          {(scan.sbom?.length || 0) > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              SBOM: {scan.sbom?.slice(0, 8).map((c) => `${c.name}${c.version ? `@${c.version}` : ''}`).join(', ')}
            </Typography>
          )}
          {(scan.cbom?.length || 0) > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              CBOM: {Array.from(new Set(scan.cbom?.map((c) => c.name))).join(', ')}
            </Typography>
          )}
          {findings.length === 0 ? (
            <EmptyState icon={<Security />} title="No findings in scanned files" description="Analyzers ran on retrieved content and did not match crypto, secret, IaC, API, or container rules." />
          ) : findings.map((f) => (
            <Box
              key={f.id}
              sx={{
                p: { xs: 1.5, md: 2 },
                border: 1,
                borderColor: 'divider',
                borderRadius: `${designSystem.radius.md}px`,
                borderLeft: 4,
                borderLeftColor: severityColor(f.severity),
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" label={f.severity} sx={{ fontWeight: 700, bgcolor: `${severityColor(f.severity)}22`, color: severityColor(f.severity) }} />
                <Chip size="small" variant="outlined" icon={<GitHub sx={{ fontSize: 14 }} />} label={f.finding_type} />
                {f.cve && <Chip size="small" label={f.cve} />}
                {f.demo && <Chip size="small" label="synthetic demo" color="info" />}
              </Stack>
              <Typography fontWeight={800} sx={{ mt: 1 }}>{f.description}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: tokens.typography.mono }}>
                {f.file_path}:{f.line_number} · {f.tool} · {f.owasp} · {f.cwe}
              </Typography>
              {f.compliance && f.compliance.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Controls: {f.compliance.join(' · ')}
                </Typography>
              )}
              {f.evidence && (
                <Box sx={{ mt: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover', fontFamily: tokens.typography.mono, fontSize: '0.75rem' }}>
                  Evidence: {f.evidence}
                </Box>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>{f.remediation}</Typography>
            </Box>
          ))}
        </>
      )}
    </Stack>
  );

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} lg={5}>
        {controls}
        {pipeline}
      </Grid>
      <Grid item xs={12} lg={7}>
        {results}
      </Grid>
    </Grid>
  );
};

export default GitHubRepoScanPanel;
