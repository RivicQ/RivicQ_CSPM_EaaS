import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Link,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import PageFrame from '../components/PageFrame';
import { isEnterpriseEdition } from '../config/editions';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import designSystem, { proBlueContainedButtonSx } from '../theme/designSystem';
import { ARCHIFY_FONTS, NEBULA, nebulaCardSx } from '../theme/nebulaSurfaces';
import { PRISM } from '../theme/prism';
import { tokens } from '../theme/tokens';

const PREFS_KEY = 'rivicq.account.preferences';

type TabKey = 'profile' | 'security' | 'workspace' | 'integrations' | 'developer' | 'preferences' | 'privacy';

type Preferences = {
  securityAlerts: boolean;
  complianceUpdates: boolean;
  quantumAlerts: boolean;
};

type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'developer', label: 'Developer' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'privacy', label: 'Privacy' },
];

const DEFAULT_PREFERENCES: Preferences = {
  securityAlerts: true,
  complianceUpdates: true,
  quantumAlerts: false,
};

const INTEGRATIONS = [
  {
    name: 'GitHub',
    status: 'Integration pending',
    detail: 'Repository scanning exists separately; this page does not read or assert an account-level connection.',
  },
  {
    name: 'Google',
    status: 'Integration pending',
    detail: 'Google exchange endpoints exist; no account-level credential state is read on this page.',
  },
  {
    name: 'Cloud/HSM',
    status: 'Integration pending',
    detail: 'Configure credentials in Admin / Multi-cloud; this page does not read connector status.',
  },
  {
    name: 'Email',
    status: 'Integration pending',
    detail: 'No email verification or delivery capability is wired into Account Centre.',
  },
  {
    name: 'Payments',
    status: 'Not supported',
    detail: 'No billing or payment capability is provided in the local sandbox.',
  },
];

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences> | null;
    return {
      securityAlerts:
        typeof parsed?.securityAlerts === 'boolean' ? parsed.securityAlerts : DEFAULT_PREFERENCES.securityAlerts,
      complianceUpdates:
        typeof parsed?.complianceUpdates === 'boolean' ? parsed.complianceUpdates : DEFAULT_PREFERENCES.complianceUpdates,
      quantumAlerts:
        typeof parsed?.quantumAlerts === 'boolean' ? parsed.quantumAlerts : DEFAULT_PREFERENCES.quantumAlerts,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
}

const TabPanel: React.FC<{ panelId: TabKey; children: React.ReactNode }> = ({ panelId, children }) => (
  <Box
    role="tabpanel"
    id={`account-panel-${panelId}`}
    aria-labelledby={`account-tab-${panelId}`}
    tabIndex={0}
    sx={{ minWidth: 0, pt: 2 }}
  >
    {children}
  </Box>
);

const SectionCard: React.FC<{ title: string; caption?: string; children: React.ReactNode }> = ({
  title,
  caption,
  children,
}) => (
  <Box
    sx={{
      ...nebulaCardSx,
      p: { xs: 1.75, sm: 2.25 },
      minWidth: 0,
      overflow: 'hidden',
      borderColor: NEBULA.line,
    }}
  >
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.75, minWidth: 0 }}>
      <Box
        sx={{
          width: 6,
          height: 6,
          mt: 0.75,
          borderRadius: '50%',
          flexShrink: 0,
          background: designSystem.gradient.brand,
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: ARCHIFY_FONTS.title,
            fontWeight: 600,
            fontSize: '0.95rem',
            lineHeight: 1.3,
            color: NEBULA.text,
          }}
        >
          {title}
        </Typography>
        {caption && (
          <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', lineHeight: 1.45, mt: 0.25 }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Stack>
    <Stack spacing={1.75} sx={{ minWidth: 0 }}>
      {children}
    </Stack>
  </Box>
);

const ReadOnlyChip: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  const text = value ? value : 'not available';
  return (
    <Chip
      label={`${label}: ${text}`}
      variant="outlined"
      size="small"
      sx={{
        maxWidth: '100%',
        color: NEBULA.text,
        borderColor: NEBULA.line,
        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
      }}
    />
  );
};

const AccountCenter: React.FC = () => {
  const { user, edition, backendReachable, isDemo, updateProfile, changePassword, refreshMe } = useAuth();
  const canPersist = backendReachable && !isDemo;

  const [activeTab, setActiveTab] = React.useState<TabKey>('profile');
  const [displayName, setDisplayName] = React.useState(user?.name || '');
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [profileMessage, setProfileMessage] = React.useState('');
  const [profileError, setProfileError] = React.useState('');

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordBusy, setPasswordBusy] = React.useState(false);
  const [securityMessage, setSecurityMessage] = React.useState('');
  const [securityError, setSecurityError] = React.useState('');

  const [mfaEnabled, setMfaEnabled] = React.useState(Boolean(user?.mfaEnabled));
  const [mfaPassword, setMfaPassword] = React.useState('');
  const [mfaSecret, setMfaSecret] = React.useState('');
  const [mfaUri, setMfaUri] = React.useState('');
  const [mfaCode, setMfaCode] = React.useState('');
  const [mfaBusy, setMfaBusy] = React.useState(false);

  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = React.useState(false);
  const [workspaceError, setWorkspaceError] = React.useState('');

  const [preferences, setPreferences] = React.useState<Preferences>(loadPreferences);
  const [preferencesSaved, setPreferencesSaved] = React.useState(false);

  const docBase = `${process.env.PUBLIC_URL || ''}/docs`;
  const openApiHref = `${docBase}/OPENAPI.md`;
  const apiFallbackHref = `${docBase}/API.md`;
  const quickstartHref = `${docBase}/QUICKSTART_CBOM.md`;
  const privacyHref = `${docBase}/PRIVACY.md`;
  const legalHref = `${docBase}/LEGAL.md`;
  const [openApiAvailable, setOpenApiAvailable] = React.useState(false);
  const [copyMessage, setCopyMessage] = React.useState('');

  const workspaceAvailable = canPersist && isEnterpriseEdition(edition);

  React.useEffect(() => {
    setDisplayName(user?.name || '');
  }, [user?.name]);

  React.useEffect(() => {
    if (typeof user?.mfaEnabled === 'boolean') setMfaEnabled(user.mfaEnabled);
  }, [user?.mfaEnabled]);

  React.useEffect(() => {
    if (!workspaceAvailable || activeTab !== 'workspace') {
      setMembers([]);
      setWorkspaceLoading(false);
      setWorkspaceError('');
      return;
    }
    let cancelled = false;
    setWorkspaceLoading(true);
    setWorkspaceError('');
    authService
      .workspaceUsers()
      .then((response) => {
        if (cancelled) return;
        const data = (response?.data || {}) as { users?: WorkspaceMember[] } | WorkspaceMember[];
        const list = Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : [];
        setMembers(
          list.map((member, index) => ({
            id: String(member?.id || `${index}`),
            name: String(member?.name || 'not available'),
            email: String(member?.email || 'not available'),
            role: String(member?.role || 'not available'),
          })),
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) setWorkspaceError(errorMessage(error, 'Unable to load workspace membership.'));
      })
      .finally(() => {
        if (!cancelled) setWorkspaceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, workspaceAvailable]);

  React.useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      setPreferencesSaved(false);
    }
  }, [preferences]);

  React.useEffect(() => {
    if (activeTab !== 'developer' || typeof fetch !== 'function') return;
    const controller = new AbortController();
    fetch(openApiHref, { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setOpenApiAvailable(response.ok);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOpenApiAvailable(false);
      });
    return () => controller.abort();
  }, [activeTab, openApiHref]);

  const saveProfile = async () => {
    setProfileError('');
    setProfileMessage('');
    if (!canPersist) {
      setProfileError(
        isDemo
          ? 'Demo sessions are local-only; profile changes cannot be persisted.'
          : 'This static session has no backend capability; profile changes cannot be persisted.',
      );
      return;
    }
    setProfileBusy(true);
    try {
      await updateProfile(displayName.trim());
      setProfileMessage('Profile saved.');
    } catch (error: unknown) {
      setProfileError(errorMessage(error, 'Unable to save profile.'));
    } finally {
      setProfileBusy(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSecurityError('');
    setSecurityMessage('');
    if (newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.');
      return;
    }
    if (!canPersist) {
      setSecurityError(
        isDemo
          ? 'Demo sessions cannot change a production password.'
          : 'Password changes require the backend control plane.',
      );
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityMessage('Password updated.');
    } catch (error: unknown) {
      setSecurityError(errorMessage(error, 'Unable to change password.'));
    } finally {
      setPasswordBusy(false);
    }
  };

  const startMfa = async () => {
    setSecurityError('');
    setSecurityMessage('');
    if (!canPersist) {
      setSecurityError(
        isDemo
          ? 'Demo sessions cannot enroll MFA; no TOTP secret is stored.'
          : 'MFA enrollment requires the backend control plane.',
      );
      return;
    }
    if (!mfaPassword) {
      setSecurityError('Enter your current password to begin MFA enrollment.');
      return;
    }
    setMfaBusy(true);
    try {
      const response = await authService.mfaSetup({ password: mfaPassword });
      const secret = String(response?.data?.secret || response?.data?.totp_secret || '');
      setMfaSecret(secret);
      setMfaUri(String(response?.data?.provisioning_uri || ''));
      setMfaCode('');
      setSecurityMessage(
        secret
          ? 'Add the secret to your authenticator, then confirm with a 6-digit code.'
          : 'MFA setup started. Confirm with a 6-digit authenticator code.',
      );
    } catch (error: unknown) {
      setSecurityError(errorMessage(error, 'Unable to start MFA setup.'));
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmMfa = async () => {
    setSecurityError('');
    setSecurityMessage('');
    if (!canPersist) {
      setSecurityError('MFA confirmation requires the backend control plane.');
      return;
    }
    if (mfaCode.trim().length < 6) {
      setSecurityError('Enter the 6-digit authenticator code.');
      return;
    }
    setMfaBusy(true);
    try {
      await authService.mfaConfirm({ secret: mfaSecret || undefined, code: mfaCode.trim() });
      setMfaEnabled(true);
      setMfaSecret('');
      setMfaUri('');
      setMfaCode('');
      setMfaPassword('');
      setSecurityMessage('MFA enabled for this account.');
      void Promise.resolve(refreshMe()).catch(() => undefined);
    } catch (error: unknown) {
      setSecurityError(errorMessage(error, 'Unable to confirm MFA.'));
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    setSecurityError('');
    setSecurityMessage('');
    if (!canPersist) {
      setSecurityError('Disabling MFA requires the backend control plane.');
      return;
    }
    if (!mfaPassword || mfaCode.trim().length < 6) {
      setSecurityError('Enter your current password and a 6-digit authenticator code.');
      return;
    }
    setMfaBusy(true);
    try {
      await authService.mfaDisable({ password: mfaPassword, code: mfaCode.trim() });
      setMfaEnabled(false);
      setMfaCode('');
      setMfaPassword('');
      setSecurityMessage('MFA disabled for this account.');
      void Promise.resolve(refreshMe()).catch(() => undefined);
    } catch (error: unknown) {
      setSecurityError(errorMessage(error, 'Unable to disable MFA.'));
    } finally {
      setMfaBusy(false);
    }
  };

  const updatePreference = (key: keyof Preferences, value: boolean) => {
    setPreferences((previous) => ({ ...previous, [key]: value }));
    setPreferencesSaved(true);
  };

  const copyQuickstart = async () => {
    setCopyMessage('');
    try {
      if (!navigator.clipboard) {
        setCopyMessage('Copy is unavailable in this browser.');
        return;
      }
      await navigator.clipboard.writeText(quickstartHref);
      setCopyMessage('Quickstart link copied.');
    } catch {
      setCopyMessage('Copy is unavailable in this browser.');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', pb: PRISM.spacing(4), boxSizing: 'border-box' }}>
      <PageFrame
        eyebrow="Console account"
        title="Account Centre"
        subtitle="Changes persist only where a backend capability exists; demo and static sessions are read-only."
        badge={edition}
      >
        <Box sx={{ minWidth: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: TabKey) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Account Centre sections"
            sx={{
              maxWidth: '100%',
              borderBottom: `1px solid ${NEBULA.line}`,
              '& .MuiTabs-flexContainer': { flexWrap: 'nowrap' },
              '& .MuiTab-root': { whiteSpace: 'nowrap', color: NEBULA.muted },
              '& .MuiTab-root.Mui-selected': { color: NEBULA.text },
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.key}
                label={tab.label}
                value={tab.key}
                id={`account-tab-${tab.key}`}
                aria-controls={`account-panel-${tab.key}`}
              />
            ))}
          </Tabs>

          {activeTab === 'profile' && (
            <TabPanel panelId="profile">
              <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                  <SectionCard title="Profile" caption="Only the display name can be changed when a backend capability exists.">
                    <Stack spacing={1.75}>
                      {!canPersist && (
                        <Alert severity="info">
                          {isDemo
                            ? 'Demo sessions are local-only, so profile changes cannot be persisted.'
                            : 'This static session has no backend capability, so profile changes cannot be persisted.'}
                        </Alert>
                      )}
                      {profileError && <Alert severity="error">{profileError}</Alert>}
                      {profileMessage && <Alert severity="success">{profileMessage}</Alert>}
                      <TextField
                        fullWidth
                        size="small"
                        label="Display name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        inputProps={{ maxLength: 120 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Email (read-only)"
                        value={user?.email || 'not available'}
                        InputProps={{ readOnly: true }}
                        helperText="Email is the sign-in identifier and cannot be changed here."
                      />
                      <Button
                        type="button"
                        variant="contained"
                        onClick={saveProfile}
                        disabled={!canPersist || profileBusy}
                        sx={{
                          ...proBlueContainedButtonSx,
                          alignSelf: 'flex-start',
                          borderRadius: `${designSystem.radius.sm}px`,
                          px: 3,
                        }}
                      >
                        Save profile
                      </Button>
                    </Stack>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={5}>
                  <SectionCard title="Account facts" caption="Read-only values supplied by the authenticated session.">
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <ReadOnlyChip label="User ID" value={user?.id} />
                      <ReadOnlyChip label="Role" value={user?.role} />
                      <ReadOnlyChip label="Tenant ID" value={user?.tenantId} />
                      <ReadOnlyChip label="Edition" value={edition} />
                      <ReadOnlyChip
                        label="MFA"
                        value={
                          typeof user?.mfaEnabled === 'boolean'
                            ? user.mfaEnabled
                              ? 'enabled'
                              : 'disabled'
                            : null
                        }
                      />
                    </Stack>
                  </SectionCard>
                </Grid>
              </Grid>
            </TabPanel>
          )}

          {activeTab === 'security' && (
            <TabPanel panelId="security">
              <Grid container spacing={2}>
                {!canPersist && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Security changes require the backend control plane. Demo and static sessions cannot persist
                      password or MFA changes.
                    </Alert>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <SectionCard title="Change password" caption="Updates the authenticated account through the API.">
                    <Stack component="form" spacing={1.5} onSubmit={submitPassword} sx={{ minWidth: 0 }}>
                      {securityError && <Alert severity="error">{securityError}</Alert>}
                      {securityMessage && <Alert severity="success">{securityMessage}</Alert>}
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="Current password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                      />
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="New password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                      />
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="Confirm new password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                      />
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Button type="submit" variant="contained" disabled={passwordBusy} sx={{ alignSelf: 'flex-start', px: 3 }}>
                          Update password
                        </Button>
                        <Button component={RouterLink} to="/forgot-password" variant="text">
                          Forgot password?
                        </Button>
                      </Stack>
                    </Stack>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Multi-factor authentication" caption="TOTP enrollment and removal use the backend MFA endpoints.">
                    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                      <Chip
                        label={mfaEnabled ? 'MFA enabled' : 'MFA off'}
                        color={mfaEnabled ? 'success' : 'default'}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      {!mfaEnabled && !mfaSecret && (
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label="Password for MFA setup"
                            value={mfaPassword}
                            onChange={(event) => setMfaPassword(event.target.value)}
                            autoComplete="current-password"
                          />
                          <Button
                            type="button"
                            variant="contained"
                            onClick={startMfa}
                            disabled={mfaBusy || !mfaPassword}
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            Enroll authenticator
                          </Button>
                        </Stack>
                      )}
                      {mfaSecret && !mfaEnabled && (
                        <Stack spacing={1.5}>
                          <Alert severity="info">
                            <Box component="span" sx={{ display: 'block', wordBreak: 'break-all' }}>
                              Secret: {mfaSecret}
                            </Box>
                            {mfaUri && (
                              <Box component="span" sx={{ display: 'block', wordBreak: 'break-all', mt: 0.5 }}>
                                {mfaUri}
                              </Box>
                            )}
                          </Alert>
                          <TextField
                            fullWidth
                            size="small"
                            label="Authenticator code"
                            value={mfaCode}
                            onChange={(event) => setMfaCode(event.target.value)}
                            inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                          />
                          <Button
                            type="button"
                            variant="contained"
                            onClick={confirmMfa}
                            disabled={mfaBusy || mfaCode.trim().length < 6}
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            Confirm MFA
                          </Button>
                        </Stack>
                      )}
                      {mfaEnabled && (
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label="Current password for MFA"
                            value={mfaPassword}
                            onChange={(event) => setMfaPassword(event.target.value)}
                            autoComplete="current-password"
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Authenticator code"
                            value={mfaCode}
                            onChange={(event) => setMfaCode(event.target.value)}
                            inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                          />
                          <Button
                            type="button"
                            variant="outlined"
                            color="warning"
                            onClick={disableMfa}
                            disabled={mfaBusy || !mfaPassword || mfaCode.trim().length < 6}
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            Disable MFA
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  </SectionCard>
                </Grid>
              </Grid>
            </TabPanel>
          )}

          {activeTab === 'workspace' && (
            <TabPanel panelId="workspace">
              <SectionCard title="Workspace membership" caption="Members are loaded only from the Enterprise control plane.">
                {!workspaceAvailable ? (
                  <Alert severity="info">Workspace membership requires the Enterprise control plane.</Alert>
                ) : (
                  <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                    {workspaceLoading && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                          Loading workspace membership…
                        </Typography>
                      </Stack>
                    )}
                    {workspaceError && <Alert severity="error">{workspaceError}</Alert>}
                    {!workspaceLoading && !workspaceError && members.length === 0 && (
                      <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                        No workspace members were returned by the control plane.
                      </Typography>
                    )}
                    {members.length > 0 && (
                      <Stack divider={<Divider flexItem />} sx={{ minWidth: 0 }}>
                        {members.map((member) => (
                          <Stack
                            key={member.id}
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={{ xs: 0.25, sm: 1.5 }}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            sx={{ py: 0.75, minWidth: 0 }}
                          >
                            <Typography sx={{ fontWeight: 600, color: NEBULA.text, minWidth: 0, wordBreak: 'break-word' }}>
                              {member.name}
                            </Typography>
                            <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem', minWidth: 0, wordBreak: 'break-all', flex: 1 }}>
                              {member.email}
                            </Typography>
                            <Chip label={member.role} size="small" variant="outlined" sx={{ alignSelf: 'flex-start', color: NEBULA.text, borderColor: NEBULA.line }} />
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                )}
              </SectionCard>
            </TabPanel>
          )}

          {activeTab === 'integrations' && (
            <TabPanel panelId="integrations">
              <Grid container spacing={2}>
                {INTEGRATIONS.map((integration) => (
                  <Grid item xs={12} sm={6} lg={4} key={integration.name}>
                    <SectionCard title={integration.name}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip
                          label={integration.status}
                          size="small"
                          color={integration.status === 'Not supported' ? 'default' : 'info'}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem', lineHeight: 1.5 }}>
                        {integration.detail}
                      </Typography>
                    </SectionCard>
                  </Grid>
                ))}
              </Grid>
            </TabPanel>
          )}

          {activeTab === 'developer' && (
            <TabPanel panelId="developer">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <SectionCard title="API reference" caption="Documentation links resolve relative to the configured public base path.">
                    <Link
                      href={openApiAvailable ? openApiHref : apiFallbackHref}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ color: NEBULA.accent, wordBreak: 'break-all' }}
                    >
                      API documentation
                    </Link>
                    <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {openApiAvailable ? openApiHref : apiFallbackHref}
                    </Typography>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="CLI quickstart" caption="Copy the quickstart guide link for CBOM generation.">
                    <Link href={quickstartHref} target="_blank" rel="noreferrer" sx={{ color: NEBULA.accent, wordBreak: 'break-all' }}>
                      {quickstartHref}
                    </Link>
                    <Button type="button" variant="outlined" onClick={copyQuickstart} sx={{ alignSelf: 'flex-start' }}>
                      Copy quickstart link
                    </Button>
                    {copyMessage && (
                      <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem' }}>{copyMessage}</Typography>
                    )}
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">No API keys are created here; Enterprise keys are admin-managed.</Alert>
                </Grid>
              </Grid>
            </TabPanel>
          )}

          {activeTab === 'preferences' && (
            <TabPanel panelId="preferences">
              <SectionCard title="Notification preferences" caption="Toggles are stored in this browser only, not on the server.">
                <Stack spacing={1}>
                  {preferencesSaved && <Alert severity="success">Preferences saved in this browser.</Alert>}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.securityAlerts}
                        onChange={(event) => updatePreference('securityAlerts', event.target.checked)}
                      />
                    }
                    label="Security alerts"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.complianceUpdates}
                        onChange={(event) => updatePreference('complianceUpdates', event.target.checked)}
                      />
                    }
                    label="Compliance updates"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.quantumAlerts}
                        onChange={(event) => updatePreference('quantumAlerts', event.target.checked)}
                      />
                    }
                    label="Quantum readiness alerts"
                  />
                </Stack>
              </SectionCard>
            </TabPanel>
          )}

          {activeTab === 'privacy' && (
            <TabPanel panelId="privacy">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Documents" caption="Policies and legal terms published with the console.">
                    <Stack spacing={1}>
                      <Link href={privacyHref} target="_blank" rel="noreferrer" sx={{ color: NEBULA.accent }}>
                        Privacy documentation
                      </Link>
                      <Link href={legalHref} target="_blank" rel="noreferrer" sx={{ color: NEBULA.accent }}>
                        Legal documentation
                      </Link>
                    </Stack>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Your data" caption="Local sandbox capabilities only.">
                    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ color: NEBULA.text, fontSize: '0.8125rem' }}>Data export and deletion:</Typography>
                        <Chip label="Planned" size="small" variant="outlined" sx={{ color: NEBULA.text, borderColor: tokens.colors.rivicq[400] }} />
                      </Stack>
                      <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                        No billing history exists in the local sandbox.
                      </Typography>
                    </Stack>
                  </SectionCard>
                </Grid>
              </Grid>
            </TabPanel>
          )}
        </Box>
      </PageFrame>
    </Box>
  );
};

export default AccountCenter;
