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
  Typography,
  useTheme,
  FormControlLabel,
  Checkbox,
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
import { useDemoTrail } from '../context/DemoTrailContext';
import { authService } from '../services/api';
import { Edition } from '../config/editions';
import BrandLogo from '../components/BrandLogo';
import CryptoQuantumBackdrop from '../components/auth/CryptoQuantumBackdrop';
import TrademarkNotice from '../components/TrademarkNotice';
import designSystem, { commandCenterCardSx, proBlueContainedButtonSx } from '../theme/designSystem';

const authHeroPanelSx = {
  ...commandCenterCardSx,
  backdropFilter: 'none',
  borderRadius: `${designSystem.radius.xl}px`,
  '& .MuiTypography-overline': {
    color: designSystem.proBlue.accentMuted,
  },
  '& .MuiTypography-h3': {
    color: designSystem.proBlue.textPrimary,
  },
  '& .MuiTypography-subtitle2:not([class*="MuiTypography-color"])': {
    color: designSystem.proBlue.textPrimary,
  },
  '& .MuiTypography-body2': {
    color: designSystem.proBlue.textSecondary,
  },
  '& .MuiCard-root': {
    bgcolor: 'rgba(255,255,255,0.06)',
    borderColor: designSystem.proBlue.border,
    color: designSystem.proBlue.textPrimary,
  },
  '& .MuiChip-root': {
    color: designSystem.proBlue.textSecondary,
    borderColor: designSystem.proBlue.border,
    bgcolor: 'rgba(255,255,255,0.04)',
    '& .MuiChip-icon': { color: designSystem.proBlue.accentMuted },
    '& .MuiChip-label': { color: designSystem.proBlue.textSecondary },
  },
  '& .MuiToggleButtonGroup-root .MuiToggleButton-root': {
    color: designSystem.proBlue.textSecondary,
    borderColor: `${designSystem.proBlue.border} !important`,
    textTransform: 'none',
    fontWeight: 600,
    '&.Mui-selected': {
      color: designSystem.proBlue.textPrimary,
      bgcolor: 'rgba(255,255,255,0.14)',
      borderColor: `${designSystem.proBlue.accentMuted} !important`,
    },
    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
  },
};

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
  const { start: startTrail } = useDemoTrail();
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
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    organisation: '',
    jobTitle: '',
    country: '',
    industry: '',
    orgSize: '',
    acceptTerms: false,
  });
  const [googleRedirectUri, setGoogleRedirectUri] = React.useState('');

  const strength = React.useMemo(() => passwordStrength(form.password), [form.password]);
  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || form.name.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const canSubmit = emailValid && form.password.length >= 8 &&
    (mode === 'login' || (displayName !== '' && form.password === form.confirm && form.acceptTerms));

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

  React.useEffect(() => {
    if (!backendReachable) return;
    authService.googleStatus()
      .then((resp) => {
        if (resp.data?.google_oauth_enabled && resp.data?.redirect_uri) {
          setGoogleRedirectUri(resp.data.redirect_uri);
        }
      })
      .catch(() => {});
  }, [backendReachable]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setConfirmationSent(null);

    try {
      const result = mode === 'register'
        ? await register(displayName || form.email.split('@')[0], form.email, form.password, edition, {
            first_name: form.firstName,
            last_name: form.lastName,
            organisation: form.organisation,
            job_title: form.jobTitle,
            country: form.country,
            industry: form.industry,
            organisation_size: form.orgSize,
            accept_terms: form.acceptTerms,
          })
        : await login(form.email, form.password, edition);

      if (result?.mfaRequired) {
        setMfaStep({ email: form.email, session: result.mfaSession || '' });
        setMfaCode('');
        return;
      }
      if (mode === 'register' && result?.requiresConfirmation) {
        setConfirmationSent({ email: form.email });
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
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

  const handleDemo = async (withTrail = true) => {
    setLoading(true);
    setError('');
    try {
      await demoLogin('community');
      if (withTrail) startTrail();
      else navigate('/dashboard', { replace: true });
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
      const loginResp = await (provider === 'github' ? authService.githubLogin(edition) : authService.googleLogin(edition));
      window.location.href = loginResp.data.auth_url;
    } catch (err: any) {
      setError(err?.response?.data?.message || `${provider === 'github' ? 'GitHub' : 'Google'} OAuth not available`);
    }
  };

  const title = mode === 'register' ? 'Create your workspace' : 'Welcome back';
  const submitLabel = mode === 'register' ? 'Create account' : 'Sign in';
  const providerName = backendReachable ? 'RivicQ Identity' : 'Supabase';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        py: 5,
        background: isDark ? designSystem.proBlue.commandCenter : designSystem.gradient.meshLight,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: isDark ? designSystem.proBlue.commandGlow : designSystem.horizon.wash,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: isDark ? 0.35 : 0.25,
          pointerEvents: 'none',
        }}
      />

      <CryptoQuantumBackdrop dark={isDark} />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <BrandLogo dark={isDark} />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`${edition.toUpperCase()} workspace`} variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label="Security Cloud" variant="outlined" sx={{ fontWeight: 600 }} />
          </Stack>
        </Box>

        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', ...authHeroPanelSx }}>
              <CardContent sx={{ p: 4.5, height: '100%' }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="overline" sx={{ display: 'block', letterSpacing: 1.2, fontWeight: 600, fontSize: '0.7rem' }}>
                      RivicQ Security Cloud
                    </Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ mt: 1, lineHeight: 1.12, letterSpacing: '-0.03em' }}>
                      {mode === 'register' ? 'Stand up your security workspace.' : 'Sign in to the security platform.'}
                    </Typography>
                    <Typography sx={{ mt: 2, maxWidth: 540 }}>
                      Enterprise cryptographic SaaS — CBOM inventory, cloud posture, policy gates, and post-quantum
                      migration planning in one control plane.
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Card sx={{ borderRadius: 1 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Security sx={{ color: designSystem.proBlue.accentLight }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                              Command Center
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              Unified posture across cloud accounts, crypto inventory, and PQC readiness.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                    <Card sx={{ bgcolor: 'rgba(59,125,74,0.12) !important', border: 1, borderColor: 'success.main', borderRadius: 1 }}>
                      <CardContent sx={{ p: 2.2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <BadgeIcon sx={{ color: 'success.light' }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: 'success.light', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                              Complete SaaS toolkit
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              Security modules, compliance frameworks, realtime monitoring, and enterprise governance.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip icon={<Storage sx={{ fontSize: 14 }} />} label="Community" size="small" variant="outlined" />
                    <Chip icon={<WorkspacePremium sx={{ fontSize: 14 }} />} label="Enterprise" size="small" variant="outlined" />
                    <Chip icon={<Shield sx={{ fontSize: 14 }} />} label="Demo access" size="small" variant="outlined" />
                  </Stack>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
                      Edition
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5, mt: 0.5 }}>
                      Community is Apache-2.0. Enterprise is a commercial license with SSO, RBAC, and cloud connectors.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      {([
                        { id: 'community' as Edition, title: 'Community', body: 'Limited CBOM engine: website, host, IP, pod inventory, CLI' },
                        { id: 'professional' as Edition, title: 'Professional', body: 'CSPM modules, multi-cloud, compliance maps' },
                        { id: 'enterprise' as Edition, title: 'Enterprise', body: 'SSO config, RBAC, audit, API keys, PQC packs' },
                      ]).map((opt) => {
                        const selected = edition === opt.id;
                        return (
                          <Button
                            key={opt.id}
                            variant={selected ? 'contained' : 'outlined'}
                            onClick={() => setEdition(opt.id)}
                            sx={{
                              flex: 1,
                              py: 1.5,
                              px: 2,
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              borderRadius: 1,
                              borderWidth: 2,
                            }}
                          >
                            <Box>
                              <Typography fontWeight={700}>{opt.title}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', opacity: 0.9, whiteSpace: 'normal' }}>
                                {opt.body}
                              </Typography>
                            </Box>
                          </Button>
                        );
                      })}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: `${designSystem.radius.xl}px` }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                    {title}
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(14,165,233,0.16)' : 'rgba(245,244,247,0.95)'),
                      backdropFilter: 'none',
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>Want to explore first?</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Try the RivicQ Demo — no setup required. Sample data only; production authentication is unchanged.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AutoAwesome />}
                      disabled={loading}
                      onClick={() => handleDemo(true)}
                      aria-label="Try interactive demo"
                    >
                      Try Interactive Demo
                    </Button>
                  </Box>
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

                    {googleRedirectUri && window.location.hostname === 'localhost' && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Google sign-in requires this redirect URI in Google Cloud Console → Credentials →
                        Authorized redirect URIs:{' '}
                        <Box component="code" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
                          {googleRedirectUri}
                        </Box>
                      </Alert>
                    )}

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
                              sx={{ py: 1.3, ...proBlueContainedButtonSx }}
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
                          <Grid container spacing={1.5}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="First name"
                                value={form.firstName}
                                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Last name"
                                value={form.lastName}
                                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                                fullWidth
                                required
                              />
                            </Grid>
                          </Grid>
                        )}
                        <TextField
                          label={mode === 'register' ? 'Work email' : 'Email'}
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                          InputProps={{ startAdornment: <InputAdornment position="start"><Mail /></InputAdornment> }}
                          helperText={form.email && !emailValid ? 'Enter a valid work email' : 'We never share your address.'}
                          error={Boolean(form.email && !emailValid)}
                          fullWidth
                          required
                          autoComplete="email"
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
                                  <IconButton
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    edge="end"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                  >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            helperText={form.password && form.password.length < 8 ? 'Use at least 8 characters' : ' '}
                            error={Boolean(form.password && form.password.length < 8)}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
                                  <IconButton
                                    onClick={() => setShowConfirm((prev) => !prev)}
                                    edge="end"
                                    aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
                                  >
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
                        {mode === 'register' && (
                          <Grid container spacing={1.5}>
                            <Grid item xs={12} sm={6}>
                              <TextField fullWidth size="small" label="Organisation" value={form.organisation} onChange={(e) => setForm((p) => ({ ...p, organisation: e.target.value }))} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField fullWidth size="small" label="Job title" value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField fullWidth size="small" label="Country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField fullWidth size="small" label="Industry" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField fullWidth size="small" label="Organisation size" placeholder="e.g. 50–200" value={form.orgSize} onChange={(e) => setForm((p) => ({ ...p, orgSize: e.target.value }))} />
                            </Grid>
                            <Grid item xs={12}>
                              <FormControlLabel
                                control={<Checkbox checked={form.acceptTerms} onChange={(e) => setForm((p) => ({ ...p, acceptTerms: e.target.checked }))} />}
                                label="I agree to the terms of service and privacy policy"
                              />
                            </Grid>
                          </Grid>
                        )}

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Current edition: <strong>{edition.toUpperCase()}</strong>
                          </Typography>
                          {mode === 'login' && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => navigate('/forgot-password')}
                            >
                              Forgot password?
                            </Button>
                          )}
                        </Stack>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                          <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading || !canSubmit}
                            endIcon={<ArrowForward />}
                            sx={{ py: 1.3, ...proBlueContainedButtonSx }}
                          >
                            {loading ? 'Please wait...' : submitLabel}
                          </Button>

                            <Button
                              variant="outlined"
                              startIcon={<AutoAwesome />}
                              disabled={loading}
                              onClick={() => handleDemo(true)}
                              sx={{ py: 1.1 }}
                            >
                              Try Demo
                            </Button>
                          </Box>

                          <Typography variant="body2" color="text.secondary">
                            {mode === 'login' ? (
                              <>Don&apos;t have an account yet?{' '}
                                <Button size="small" onClick={() => setMode('register')}>Create Account</Button>
                                {' '}or explore RivicQ with Demo Access.
                              </>
                            ) : (
                              <>Already registered?{' '}
                                <Button size="small" onClick={() => setMode('login')}>Sign In</Button>
                              </>
                            )}
                          </Typography>


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
                          {supabaseEnabled && !backendReachable && (
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
                          By continuing you agree to the{' '}
                          <a href={`${process.env.PUBLIC_URL || ''}/docs/LEGAL.md`} style={{ color: 'inherit' }}>legal terms</a>
                          {' '}and{' '}
                          <a href={`${process.env.PUBLIC_URL || ''}/docs/PRIVACY.md`} style={{ color: 'inherit' }}>privacy notice</a>.
                          Authentication is handled by {providerName}.
                        </Typography>
                        <TrademarkNotice compact sx={{ textAlign: 'center', mx: 'auto' }} />
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
