import React, { useState } from 'react';
import { Alert, Box, Button, Chip, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { GitHub, PlayArrow, Refresh } from '@mui/icons-material';
import { gitHubScanService } from '../services/api';
import { EmptyState } from './ui';

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

type RepoItem = {
  full_name: string;
};

type ScanPayload = {
  scan_id?: string;
  status?: string;
  stage?: string;
  stages?: Stage[];
  error?: string;
  demo?: boolean;
  repos?: Array<{
    status?: string;
    error?: string;
    demo?: boolean;
    pqc_readiness?: number;
    file_count?: number;
    stages?: Stage[];
    crypto_findings?: Finding[];
    sbom?: Array<{ name: string; version?: string; type?: string }>;
    cbom?: Array<{ name: string; type?: string }>;
    summary?: { total_findings?: number };
  }>;
};

const TERMINAL = new Set(['completed', 'failed', 'completed_with_warnings', 'partial', 'cancelled']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const GitHubRepoScanPanel: React.FC = () => {
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
          if (payload?.status && TERMINAL.has(payload.status)) {
            break;
          }
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

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" fontWeight={700}>GitHub repository scan</Typography>
      <Typography variant="body2" color="text.secondary">
        Analyzes authorized repository contents (tree + files) for crypto, secrets, SBOM, CBOM, IaC, APIs, and containers.
        Progress stages are recorded as each analyzer finishes — not a timer. Findings include file, line, and masked evidence.
      </Typography>
      {demo && (
        <Alert severity="info">Demo fixture data — synthetic findings from embedded test files, not a customer tenant.</Alert>
      )}
      {error && <Alert severity="warning">{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField size="small" label="Organisation (optional)" value={org} onChange={(e) => setOrg(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 180 } }} />
        <Button variant="outlined" startIcon={<Refresh />} onClick={listRepos} sx={{ minHeight: 44 }}>List repos</Button>
      </Stack>
      {repos.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {repos.slice(0, 12).map((r) => (
            <Chip key={r.full_name} label={r.full_name} size="small" onClick={() => setRepo(r.full_name)} variant={r.full_name === repo ? 'filled' : 'outlined'} />
          ))}
        </Stack>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField fullWidth size="small" label="owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
        <Button variant="contained" startIcon={loading ? <Refresh /> : <PlayArrow />} onClick={runScan} disabled={loading} sx={{ minWidth: { sm: 160 }, minHeight: 44 }}>
          {loading ? 'Scanning…' : 'Scan repository'}
        </Button>
      </Stack>
      {loading && (
        <Box>
          <Typography variant="caption" color="text.secondary">{liveStage ? `Stage: ${liveStage}` : 'Queued'}</Typography>
          <LinearProgress sx={{ mt: 0.75 }} />
        </Box>
      )}
      {failed && <Alert severity="error">Scan failed: {scan?.error || result?.error || 'unknown error'}. Status is not complete.</Alert>}
      {stages.length > 0 && (
        <Stack spacing={0.75}>
          {stages.map((s) => (
            <Typography key={s.id} variant="caption" color="text.secondary">
              {s.status === 'completed' ? '✓' : '•'} {s.label}
            </Typography>
          ))}
        </Stack>
      )}
      {scan && !failed && (
        <Stack spacing={1}>
          <Typography variant="body2" fontWeight={700}>
            Score inputs — {scan.summary?.total_findings ?? 0} findings · PQC {scan.pqc_readiness ?? 0}% · {scan.file_count ?? 0} files
          </Typography>
          {(scan.sbom?.length || 0) > 0 && (
            <Typography variant="caption" color="text.secondary">
              SBOM: {scan.sbom?.map((c) => `${c.name}${c.version ? `@${c.version}` : ''}`).join(', ')}
            </Typography>
          )}
          {(scan.cbom?.length || 0) > 0 && (
            <Typography variant="caption" color="text.secondary">
              CBOM algorithms: {Array.from(new Set(scan.cbom?.map((c) => c.name))).join(', ')}
            </Typography>
          )}
          {findings.length === 0 ? (
            <EmptyState title="No findings in scanned files" description="The analyzers ran on retrieved content and did not match crypto, secret, IaC, or container rules." />
          ) : findings.map((f) => (
            <Box key={f.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, borderLeft: 4, borderLeftColor: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'error.main' : 'info.main' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" label={f.severity} color={f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'error' : 'default'} />
                <Chip size="small" variant="outlined" icon={<GitHub sx={{ fontSize: 14 }} />} label={f.finding_type} />
                {f.cve && <Chip size="small" label={f.cve} />}
                {f.demo && <Chip size="small" label="demo" />}
              </Stack>
              <Typography fontWeight={700} sx={{ mt: 0.75 }}>{f.description}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {f.file_path}:{f.line_number} · {f.tool} · {f.owasp} · {f.cwe}
              </Typography>
              {f.compliance && f.compliance.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Controls: {f.compliance.join(' · ')}
                </Typography>
              )}
              {f.evidence && <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>Evidence: {f.evidence}</Typography>}
              <Typography variant="body2" sx={{ mt: 0.5 }}>{f.remediation}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default GitHubRepoScanPanel;
