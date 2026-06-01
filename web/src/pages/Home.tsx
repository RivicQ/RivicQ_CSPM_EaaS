import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, LinearProgress, TextField, InputAdornment } from '@mui/material';
import { ArrowForward, GitHub, Search, Shield, CheckCircle, Warning, Lock } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
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

  const handleScan = () => {
    if (!repoUrl.trim()) return;
    setScanStatus('scanning');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setScanStatus('complete');
          return 100;
        }
        return p + 5;
      });
    }, 200);
  };

  const statusIcon = (status: string) => {
    if (status === 'done') return <CheckCircle sx={{ color: tokens.colors.crypto.low }} />;
    if (status === 'scanning') return <Box sx={{ color: tokens.colors.rivicq[400], animation: 'spin 1s linear infinite' }}><Search /></Box>;
    return <Box sx={{ color: tokens.colors.text.muted }}><Lock /></Box>;
  };

  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.colors.surface[0]} 0%, ${tokens.colors.surface[1]} 100%)`, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`, backgroundSize: '72px 72px', pointerEvents: 'none' }} />
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 6 }}>
          <BrandLogo />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate('/login')} sx={{ color: tokens.colors.text.primary, borderColor: tokens.colors.border }}>Sign In</Button>
            <Button variant="contained" onClick={() => navigate('/register')}>Get Started</Button>
          </Stack>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Chip icon={<Shield />} label="Open Source CryptoBOM Scanner" sx={{ mb: 3, bgcolor: `${tokens.colors.rivicq[500]}22`, color: tokens.colors.rivicq[300], border: `1px solid ${tokens.colors.rivicq[500]}44` }} />
            <Typography variant="h2" fontWeight={900} sx={{ color: tokens.colors.text.primary, mb: 2, lineHeight: 1.1, fontSize: { xs: '2rem', md: '3.5rem' } }}>
              Secure your code.
              <br />Today. Against tomorrow.
            </Typography>
            <Typography variant="h6" sx={{ color: tokens.colors.text.secondary, maxWidth: 640, mx: 'auto', mb: 4, fontWeight: 400 }}>
              Scan your repositories for cryptographic assets, generate Quantum Bills of Materials, and future-proof your code — free for open source.
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card sx={{ maxWidth: 700, mx: 'auto', mb: 3, p: 0.5, bgcolor: tokens.colors.surface[2], borderColor: tokens.colors.rivicq[500] + '44' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    placeholder="Paste public GitHub repo URL..."
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><GitHub sx={{ color: tokens.colors.text.muted }} /></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: tokens.colors.surface[0], borderRadius: 2 } }}
                  />
                  <Button
                    size="large"
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={handleScan}
                    disabled={scanStatus === 'scanning' || !repoUrl.trim()}
                    sx={{ py: 1.5, fontSize: '1rem' }}
                  >
                    {scanStatus === 'scanning' ? 'Scanning...' : 'Scan \u2192'}
                  </Button>
                  <Button variant="text" sx={{ color: tokens.colors.text.secondary }} startIcon={<GitHub />}>
                    Connect Public Repo via OAuth
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Box>

        {scanStatus !== 'idle' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <Card sx={{ mb: 4, bgcolor: tokens.colors.surface[1] }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Live Scan Visualization</Typography>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, mb: 3 }} />
                <Grid container spacing={2}>
                  {PACKAGES.map((pkg) => (
                    <Grid item xs={4} sm={2} key={pkg.name}>
                      <Card sx={{ bgcolor: tokens.colors.surface[2], borderColor: tokens.colors.border, textAlign: 'center' }}>
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

        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: tokens.colors.text.primary, mb: 3, textAlign: 'center' }}>OSS Algorithm Breakdown</Typography>
          <Grid container spacing={3} justifyContent="center">
            {[
              { name: 'AES-256', usages: 142, risk: 'low' as const, pqc: true },
              { name: 'RSA-4096', usages: 89, risk: 'medium' as const, pqc: false },
              { name: 'Kyber-768', usages: 12, risk: 'low' as const, pqc: true },
            ].map((alg) => (
              <Grid item xs={12} sm={4} key={alg.name}>
                <motion.div whileHover={{ y: -4 }}>
                  <Card sx={{ bgcolor: tokens.colors.surface[1], borderColor: tokens.colors.border }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={1}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>{alg.name}</Typography>
                        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{alg.usages} usages</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            size="small"
                            label={alg.risk === 'low' ? '\u2705' : '\u26A0\uFE0F'}
                            sx={{ bgcolor: alg.risk === 'low' ? `${tokens.colors.crypto.low}22` : `${tokens.colors.crypto.high}22`, color: alg.risk === 'low' ? tokens.colors.crypto.low : tokens.colors.crypto.high }}
                          />
                          {alg.pqc && <Chip size="small" label="PQC" sx={{ bgcolor: `${tokens.colors.crypto.quantum}22`, color: tokens.colors.crypto.quantum }} />}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button variant="outlined" sx={{ borderColor: tokens.colors.border, color: tokens.colors.text.primary }}>
              Export QBoM
            </Button>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', py: 4, borderTop: `1px solid ${tokens.colors.border}` }}>
          <Typography variant="body2" sx={{ color: tokens.colors.text.muted }}>
            No signup required for OSS scanning. Just paste a public repo URL and scan instantly.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
