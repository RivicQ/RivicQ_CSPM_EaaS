import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, TextField, InputAdornment, Avatar, useTheme,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, CloudQueue, GitHub, Shield, GppGood, Memory, Psychology, FactCheck, Lock, WorkspacePremium, VerifiedUser,
  Api, MenuBook, EnhancedEncryption, Key, AccountTree, MailOutline,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { cbomService, gitHubScanService } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import TrademarkNotice from '../components/TrademarkNotice';
import ClientWorkflow from '../components/home/ClientWorkflow';
import HomeScanReport, { HomeScanReportData } from '../components/home/HomeScanReport';
import FiveBomStrip from '../components/bom/FiveBomStrip';
import OperatorRail from '../components/home/OperatorRail';
import FabricPreview from '../components/home/FabricPreview';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';
import { MotionSection } from '../motion/primitives';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const FEATURES = [
  {
    icon: <AccountTree />, title: 'Five-BOM intelligence', color: tokens.colors.rivicq[600],
    desc: 'QBOM, AIBOM, SBOM, IBOM, and CBOM in one workspace. Community runs CBOM, SBOM, and local QBOM. AIBOM and IBOM unlock with Enterprise.',
  },
  {
    icon: <EnhancedEncryption />, title: 'Encryption as a Service', color: tokens.colors.rivicq[600],
    desc: 'A managed encryption intelligence layer that wires repositories, cloud KMS, HSMs, and certificates into one living cryptographic model — discover, protect, and govern keys from a single API.',
  },
  {
    icon: <Memory />, title: 'Crypto & CBOM Inventory', color: tokens.colors.crypto.quantum,
    desc: 'Automatic discovery of cryptographic assets, algorithms, and keys across code, cloud, and infrastructure. Generate CycloneDX/SPDX Cryptographic Bills of Materials.',
  },
  {
    icon: <Psychology />, title: 'Quantum & PQC Readiness', color: tokens.colors.gold[600],
    desc: 'Quantify harvest-now-decrypt-later exposure and plan migrations to ML-KEM and ML-DSA post-quantum cryptography. Qiskit scores are a local taxonomy — not IBM Quantum hardware.',
  },
  {
    icon: <Memory />, title: 'HSM & Quantum connectors', color: tokens.colors.crypto.info,
    desc: 'PKCS#11 / cloud HSM and optional quantum runtime stay disconnected until you supply credentials. QSIC is a declared research ASIC, not a shipped FIPS module.',
  },
  {
    icon: <GppGood />, title: 'API security & DevSecOps', color: tokens.colors.crypto.high,
    desc: 'TLS/HTTPS API hygiene from website and host scans, plus an eight-stage pipeline view. Continuous production monitoring is Enterprise. The GitHub Action policy gate is unchanged.',
  },
  {
    icon: <FactCheck />, title: 'Governance mapping', color: tokens.colors.crypto.low,
    desc: 'DORA, NIS2, EU AI Act, CRA, NIST Zero Trust, FIPS, and BSI operator mappings. Community is JSON. Enterprise enables the evidence pack. Mappings are not certifications.',
  },
];

const EAAS_CAPABILITIES = [
  { icon: <EnhancedEncryption />, title: 'Encrypt / Decrypt API', desc: 'Envelope encryption, tokenization, and signing through a single REST/gRPC endpoint backed by your HSM or KMS.' },
  { icon: <Key />, title: 'Key lifecycle', desc: 'Generate, rotate, wrap, and revoke keys with policy — including PQC-hybrid ML-KEM key exchange.' },
  { icon: <Shield />, title: 'PQC-hybrid channels', desc: 'Quantum-safe TLS and messaging using classical + ML-KEM/ML-DSA hybrids, with fallbacks.' },
  { icon: <VerifiedUser />, title: 'Attestation & evidence', desc: 'Signed CBOM and quantum-readiness attestations you can hand to auditors and regulators.' },
];

const DOCS = [
  { icon: <MenuBook />, title: 'Documentation', desc: 'Architecture, EaaS concepts, CBOM & PQC guides.', href: 'docs/index.html' },
  { icon: <MailOutline />, title: 'Contact directory', desc: 'One domain: @rivicq.com. Priority inboxes and aliases.', href: 'docs/contact.html' },
  { icon: <Api />, title: 'API Reference', desc: 'OpenAPI/ReDoc reference for the RivicQ platform API.', href: 'api/index.html' },
  { icon: <GitHub />, title: 'GitHub', desc: 'Source, issues, and the OSS CryptoBOM scanner.', href: 'https://github.com/RivicQ/RivicQ_CSPM_EaaS' },
];

const STEPS = [
  { step: '01', title: 'Discover', desc: 'Scan websites, hosts, IPs, servers, declared Kubernetes pods, and HSM/QSIC catalog entries. Community is the limited engine; no live cluster attach.', color: tokens.colors.rivicq[600] },
  { step: '02', title: 'Mitigate', desc: 'Map Shor/Grover-class crypto to ML-KEM, ML-DSA, and SLH-DSA. Hybrid PQC is recommended; keys are not rotated by this platform.', color: tokens.colors.gold[600] },
  { step: '03', title: 'Report', desc: 'Export CycloneDX CBOM, Qiskit/audit scores, and DORA/NIS2/BSI mappings. Community is JSON. Enterprise adds the evidence pack and connectors.', color: tokens.colors.crypto.low },
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
  const [workflowStep, setWorkflowStep] = React.useState(0);

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
              setWorkflowStep(1);
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
              setWorkflowStep(1);
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

  const cardBg = isDark ? '#18181b' : '#ffffff';
  const cardBorder = isDark ? '#27272a' : '#e4e4e7';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }} flexWrap="wrap" useFlexGap>
          <BrandLogo dark={isDark} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={() => scrollToId('workflows')}>Workflow</Button>
            <Button size="small" onClick={() => scrollToId('features')}>Capabilities</Button>
            <Button size="small" onClick={() => scrollToId('pricing')}>Plans</Button>
            <Button size="small" onClick={() => openExternal('docs/index.html')}>Docs</Button>
            <Button variant="outlined" size="small" onClick={() => navigate('/login')}>Sign in</Button>
            <Button variant="contained" size="small" onClick={() => navigate('/register')}>Open workspace</Button>
          </Stack>
        </Stack>

        <MotionSection>
          <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
            Operator loop
          </Typography>
          <Typography sx={{ fontSize: { xs: '2rem', md: '3.25rem' }, fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1.05, mb: 1.5, maxWidth: 760 }}>
            Run the estate like a workflow, not a brochure.
          </Typography>
          <Typography sx={{ color: 'text.secondary', maxWidth: 640, mb: 3 }}>
            Discover assets, assess cryptographic and cloud risk, remediate with approval, then report evidence.
            Community stays a limited scan engine. Enterprise unlocks connectors.
          </Typography>
          <OperatorRail
            active={workflowStep}
            onChange={(i) => {
              setWorkflowStep(i);
              if (i === 0) scrollToId('discover-console');
              if (i === 1) scrollToId('assess-console');
              if (i === 2) navigate('/demo');
              if (i === 3) scrollToId('docs');
            }}
          />
        </MotionSection>

        <Box id="discover-console" sx={{ mt: 5, mb: 3, scrollMarginTop: 80 }}>
          <MotionSection>
            <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: cardBg, borderRadius: 1.5, p: { xs: 2, md: 2.5 } }}>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                discover · public target only
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
                  loadingText="Discovering…"
                  disabled={!repoUrl.trim()}
                  sx={{ minWidth: 180 }}
                >
                  Start discovery
                </LoadingButton>
                <Button variant="outlined" onClick={() => navigate('/demo')}>Labeled demo</Button>
              </Stack>
            </Box>
          </MotionSection>
        </Box>

        <Grid container spacing={2} sx={{ mb: 6 }}>
          <Grid item xs={12} md={7}>
            <FabricPreview />
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack spacing={1.25} sx={{ height: '100%' }}>
              {['Scan a public repo or host', 'Read the security graph', 'Open a gated remediation', 'Export CBOM / mappings'].map((line, i) => (
                <Box
                  key={line}
                  component={motion.div}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  sx={{
                    border: '1px solid',
                    borderColor: workflowStep === i ? 'primary.main' : 'divider',
                    bgcolor: cardBg,
                    borderRadius: 1,
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{line}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Box id="assess-console" sx={{ scrollMarginTop: 80 }}>
          {scanStatus !== 'idle' && (
            <HomeScanReport
              status={scanStatus}
              progress={progress}
              report={report}
              onOpenApp={() => { setWorkflowStep(2); navigate('/register'); }}
              onRegister={() => { setWorkflowStep(2); navigate('/register'); }}
            />
          )}
        </Box>

        <Box sx={{ mb: 10, textAlign: 'center' }}>
          <Grid container spacing={3}>
            {[
              { value: '5 BOM', label: 'QBOM · AIBOM · SBOM · IBOM · CBOM' },
              { value: 'CLI', label: 'rivicq scan .' },
              { value: 'OSS + Ent', label: 'Same security engine' },
              { value: 'Mappings', label: 'Not certifications' },
            ].map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Typography variant="h3" fontWeight={600} sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.label}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box id="eaas" sx={{ mb: 10, position: 'relative', scrollMarginTop: 80 }}>
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 1.5,
              p: { xs: 3, md: 5 },
              border: 1,
              borderColor: 'divider',
              background: cardBg,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Chip icon={<EnhancedEncryption />} label="Encryption as a Service" color="primary" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
              <Typography variant="h4" fontWeight={600} sx={{ mb: 1.5, letterSpacing: '-0.02em', maxWidth: 720 }}>
                One API for encryption, keys, and post-quantum readiness
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 720 }}>
                RivicQ EaaS abstracts your HSMs and cloud KMS behind a single, policy-driven service. Encrypt data,
                manage the full key lifecycle, and roll out PQC-hybrid cryptography without rewriting applications.
              </Typography>
              <Grid container spacing={2.5}>
                {EAAS_CAPABILITIES.map((c) => (
                  <Grid item xs={12} sm={6} md={3} key={c.title}>
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.25 }}>
                      <Card sx={{ height: '100%', bgcolor: cardBg, border: 1, borderColor: cardBorder }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Avatar sx={{ bgcolor: `${tokens.colors.rivicq[500]}1a`, color: tokens.colors.rivicq[500], mb: 1.5, width: 42, height: 42 }}>{c.icon}</Avatar>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>{c.title}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{c.desc}</Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
              <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
                <Button variant="contained" endIcon={<ArrowForward />} onClick={() => navigate('/register')}>Start with EaaS</Button>
                <Button variant="outlined" startIcon={<MenuBook />} onClick={() => openExternal('docs/index.html')}>Read the docs</Button>
                <Button variant="text" startIcon={<Api />} onClick={() => openExternal('api/index.html')}>API reference</Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        <ClientWorkflow />

        <Box id="five-bom" sx={{ mb: 10, scrollMarginTop: 80 }}>
          <FiveBomStrip />
        </Box>

        <Box id="features" sx={{ mb: 10, scrollMarginTop: 80 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 1, textAlign: 'center', letterSpacing: '-0.02em' }}>One platform for complete cryptographic security</Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center' }}>From Encryption-as-a-Service and HSM key hygiene to post-quantum cryptography — everything your security team needs.</Typography>
          <Grid container spacing={3}>
            {FEATURES.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <motion.div>
                  <Card sx={{ height: '100%', bgcolor: cardBg, border: 1, borderColor: cardBorder }}>
                    <CardContent sx={{ p: 3 }}>
                      <Avatar sx={{ bgcolor: `${f.color}1a`, color: f.color, mb: 2, width: 48, height: 48 }}>{f.icon}</Avatar>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{f.title}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{f.desc}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 10 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 4, textAlign: 'center', letterSpacing: '-0.02em' }}>How it works</Typography>
          <Grid container spacing={3}>
            {STEPS.map((s) => (
              <Grid item xs={12} md={4} key={s.step}>
                <Card sx={{ height: '100%', bgcolor: cardBg, border: 1, borderColor: `${s.color}33` }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h2" fontWeight={600} sx={{ color: 'text.disabled', mb: 1, letterSpacing: '-0.03em' }}>{s.step}</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{s.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box id="docs" sx={{ mb: 10, scrollMarginTop: 80 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 1, textAlign: 'center', letterSpacing: '-0.02em' }}>Documentation &amp; developers</Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center' }}>Everything you need to build on the RivicQ encryption intelligence layer.</Typography>
          <Grid container spacing={3}>
                {DOCS.map((d) => (
              <Grid item xs={12} sm={6} md={3} key={d.title}>
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.25 }}>
                  <Card
                    onClick={() => openExternal(d.href)}
                    sx={{ height: '100%', cursor: 'pointer', bgcolor: cardBg, border: 1, borderColor: cardBorder, transition: 'border-color .2s', '&:hover': { borderColor: 'primary.main' } }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Avatar sx={{ bgcolor: `${tokens.colors.rivicq[500]}1a`, color: tokens.colors.rivicq[500], mb: 2, width: 44, height: 44 }}>{d.icon}</Avatar>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                        <Typography variant="h6" fontWeight={700}>{d.title}</Typography>
                        <ArrowForward sx={{ fontSize: 15, color: 'text.disabled' }} />
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{d.desc}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 10, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Control mappings (not certifications)</Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {STANDARDS.map((s) => (
              <Chip key={s} icon={<VerifiedUser sx={{ fontSize: 14 }} />} label={s} variant="outlined" sx={{ color: 'text.secondary' }} />
            ))}
          </Stack>
        </Box>

        <Box id="pricing" sx={{ mb: 10, scrollMarginTop: 80 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 4, textAlign: 'center', letterSpacing: '-0.02em' }}>Pricing</Typography>
          <Grid container spacing={3} maxWidth={900} sx={{ mx: 'auto' }}>
            {[
              {
                name: 'Community', icon: <Lock />, price: 'Apache-2.0', tagline: 'Open source · this GitHub project', color: tokens.colors.rivicq[600],
                features: ['CBOM scanning', 'Crypto inventory', 'Dashboard & analytics', 'GitHub Action policy gate'],
                cta: 'Use Community', action: () => navigate('/register'),
              },
              {
                name: 'Enterprise', icon: <WorkspacePremium />, price: 'Commercial', tagline: 'Licensed by RivicQ GmbH', color: tokens.colors.gold[600], featured: true,
                features: ['SSO, RBAC, audit viewer', 'Multi-cloud connectors', 'Compliance mappings (not certs)', 'Contracted support'],
                cta: 'Request access', action: () => navigate('/switcher'),
              },
            ].map((tier) => (
              <Grid item xs={12} md={6} key={tier.name}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: cardBg,
                    border: 1,
                    borderColor: tier.featured ? 'primary.main' : cardBorder,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudQueue sx={{ color: tier.color }} />
                        <Typography variant="h6" fontWeight={600}>{tier.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h3" fontWeight={600} sx={{ letterSpacing: '-0.02em' }}>{tier.price}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{tier.tagline}</Typography>
                      </Box>
                      {tier.features.map((f) => (
                        <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle sx={{ fontSize: 16, color: tokens.colors.crypto.low }} />
                          <Typography variant="body2">{f}</Typography>
                        </Box>
                      ))}
                      <Button variant={tier.featured ? 'contained' : 'outlined'} size="large" onClick={tier.action} sx={{ mt: 1 }}>
                        {tier.cta}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ textAlign: 'center', py: 4, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1.25} alignItems="center">
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
              <BrandLogo compact />
              <Typography variant="body2" sx={{ color: 'text.muted' }}>© 2026 RivicQ GmbH · hello@rivicq.com</Typography>
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
