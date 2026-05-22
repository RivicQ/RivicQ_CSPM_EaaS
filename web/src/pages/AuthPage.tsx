import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowForward, Lock, Mail, Visibility, VisibilityOff, Security, WorkspacePremium, Storage, Shield } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  defaultMode?: 'login';
}

const AuthPage: React.FC<AuthPageProps> = ({ defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, edition, setEdition, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    email: '',
    password: '',
  });

  const editionLabel = edition === 'enterprise' ? 'Enterprise' : 'OSS';

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(form.email, form.password, edition);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #667eea22, transparent 30%), linear-gradient(135deg, #0f172a 0%, #111827 45%, #1f2937 100%)', py: 6 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', background: 'rgba(15, 23, 42, 0.82)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
              <CardContent sx={{ p: 4, height: '100%' }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Box>
                    <Security sx={{ fontSize: 42, color: '#a5b4fc' }} />
                    <Typography variant="overline" sx={{ display: 'block', mt: 2, color: '#c7d2fe', letterSpacing: 2 }}>
                      CryptoBOM SaaS Access
                    </Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                      Start in OSS, unlock Enterprise when you are ready
                    </Typography>
                    <Typography sx={{ mt: 2, color: '#cbd5e1' }}>
                      Use your approved work account to enter the open source workspace or switch to the Enterprise workspace for locked compliance, IBM, and multi-cloud features.
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
                      OSS includes core CBOM inventory, scanner, analytics, and local workflows. Enterprise unlocks compliance, IBM Quantum, HSM, multi-cloud, and automation.
                    </Alert>
                    <Alert severity="success" sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: 'white', border: '1px solid rgba(16,185,129,0.25)' }}>
                      Sign in with your work email and approved company credentials. Self-service registration is disabled.
                    </Alert>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip icon={<Storage />} label="OSS ready" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.24)' }} variant="outlined" />
                    <Chip icon={<WorkspacePremium />} label="Enterprise locked" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.24)' }} variant="outlined" />
                    <Chip icon={<Shield />} label="Work-domain login" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.24)' }} variant="outlined" />
                  </Stack>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Select your edition before logging in.
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      value={edition}
                      onChange={(_, value: 'oss' | 'enterprise' | null) => value && setEdition(value)}
                      sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}
                    >
                      <ToggleButton value="oss" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}>
                        OSS
                      </ToggleButton>
                      <ToggleButton value="enterprise" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}>
                        Enterprise
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: 4 }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                  Work Domain Login
                </Typography>

                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(15, 23, 42, 0.03)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Current workspace
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {editionLabel} edition is selected. You can switch editions before login.
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Stack spacing={2.25}>
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Mail /></InputAdornment> }}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                      required
                    />

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="body2" color="text.secondary">
                      Current edition: <strong>{edition.toUpperCase()}</strong>
                    </Typography>

                    <Alert severity="warning" sx={{ bgcolor: 'rgba(255,244,229,0.04)', color: 'white', border: '1px solid rgba(255,193,7,0.12)' }}>
                      Self-service registration is disabled. To get Enterprise access, request access below.
                    </Alert>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        endIcon={<ArrowForward />}
                        sx={{ py: 1.3 }}
                      >
                        {loading ? 'Please wait...' : 'Login to Dashboard'}
                      </Button>

                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => window.location.href = 'mailto:admin@example.com?subject=Access%20Request%20for%20CryptoBOM'}
                        sx={{ py: 1.1 }}
                      >
                        Request Enterprise Access
                      </Button>
                    </Box>

                    
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AuthPage;
