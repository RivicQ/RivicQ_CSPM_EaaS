import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Menu, MenuItem, Stack, Typography, TextField, InputAdornment,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, GitHub, GppGood, Lock, WorkspacePremium, VerifiedUser,
  Api, MenuBook, EnhancedEncryption, AccountTree, MailOutline, KeyboardArrowDown, NorthEast,
  FactCheck, Psychology,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { cbomService, gitHubScanService } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import TrademarkNotice from '../components/TrademarkNotice';
import HomeScanReport, { HomeScanReportData } from '../components/home/HomeScanReport';
import PublicEngineNotice from '../components/brand/PublicEngineNotice';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';
import { MotionSection } from '../motion/primitives';
import NebulaBackdrop from '../components/brand/NebulaBackdrop';
import ArchifySurface from '../components/brand/ArchifySurface';
import ScanWorkflowStrip from '../components/home/ScanWorkflowStrip';
import ArchifySystemMaps from '../components/brand/ArchifySystemMaps';
import ThemeToggle from '../theme/ThemeToggle';
import { useThemeMode } from '../theme/ThemeContext';
import { PRISM } from '../theme/prism';
import {
  NEBULA,
  archifyAuraLayersSx,
  archifyEyebrowSx,
  archifyTitleSx,
  nebulaPageSx,
} from '../theme/nebulaSurfaces';
import { PUBLIC_ENGINE_CHIP_DEMO, PUBLIC_ENGINE_CHIP_LIVE } from '../data/publicInfrastructure';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

type HomeDoc = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
  to?: string;
};

type NavItem = {
  id: string;
  label: string;
  onClick?: () => void;
  items?: { label: string; action: () => void }[];
};

const OPERATOR_FLOW = [
  { icon: <VerifiedUser />, title: 'Session', desc: 'Public pages explain the product before sign-in. The console starts with a real session.' },
  { icon: <Lock />, title: 'Entitlement', desc: 'The server derives edition and tenant from /auth/me. Local switches never grant Enterprise.' },
  { icon: <Api />, title: 'API v1', desc: 'Scans are tenant-scoped jobs with a result URL, not browser-local claims.' },
  { icon: <AccountTree />, title: 'Scanners', desc: 'TLS, SSH, HTTP, SBOM, repo, host, and website targets fingerprint cryptography.' },
  { icon: <FactCheck />, title: 'Policy gate', desc: 'Findings become BLOCK, WARN, ALLOW, or INFORM. CI enforces fail-on BLOCK.' },
  { icon: <EnhancedEncryption />, title: 'CBOM evidence', desc: 'CycloneDX CBOM returns machine-readable evidence to the console and CLI.' },
  { icon: <Psychology />, title: 'PQC planning', desc: 'Migration classes and control mappings support planning; mappings are not certifications.' },
];

const DOCS: HomeDoc[] = [
  { icon: <MenuBook />, title: 'Documentation', desc: 'Architecture, EaaS, CBOM, and PQC guides.', href: 'docs/index.html' },
  { icon: <AccountTree />, title: 'System reference', desc: 'One product, engine, console, and evidence path.', href: 'archify/site/reference.html' },
  { icon: <Api />, title: 'API reference', desc: 'OpenAPI for the RivicQ platform API.', href: 'api/index.html' },
  { icon: <GppGood />, title: 'Security cloud', desc: 'Enterprise cloud scope and licence boundary.', href: 'marketing/index.html#cloud' },
  { icon: <AccountTree />, title: 'RivicQ Graph', desc: 'Labeled security-graph demo. Synthetic data only.', href: 'fabric/' },
  { icon: <Psychology />, title: 'Platform animation', desc: 'Animated discovery and posture flow.', href: 'animation.html' },
  { icon: <MailOutline />, title: 'Contact', desc: 'Public desks on @rivicq.com.', to: '/contact' },
  { icon: <GitHub />, title: 'Open Source', desc: 'Source, issues, and the OSS scanner.', href: 'https://github.com/RivicQ/RivicQ_CSPM_EaaS' },
];

const STANDARDS = ['CIS Benchmarks', 'NIST 800-53', 'NIST PQC (FIPS 203/204)', 'SOC 2', 'ISO 27001', 'PCI DSS 4.0', 'DORA', 'NIS2', 'EU CRA', 'eIDAS 2.0'];

const COMMUNITY_FEATURES = [
  'Apache-2.0 CLI and GitHub Action',
  'Repo, host, website, SBOM, firmware, and inventory scans',
  'Community dashboard, findings, and CycloneDX CBOM evidence',
  'Policy gate with fail-on BLOCK in CI',
];

const ENTERPRISE_FEATURES = [
  'Licence, tenant, SSO, RBAC, and audit viewer',
  'Configured cloud connectors and continuous monitoring',
  'QBOM, HSM/PKCS#11, AIBOM, IBOM, and governance evidence',
  'Control mappings are not audits or certifications',
];

const homeGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
  gap: PRISM.spacing(2),
  width: '100%',
  maxWidth: PRISM.grid.maxWidth,
  mx: 'auto',
  px: { xs: 2, md: 3 },
} as const;

const panelSx = {
  bgcolor: NEBULA.panel,
  border: PRISM.border.hairline,
  borderColor: NEBULA.line,
  borderRadius: PRISM.radii.md,
} as const;

const sectionTitleSx = {
  ...archifyEyebrowSx,
  mb: 1,
} as const;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, backendReachable, demoLogin, isDemo } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [scanStatus, setScanStatus] = React.useState<ScanStatus>('idle');
  const [repoUrl, setRepoUrl] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [report, setReport] = React.useState<HomeScanReportData | null>(null);
  const [navMenu, setNavMenu] = React.useState<{ id: string; el: HTMLElement } | null>(null);

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
    const target = repoUrl.trim() || (!backendReachable ? 'https://demo.example.com' : '');
    if (!target) return;
    if (!repoUrl.trim() && !backendReachable) setRepoUrl(target);

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
    const url = href.startsWith('http') ? href : `${process.env.PUBLIC_URL || ''}/${href.replace(/^\//, '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const NAV: NavItem[] = [
    { id: 'home', label: 'Overview', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    {
      id: 'workflow',
      label: 'Workflow',
      items: [
        { label: 'One product path', action: () => scrollToId('workflow') },
        { label: 'Operator flow', action: () => scrollToId('platform') },
        { label: 'System maps', action: () => navigate('/maps') },
        { label: 'System reference', action: () => openExternal('archify/site/reference.html') },
      ],
    },
    {
      id: 'editions',
      label: 'Editions',
      items: [
        { label: 'Community', action: () => navigate('/register') },
        { label: 'Enterprise', action: () => navigate('/request-demo') },
        { label: 'Pricing', action: () => navigate('/pricing') },
        { label: 'Security cloud', action: () => openExternal('marketing/index.html#cloud') },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      items: [
        { label: 'Documentation', action: () => openExternal('docs/index.html') },
        { label: 'API reference', action: () => openExternal('api/index.html') },
        { label: 'Architecture reference', action: () => openExternal('archify/site/reference.html') },
        { label: 'Platform animation', action: () => openExternal('animation.html') },
        { label: 'RivicQ Graph', action: () => openExternal('fabric/') },
        { label: 'Security policy', action: () => openExternal('docs/read.html?doc=SECURITY.md') },
        { label: 'Privacy', action: () => openExternal('docs/read.html?doc=PRIVACY.md') },
      ],
    },
    {
      id: 'company',
      label: 'Company',
      items: [
        { label: 'Contact', action: () => navigate('/contact') },
        { label: 'Request demo', action: () => navigate('/request-demo') },
        { label: 'IBM Partner Plus', action: () => navigate('/ibm') },
        { label: 'hello@rivicq.com', action: () => { window.location.href = 'mailto:hello@rivicq.com'; } },
      ],
    },
  ];

  return (
    <Box sx={{ ...nebulaPageSx, position: 'relative', overflowX: 'hidden' }}>
      <Box sx={{ height: 3, bgcolor: 'primary.main', position: 'sticky', top: 0, zIndex: 21 }} />
      <Box
        sx={{
          position: 'sticky',
          top: 3,
          zIndex: 20,
          bgcolor: NEBULA.ink,
          borderBottom: PRISM.border.hairline,
          borderColor: NEBULA.line,
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.25 }}>
          <Box sx={{ mb: 0.85 }}>
            <ArchifySurface placement="rail" variant="public" />
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
            <BrandLogo dark={mode === 'dark'} />
            <Stack direction="row" spacing={0.25} flexWrap="wrap" useFlexGap sx={{ display: { xs: 'none', md: 'flex' } }}>
              {NAV.map((item) => (
                <Button
                  key={item.id}
                  size="small"
                  endIcon={item.items ? <KeyboardArrowDown sx={{ fontSize: 16 }} /> : undefined}
                  onClick={(e) => {
                    if (item.items) setNavMenu({ id: item.id, el: e.currentTarget });
                    else item.onClick?.();
                  }}
                  sx={{ color: 'text.primary', fontWeight: 500 }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <ThemeToggle mode={mode} onToggle={toggleMode} compact />
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/request-demo')}
                sx={{ borderRadius: 999, bgcolor: 'primary.main', color: 'primary.contrastText' }}
              >
                Request demo
              </Button>
            </Stack>
          </Stack>
        </Container>
        <Menu
          anchorEl={navMenu?.el}
          open={Boolean(navMenu)}
          onClose={() => setNavMenu(null)}
          slotProps={{ paper: { sx: { bgcolor: NEBULA.panel, color: NEBULA.text, border: PRISM.border.hairline, borderColor: NEBULA.line } } }}
        >
          {(NAV.find((n) => n.id === navMenu?.id)?.items || []).map((it) => (
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

      <Box
        id="overview"
        sx={{
          position: 'relative',
          minHeight: { xs: 560, md: 640 },
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          borderBottom: PRISM.border.hairline,
          borderColor: NEBULA.line,
        }}
      >
        {mode === 'dark' ? (
          <NebulaBackdrop />
        ) : (
          <Box
            aria-hidden
            sx={{
              ...archifyAuraLayersSx.radial,
              background: `radial-gradient(ellipse 55% 50% at 50% 20%, ${PRISM.brand.violet100}, transparent 70%)`,
            }}
          />
        )}
        <Box
          aria-hidden
          sx={{
            ...archifyAuraLayersSx.radial,
            opacity: mode === 'dark' ? 1 : 0.24,
            background: `
              radial-gradient(ellipse 50% 45% at 50% 0%, rgba(56,189,248,0.06), transparent 70%),
              radial-gradient(ellipse 55% 48% at 50% 18%, ${PRISM.brand.violet500}44, transparent 68%)
            `,
          }}
        />
        <Box sx={{ ...homeGridSx, position: 'relative', zIndex: 1, py: { xs: 8, md: 12 }, textAlign: 'center' }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: '2 / span 10' } }}>
            <Typography
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.1,
                py: 0.4,
                pl: 0.45,
                mb: 2.5,
                border: PRISM.border.hairline,
                borderColor: NEBULA.lineHi,
                borderRadius: 999,
                bgcolor: NEBULA.raised,
                color: NEBULA.muted,
                fontSize: '0.8125rem',
              }}
            >
              <Box
                component="span"
                sx={{
                  px: 0.9,
                  py: 0.35,
                  borderRadius: 999,
                  bgcolor: NEBULA.accent,
                  color: PRISM.dark.text,
                  fontFamily: PRISM.typography.mono,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                }}
              >
                CSPM
              </Box>
              One product · two editions · evidence you can verify
            </Typography>
            <Typography
              component="h1"
              sx={{
                ...archifyTitleSx,
                fontSize: { xs: '2.4rem', md: '3.6rem' },
                mb: 2.5,
                textWrap: 'balance',
              }}
            >
              Know what cryptography protects your business{' '}
              <Box
                component="em"
                sx={{
                  fontFamily: PRISM.typography.display,
                  fontStyle: 'normal',
                  fontWeight: 500,
                  background: `linear-gradient(100deg, ${PRISM.brand.violet400} 0%, ${PRISM.brand.violet500} 45%, ${PRISM.brand.violet600} 100%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                before attackers do.
              </Box>
            </Typography>
            <Typography sx={{ color: NEBULA.muted, maxWidth: 780, mx: 'auto', mb: 4, fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.65 }}>
              RivicQ is one CSPM product: public pages explain the engine, the authenticated console scopes work to a tenant,
              scanners fingerprint cryptography, policy decides, and CycloneDX CBOM evidence returns. Community is Apache-2.0;
              Enterprise is licence- and configuration-gated.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                size="large"
                endIcon={<NorthEast />}
                onClick={() => scrollToId('scanning')}
                sx={{ px: 3, py: 1.2, borderRadius: `${PRISM.radii.md}px`, textTransform: 'none', fontWeight: 600 }}
              >
                Run a scan
              </Button>
              <Button
                variant="outlined"
                size="large"
                endIcon={<VerifiedUser />}
                onClick={async () => {
                  await demoLogin('community');
                  navigate('/scanner');
                }}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: `${PRISM.radii.md}px`,
                  color: NEBULA.text,
                  borderColor: NEBULA.lineHi,
                  bgcolor: NEBULA.panel,
                  textTransform: 'none',
                  '&:hover': { borderColor: NEBULA.accentSoft, bgcolor: NEBULA.raised },
                }}
              >
                Try the live demo
              </Button>
              <Button
                variant="text"
                size="large"
                onClick={() => navigate('/request-demo')}
                sx={{ px: 3, py: 1.2, color: NEBULA.muted, textTransform: 'none', '&:hover': { color: NEBULA.text } }}
              >
                Request enterprise demo
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box sx={{ ...homeGridSx, py: { xs: 5, md: 8 } }}>
        <Box id="scan" sx={{ gridColumn: '1 / -1', scrollMarginTop: 96 }}>
          <Box id="scanning" sx={{ ...panelSx, p: { xs: 2, md: 2.5 }, scrollMarginTop: 96 }}>
            <MotionSection>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontFamily: tokens.typography.mono, fontSize: 12, color: NEBULA.muted }}>
                  {isDemo || !backendReachable
                    ? '$ rivicq · interactive demo · sample data · nothing is claimed as a live result'
                    : '$ rivicq scan · public target only · quantum scores come from this scan, not a silent live estate'}
                </Typography>
                <Chip
                  size="small"
                  label={backendReachable && !isDemo ? PUBLIC_ENGINE_CHIP_LIVE : PUBLIC_ENGINE_CHIP_DEMO}
                  color={backendReachable && !isDemo ? 'success' : 'info'}
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
                    startAdornment: <InputAdornment position="start"><GitHub sx={{ color: NEBULA.muted }} /></InputAdornment>,
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
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: NEBULA.muted, lineHeight: 1.5 }}>
                  {isDemo
                    ? 'Interactive demo — labelled sample findings in this browser. Not customer telemetry.'
                    : 'No engine on this static build. Run demo scan starts the interactive demo with labelled sample data. Live scans need the API (docs/RENDER.md).'}
                </Typography>
              )}
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
        </Box>

        <Box id="workflow" sx={{ gridColumn: '1 / -1', mt: 8, scrollMarginTop: 96 }}>
          <Typography sx={sectionTitleSx}>Workflow</Typography>
          <Typography component="h2" sx={{ ...archifyTitleSx, fontSize: { xs: '1.6rem', md: '2rem' }, mb: 3 }}>
            One path from finding to evidence.
          </Typography>
          <ScanWorkflowStrip />
          <Box sx={{ mt: 4 }}>
            <ArchifySystemMaps />
          </Box>
        </Box>

        <Box id="platform" sx={{ gridColumn: '1 / -1', mt: 10, scrollMarginTop: 96 }}>
          <Typography sx={sectionTitleSx}>Operator path</Typography>
          <Typography component="h2" sx={{ ...archifyTitleSx, fontSize: { xs: '1.6rem', md: '2rem' }, mb: 3, maxWidth: 720 }}>
            Public pages explain it. The console scopes it. The engine proves it.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' }, gap: PRISM.spacing(2) }}>
            {OPERATOR_FLOW.map((item) => (
              <Box
                key={item.title}
                sx={{
                  gridColumn: { xs: '1 / -1', md: 'span 4' },
                  ...panelSx,
                  p: 2.5,
                  minHeight: 168,
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{ color: NEBULA.accentSoft, mt: 0.25 }}>{item.icon}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: NEBULA.muted }}>{item.desc}</Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>

        <Box id="editions" sx={{ gridColumn: '1 / -1', mt: 10, scrollMarginTop: 96 }}>
          <Typography sx={sectionTitleSx}>Editions</Typography>
          <Typography component="h2" sx={{ ...archifyTitleSx, fontSize: { xs: '1.6rem', md: '2rem' }, mb: 3 }}>
            Shared engine. Different control plane.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' }, gap: PRISM.spacing(2) }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' }, ...panelSx, p: 3, height: '100%' }}>
              <Chip size="small" icon={<Lock />} label="Apache-2.0" sx={{ mb: 1.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 650, mb: 1 }}>Community</Typography>
              <Typography variant="body2" sx={{ color: NEBULA.muted, mb: 2 }}>
                The public engine and CLI. No cloud credentials are required to clone or scan a repository.
              </Typography>
              {COMMUNITY_FEATURES.map((f) => (
                <Stack key={f} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <CheckCircle sx={{ fontSize: 16, color: PRISM.severity.success }} />
                  <Typography variant="body2">{f}</Typography>
                </Stack>
              ))}
              <Button variant="outlined" sx={{ mt: 2, borderColor: NEBULA.lineHi, color: NEBULA.text }} onClick={() => navigate('/register')}>
                Use Community
              </Button>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' }, ...panelSx, p: 3, height: '100%' }}>
              <Chip size="small" icon={<WorkspacePremium />} label="Configured only" color="primary" sx={{ mb: 1.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 650, mb: 1 }}>Enterprise</Typography>
              <Typography variant="body2" sx={{ color: NEBULA.muted, mb: 2 }}>
                Licensed by RivicQ GmbH. Enterprise claims apply only with a valid licence, configured database, and connected identity provider.
              </Typography>
              {ENTERPRISE_FEATURES.map((f) => (
                <Stack key={f} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <CheckCircle sx={{ fontSize: 16, color: PRISM.severity.success }} />
                  <Typography variant="body2">{f}</Typography>
                </Stack>
              ))}
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/request-demo')}>
                Request access
              </Button>
            </Box>
          </Box>
        </Box>

        <Box id="resources" sx={{ gridColumn: '1 / -1', mt: 10, scrollMarginTop: 96 }}>
          <Typography sx={sectionTitleSx}>Resources</Typography>
          <Typography component="h2" sx={{ ...archifyTitleSx, fontSize: { xs: '1.6rem', md: '2rem' }, mb: 3 }}>
            Read the system, not a sales graphic.
          </Typography>
          <Box id="docs" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: PRISM.spacing(2), scrollMarginTop: 80 }}>
            {DOCS.map((d) => (
              <Box
                key={d.title}
                onClick={() => (d.to ? navigate(d.to) : openExternal(d.href || ''))}
                sx={{
                  ...panelSx,
                  p: 2,
                  height: '100%',
                  cursor: 'pointer',
                  transition: `border-color ${PRISM.motion.base}`,
                  '&:hover': { borderColor: NEBULA.accentSoft },
                }}
              >
                <Box sx={{ color: NEBULA.accentSoft, mb: 1 }}>{d.icon}</Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{d.title}</Typography>
                <Typography variant="body2" sx={{ color: NEBULA.muted }}>{d.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box id="plans" sx={{ gridColumn: '1 / -1', mt: 8, textAlign: 'center', scrollMarginTop: 96 }}>
          <Typography variant="caption" sx={{ color: NEBULA.faint, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            Control mappings (not certifications)
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {STANDARDS.map((s) => (
              <Chip key={s} icon={<VerifiedUser sx={{ fontSize: 14 }} />} label={s} variant="outlined" />
            ))}
          </Stack>
        </Box>

        <Box sx={{ gridColumn: '1 / -1', mt: 8, py: 3, borderTop: PRISM.border.hairline, borderColor: NEBULA.line }}>
          <Stack spacing={1.25} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap justifyContent="center">
              <BrandLogo compact dark={mode === 'dark'} />
              <Typography variant="body2" sx={{ color: NEBULA.muted }}>© 2026 RivicQ GmbH · hello@rivicq.com</Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
              <Button size="small" href="mailto:hello@rivicq.com">hello@</Button>
              <Button size="small" onClick={() => navigate('/contact')}>Contact</Button>
              <Button size="small" onClick={() => navigate('/dashboard')}>Console</Button>
              <Button size="small" onClick={() => openExternal('docs/index.html')}>Docs</Button>
              <Button size="small" onClick={() => openExternal('archify/site/reference.html')}>Reference</Button>
              <Button size="small" onClick={() => openExternal('api/index.html')}>API</Button>
              <Button size="small" href="https://github.com/RivicQ/RivicQ_CSPM_EaaS" target="_blank" rel="noopener noreferrer">Open Source</Button>
              <Button size="small" onClick={() => navigate('/pricing')}>Pricing</Button>
              <Button size="small" onClick={() => navigate('/request-demo')}>Request demo</Button>
            </Stack>
            <TrademarkNotice />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
