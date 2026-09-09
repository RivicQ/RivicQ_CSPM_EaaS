import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Grid, Menu, MenuItem, Stack, Typography, TextField, InputAdornment,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, GitHub, GppGood, Psychology, FactCheck, Lock, WorkspacePremium, VerifiedUser,
  Api, MenuBook, EnhancedEncryption, AccountTree, MailOutline, KeyboardArrowDown, NorthEast,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { cbomService, gitHubScanService } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import TrademarkNotice from '../components/TrademarkNotice';
import HomeScanReport, { HomeScanReportData } from '../components/home/HomeScanReport';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';
import { MotionSection } from '../motion/primitives';
import NebulaBackdrop from '../components/brand/NebulaBackdrop';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const PLATFORM = [
  { icon: <Psychology />, title: 'AI engineering', desc: 'AIBOM for models, datasets, endpoints, and AI identities. EU AI Act names are mappings, not a product certification.' },
  { icon: <AccountTree />, title: 'DevSecOps', desc: 'Scan → inventory → policy gate in CI. The GitHub Action is Community; continuous monitoring is Enterprise.' },
  { icon: <GppGood />, title: 'Cloud security', desc: 'CSPM from declared and scanned assets. Live cloud attach needs customer credentials and an Enterprise license.' },
  { icon: <Api />, title: 'API security', desc: 'TLS/HTTPS hygiene from website and host scans. Gateway inventory is Enterprise when a connector exists.' },
  { icon: <FactCheck />, title: 'GRC & compliance risk', desc: 'DORA, NIS2, NIST, ISO, PCI, SOC 2 operator mappings. Mappings are not audits or certifications.' },
  { icon: <EnhancedEncryption />, title: 'Quantum risk', desc: 'Harvest-now exposure and ML-KEM / ML-DSA planning from scan intelligence. Pages is static — live scores need the API or CLI.' },
];

const DOCS = [
  { icon: <MenuBook />, title: 'Documentation', desc: 'Architecture, EaaS, CBOM, and PQC guides.', href: 'docs/index.html' },
  { icon: <MailOutline />, title: 'Contact', desc: 'Public desks on @rivicq.com.', href: 'docs/contact.html' },
  { icon: <Api />, title: 'API reference', desc: 'OpenAPI for the RivicQ platform API.', href: 'api/index.html' },
  { icon: <GitHub />, title: 'GitHub', desc: 'Source, issues, and the OSS scanner.', href: 'https://github.com/RivicQ/RivicQ_CSPM_EaaS' },
];

const STANDARDS = ['CIS Benchmarks', 'NIST 800-53', 'NIST PQC (FIPS 203/204)', 'SOC 2', 'ISO 27001', 'PCI DSS 4.0', 'DORA', 'NIS2', 'EU CRA', 'eIDAS 2.0'];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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

  const ink = '#000000';
  const panel = '#0a0a0f';
  const [navMenu, setNavMenu] = React.useState<{ id: string; el: HTMLElement } | null>(null);

  const NAV = [
    { id: 'home', label: 'Home', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    {
      id: 'products',
      label: 'Products',
      items: [
        { label: 'CBOM pilot', action: () => scrollToId('scan') },
        { label: 'Five-BOM workspace', action: () => navigate('/login') },
        { label: 'Scanner', action: () => navigate('/login') },
      ],
    },
    {
      id: 'solutions',
      label: 'Solutions',
      items: [
        { label: 'AI engineering', action: () => scrollToId('platform') },
        { label: 'DevSecOps', action: () => scrollToId('platform') },
        { label: 'Cloud security', action: () => scrollToId('platform') },
        { label: 'API security', action: () => scrollToId('platform') },
      ],
    },
    {
      id: 'compliance',
      label: 'Compliance Centre',
      items: [
        { label: 'GRC mappings', action: () => scrollToId('plans') },
        { label: 'Governance hub', action: () => navigate('/login') },
      ],
    },
    {
      id: 'trust',
      label: 'Trust & Security',
      items: [
        { label: 'Security policy', action: () => openExternal('docs/read.html?doc=SECURITY.md') },
        { label: 'Privacy', action: () => openExternal('docs/read.html?doc=PRIVACY.md') },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      items: [
        { label: 'Documentation', action: () => openExternal('docs/index.html') },
        { label: 'API reference', action: () => openExternal('api/index.html') },
        { label: 'GitHub', action: () => openExternal('https://github.com/RivicQ/RivicQ_CSPM_EaaS') },
      ],
    },
    {
      id: 'company',
      label: 'Company',
      items: [
        { label: 'Contact', action: () => navigate('/contact') },
        { label: 'hello@rivicq.com', action: () => { window.location.href = 'mailto:hello@rivicq.com'; } },
      ],
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: ink, color: 'text.primary', position: 'relative' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          bgcolor: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
            <BrandLogo dark />
            <Stack direction="row" spacing={0.25} flexWrap="wrap" useFlexGap sx={{ display: { xs: 'none', md: 'flex' } }}>
              {NAV.map((item) => (
                <Button
                  key={item.id}
                  size="small"
                  endIcon={'items' in item ? <KeyboardArrowDown sx={{ fontSize: 16 }} /> : undefined}
                  onClick={(e) => {
                    if ('items' in item && item.items) setNavMenu({ id: item.id, el: e.currentTarget });
                    else item.onClick?.();
                  }}
                  sx={{ color: '#fff', fontWeight: 500 }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
            <Button variant="contained" size="small" onClick={() => navigate('/register')} sx={{ borderRadius: 999 }}>
              Get Started
            </Button>
          </Stack>
        </Container>
        <Menu
          anchorEl={navMenu?.el}
          open={Boolean(navMenu)}
          onClose={() => setNavMenu(null)}
          slotProps={{ paper: { sx: { bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' } } }}
        >
          {(NAV.find((n) => n.id === navMenu?.id) as { items?: { label: string; action: () => void }[] } | undefined)?.items?.map((it) => (
            <MenuItem
              key={it.label}
              onClick={() => {
                it.action();
                setNavMenu(null);
              }}
            >
              {it.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Box sx={{ position: 'relative', minHeight: { xs: 560, md: 640 }, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <NebulaBackdrop />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center', py: { xs: 8, md: 12 } }}>
          <Typography sx={{ fontSize: { xs: '2.2rem', md: '3.35rem' }, fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 1.08, color: '#fff', mb: 2.5 }}>
            Cryptographic Security & Quantum Readiness
          </Typography>
          <Typography sx={{ color: '#d1d5db', maxWidth: 720, mx: 'auto', mb: 4, fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.65 }}>
            RivicQ discovers, inventories and assesses cryptographic assets across your infrastructure, helping organizations manage risk, meet compliance requirements and plan their transition to post-quantum cryptography.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              endIcon={<NorthEast />}
              onClick={() => scrollToId('scan')}
              sx={{ px: 3, py: 1.2 }}
            >
              Start Free CBOM Pilot
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/demo')}
              sx={{ px: 3, py: 1.2, color: '#fff', borderColor: 'rgba(255,255,255,0.55)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              Book a Demo
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box id="scan" sx={{ scrollMarginTop: 80 }}>
          <MotionSection>
            <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: panel, borderRadius: 2, p: { xs: 2, md: 2.5 } }}>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                $ rivicq scan · public target only · quantum scores come from this scan, not a silent live estate
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
              <BrandLogo compact dark />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>© 2026 RivicQ GmbH · hello@rivicq.com</Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
              <Button size="small" href="mailto:hello@rivicq.com">hello@</Button>
              <Button size="small" href="mailto:sales@rivicq.com">sales@</Button>
              <Button size="small" href="mailto:support@rivicq.com">support@</Button>
              <Button size="small" href="mailto:security@rivicq.com">security@</Button>
              <Button size="small" href="mailto:privacy@rivicq.com">privacy@</Button>
              <Button size="small" onClick={() => navigate('/contact')}>Contact</Button>
            </Stack>
            <TrademarkNotice />
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
