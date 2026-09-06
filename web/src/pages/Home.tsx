import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Grid, Stack, Typography, TextField, InputAdornment, useTheme,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, GitHub, GppGood, Memory, Psychology, FactCheck, Lock, WorkspacePremium, VerifiedUser,
  Api, MenuBook, EnhancedEncryption, AccountTree, MailOutline,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { cbomService, gitHubScanService } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import TrademarkNotice from '../components/TrademarkNotice';
import HomeScanReport, { HomeScanReportData } from '../components/home/HomeScanReport';
import ConsolePreview from '../components/home/ConsolePreview';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';
import { MotionSection } from '../motion/primitives';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const PLATFORM = [
  { icon: <AccountTree />, title: 'Five-BOM workspace', desc: 'QBOM, AIBOM, SBOM, IBOM, and CBOM in one control plane. Community runs CBOM, SBOM, and local QBOM.' },
  { icon: <EnhancedEncryption />, title: 'Encryption intelligence', desc: 'Repositories, cloud KMS, HSMs, and certificates in one cryptographic model — discover and govern from a single API.' },
  { icon: <Memory />, title: 'Crypto inventory', desc: 'Automatic discovery of algorithms and keys. Export CycloneDX / SPDX Cryptographic Bills of Materials.' },
  { icon: <Psychology />, title: 'PQC readiness', desc: 'Harvest-now-decrypt-later exposure and ML-KEM / ML-DSA planning. Qiskit scores are a local taxonomy — not IBM Quantum hardware.' },
  { icon: <GppGood />, title: 'API & DevSecOps', desc: 'TLS hygiene from website and host scans plus an eight-stage pipeline view. Continuous monitoring is Enterprise.' },
  { icon: <FactCheck />, title: 'Governance mappings', desc: 'DORA, NIS2, EU AI Act, CRA, NIST, FIPS, and BSI operator mappings. Mappings are not certifications.' },
];

const DOCS = [
  { icon: <MenuBook />, title: 'Documentation', desc: 'Architecture, EaaS, CBOM, and PQC guides.', href: 'docs/index.html' },
  { icon: <MailOutline />, title: 'Contact directory', desc: 'One domain: @rivicq.com.', href: 'docs/contact.html' },
  { icon: <Api />, title: 'API reference', desc: 'OpenAPI for the RivicQ platform API.', href: 'api/index.html' },
  { icon: <GitHub />, title: 'GitHub', desc: 'Source, issues, and the OSS scanner.', href: 'https://github.com/RivicQ/RivicQ_CSPM_EaaS' },
];

const STANDARDS = ['CIS Benchmarks', 'NIST 800-53', 'NIST PQC (FIPS 203/204)', 'SOC 2', 'ISO 27001', 'PCI DSS 4.0', 'DORA', 'NIS2', 'EU CRA', 'eIDAS 2.0'];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
    if (!repoUrl.trim()) return;
    setScanStatus('scanning');
    setProgress(0);
    setReport(null);
    const target = repoUrl.trim();
    const githubSpec = (() => {
      const m = target.match(/github\.com[:/]+([^/]+)\/([^/#\s]+)/i);
      if (m) return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
      if (/^[\w.-]+\/[\w.-]+$/.test(target)) return target;
      return '';
    })();
    try {
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
      const resp = await cbomService.triggerScan(target, isWebsiteTarget(target) ? 'website' : 'cbom');
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
    const url = href.startsWith('http') ? href : `${process.env.PUBLIC_URL || ''}/${href.replace(/^\//, '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const ink = isDark ? '#0c0b09' : '#f7f3eb';
  const panel = isDark ? '#17150f' : '#fffdf8';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: ink, color: 'text.primary' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: ink,
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
            <BrandLogo dark={isDark} />
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Button size="small" onClick={() => scrollToId('platform')}>Platform</Button>
              <Button size="small" onClick={() => scrollToId('scan')}>Scan</Button>
              <Button size="small" onClick={() => scrollToId('plans')}>Plans</Button>
              <Button size="small" onClick={() => openExternal('docs/index.html')}>Docs</Button>
              <Button variant="outlined" size="small" onClick={() => navigate('/login')}>Sign in</Button>
              <Button variant="contained" size="small" onClick={() => navigate('/register')}>Open workspace</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <MotionSection>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
                RivicQ Security Cloud · Berlin
              </Typography>
              <Typography sx={{ fontSize: { xs: '2.35rem', md: '3.4rem' }, fontWeight: 650, letterSpacing: '-0.045em', lineHeight: 1.02, mb: 2 }}>
                The cryptographic control plane for teams that ship software.
              </Typography>
              <Typography sx={{ color: 'text.secondary', maxWidth: 520, mb: 3, fontSize: '1.05rem' }}>
                Community is a limited scan engine on this GitHub project. Enterprise is the licensed SaaS —
                connectors, SSO, evidence packs. Open a workspace or run a public target now.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Button variant="contained" size="large" endIcon={<ArrowForward />} onClick={() => navigate('/register')}>
                  Open a workspace
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/demo')}>
                  Labeled demo
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <ConsolePreview />
            </Grid>
          </Grid>
        </MotionSection>

        <Box id="scan" sx={{ mt: 8, scrollMarginTop: 80 }}>
          <MotionSection>
            <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: panel, borderRadius: 1, p: { xs: 2, md: 2.5 } }}>
              <Typography sx={{ fontFamily: 'Source Code Pro, monospace', fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                $ rivicq scan · public target only
              </Typography>
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
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={handleScan}
                  loading={scanStatus === 'scanning'}
                  loadingText="Scanning…"
                  disabled={!repoUrl.trim()}
                  sx={{ minWidth: 168 }}
                >
                  Run scan
                </LoadingButton>
              </Stack>
            </Box>
          </MotionSection>
        </Box>

        {scanStatus !== 'idle' && (
          <Box sx={{ mt: 3 }}>
            <HomeScanReport
              status={scanStatus}
              progress={progress}
              report={report}
              onOpenApp={() => navigate('/register')}
              onRegister={() => navigate('/register')}
            />
          </Box>
        )}

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
                  This GitHub project. CBOM, SBOM, local QBOM, dashboard, and the GitHub Action policy gate.
                </Typography>
                {['CBOM scanning', 'Crypto inventory', 'Workspace dashboard', 'CLI · rivicq scan .'].map((f) => (
                  <Stack key={f} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <CheckCircle sx={{ fontSize: 16, color: tokens.colors.crypto.success }} />
                    <Typography variant="body2">{f}</Typography>
                  </Stack>
                ))}
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/register')}>Use Community</Button>
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
                <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/switcher')}>Request access</Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box id="docs" sx={{ mt: 8, scrollMarginTop: 80 }}>
          <Grid container spacing={2}>
            {DOCS.map((d) => (
              <Grid item xs={12} sm={6} md={3} key={d.title}>
                <Box
                  onClick={() => openExternal(d.href)}
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

        <Box id="plans" sx={{ mt: 8, textAlign: 'center', scrollMarginTop: 80 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            Control mappings (not certifications)
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {STANDARDS.map((s) => (
              <Chip key={s} icon={<VerifiedUser sx={{ fontSize: 14 }} />} label={s} variant="outlined" />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 8, py: 3, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1.25} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap justifyContent="center">
              <BrandLogo compact dark={isDark} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>© 2026 RivicQ GmbH · hello@rivicq.com</Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
              <Button size="small" href="mailto:hello@rivicq.com">hello@</Button>
              <Button size="small" href="mailto:sales@rivicq.com">sales@</Button>
              <Button size="small" href="mailto:support@rivicq.com">support@</Button>
              <Button size="small" href="mailto:security@rivicq.com">security@</Button>
              <Button size="small" href="mailto:privacy@rivicq.com">privacy@</Button>
              <Button size="small" onClick={() => navigate('/contact')}>Directory</Button>
            </Stack>
            <TrademarkNotice />
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
