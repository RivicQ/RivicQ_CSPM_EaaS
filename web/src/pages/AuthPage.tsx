import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowForward,
  Lock,
  Mail,
  Person,
  Visibility,
  VisibilityOff,
  WorkspacePremium,
  Storage,
  Shield,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import BrandLogo from '../components/BrandLogo';

interface AuthPageProps {
  defaultMode?: 'login' | 'register';
}

const AuthPage: React.FC<AuthPageProps> = ({ defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, edition, setEdition, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState<'login' | 'register'>(defaultMode);
  const [form, setForm] = React.useState({
    name: '',
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

  React.useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        await register(form.name || form.email.split('@')[0], form.email, form.password, edition);
      } else {
        await login(form.email, form.password, edition);
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'register' ? 'Create your workspace identity' : 'Sign in to your secure workspace';
  const submitLabel = mode === 'register' ? 'Create account' : 'Login to Dashboard';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        py: 5,
        background:
          'radial-gradient(circle at top left, rgba(6,182,212,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(212,175,55,0.16), transparent 24%), linear-gradient(180deg, #06111f 0%, #0b1220 100%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <BrandLogo dark />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`${edition.toUpperCase()} workspace`} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
            <Chip label="OSS + Enterprise" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
          </Stack>
        </Box>

        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Card
              sx={{
                height: '100%',
                background: 'rgba(8,15,28,0.84)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 30px 80px rgba(2,6,23,0.32)',
                borderRadius: 6,
              }}
            >
              <CardContent sx={{ p: 4.5, height: '100%' }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="overline" sx={{ display: 'block', color: '#93c5fd', letterSpacing: 4 }}>
                      Welcome
                    </Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ mt: 1, lineHeight: 1.02 }}>
                      Clear access to OSS and Enterprise workspaces.
                    </Typography>
                    <Typography sx={{ mt: 2, color: '#cbd5e1', maxWidth: 540 }}>
                      A focused login and onboarding flow for crypto inventory, scanner, compliance, and enterprise governance.
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#dbeafe', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                          Simple navigation
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: '#cbd5e1' }}>
                          Start in the welcome page, choose an edition, and go directly to the dashboard or scanner without extra noise.
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card sx={{ bgcolor: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 4 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#bbf7d0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                          Enterprise ready
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: '#ecfdf5' }}>
                          Production-grade crypto inventory, compliance reporting, and quantum-safe migration for your organization.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip icon={<Storage />} label="OSS" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.24)' }} variant="outlined" />
                    <Chip icon={<WorkspacePremium />} label="Enterprise" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.24)' }} variant="outlined" />
                    <Chip icon={<Shield />} label="Demo access" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.24)' }} variant="outlined" />
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
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {title}
                  </Typography>
                  <Tabs
                    value={mode}
                    onChange={(_, nextMode: 'login' | 'register') => setMode(nextMode)}
                    textColor="primary"
                    indicatorColor="primary"
                  >
                    <Tab value="login" label="Login" />
                    <Tab value="register" label="Register" />
                  </Tabs>
                </Stack>

                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(15, 23, 42, 0.03)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Current workspace
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {editionLabel} edition is selected. You can switch editions before authentication.
                  </Typography>
                </Box>



                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Stack spacing={2.25}>
                    {mode === 'register' && (
                      <TextField
                        label="Full name"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
                        fullWidth
                        required
                      />
                    )}
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

                    <Alert severity="info" sx={{ bgcolor: 'rgba(255,244,229,0.04)', border: '1px solid rgba(255,193,7,0.12)' }}>
                      {mode === 'register'
                        ? 'Registration creates a new workspace identity and returns you to the dashboard.'
                        : 'Sign in with your workspace credentials.'}
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
                        {loading ? 'Please wait...' : submitLabel}
                      </Button>

                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => window.location.href = 'mailto:enterprise@rivicq.de?subject=Access%20Request%20for%20CryptoBOM'}
                        sx={{ py: 1.1 }}
                      >
                        Request Enterprise Access
                      </Button>
                    </Box>

                    <Divider sx={{ my: 1 }}>OR</Divider>

                    <Alert severity="info" sx={{ bgcolor: 'rgba(255,244,229,0.04)', border: '1px solid rgba(255,193,7,0.12)' }}>
                      This release ships with GitHub authentication only.
                    </Alert>

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={async () => {
                        try {
                          const resp = await authService.githubStatus();
                          if (!resp.data.github_oauth_enabled) {
                            setError('GitHub OAuth is not configured. Contact your administrator.');
                            return;
                          }
                          const loginResp = await authService.githubLogin();
                          window.location.href = loginResp.data.auth_url;
                        } catch (err: any) {
                          setError(err?.response?.data?.message || 'GitHub OAuth not available');
                        }
                      }}
                      sx={{ py: 1.1 }}
                    >
                      Sign in with GitHub
                    </Button>


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
