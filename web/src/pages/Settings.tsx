import React from 'react';
import { Avatar, Box, Button, Chip, Divider, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import { Save, Security, Notifications, Person, Cloud, WorkspacePremium, GitHub } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { isEnterpriseEdition } from '../config/editions';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import GitHubRepoScanPanel from '../components/GitHubRepoScanPanel';
import designSystem from '../theme/designSystem';

const Settings: React.FC = () => {
  const { user, edition } = useAuth();
  const displayName = user?.name || 'Workspace user';
  const email = user?.email || 'unknown@rivicq.com';

  return (
    <PageFrame eyebrow="Cryptographic Security Posture Management" title="Settings" subtitle="Manage your profile, security defaults, GitHub scanning, and connected cloud integrations." badge={edition.toUpperCase()}>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <GlassCard glow="#6366f1" delay={0}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Person color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Profile</Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 700 }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                <Box>
                  <Typography fontWeight={600}>{displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">{email}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                    <Chip label={edition} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    <Chip label={user?.role || 'admin'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </Stack>
                </Box>
              </Stack>
              <TextField fullWidth label="Display Name" defaultValue={displayName} size="small" />
              <TextField fullWidth label="Email" defaultValue={email} size="small" />
              <Button variant="contained" startIcon={<Save />}>Save Changes</Button>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard glow="#7c3aed" delay={1}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Security color="secondary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Security</Typography>
              </Stack>
              <FormControlLabel control={<Switch defaultChecked />} label="Two-Factor Authentication" />
              <Divider />
              <FormControlLabel control={<Switch defaultChecked />} label="Email Notifications" />
              <Divider />
              <FormControlLabel control={<Switch />} label="Session Timeout (30 min)" />
              <Box sx={{ p: 1.5, borderRadius: `${designSystem.radius.sm}px`, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {isEnterpriseEdition(edition) ? 'Enterprise mode — full module catalog enabled.' : 'Community mode — upgrade for enterprise modules.'}
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard delay={2}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Cloud color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Cloud Integrations</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<Cloud />} label="AWS Connected" color="success" variant="outlined" size="small" />
                <Chip icon={<Cloud />} label="GCP Connected" color="success" variant="outlined" size="small" />
              </Stack>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard delay={3}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Notifications color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
              </Stack>
              <FormControlLabel control={<Switch defaultChecked />} label="Security Alerts" />
              <FormControlLabel control={<Switch defaultChecked />} label="Compliance Updates" />
              <FormControlLabel control={<Switch defaultChecked />} label="Quantum Readiness Alerts" />
              {!isEnterpriseEdition(edition) && (
                <Button variant="outlined" startIcon={<WorkspacePremium />} size="small" sx={{ alignSelf: 'flex-start' }}>
                  Upgrade to Enterprise
                </Button>
              )}
            </Stack>
          </GlassCard>
        </Grid>
        <Grid item xs={12}>
          <GlassCard delay={4}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GitHub color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>GitHub repository scanning</Typography>
                <Chip label="Enterprise scanner" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
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
