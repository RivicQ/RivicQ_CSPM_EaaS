import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, TextField, InputAdornment, Avatar, Divider, useTheme,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, CloudQueue, GitHub, Shield, GppGood, Memory, Psychology, FactCheck, Lock, WorkspacePremium, VerifiedUser,
  Api, Terminal, MenuBook, EnhancedEncryption, Key,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { cbomService, gitHubScanService } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import TrademarkNotice from '../components/TrademarkNotice';
import QubitField from '../components/home/QubitField';
import EncryptionLayerVisual from '../components/home/EncryptionLayerVisual';
import ClientWorkflow from '../components/home/ClientWorkflow';
import HomeScanReport, { HomeScanReportData } from '../components/home/HomeScanReport';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';
import designSystem, { glassSurface } from '../theme/designSystem';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const FEATURES = [
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
    desc: 'Quantify harvest-now-decrypt-later exposure and plan migrations to ML-KEM and ML-DSA post-quantum cryptography with auditable, qubit-era attestations.',
  },
  {
    icon: <Memory />, title: 'HSM & Key Lifecycle', color: tokens.colors.crypto.info,
    desc: 'Unified visibility into AWS CloudHSM, IBM HPCS, and cloud KMS. Track rotation, wrapping, attestation, and PQC-hybrid key hygiene across every provider.',
  },
  {
    icon: <GppGood />, title: 'Cloud Posture Management', color: tokens.colors.crypto.high,
    desc: 'Assess accounts and workloads against CIS, NIST, and similar operator mappings — posture scores where connectors are configured, not a certification of RivicQ.',
  },
  {
    icon: <FactCheck />, title: 'Compliance Automation', color: tokens.colors.crypto.low,
    desc: 'Conformance checks and evidence packs mapped to ISO 27001, DORA, NIS2, GDPR, the EU AI Act, and the EU CRA. Mappings are not audit opinions or certifications.',
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
  { icon: <Api />, title: 'API Reference', desc: 'OpenAPI/ReDoc reference for the RivicQ platform API.', href: 'api/index.html' },
  { icon: <Terminal />, title: 'SDKs', desc: 'Python, TypeScript, Rust, Java, and .NET client libraries.', href: 'docs/sdks/README.md' },
  { icon: <GitHub />, title: 'GitHub', desc: 'Source, issues, and the OSS CryptoBOM scanner.', href: 'https://github.com/RivicQ/RivicQ_CSPM_EaaS' },
];

const STEPS = [
  { step: '01', title: 'Connect', desc: 'Link repositories, cloud accounts, HSMs, and clusters in minutes. No agents required for inventory.', color: tokens.colors.rivicq[600] },
  { step: '02', title: 'Assess', desc: 'The EaaS engine discovers crypto, builds your CBOM, and quantifies quantum exposure against conformance packs.', color: tokens.colors.gold[600] },
  { step: '03', title: 'Protect', desc: 'Encrypt through the API, migrate to PQC, and enforce policy with prioritized remediation and full audit trails.', color: tokens.colors.crypto.low },
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

  const heroBg = isDark ? designSystem.proBlue.commandCenter : '#ffffff';
  const cardBg = isDark ? '#0c4a6e' : '#ffffff';
  const cardBorder = isDark ? 'rgba(186,230,253,0.12)' : 'rgba(14,165,233,0.16)';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: heroBg,
        position: 'relative',
        overflow: 'hidden',
        color: isDark ? '#e2e8f0' : '#0f172a',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(14,165,233,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.06) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          pointerEvents: 'none',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 70%)',
        }}
      />

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, position: 'relative' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            mb: 10,
            p: 1.5,
            borderRadius: `${designSystem.radius.md}px`,
            ...(isDark
              ? {
                background: designSystem.proBlue.commandCenter,
                border: `1px solid ${designSystem.proBlue.border}`,
                boxShadow: designSystem.proBlue.shadow,
              }
              : glassSurface(theme, true)),
          }}
        >
          <BrandLogo dark={isDark} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button variant="text" sx={{ color: 'text.secondary', display: { xs: 'none', md: 'inline-flex' } }} onClick={() => scrollToId('features')}>Features</Button>
            <Button variant="text" sx={{ color: 'text.secondary', display: { xs: 'none', md: 'inline-flex' } }} onClick={() => scrollToId('eaas')}>Platform</Button>
            <Button variant="text" sx={{ color: 'text.secondary', display: { xs: 'none', lg: 'inline-flex' } }} onClick={() => scrollToId('workflows')}>Workflows</Button>
            <Button variant="text" sx={{ color: 'text.secondary', display: { xs: 'none', md: 'inline-flex' } }} onClick={() => scrollToId('pricing')}>Pricing</Button>
            <Button variant="text" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }} onClick={() => openExternal('docs/index.html')}>Docs</Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }} />
            <Button variant="outlined" onClick={() => navigate('/login')} sx={{ color: 'text.primary' }}>Sign In</Button>
            <Button variant="contained" onClick={() => navigate('/register')}>Get Started</Button>
          </Stack>
        </Box>

        <Box sx={{ position: 'relative', mb: { xs: 6, md: 10 } }}>
          <QubitField dark={isDark} />
          <Grid container spacing={{ xs: 4, md: 5 }} alignItems="center" sx={{ position: 'relative' }}>
            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                <Chip
                  icon={<EnhancedEncryption />}
                  label="Encryption as a Service · Quantum-safe CSPM"
                  sx={{
                    mb: 3,
                    bgcolor: isDark ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.08)',
                    color: 'primary.main',
                    border: 1,
                    borderColor: 'primary.main',
                    fontWeight: 600,
                  }}
                />
                <Typography
                  variant="h2"
                  fontWeight={600}
                  sx={{ mb: 2, lineHeight: 1.12, fontSize: { xs: '1.85rem', md: '2.6rem' }, letterSpacing: '-0.02em' }}
                >
                  Your business already runs on encryption.
                  <br />
                  <Box component="span" sx={{ color: 'text.primary' }}>
                    Now it needs intelligence.
                  </Box>
                </Typography>
                <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 620, mb: 3, fontWeight: 400, fontSize: { xs: '1rem', md: '1.15rem' } }}>
                  RivicQ is the Encryption-as-a-Service intelligence layer — wiring repositories, cloud KMS, HSMs, and
                  certificates into one living cryptographic model that discovers keys, quantifies quantum risk, and
                  automates PQC migration and compliance.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3, fontStyle: 'italic' }}>
                  Not a dashboard. Not a report mill. The cryptographic decision layer security never had.
                </Typography>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.05 }}>
                <Card
                  sx={{
                    mb: 2,
                    p: 0.5,
                    bgcolor: cardBg,
                    border: 1,
                    borderColor: isDark ? 'rgba(14,165,233,0.35)' : 'rgba(14,165,233,0.22)',
                    backdropFilter: 'none',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        placeholder="Paste a public GitHub repo, or a website URL (https://example.com)…"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><GitHub sx={{ color: 'text.muted' }} /></InputAdornment>,
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)',
                            borderRadius: 2,
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <LoadingButton
                          size="large"
                          variant="contained"
                          endIcon={<ArrowForward />}
                          onClick={handleScan}
                          loading={scanStatus === 'scanning'}
                          loadingText="Scanning…"
                          disabled={!repoUrl.trim()}
                          sx={{ py: 1.5, fontSize: '1rem', flexGrow: 1 }}
                        >
                          Scan for Crypto Risk
                        </LoadingButton>
                        <Button
                          size="large"
                          variant="outlined"
                          onClick={() => navigate('/demo')}
                          startIcon={<WorkspacePremium />}
                          sx={{ py: 1.5, fontSize: '1rem', color: 'tertiary.main', borderColor: 'tertiary.main' }}
                        >
                          Try Interactive Demo
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Your encryption intelligence, wherever you go — desktop, tablet, and mobile.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                <EncryptionLayerVisual dark={isDark} />
              </motion.div>
            </Grid>
          </Grid>
        </Box>

        {scanStatus !== 'idle' && (
          <HomeScanReport
            status={scanStatus}
            progress={progress}
            report={report}
            onOpenApp={() => navigate('/register')}
            onRegister={() => navigate('/register')}
          />
        )}

        <Box sx={{ mb: 10, textAlign: 'center' }}>
          <Grid container spacing={3}>
            {[
              { value: 'CBOM', label: 'CycloneDX crypto inventory' },
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
              borderRadius: `${designSystem.radius.md}px`,
              p: { xs: 3, md: 5 },
              border: 1,
              borderColor: isDark ? 'rgba(14,165,233,0.28)' : 'rgba(14,165,233,0.16)',
              background: isDark ? designSystem.proBlue.commandCenter : '#ffffff',
            }}
          >
            <QubitField dark={isDark} density={0.6} />
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
                    bgcolor: tier.featured ? (isDark ? 'rgba(14,165,233,0.16)' : 'rgba(14,165,233,0.06)') : cardBg,
                    border: 1,
                    borderColor: tier.featured ? 'rgba(14,165,233,0.4)' : cardBorder,
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
              <Typography variant="body2" sx={{ color: 'text.muted' }}>© 2026 RivicQ GmbH · Encryption as a Service</Typography>
            </Stack>
            <TrademarkNotice />
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
