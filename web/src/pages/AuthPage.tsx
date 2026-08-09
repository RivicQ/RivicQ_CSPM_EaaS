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
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
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
  Security,
  Badge as BadgeIcon,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { login, register, edition, setEdition, isAuthenticated, supabaseEnabled, supabaseLogin, supabaseRegister } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState<'login' | 'register'>(defaultMode);
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
  });

  const editionLabel = edition === 'enterprise' ? 'Enterprise' : edition === 'professional' ? 'Professional' : 'Community';

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

  const leftBg = isDark
    ? 'linear-gradient(160deg, #0f172a 0%, #312e81 130%)'
    : 'linear-gradient(160deg, #ffffff 0%, #eef2ff 80%, #f0fdf4 100%)';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        py: 5,
        background: isDark
          ? 'radial-gradient(circle at top left, rgba(99,102,241,0.2), transparent 30%), radial-gradient(circle at bottom right, rgba(245,158,11,0.1), transparent 24%), linear-gradient(180deg, #0b1220 0%, #0f172a 100%)'
          : 'radial-gradient(circle at top left, rgba(99,102,241,0.12), transparent 30%), radial-gradient(circle at bottom right, rgba(5,150,105,0.08), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <BrandLogo />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`${edition.toUpperCase()} workspace`} variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label="OSS + Enterprise" variant="outlined" sx={{ fontWeight: 600 }} />
          </Stack>
        </Box>

        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Card
              sx={{
                height: '100%',
                background: leftBg,
                color: isDark ? '#f8fafc' : '#0f172a',
                border: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.14)',
                backdropFilter: 'blur(16px)',
                boxShadow: isDark ? '0 30px 80px rgba(2,6,23,0.32)' : '0 24px 60px rgba(79,70,229,0.1)',
                borderRadius: 4,
              }}
            >
              <CardContent sx={{ p: 4.5, height: '100%' }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="overline" sx={{ display: 'block', color: 'primary.main', letterSpacing: 4, fontWeight: 700 }}>
                      Welcome
                    </Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ mt: 1, lineHeight: 1.02, letterSpacing: '-0.02em' }}>
                      Clear access to OSS and Enterprise workspaces.
                    </Typography>
                    <Typography sx={{ mt: 2, color: 'text.secondary', maxWidth: 540 }}>
                      A focused login and onboarding flow for crypto inventory, scanner, compliance, and enterprise governance.
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Card sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.05)', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Security sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                              Simple navigation
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                              Start in the welcome page, choose an edition, and go directly to the dashboard or scanner without extra noise.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                    <Card sx={{ bgcolor: isDark ? 'rgba(16,185,129,0.09)' : 'rgba(5,150,105,0.06)', border: 1, borderColor: 'success.main', borderRadius: 3 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <BadgeIcon sx={{ color: 'success.main' }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: 'success.main', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                              Enterprise ready
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                              Production-grade crypto inventory, compliance reporting, and quantum-safe migration for your organization.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip icon={<Storage sx={{ fontSize: 14 }} />} label="Community" size="small" variant="outlined" />
                    <Chip icon={<WorkspacePremium sx={{ fontSize: 14 }} />} label="Professional" size="small" variant="outlined" />
                    <Chip icon={<WorkspacePremium sx={{ fontSize: 14 }} />} label="Enterprise" size="small" variant="outlined" />
                    <Chip icon={<Shield sx={{ fontSize: 14 }} />} label="Demo access" size="small" variant="outlined" />
                  </Stack>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Select your edition before logging in.
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      value={edition}
                      onChange={(_, value: 'community' | 'professional' | 'enterprise' | null) => value && setEdition(value)}
                      sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}
                    >
                      <ToggleButton value="community" sx={{ textTransform: 'none', fontWeight: 600 }}>Community</ToggleButton>
                      <ToggleButton value="professional" sx={{ textTransform: 'none', fontWeight: 600 }}>Professional</ToggleButton>
                      <ToggleButton value="enterprise" sx={{ textTransform: 'none', fontWeight: 600 }}>Enterprise</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                    {title}
                  </Typography>
                  <Tabs value={mode} onChange={(_, nextMode: 'login' | 'register') => setMode(nextMode)} textColor="primary" indicatorColor="primary">
                    <Tab value="login" label="Login" />
                    <Tab value="register" label="Register" />
                  </Tabs>
                </Stack>

                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
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

                    <Alert severity="info" sx={{ borderRadius: 2 }}>
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

                    <Alert severity="info" sx={{ borderRadius: 2 }}>
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

                    {supabaseEnabled && (
                      <Button
                        variant="outlined"
                        color="success"
                        fullWidth
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          setError('');
                          try {
                            if (mode === 'register') {
                              await supabaseRegister(form.name || form.email.split('@')[0], form.email, form.password, edition);
                            } else {
                              await supabaseLogin(form.email, form.password, edition);
                            }
                            navigate('/dashboard', { replace: true });
                          } catch (err: any) {
                            setError(err?.message || 'Supabase authentication failed');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        sx={{ py: 1.1 }}
                      >
                        Continue with Supabase
                      </Button>
                    )}
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
