import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Chip,
  Stack,
} from '@mui/material';
import {
  Save,
  Security,
  Notifications,
  Person,
  Cloud,
  WorkspacePremium,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { isEnterpriseEdition } from '../config/editions';
import PageFrame from '../components/PageFrame';

const Settings: React.FC = () => {
  const { user, edition } = useAuth();
  const displayName = user?.name || 'Workspace user';
  const email = user?.email || 'unknown@rivicq.com';

  return (
    <PageFrame
      eyebrow="Profile & Access"
      title="Settings"
      subtitle="Manage your profile, security defaults, and connected cloud integrations from one clean workspace."
      badge={edition.toUpperCase()}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Typography variant="h6">Profile</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">{displayName}</Typography>
                    <Typography variant="body2" color="text.secondary">{email}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip label={edition.toUpperCase()} size="small" />
                      <Chip label={user?.role || 'workspace-user'} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                </Box>
                <TextField fullWidth label="Display Name" defaultValue={displayName} />
                <TextField fullWidth label="Email" defaultValue={email} />
                <Button variant="contained" startIcon={<Save />}>Save Changes</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color="primary" />
                  <Typography variant="h6">Security</Typography>
                </Box>
                <FormControlLabel control={<Switch defaultChecked />} label="Two-Factor Authentication" />
                <Divider />
                <FormControlLabel control={<Switch defaultChecked />} label="Email Notifications" />
                <Divider />
                <FormControlLabel control={<Switch />} label="Session Timeout (30 minutes)" />
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Workspace mode</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {edition === 'enterprise'
                      ? 'Enterprise mode enables compliance, cloud governance, quantum attestation, and HSM controls.'
                      : edition === 'professional'
                        ? 'Professional mode enables compliance, multi-cloud posture, and the full security module suite.'
                        : 'Community mode focuses on inventory, scanner, and local developer workflows.'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Cloud color="primary" />
                <Typography variant="h6">Cloud Integrations</Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip label="AWS Connected" color="success" icon={<Cloud />} />
                <Chip label="GCP Connected" color="success" icon={<Cloud />} />
                {isEnterpriseEdition(edition) && <Chip label="IBM Cloud Connected" color="success" icon={<Cloud />} />}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Notifications color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <FormControlLabel control={<Switch defaultChecked />} label="Security Alerts" />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel control={<Switch defaultChecked />} label="Compliance Updates" />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel control={<Switch defaultChecked />} label="Quantum Readiness Alerts" />
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkspacePremium color="secondary" />
                <Typography variant="body2" color="text.secondary">
                  Profile updates stay local until you save them to the workspace.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default Settings;
