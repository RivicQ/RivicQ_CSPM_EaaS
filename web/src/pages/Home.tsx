import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Grid, Stack, Typography, TextField, InputAdornment, useTheme,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, GitHub, GppGood, Psychology, FactCheck, Lock, WorkspacePremium, VerifiedUser,
  Api, MenuBook, EnhancedEncryption, AccountTree, MailOutline, NorthEast,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { cbomService, gitHubScanService } from '../services/api';
import HomeScanReport, { HomeScanReportData } from '../components/home/HomeScanReport';
import PublicEngineNotice from '../components/brand/PublicEngineNotice';
import PublicShell from '../components/brand/PublicShell';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';
import { websiteCtaSx, websiteOutlineCtaSx } from '../theme/websiteChrome';
import { archifyDocsHref } from '../theme/docsLink';
import ConsoleStory from '../components/ops/ConsoleStory';
import { MotionSection } from '../motion/primitives';
import NebulaBackdrop from '../components/brand/NebulaBackdrop';
import ScanWorkflowStrip from '../components/home/ScanWorkflowStrip';
import ArchifyWorkflowEmbed from '../components/brand/ArchifyWorkflowEmbed';
import { PUBLIC_ENGINE_CHIP_DEMO, PUBLIC_ENGINE_CHIP_LIVE } from '../data/publicInfrastructure';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const PLATFORM = [
  { icon: <Psychology />, title: 'AI engineering', desc: 'AIBOM is an Enterprise inventory for models, datasets, and AI identities. Community CBOM still flags cryptography on serving stacks. EU AI Act names are mappings, not a certification.' },
  { icon: <AccountTree />, title: 'DevSecOps', desc: 'Scan → inventory → policy gate in CI. The GitHub Action is Community; continuous monitoring is Enterprise.' },
  { icon: <GppGood />, title: 'Cloud security', desc: 'CSPM from declared and scanned assets. Live cloud attach needs customer credentials and an Enterprise license.' },
  { icon: <Api />, title: 'API security', desc: 'TLS/HTTPS hygiene from website and host scans. Gateway inventory is Enterprise when a connector exists.' },
  { icon: <FactCheck />, title: 'GRC & compliance risk', desc: 'DORA, NIS2, NIST, ISO, PCI, SOC 2 operator mappings. Mappings are not audits or certifications.' },
  { icon: <EnhancedEncryption />, title: 'Quantum risk', desc: 'Harvest-now exposure and ML-KEM / ML-DSA planning from scan intelligence. Pages is static — live scores need the API or CLI.' },
];

type HomeDoc = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
  to?: string;
};

const DOCS: HomeDoc[] = [
  { icon: <MenuBook />, title: 'Documentation', desc: 'Architecture, editions, CBOM, and PQC notes, rendered in Archify.', href: archifyDocsHref() },
  { icon: <MailOutline />, title: 'Contact', desc: 'Public desks on @rivicq.com.', to: '/contact' },
  { icon: <AccountTree />, title: 'RivicQ Graph', desc: 'Labeled security-graph demo. Synthetic data only.', href: 'fabric/' },
  { icon: <Api />, title: 'API reference', desc: 'OpenAPI for the RivicQ platform API.', href: 'api/index.html' },
  { icon: <GitHub />, title: 'GitHub', desc: 'Source, issues, and the OSS scanner.', href: 'https://github.com/RivicQ/RivicQ_CSPM_EaaS' },
];

const STANDARDS = ['CIS Benchmarks', 'NIST 800-53', 'NIST PQC (FIPS 203/204)', 'SOC 2', 'ISO 27001', 'PCI DSS 4.0', 'DORA', 'NIS2', 'EU CRA', 'eIDAS 2.0'];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const isDark = useTheme().palette.mode === 'dark';
  const { isAuthenticated, backendReachable, demoLogin, isDemo } = useAuth();
  const [scanStatus, setScanStatus] = React.useState<ScanStatus>('idle');
  const [repoUrl, setRepoUrl] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [report, setReport] = React.useState<HomeScanReportData | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const buildReport = (target: string, data: any): HomeScanReportData => {
    const findings = data?.findings || data?.summary || {};
    const findingItems = data?.finding_items || data?.detections || data?.intel_findings || [];
    const resources = data?.resources || {};
    const qiskit = data?.qiskit || {};
    const audit = data?.audit_score || {};
    return {
      target,
      score: data?.security_score ?? data?.score ?? audit.overall ?? findings?.score,
      severity: {
        critical: findings.critical ?? data?.critical,
        high: findings.high ?? data?.high,
        medium: findings.medium ?? data?.medium,
        low: findings.low ?? data?.low,
      },
      quantumRisk: data?.quantum_risk ?? data?.quantumRisk ?? audit.quantum_risk,
      qiskitEstate: qiskit.estate_score ?? audit.qiskit_estate,
      auditScore: audit.overall,
      policyGate: data?.gate?.decision ?? audit.policy_gate,
      resources,
      detections: (Array.isArray(findingItems) ? findingItems : []).slice(0, 12).map((f: any) => ({
        title: f.title || f.algorithm || f.finding_type || 'Finding',
        severity: f.severity,
        protocol: f.protocol || f.scanner,
      })),
      algorithms: (data?.algorithms || data?.crypto_findings || qiskit.algorithms || [])
        .slice(0, 12)
        .map((a: any) => ({
          name: a.name || a.algorithm,
          count: a.count,
          quantumSafe: a.quantum_safe ?? a.quantumSafe,
          attackClass: a.attack_class || a.attackClass,
        })),
    };
  };

  const isWebsiteTarget = (value: string) => /^(https?:\/\/|www\.)/i.test(value) || /^[\w.-]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(value);

  const handleScan = async () => {
    // On static Pages, allow one-click demo even with an empty field.
    const target = repoUrl.trim() || (!backendReachable ? 'https://demo.example.com' : '');
    if (!target) return;
    if (!repoUrl.trim() && !backendReachable) setRepoUrl(target);

    // Static Pages: enter labelled demo, then open the Scanner console which
    // already runs the in-browser demo adapter end-to-end (client-meeting path).
    if (!backendReachable) {
      setScanStatus('scanning');
      setProgress(10);
      setReport(null);
      try {
        if (!isDemo) await demoLogin('community');
        navigate(`/scanner?target=${encodeURIComponent(target)}&autostart=1`);
      } catch {
        setScanStatus('error');
        setProgress(0);
      }
      return;
    }

    setScanStatus('scanning');
    setProgress(5);
    setReport(null);

    const githubSpec = (() => {
      const m = target.match(/github\.com[:/]+([^/]+)\/([^/#\s]+)/i);
      if (m) return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
      if (/^[\w.-]+\/[\w.-]+$/.test(target)) return target;
      return '';
    })();
    try {
      // Live GitHub Contents scan when the engine is reachable.
      if (githubSpec) {
        const resp = await gitHubScanService.scanRepos([githubSpec], 'full', false);
        const scanId = resp.data.scan_id;
        let ticks = 0;
        const interval = setInterval(async () => {
          ticks += 1;
          try {
            const statusResp = await gitHubScanService.getScanStatus(scanId);
            const status = statusResp.data;
            setProgress(Math.min(95, ticks * 12));
            const done = ['completed', 'failed', 'completed_with_warnings', 'partial'].includes(status.status);
            if (done || ticks > 40) {
              clearInterval(interval);
              if (status.status === 'failed') {
                setScanStatus('error');
                return;
              }
              const repo = status.repos?.[0] || status;
              setReport(buildReport(githubSpec, {
                findings: repo.summary,
                algorithms: repo.cbom,
                quantum_risk: repo.pqc_readiness != null ? 100 - repo.pqc_readiness : undefined,
                score: repo.pqc_readiness,
              }));
              setScanStatus('complete');
              setProgress(100);
            }
          } catch {
            clearInterval(interval);
            setScanStatus('error');
          }
        }, 1500);
        return;
      }
      const scanTarget = githubSpec ? `https://github.com/${githubSpec}` : target;
      const resp = await cbomService.triggerScan(scanTarget, isWebsiteTarget(scanTarget) || Boolean(githubSpec) ? 'website' : 'cbom');
      const scanId = resp.data.scan_id;
      let ticks = 0;
      const interval = setInterval(async () => {
        ticks += 1;
        try {
          const statusResp = await cbomService.getScanStatus(scanId);
          const status = statusResp.data;
          setProgress(status.progress || Math.min(90, ticks * 12));
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval);
            if (status.status === 'completed') {
              try {
                const [reportResp, intelResp, qiskitResp] = await Promise.all([
                  cbomService.getScanReport(scanId).catch(() => null),
                  cbomService.getScanIntelligence(scanId).catch(() => null),
                  cbomService.getScanQiskit(scanId).catch(() => null),
                ]);
                const reportData = reportResp?.data || status;
                const intel = intelResp?.data || {};
                const qiskitPayload = qiskitResp?.data || {};
                setReport(buildReport(target, {
                  ...status,
                  ...reportData,
                  findings: status.findings || intel.summary,
                  finding_items: status.finding_items || reportData.findings,
                  resources: status.resources || qiskitPayload.resources,
                  qiskit: qiskitPayload.qiskit || intel.qiskit,
                  audit_score: qiskitPayload.audit_score || intel.audit_score,
                  gate: intel.gate,
                  algorithms: (qiskitPayload.qiskit || intel.qiskit)?.algorithms,
                }));
              } catch {
                setReport(buildReport(target, status));
              }
              setScanStatus('complete');
            } else {
              setScanStatus('error');
            }
          }
        } catch {
          clearInterval(interval);
          setScanStatus('error');
        }
      }, 1500);
    } catch {
      setScanStatus('error');
    }
  };

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openExternal = (href: string) => {
    const url = href.startsWith('http') || href.startsWith('/')
      ? href
      : `${process.env.PUBLIC_URL || ''}/${href.replace(/^\//, '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const panel = 'var(--rq-surface)';

  return (
    <PublicShell>
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        {isDark && <NebulaBackdrop />}
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center', py: { xs: 6, md: 9 } }}>
          <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--rq-accent)', mb: 1.5 }}>
            Cryptographic security posture
          </Typography>
          <Typography component="h1" sx={{ fontSize: { xs: '2rem', md: '3.1rem' }, fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--rq-text)', mb: 2, maxWidth: 720, mx: 'auto' }}>
            See the cryptography that protects the estate.
          </Typography>
          <Typography sx={{ color: 'var(--rq-muted)', maxWidth: 640, mx: 'auto', mb: 3, fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.65 }}>
            Community inventories CBOM and SBOM. A written license adds CSPM, QBOM, HBOM, AIBOM, and IBOM. This Pages build is a labelled demo with no live engine.
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mb: 3 }}>
            {['First look', 'Assessment', 'Inventory', 'PQC plan', 'Evidence'].map((step) => (
              <Chip key={step} size="small" label={step} variant="outlined" sx={{ color: 'var(--rq-text)', borderColor: 'var(--rq-line)' }} />
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<NorthEast />}
              onClick={() => scrollToId('scan')}
              sx={{ ...websiteCtaSx, px: 3, py: 1.2 }}
            >
              Start security assessment
            </Button>
            <Button
              variant="outlined"
              size="large"
              endIcon={<VerifiedUser />}
              onClick={async () => {
                await demoLogin('community');
                navigate('/scanner');
              }}
              sx={{ px: 3, py: 1.2, ...websiteOutlineCtaSx(isDark) }}
            >
              Enter the interactive demo
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box id="scan" sx={{ scrollMarginTop: 96 }}>
          <MotionSection>
            <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: panel, borderRadius: 2, p: { xs: 2, md: 2.5 } }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontFamily: tokens.typography.mono, fontSize: 12, color: 'text.secondary' }}>
                  {isDemo || !backendReachable
                    ? '$ rivicq · interactive demo · sample data · nothing is claimed as a live result'
                    : '$ rivicq scan · public target only · quantum scores come from this scan, not a silent live estate'}
                </Typography>
                <Chip
                  size="small"
                  label={backendReachable && !isDemo ? PUBLIC_ENGINE_CHIP_LIVE : PUBLIC_ENGINE_CHIP_DEMO}
                  color="success"
                  variant={backendReachable && !isDemo ? 'outlined' : 'filled'}
                />
              </Stack>
              {!backendReachable && !isDemo && <PublicEngineNotice variant="scan" compact />}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                <TextField
                  fullWidth
                  placeholder="github.com/org/repo or https://example.com"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><GitHub sx={{ color: 'text.secondary' }} /></InputAdornment>,
                  }}
                />
                <LoadingButton
                  type="button"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={() => { void handleScan(); }}
                  loading={scanStatus === 'scanning'}
                  loadingText="Scanning…"
                  disabled={backendReachable && !repoUrl.trim()}
                  sx={{ minWidth: 168 }}
                  aria-label={backendReachable ? 'Run scan' : 'Run demo scan'}
                >
                  {backendReachable ? 'Run scan' : 'Run demo scan'}
                </LoadingButton>
              </Stack>
              {!backendReachable && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', lineHeight: 1.5 }}>
                  {isDemo
                    ? 'Interactive demo — labelled sample findings in this browser. Not customer telemetry.'
                    : 'No engine on this static build. Run demo scan starts the interactive demo with labelled sample data. Live scans need the API (docs/RENDER.md).'}
                </Typography>
              )}
            </Box>
          </MotionSection>
        </Box>

        {scanStatus !== 'idle' && (
          <Box sx={{ mt: 3 }}>
            <HomeScanReport
              status={scanStatus}
              progress={progress}
              report={report}
              onOpenApp={() => navigate('/demo')}
              onRegister={() => navigate('/demo')}
            />
          </Box>
        )}

        <ScanWorkflowStrip />
        <ArchifyWorkflowEmbed />

        <Box id="funnel" sx={{ mt: 6, scrollMarginTop: 80 }}>
          <ConsoleStory focus="funnel" />
        </Box>

        <Box id="platform" sx={{ mt: 10, scrollMarginTop: 80 }}>
          <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
            Platform
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 650, letterSpacing: '-0.03em', mb: 3, maxWidth: 640 }}>
            Open source engine. Enterprise control plane. Same security model.
          </Typography>
          <Grid container spacing={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {PLATFORM.map((item, i) => (
              <Grid item xs={12} md={6} key={item.title} sx={{ borderRight: { md: i % 2 === 0 ? '1px solid' : 0 }, borderBottom: i < PLATFORM.length - 2 ? '1px solid' : { xs: i < PLATFORM.length - 1 ? '1px solid' : 0, md: i < PLATFORM.length - 2 ? '1px solid' : 0 }, borderColor: 'divider' }}>
                <Box sx={{ p: 2.5, bgcolor: panel, height: '100%' }}>
                  <Stack direction="row" spacing={1.25} alignItems="flex-start">
                    <Box sx={{ color: 'primary.main', mt: 0.25 }}>{item.icon}</Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.desc}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 8 }}>
          <Grid container spacing={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Grid item xs={12} md={6} sx={{ borderRight: { md: '1px solid' }, borderColor: 'divider' }}>
              <Box sx={{ p: 3, bgcolor: panel, height: '100%' }}>
                <Chip size="small" icon={<Lock />} label="Apache-2.0" sx={{ mb: 1.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 650, mb: 1 }}>Community</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  This GitHub project. CBOM, SBOM, dashboard, and the GitHub Action policy gate. QBOM/HBOM/AIBOM/IBOM are Enterprise.
                </Typography>
                {['CBOM scanning', 'Crypto inventory', 'Workspace dashboard', 'CLI · rivicq scan .'].map((f) => (
                  <Stack key={f} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <CheckCircle sx={{ fontSize: 16, color: tokens.colors.crypto.success }} />
                    <Typography variant="body2">{f}</Typography>
                  </Stack>
                ))}
                <Button variant="contained" sx={{ mt: 2, ...websiteCtaSx }} onClick={() => navigate('/demo')}>Start with Community</Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 3, bgcolor: panel, height: '100%' }}>
                <Chip size="small" icon={<WorkspacePremium />} label="Commercial" color="primary" sx={{ mb: 1.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 650, mb: 1 }}>Enterprise</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Licensed by RivicQ GmbH. Connectors, SSO, RBAC, audit viewer, and evidence packs.
                </Typography>
                {['SSO, RBAC, audit viewer', 'Multi-cloud connectors', 'Compliance mappings (not certs)', 'Contracted support'].map((f) => (
                  <Stack key={f} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <CheckCircle sx={{ fontSize: 16, color: tokens.colors.crypto.success }} />
                    <Typography variant="body2">{f}</Typography>
                  </Stack>
                ))}
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/request-demo')}>Written license</Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box id="docs" sx={{ mt: 8, scrollMarginTop: 80 }}>
          <Grid container spacing={2}>
            {DOCS.map((d) => (
              <Grid item xs={12} sm={6} md={4} key={d.title}>
                <Box
                  onClick={() => (d.to ? navigate(d.to) : openExternal(d.href || ''))}
                  sx={{
                    p: 2,
                    height: '100%',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: panel,
                    borderRadius: 1,
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box sx={{ color: 'primary.main', mb: 1 }}>{d.icon}</Box>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{d.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{d.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box id="plans" sx={{ mt: 8, textAlign: 'center', scrollMarginTop: 96 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            Control mappings (not certifications)
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {STANDARDS.map((s) => (
              <Chip key={s} icon={<VerifiedUser sx={{ fontSize: 14 }} />} label={s} variant="outlined" />
            ))}
          </Stack>
        </Box>

      </Container>
    </PublicShell>
  );
};

export default Home;
