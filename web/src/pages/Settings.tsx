import React from 'react';
import { Alert, Avatar, Box, Button, Chip, Divider, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import { Save, Security, Notifications, Person, Cloud, WorkspacePremium, GitHub, Memory, VerifiedUser } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isEnterpriseEdition } from '../config/editions';
import { authService } from '../services/api';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import GitHubRepoScanPanel from '../components/GitHubRepoScanPanel';
import designSystem from '../theme/designSystem';
import { tokens } from '../theme/tokens';

const Settings: React.FC = () => {
  const { user, edition, backendReachable, isDemo, updateProfile, changePassword, refreshMe } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || 'Workspace user';
  const email = user?.email || 'unknown@rivicq.com';

  const [name, setName] = React.useState(displayName);
  const [profileMsg, setProfileMsg] = React.useState('');
  const [profileErr, setProfileErr] = React.useState('');
  const [notify, setNotify] = React.useState({ securityAlerts: true, compliance: true, quantum: true });

  const [mfaEnabled, setMfaEnabled] = React.useState(Boolean(user?.mfaEnabled));
  const [mfaSecret, setMfaSecret] = React.useState('');
  const [mfaUri, setMfaUri] = React.useState('');
  const [mfaCode, setMfaCode] = React.useState('');
  const [mfaMsg, setMfaMsg] = React.useState('');
  const [mfaErr, setMfaErr] = React.useState('');

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [nextPassword, setNextPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pwMsg, setPwMsg] = React.useState('');
  const [pwErr, setPwErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setName(displayName);
    setMfaEnabled(Boolean(user?.mfaEnabled));
  }, [displayName, user?.mfaEnabled]);

  React.useEffect(() => {
    if (!backendReachable || isDemo) return;
    refreshMe().catch(() => undefined);
  }, [backendReachable, isDemo, refreshMe]);

  const saveProfile = async () => {
    setProfileErr('');
    setProfileMsg('');
    if (!backendReachable || isDemo) {
      setProfileErr(isDemo ? 'Demo sessions cannot persist profile changes.' : 'Profile updates require the RivicQ API.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile(name.trim());
      setProfileMsg('Display name saved.');
    } catch (err: any) {
      setProfileErr(err?.response?.data?.error || err?.message || 'Unable to save profile');
    } finally {
      setBusy(false);
    }
  };

  const startMfa = async () => {
    setMfaErr('');
    setMfaMsg('');
    if (!backendReachable || isDemo) {
      setMfaErr('MFA enrollment requires a live API session. Demo mode does not store TOTP secrets.');
      return;
    }
    setBusy(true);
    try {
      const resp = await authService.mfaSetup();
      setMfaSecret(resp.data?.secret || '');
      setMfaUri(resp.data?.provisioning_uri || '');
      setMfaMsg('Add the secret to your authenticator, then confirm with a 6-digit code.');
    } catch (err: any) {
      setMfaErr(err?.response?.data?.error || err?.message || 'Unable to start MFA setup');
    } finally {
      setBusy(false);
    }
  };

  const confirmMfa = async () => {
    setMfaErr('');
    setBusy(true);
    try {
      await authService.mfaConfirm({ secret: mfaSecret, code: mfaCode.trim() });
      setMfaEnabled(true);
      setMfaSecret('');
      setMfaUri('');
      setMfaCode('');
      setMfaMsg('MFA is enabled for this account.');
      await refreshMe();
    } catch (err: any) {
      setMfaErr(err?.response?.data?.error || err?.message || 'Unable to confirm MFA');
    } finally {
      setBusy(false);
    }
  };

  const disableMfa = async () => {
    setMfaErr('');
    if (!mfaCode.trim()) {
      setMfaErr('Enter a current authenticator code to disable MFA.');
      return;
    }
    setBusy(true);
    try {
      await authService.mfaDisable(mfaCode.trim());
      setMfaEnabled(false);
      setMfaCode('');
      setMfaMsg('MFA is disabled.');
      await refreshMe();
    } catch (err: any) {
      setMfaErr(err?.response?.data?.error || err?.message || 'Unable to disable MFA');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setPwErr('');
    setPwMsg('');
    if (nextPassword.length < 8) {
      setPwErr('New password must be at least 8 characters.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setPwErr('New passwords do not match.');
      return;
    }
    if (!backendReachable || isDemo) {
      setPwErr(isDemo ? 'Demo sessions cannot change a production password.' : 'Password changes require the RivicQ API.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setPwMsg('Password updated.');
    } catch (err: any) {
      setPwErr(err?.response?.data?.error || err?.message || 'Unable to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame eyebrow="Cryptographic Security Posture Management" title="Settings" subtitle="Profile, password, MFA, GitHub scanning, and workspace defaults. Cloud chips below are status placeholders until connectors are configured." badge={edition.toUpperCase()}>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <GlassCard glow={tokens.colors.rivicq[500]} delay={0}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Person color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Profile</Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: '2px',
                    borderRadius: '50%',
                    background: designSystem.gradient.brand,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'background.paper', color: 'primary.main', fontWeight: 800 }}>
                    {(name || displayName).charAt(0).toUpperCase()}
                  </Avatar>
                </Box>
                <Box>
                  <Typography fontWeight={700}>{name || displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">{email}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                    <Chip label={edition} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    <Chip label={user?.role || 'viewer'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </Stack>
                </Box>
              </Stack>
              {profileErr && <Alert severity="error">{profileErr}</Alert>}
              {profileMsg && <Alert severity="success">{profileMsg}</Alert>}
              <TextField fullWidth label="Display Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
              <TextField fullWidth label="Work email" value={email} size="small" disabled helperText="Email is the sign-in identifier and cannot be changed here." />
              <Button variant="contained" startIcon={<Save />} disabled={busy} onClick={saveProfile} sx={{ background: designSystem.gradient.brand, alignSelf: 'flex-start', px: 3 }}>
                Save profile
              </Button>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard glow={tokens.colors.crypto.quantum} delay={1}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Security color="secondary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Security &amp; access</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                MFA uses TOTP. Enrollment talks to <code>/auth/mfa/setup</code> — this switch does not fake a enabled state.
              </Typography>
              {mfaErr && <Alert severity="error">{mfaErr}</Alert>}
              {mfaMsg && <Alert severity="success">{mfaMsg}</Alert>}
              <Chip label={mfaEnabled ? 'MFA enabled' : 'MFA off'} color={mfaEnabled ? 'success' : 'default'} size="small" sx={{ alignSelf: 'flex-start' }} />
              {!mfaEnabled && !mfaSecret && (
                <Button variant="contained" disabled={busy} onClick={startMfa} sx={{ alignSelf: 'flex-start' }}>
                  Enroll authenticator
                </Button>
              )}
              {mfaSecret && (
                <Stack spacing={1}>
                  <Alert severity="info">
                    Secret: <Box component="code" sx={{ wordBreak: 'break-all' }}>{mfaSecret}</Box>
                  </Alert>
                  {mfaUri && (
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {mfaUri}
                    </Typography>
                  )}
                  <TextField size="small" label="Authenticator code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputProps={{ maxLength: 6 }} />
                  <Button variant="contained" disabled={busy || mfaCode.trim().length < 6} onClick={confirmMfa} sx={{ alignSelf: 'flex-start' }}>
                    Confirm MFA
                  </Button>
                </Stack>
              )}
              {mfaEnabled && (
                <Stack spacing={1}>
                  <TextField size="small" label="Authenticator code to disable" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputProps={{ maxLength: 6 }} />
                  <Button color="warning" variant="outlined" disabled={busy} onClick={disableMfa} sx={{ alignSelf: 'flex-start' }}>
                    Disable MFA
                  </Button>
                </Stack>
              )}
              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>Change password</Typography>
              {pwErr && <Alert severity="error">{pwErr}</Alert>}
              {pwMsg && <Alert severity="success">{pwMsg}</Alert>}
              <TextField size="small" type="password" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <TextField size="small" type="password" label="New password" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} />
              <TextField size="small" type="password" label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <Button variant="outlined" disabled={busy} onClick={savePassword} sx={{ alignSelf: 'flex-start' }}>
                Update password
              </Button>
              <Box sx={{ p: 1.5, borderRadius: `${designSystem.radius.sm}px`, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {isEnterpriseEdition(edition) ? 'Enterprise workspace — admin console includes audit, API keys, and SSO config.' : 'Community workspace — upgrade for enterprise control-plane modules.'}
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard glow={tokens.colors.crypto.low} delay={2}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Cloud color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Cloud &amp; HSM integrations</Typography>
              </Stack>
              <Alert severity="info">
                Connectors are not marked connected unless the Enterprise control plane has credentials. Empty inventory is expected without them.
              </Alert>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<Cloud />} label="AWS — configure in Admin / Multi-cloud" variant="outlined" size="small" />
                <Chip icon={<Cloud />} label="GCP — configure in Admin / Multi-cloud" variant="outlined" size="small" />
                <Chip icon={<Memory />} label="HSM / TPM — declared inventory" variant="outlined" size="small" />
                <Chip icon={<VerifiedUser />} label="PQC guidance (NIST ML-KEM / ML-DSA)" variant="outlined" size="small" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Hardware security modules and KMS key rings feed CBOM inventory when a connector or declared inventory is present. This is not firmware reverse-engineering.
              </Typography>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard delay={3}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Notifications color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Preferences are stored in this browser only until a notification service is wired.
              </Typography>
              <FormControlLabel
                control={<Switch checked={notify.securityAlerts} onChange={(e) => setNotify((p) => ({ ...p, securityAlerts: e.target.checked }))} />}
                label="Security alerts"
              />
              <FormControlLabel
                control={<Switch checked={notify.compliance} onChange={(e) => setNotify((p) => ({ ...p, compliance: e.target.checked }))} />}
                label="Compliance updates"
              />
              <FormControlLabel
                control={<Switch checked={notify.quantum} onChange={(e) => setNotify((p) => ({ ...p, quantum: e.target.checked }))} />}
                label="Quantum readiness alerts"
              />
              {!isEnterpriseEdition(edition) && (
                <Button variant="outlined" startIcon={<WorkspacePremium />} size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/switcher')}>
                  Upgrade to Enterprise
                </Button>
              )}
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12}>
          <GlassCard glow={tokens.colors.crypto.quantum} delay={4}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GitHub color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>GitHub repository scanning</Typography>
                <Chip label="Authorized Contents API" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Connect an authorized repository. Scans use GitHub Contents APIs when GITHUB_TOKEN is set; otherwise DEMO_MODE serves the synthetic fixture with evidence-backed findings.
              </Typography>
              <GitHubRepoScanPanel />
            </Stack>
          </GlassCard>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default Settings;
