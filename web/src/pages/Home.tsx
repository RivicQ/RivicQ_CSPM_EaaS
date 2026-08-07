import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, LinearProgress, TextField, InputAdornment, Avatar, Divider,
} from '@mui/material';
import {
  ArrowForward, CheckCircle, CloudQueue, GitHub, Search, Shield, GppGood, Memory, Psychology, FactCheck, Insights, Language, Lock, WorkspacePremium, VerifiedUser,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { cbomService } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import { tokens } from '../theme/tokens';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const PACKAGES = [
  { name: 'axios', status: 'done' as const },
  { name: 'express', status: 'scanning' as const },
  { name: 'lodash', status: 'done' as const },
  { name: 'jsonwebtoken', status: 'pending' as const },
  { name: 'crypto-js', status: 'pending' as const },
  { name: 'node-forge', status: 'pending' as const },
];

const FEATURES = [
  {
    icon: <GppGood />, title: 'Cloud Posture Management', color: tokens.colors.rivicq[400],
    desc: 'Continuously assess every account and workload against CIS, NIST, SOC 2, and PCI DSS. See your posture score per account with instant remediation.',
  },
  {
    icon: <Memory />, title: 'Crypto & CBOM Inventory', color: tokens.colors.crypto.quantum,
    desc: 'Automatic discovery of cryptographic assets, algorithms, and keys across code, cloud, and infrastructure. Generate Quantum Bills of Materials.',
  },
  {
    icon: <Psychology />, title: 'Quantum & PQC Readiness', color: tokens.colors.gold[500],
    desc: 'Quantify your risk against quantum-era attacks. Plan and execute migrations to ML-KEM and post-quantum cryptography with auditable attestations.',
  },
  {
    icon: <FactCheck />, title: 'Compliance Automation', color: tokens.colors.crypto.low,
    desc: 'Continuous conformance checks, audit-ready evidence, and executive reports for ISO 27001, SOC 2, DORA, GDPR, and the EU AI Act.',
  },
  {
    icon: <Insights />, title: 'Threat Detection & Analytics', color: tokens.colors.crypto.high,
    desc: 'ML-assisted anomaly detection on cryptographic operations, real-time security events, and executive analytics across your whole estate.',
  },
  {
    icon: <Language />, title: 'Multi-Cloud Coverage', color: tokens.colors.crypto.info,
    desc: 'AWS, Azure, GCP, and IBM Cloud in one pane of glass. HSM status, KMS key hygiene, and CloudTrail audit events per provider.',
  },
];

const STEPS = [
  { step: '01', title: 'Connect', desc: 'Link cloud accounts, repositories, and clusters in minutes. No agents required for inventory.', color: tokens.colors.rivicq[400] },
  { step: '02', title: 'Assess', desc: 'Continuous scanning finds misconfigurations, weak crypto, and posture drift against your conformance packs.', color: tokens.colors.gold[500] },
  { step: '03', title: 'Remediate', desc: 'Prioritized findings with one-click remediation plans, drift prevention, and full audit trails.', color: tokens.colors.crypto.low },
];

const STANDARDS = ['CIS Benchmarks', 'NIST 800-53', 'SOC 2', 'ISO 27001', 'PCI DSS 4.0', 'DORA', 'GDPR', 'EU AI Act'];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [scanStatus, setScanStatus] = React.useState<ScanStatus>('idle');
  const [repoUrl, setRepoUrl] = React.useState('');
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleScan = async () => {
    if (!repoUrl.trim()) return;
    setScanStatus('scanning');
    setProgress(0);
    try {
      const resp = await cbomService.triggerScan(repoUrl.trim(), 'cbom');
      const scanId = resp.data.scan_id;
      const interval = setInterval(async () => {
        try {
          const statusResp = await cbomService.getScanStatus(scanId);
          const status = statusResp.data;
          setProgress(status.progress || 0);
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval);
            setScanStatus(status.status === 'completed' ? 'complete' : 'error');
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

  const statusIcon = (status: string) => {
    if (status === 'done') return <CheckCircle sx={{ color: tokens.colors.crypto.low }} />;
    if (status === 'scanning') return <Box sx={{ color: tokens.colors.rivicq[400], animation: 'spin 1s linear infinite' }}><Search /></Box>;
    return <Box sx={{ color: tokens.colors.text.muted }}><Lock /></Box>;
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 80% -10%, rgba(15,98,254,0.16), transparent 60%), radial-gradient(900px 500px at 0% 10%, rgba(212,175,55,0.10), transparent 55%), linear-gradient(180deg, #050a18 0%, #081020 45%, #0b1530 100%)', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(15,98,254,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,98,254,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' }} />

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 8 }}>
          <BrandLogo />
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ color: tokens.colors.text.secondary }} onClick={() => navigate('/login')}>Features</Button>
            <Button variant="text" sx={{ color: tokens.colors.text.secondary }} onClick={() => navigate('/login')}>Product</Button>
            <Button variant="text" sx={{ color: tokens.colors.text.secondary }} onClick={() => navigate('/login')}>Pricing</Button>
            <Button variant="text" sx={{ color: tokens.colors.text.secondary }} onClick={() => navigate('/login')}>Docs</Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Button variant="outlined" onClick={() => navigate('/login')} sx={{ color: tokens.colors.text.primary, borderColor: tokens.colors.border }}>Sign In</Button>
            <Button variant="contained" onClick={() => navigate('/register')}>Get Started</Button>
          </Stack>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Chip icon={<Shield />} label="Complete Cloud & Cyber Security Posture" sx={{ mb: 3, bgcolor: 'rgba(15,98,254,0.12)', color: tokens.colors.rivicq[300], border: '1px solid rgba(15,98,254,0.4)' }} />
            <Typography variant="h2" fontWeight={900} sx={{ color: tokens.colors.text.primary, mb: 2, lineHeight: 1.08, fontSize: { xs: '2.1rem', md: '3.8rem' } }}>
              Your entire security posture.
              <br />
              <Box component="span" sx={{ background: tokens.colors.brandGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Continuously assessed.
              </Box>
            </Typography>
            <Typography variant="h6" sx={{ color: tokens.colors.text.secondary, maxWidth: 720, mx: 'auto', mb: 4, fontWeight: 400 }}>
              CryptoBOM unifies cloud posture management, cryptographic inventory, PQC migration, and compliance automation — in one security platform.
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card sx={{ maxWidth: 700, mx: 'auto', mb: 3, p: 0.5, bgcolor: 'rgba(13,28,64,0.8)', border: '1px solid rgba(15,98,254,0.35)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    placeholder="Paste public GitHub repo URL for a free CBOM scan..."
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><GitHub sx={{ color: tokens.colors.text.muted }} /></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(6,13,26,0.7)', borderRadius: 2 } }}
                  />
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      size="large"
                      variant="contained"
                      endIcon={<ArrowForward />}
                      onClick={handleScan}
                      disabled={scanStatus === 'scanning' || !repoUrl.trim()}
                      sx={{ py: 1.5, fontSize: '1rem', flexGrow: 1 }}
                    >
                      {scanStatus === 'scanning' ? 'Scanning...' : 'Scan for Crypto Risk'}
                    </Button>
                    <Button
                      size="large"
                      variant="outlined"
                      onClick={() => navigate('/switcher')}
                      startIcon={<WorkspacePremium />}
                      sx={{ py: 1.5, fontSize: '1rem', color: tokens.colors.gold[300], borderColor: 'rgba(212,175,55,0.45)' }}
                    >
                      Explore Enterprise
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Box>

        {scanStatus !== 'idle' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <Card sx={{ mb: 6, bgcolor: 'rgba(8,16,32,0.9)', border: '1px solid rgba(15,98,254,0.28)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Live Scan Visualization</Typography>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, mb: 3 }} />
                <Grid container spacing={2}>
                  {PACKAGES.map((pkg) => (
                    <Grid item xs={4} sm={2} key={pkg.name}>
                      <Card sx={{ bgcolor: tokens.colors.navy[2], borderColor: tokens.colors.border, textAlign: 'center' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ fontSize: 28, mb: 1 }}>{statusIcon(pkg.status)}</Box>
                          <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>{pkg.name}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Grid container spacing={3}>
            {[
              { value: '150k+', label: 'Assets assessed' },
              { value: '5', label: 'Cloud providers' },
              { value: '8+', label: 'Compliance frameworks' },
              { value: '99.95%', label: 'Platform uptime' },
            ].map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Typography variant="h3" fontWeight={900} sx={{ background: tokens.colors.brandGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</Typography>
                <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{s.label}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: tokens.colors.text.primary, mb: 1, textAlign: 'center' }}>One platform for complete security</Typography>
          <Typography variant="body1" sx={{ color: tokens.colors.text.secondary, mb: 4, textAlign: 'center' }}>From cloud posture to post-quantum cryptography — everything your security team needs.</Typography>
          <Grid container spacing={3}>
            {FEATURES.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <motion.div whileHover={{ y: -6 }}>
                  <Card sx={{ height: '100%', bgcolor: 'rgba(17,32,58,0.55)', border: '1px solid rgba(148,163,184,0.14)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Avatar sx={{ bgcolor: `${f.color}22`, color: f.color, mb: 2, width: 48, height: 48 }}>{f.icon}</Avatar>
                      <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary, mb: 1 }}>{f.title}</Typography>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{f.desc}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: tokens.colors.text.primary, mb: 4, textAlign: 'center' }}>How it works</Typography>
          <Grid container spacing={3}>
            {STEPS.map((s) => (
              <Grid item xs={12} md={4} key={s.step}>
                <Card sx={{ height: '100%', bgcolor: 'rgba(17,32,58,0.55)', border: `1px solid ${s.color}33` }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h2" fontWeight={900} sx={{ color: `${s.color}55`, mb: 1 }}>{s.step}</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary, mb: 1 }}>{s.title}</Typography>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{s.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: tokens.colors.text.muted, letterSpacing: 2, textTransform: 'uppercase' }}>Built for</Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {STANDARDS.map((s) => (
              <Chip key={s} icon={<VerifiedUser sx={{ fontSize: 14 }} />} label={s} variant="outlined" sx={{ color: tokens.colors.text.secondary, borderColor: tokens.colors.border }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: tokens.colors.text.primary, mb: 4, textAlign: 'center' }}>Pricing</Typography>
          <Grid container spacing={3} maxWidth={900} sx={{ mx: 'auto' }}>
            {[
              {
                name: 'OSS', icon: <Lock />, price: '$0', tagline: 'For open source teams', color: tokens.colors.rivicq[400],
                features: ['CBOM scanning', 'Crypto inventory', 'Dashboard & analytics', 'GitHub & CI integration'],
                cta: 'Start free', action: () => navigate('/register'),
              },
              {
                name: 'Enterprise', icon: <WorkspacePremium />, price: 'Custom', tagline: 'For security & compliance teams', color: tokens.colors.gold[500], featured: true,
                features: ['Full CSPM & conformance packs', 'Quantum / PQC migration', 'Multi-cloud & HSM coverage', 'SSO, audit logs & SLA'],
                cta: 'Request access', action: () => navigate('/switcher'),
              },
            ].map((tier) => (
              <Grid item xs={12} md={6} key={tier.name}>
                <Card sx={{ height: '100%', bgcolor: tier.featured ? 'rgba(212,175,55,0.06)' : 'rgba(17,32,58,0.55)', border: tier.featured ? `1px solid ${tokens.colors.gold[500]}55` : '1px solid rgba(148,163,184,0.14)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudQueue sx={{ color: tier.color }} />
                        <Typography variant="h6" fontWeight={800} sx={{ color: tokens.colors.text.primary }}>{tier.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h3" fontWeight={900} sx={{ color: tokens.colors.text.primary }}>{tier.price}</Typography>
                        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{tier.tagline}</Typography>
                      </Box>
                      {tier.features.map((f) => (
                        <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle sx={{ fontSize: 16, color: tokens.colors.crypto.low }} />
                          <Typography variant="body2" sx={{ color: tokens.colors.text.primary }}>{f}</Typography>
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

        <Box sx={{ textAlign: 'center', py: 4, borderTop: '1px solid rgba(148,163,184,0.14)' }}>
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
            <BrandLogo compact dark />
            <Typography variant="body2" sx={{ color: tokens.colors.text.muted }}>© 2026 RivicQ · Cloud & Cyber Security Posture Management</Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
