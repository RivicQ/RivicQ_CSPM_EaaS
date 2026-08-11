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
  LinearProgress,
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
  AutoAwesome,
  CheckCircle,
  GitHub,
  Google,
  Key,
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
import { Edition } from '../config/editions';
import BrandLogo from '../components/BrandLogo';

interface AuthPageProps {
  defaultMode?: 'login' | 'register';
}

function passwordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const map = [
    { label: 'Weak', color: 'error' },
    { label: 'Fair', color: 'warning' },
    { label: 'Good', color: 'info' },
    { label: 'Strong', color: 'success' },
  ];
  return { score, label: map[score]?.label ?? 'Weak', color: map[score]?.color ?? 'error' };
}

const AuthPage: React.FC<AuthPageProps> = ({ defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const {
    login,
    register,
    supabaseLogin,
    supabaseRegister,
    demoLogin,
    verifyMfa,
    edition,
    setEdition,
    isAuthenticated,
    supabaseEnabled,
    backendReachable,
  } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState<'login' | 'register'>(defaultMode);
  const [confirmationSent, setConfirmationSent] = React.useState<{ email: string } | null>(null);
  const [mfaStep, setMfaStep] = React.useState<{ email: string; session: string } | null>(null);
  const [mfaCode, setMfaCode] = React.useState('');
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });

  const strength = React.useMemo(() => passwordStrength(form.password), [form.password]);
  const canSubmit = form.email.includes('@') && form.password.length >= 8 &&
    (mode === 'login' || (form.name.trim() !== '' && form.password === form.confirm));

  const editionLabel = edition === 'enterprise' ? 'Enterprise' : edition === 'professional' ? 'Professional' : 'Community';

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  React.useEffect(() => {
    setMode(defaultMode);
    setError('');
    setConfirmationSent(null);
  }, [defaultMode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setConfirmationSent(null);

    try {
      const result = mode === 'register'
        ? await register(form.name || form.email.split('@')[0], form.email, form.password, edition)
        : await login(form.email, form.password, edition);

      if (result?.mfaRequired) {
        setMfaStep({ email: form.email, session: result.mfaSession || '' });
        setMfaCode('');
        return;
      }
      if (mode === 'register' && result?.requiresConfirmation) {
        setConfirmationSent({ email: form.email });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.message ||
        (mode === 'register' ? 'Registration failed' : 'Authentication failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaStep) return;
    setLoading(true);
    setError('');
    try {
      await verifyMfa(mfaStep.email, mfaCode.trim(), mfaStep.session, edition);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    if (!backendReachable) return;
    setLoading(true);
    setError('');
    try {
      await demoLogin(edition);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Demo access unavailable');
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async (provider: 'github' | 'google') => {
    setError('');
    try {
      const statusResp = await (provider === 'github' ? authService.githubStatus() : authService.googleStatus());
      if (!statusResp.data[`${provider}_oauth_enabled`]) {
        setError(`${provider === 'github' ? 'GitHub' : 'Google'} OAuth is not configured on this deployment.`);
        return;
      }
      const loginResp = await (provider === 'github' ? authService.githubLogin() : authService.googleLogin());
      window.location.href = loginResp.data.auth_url;
    } catch (err: any) {
      setError(err?.response?.data?.message || `${provider === 'github' ? 'GitHub' : 'Google'} OAuth not available`);
    }
  };

  const title = mode === 'register' ? 'Create your workspace' : 'Welcome back';
  const submitLabel = mode === 'register' ? 'Create account' : 'Sign in';
  const providerName = backendReachable ? 'RivicQ Identity' : 'Supabase';

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
                      CryptoBOM EaaS
                    </Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ mt: 1, lineHeight: 1.02, letterSpacing: '-0.02em' }}>
                      {mode === 'register' ? 'Start building your crypto inventory.' : 'Secure access to your workspace.'}
                    </Typography>
                    <Typography sx={{ mt: 2, color: 'text.secondary', maxWidth: 540 }}>
                      Discover, inventory, and govern cryptographic assets with automated CBOM generation, cloud posture
                      checks, and post-quantum migration planning.
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Card sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.05)', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Security sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                              Command Center
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                              Unified posture across cloud accounts, crypto inventory, and PQC readiness.
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
                              Complete SaaS toolkit
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                              Security modules, compliance frameworks, realtime monitoring, and enterprise governance.
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
                      Select your edition before authenticating.
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      value={edition}
                      onChange={(_, value: Edition | null) => value && setEdition(value)}
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
                  <Tabs
                    value={mode}
                    onChange={(_, nextMode: 'login' | 'register') => {
                      setMode(nextMode);
                      setMfaStep(null);
                      setError('');
                    }}
                    textColor="primary"
                    indicatorColor="primary"
                  >
                    <Tab value="login" label="Login" />
                    <Tab value="register" label="Register" />
                  </Tabs>
                </Stack>

                {confirmationSent && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <strong>Check your inbox.</strong> A confirmation link was sent to {confirmationSent.email}. Verify your
                    email, then sign in to continue.
                  </Alert>
                )}

                {!confirmationSent && (
                  <>
                    <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Current workspace
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {editionLabel} edition · signed in via <strong>{providerName}</strong>
                        {!backendReachable && ' (browser authentication)'}
                      </Typography>
                    </Box>

                    {error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                      </Alert>
                    )}

                    {mfaStep && (
                      <form onSubmit={handleMfaSubmit}>
                        <Stack spacing={2.25}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              Two-factor authentication required
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Enter the 6-digit code from your authenticator app for <strong>{mfaStep.email}</strong>.
                            </Typography>
                          </Box>
                          <TextField
                            label="Authenticator code"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value)}
                            inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Key /></InputAdornment> }}
                            fullWidth
                            required
                          />
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Button
                              type="submit"
                              variant="contained"
                              size="large"
                              disabled={loading || mfaCode.trim().length < 6}
                              endIcon={<ArrowForward />}
                              sx={{ py: 1.3 }}
                            >
                              {loading ? 'Verifying...' : 'Verify and sign in'}
                            </Button>
                            <Button
                              variant="text"
                              disabled={loading}
                              onClick={() => {
                                setMfaStep(null);
                                setError('');
                              }}
                            >
                              Back
                            </Button>
                          </Stack>
                        </Stack>
                      </form>
                    )}

                    {!mfaStep && (
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
                        <Box>
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
                          {mode === 'register' && form.password && (
                            <Box sx={{ mt: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={(strength.score / 3) * 100}
                                  color={strength.color as 'error' | 'warning' | 'info' | 'success'}
                                  sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                                />
                                <Typography variant="caption" color={`${strength.color}.main`} sx={{ fontWeight: 700 }}>
                                  {strength.label}
                                </Typography>
                              </Stack>
                            </Box>
                          )}
                        </Box>
                        {mode === 'register' && (
                          <TextField
                            label="Confirm password"
                            type={showConfirm ? 'text' : 'password'}
                            value={form.confirm}
                            onChange={(e) => setForm((prev) => ({ ...prev, confirm: e.target.value }))}
                            InputProps={{
                              startAdornment: <InputAdornment position="start"><Key /></InputAdornment>,
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={() => setShowConfirm((prev) => !prev)} edge="end">
                                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            error={Boolean(form.confirm && form.confirm !== form.password)}
                            helperText={form.confirm && form.confirm !== form.password ? 'Passwords do not match' : ' '}
                            fullWidth
                            required
                          />
                        )}

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Current edition: <strong>{edition.toUpperCase()}</strong>
                          </Typography>
                          {mode === 'login' && (
                            <Typography variant="body2" component="a" href="#forgot" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                              Forgot password?
                            </Typography>
                          )}
                        </Stack>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                          <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading || !canSubmit}
                            endIcon={<ArrowForward />}
                            sx={{ py: 1.3 }}
                          >
                            {loading ? 'Please wait...' : submitLabel}
                          </Button>

                          {backendReachable && (
                            <Button
                              variant="outlined"
                              color="success"
                              startIcon={<AutoAwesome />}
                              disabled={loading}
                              onClick={handleDemo}
                              sx={{ py: 1.1 }}
                            >
                              Try the demo
                            </Button>
                          )}
                        </Box>

                        {backendReachable && !mfaStep && (
                          <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Demo workspace credentials (password <strong>DemoPass123!</strong>):
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                              Enterprise&nbsp;· admin@rivicq.com
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                              Professional&nbsp;· operator@rivicq.com · analyst@rivicq.com
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                              Community&nbsp;· sales@rivicq.com
                            </Typography>
                          </Box>
                        )}

                        <Divider sx={{ my: 1 }}>OR CONTINUE WITH</Divider>

                        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                          {backendReachable && (
                            <>
                              <Button
                                variant="outlined"
                                startIcon={<GitHub />}
                                onClick={() => socialLogin('github')}
                                sx={{ py: 1.1, flex: 1, minWidth: 140 }}
                              >
                                GitHub
                              </Button>
                              <Button
                                variant="outlined"
                                startIcon={<Google />}
                                onClick={() => socialLogin('google')}
                                sx={{ py: 1.1, flex: 1, minWidth: 140 }}
                              >
                                Google
                              </Button>
                            </>
                          )}
                          {supabaseEnabled && (
                            <Button
                              variant="outlined"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={async () => {
                                setLoading(true);
                                setError('');
                                try {
                                  if (mode === 'register') {
                                    const result = await supabaseRegister(form.name || form.email.split('@')[0], form.email, form.password, edition);
                                    if (result?.requiresConfirmation) {
                                      setConfirmationSent({ email: form.email });
                                    } else {
                                      navigate('/dashboard', { replace: true });
                                    }
                                  } else {
                                    await supabaseLogin(form.email, form.password, edition);
                                    navigate('/dashboard', { replace: true });
                                  }
                                } catch (err: any) {
                                  setError(err?.message || 'Supabase authentication failed');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              sx={{ py: 1.1, flex: 1, minWidth: 140 }}
                            >
                              Supabase
                            </Button>
                          )}
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                          By continuing you agree to the <a href="#terms" style={{ color: 'inherit' }}>Terms of Service</a> and{' '}
                          <a href="#privacy" style={{ color: 'inherit' }}>Privacy Policy</a>. Authentication is handled by {providerName}.
                        </Typography>
                      </Stack>
                    </form>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AuthPage;
