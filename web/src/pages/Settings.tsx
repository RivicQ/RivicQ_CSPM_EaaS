import React from 'react';
import { Avatar, Box, Button, Chip, Divider, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import { Save, Security, Notifications, Person, Cloud, WorkspacePremium, GitHub, Memory, VerifiedUser } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isEnterpriseEdition } from '../config/editions';
import { readAuditLog } from '../utils/auditLog';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import GitHubRepoScanPanel from '../components/GitHubRepoScanPanel';
import designSystem from '../theme/designSystem';
import { tokens } from '../theme/tokens';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, edition, workspace, setWorkspaceName } = useAuth();
  const displayName = user?.name || 'Workspace user';
  const email = user?.email || 'unknown@rivicq.com';
  const [workspaceName, setLocalWorkspaceName] = React.useState(workspace?.name || 'Community workspace');

  const [security, setSecurity] = React.useState({ mfa: true, emailAlerts: true, sessionTimeout: false });
  const [notify, setNotify] = React.useState({ securityAlerts: true, compliance: true, quantum: true });
  const [audit] = React.useState(() => readAuditLog());

  return (
    <PageFrame eyebrow="Cryptographic Security Posture Management" title="Settings" subtitle="Manage your profile, security defaults, GitHub scanning, HSM posture, and connected cloud integrations." badge={edition.toUpperCase()}>
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
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                </Box>
                <Box>
                  <Typography fontWeight={700}>{displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">{email}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                    <Chip label={edition} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    <Chip label={user?.role || 'admin'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </Stack>
                </Box>
              </Stack>
              <TextField fullWidth label="Display Name" defaultValue={displayName} size="small" />
              <TextField fullWidth label="Work email" defaultValue={email} size="small" />
              <TextField
                fullWidth
                size="small"
                label="Workspace name"
                value={workspaceName}
                onChange={(e) => setLocalWorkspaceName(e.target.value)}
                helperText={workspace ? `Workspace ID ${workspace.id}` : 'A local workspace is created on first sign-in.'}
              />
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={() => setWorkspaceName(workspaceName)}
                sx={{ background: designSystem.gradient.brand, alignSelf: 'flex-start', px: 3 }}
              >
                Save Changes
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
              <FormControlLabel
                control={<Switch checked={security.mfa} onChange={(e) => setSecurity((p) => ({ ...p, mfa: e.target.checked }))} />}
                label="Multi-factor authentication"
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={security.emailAlerts} onChange={(e) => setSecurity((p) => ({ ...p, emailAlerts: e.target.checked }))} />}
                label="Email sign-in alerts"
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={security.sessionTimeout} onChange={(e) => setSecurity((p) => ({ ...p, sessionTimeout: e.target.checked }))} />}
                label="Auto session timeout (30 min)"
              />
              <Box sx={{ p: 1.5, borderRadius: `${designSystem.radius.sm}px`, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {isEnterpriseEdition(edition) ? 'Enterprise mode — full module catalog enabled.' : 'Community mode — upgrade for enterprise modules.'}
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
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<Cloud />} label="AWS Connected" color="success" variant="outlined" size="small" />
                <Chip icon={<Cloud />} label="GCP Connected" color="success" variant="outlined" size="small" />
                <Chip icon={<Memory />} label="IBM HPCS (HSM)" color="primary" variant="outlined" size="small" />
                <Chip icon={<VerifiedUser />} label="PQC attestation ready" variant="outlined" size="small" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Hardware security modules and KMS key rings feed the CBOM inventory and quantum-readiness scoring.
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
                <Button variant="outlined" startIcon={<WorkspacePremium />} size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/beta')}>
                  Request Enterprise access
                </Button>
              )}
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12}>
          {isEnterpriseEdition(edition) && (
            <GlassCard delay={3.5}>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Audit log</Typography>
                <Typography variant="body2" color="text.secondary">Basic Enterprise audit trail for this workspace (browser-local until the engine is connected).</Typography>
                {audit.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">No events yet. Exports and scans will appear here.</Typography>
                ) : audit.slice(0, 8).map((e) => (
                  <Typography key={e.id} variant="caption" sx={{ fontFamily: tokens.typography.mono }}>
                    {e.at} · {e.action} {e.detail ? `· ${e.detail}` : ''}
                  </Typography>
                ))}
              </Stack>
            </GlassCard>
          )}
        </Grid>
        <Grid item xs={12}>
          <GlassCard glow={tokens.colors.crypto.quantum} delay={4}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GitHub color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>GitHub repository scanning</Typography>
                <Chip label="Enterprise scanner" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Connect an authorized repository. Scans use GitHub Contents APIs when GITHUB_TOKEN is set. Without a token the engine reports an error instead of fabricating findings.
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
