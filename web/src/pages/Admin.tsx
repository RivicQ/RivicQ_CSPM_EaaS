import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { AdminPanelSettings, Key, People, Policy, Webhook } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';
import { WORKSPACE_ROLES, WorkspaceRole } from '../auth/roles';
import { adminService, authService } from '../services/api';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import { EmptyState } from '../components/ui';

type WorkspaceUser = { id: string; name: string; email: string; role: string };

const LABELED_DEMO_USERS: WorkspaceUser[] = [
  { id: 'demo-admin', name: 'Demo CISO', email: 'demo-ciso@demo.rivicq.local', role: 'admin' },
  { id: 'demo-operator', name: 'Demo Operator', email: 'operator@demo.rivicq.local', role: 'operator' },
  { id: 'demo-analyst', name: 'Demo Analyst', email: 'analyst@demo.rivicq.local', role: 'analyst' },
  { id: 'demo-viewer', name: 'Demo Viewer', email: 'viewer@demo.rivicq.local', role: 'viewer' },
];

const Admin: React.FC = () => {
  const { user, edition, isDemo, backendReachable } = useAuth();
  const [tab, setTab] = React.useState(0);
  const [users, setUsers] = React.useState<WorkspaceUser[]>([]);
  const [usersError, setUsersError] = React.useState('');
  const [usersNote, setUsersNote] = React.useState('');
  const [audit, setAudit] = React.useState<any[]>([]);
  const [auditNote, setAuditNote] = React.useState('');
  const [keys, setKeys] = React.useState<any[]>([]);
  const [keysNote, setKeysNote] = React.useState('');
  const [webhooks, setWebhooks] = React.useState<any[]>([]);
  const [hooksNote, setHooksNote] = React.useState('');
  const [sso, setSso] = React.useState<any[]>([]);
  const [ssoNote, setSsoNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [keyDialog, setKeyDialog] = React.useState(false);
  const [keyName, setKeyName] = React.useState('CI policy gate');
  const [newKey, setNewKey] = React.useState('');
  const [hookDialog, setHookDialog] = React.useState(false);
  const [hookName, setHookName] = React.useState('Findings webhook');
  const [hookUrl, setHookUrl] = React.useState('https://example.invalid/hooks/rivicq');
  const [samlEntity, setSamlEntity] = React.useState('');
  const [samlAcs, setSamlAcs] = React.useState('');
  const [actionError, setActionError] = React.useState('');

  const enterpriseApi = isPaidEdition(edition) && backendReachable && !isDemo;

  const loadUsers = React.useCallback(async () => {
    setUsersError('');
    if (isDemo || !backendReachable) {
      setUsers(LABELED_DEMO_USERS);
      setUsersNote('Labeled demo directory — not a live tenant. Role changes are disabled here.');
      return;
    }
    try {
      const resp = await authService.workspaceUsers();
      setUsers(resp.data?.users || []);
      setUsersNote('');
    } catch (err: any) {
      setUsersError(err?.response?.data?.error || 'Unable to load workspace users');
      setUsers([]);
    }
  }, [backendReachable, isDemo]);

  const loadControlPlane = React.useCallback(async () => {
    if (!backendReachable || isDemo) {
      setAudit([]);
      setKeys([]);
      setWebhooks([]);
      setSso([]);
      setAuditNote('Audit log requires a live Enterprise API and database.');
      setKeysNote('API keys require the Enterprise control plane.');
      setHooksNote('Webhooks require the Enterprise control plane.');
      setSsoNote('SSO configuration is stored only — live SAML/OIDC login is not enabled yet.');
      return;
    }
    try {
      const events = await adminService.auditEvents();
      setAudit(events.data?.events || []);
      setAuditNote(events.data?.events?.length ? '' : 'No audit events in this tenant yet (or Enterprise DB is unavailable).');
    } catch (err: any) {
      setAudit([]);
      setAuditNote(err?.response?.status === 404
        ? 'Audit API is not on this Community server.'
        : (err?.response?.data?.error || 'Audit log unavailable'));
    }
    try {
      const listed = await adminService.apiKeys();
      setKeys(listed.data?.api_keys || []);
      setKeysNote('');
    } catch (err: any) {
      setKeys([]);
      setKeysNote(err?.response?.status === 404 ? 'API keys are an Enterprise control-plane feature.' : (err?.response?.data?.error || 'API keys unavailable'));
    }
    try {
      const listed = await adminService.webhooks();
      setWebhooks(listed.data?.webhooks || []);
      setHooksNote('');
    } catch (err: any) {
      setWebhooks([]);
      setHooksNote(err?.response?.status === 404 ? 'Webhooks are an Enterprise control-plane feature.' : (err?.response?.data?.error || 'Webhooks unavailable'));
    }
    try {
      const listed = await adminService.ssoProviders();
      setSso(listed.data?.providers || []);
      setSsoNote('Saving SAML/LDAP stores IdP metadata. It does not complete a live login handshake.');
    } catch (err: any) {
      setSso([]);
      setSsoNote(err?.response?.status === 404 ? 'SSO config is an Enterprise control-plane feature.' : (err?.response?.data?.error || 'SSO unavailable'));
    }
  }, [backendReachable, isDemo]);

  React.useEffect(() => {
    loadUsers();
    loadControlPlane();
  }, [loadUsers, loadControlPlane]);

  const changeRole = async (id: string, role: WorkspaceRole) => {
    setActionError('');
    setBusy(true);
    try {
      await authService.updateWorkspaceUserRole(id, role);
      await loadUsers();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Role update failed');
    } finally {
      setBusy(false);
    }
  };

  const createKey = async () => {
    setActionError('');
    setBusy(true);
    try {
      const resp = await adminService.createApiKey({ name: keyName, role: 'viewer' });
      setNewKey(resp.data?.key || resp.data?.api_key || '');
      setKeyDialog(false);
      await loadControlPlane();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Unable to create API key — Enterprise database may be unavailable');
    } finally {
      setBusy(false);
    }
  };

  const createWebhook = async () => {
    setActionError('');
    setBusy(true);
    try {
      await adminService.createWebhook({ name: hookName, url: hookUrl, events: ['scan.completed'] });
      setHookDialog(false);
      await loadControlPlane();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Unable to create webhook — Enterprise database may be unavailable');
    } finally {
      setBusy(false);
    }
  };

  const saveSaml = async () => {
    setActionError('');
    setBusy(true);
    try {
      await adminService.configureSaml({
        entity_id: samlEntity || 'https://rivicq.example/saml',
        acs_url: samlAcs || 'https://rivicq.example/api/v1/sso/saml/acs',
        idp_metadata: '<EntityDescriptor />',
        enabled: true,
      });
      await loadControlPlane();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Unable to store SAML config');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Enterprise control plane"
      title="Admin console"
      subtitle="Workspace members, immutable audit, API keys, webhooks, and SSO configuration. Roles are enforced on the server."
      badge={edition.toUpperCase()}
      action={
        <Chip icon={<AdminPanelSettings />} label={user?.role || 'admin'} color="primary" variant="outlined" />
      }
    >
      <Stack spacing={2}>
        {isDemo && (
          <Alert severity="warning">
            Demo environment — sample directory only. This is not a customer tenant and is not a certification.
          </Alert>
        )}
        {actionError && <Alert severity="error">{actionError}</Alert>}
        <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="scrollable" allowScrollButtonsMobile>
          <Tab icon={<People />} iconPosition="start" label="Users & roles" />
          <Tab icon={<Policy />} iconPosition="start" label="Audit log" />
          <Tab icon={<Key />} iconPosition="start" label="API keys" />
          <Tab icon={<Webhook />} iconPosition="start" label="Webhooks" />
          <Tab icon={<AdminPanelSettings />} iconPosition="start" label="SSO" />
        </Tabs>

        {tab === 0 && (
          <GlassCard>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>Workspace members</Typography>
              {usersNote && <Alert severity="info">{usersNote}</Alert>}
              {usersError && <Alert severity="error">{usersError}</Alert>}
              {users.length === 0 && !usersError ? (
                <EmptyState title="No users" description="Register an account or seed bootstrap users on the API." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={row.role}
                            disabled={busy || isDemo || !backendReachable}
                            onChange={(e) => changeRole(row.id, e.target.value as WorkspaceRole)}
                            sx={{ minWidth: 140 }}
                          >
                            {WORKSPACE_ROLES.map((role) => (
                              <MenuItem key={role} value={role}>{role}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </GlassCard>
        )}

        {tab === 1 && (
          <GlassCard>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>Immutable audit log</Typography>
              {auditNote && <Alert severity="info">{auditNote}</Alert>}
              {audit.length === 0 ? (
                <EmptyState title="No events" description="Events appear when the Enterprise database is connected and the control plane is serving traffic." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Path</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {audit.slice(0, 50).map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>{ev.created_at || '—'}</TableCell>
                        <TableCell>{ev.event_type || '—'}</TableCell>
                        <TableCell>{ev.method || '—'}</TableCell>
                        <TableCell>{ev.path || '—'}</TableCell>
                        <TableCell>{ev.status ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </GlassCard>
        )}

        {tab === 2 && (
          <GlassCard>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>API keys</Typography>
                <Button variant="contained" disabled={!enterpriseApi || busy} onClick={() => setKeyDialog(true)}>
                  Create key
                </Button>
              </Stack>
              {keysNote && <Alert severity="info">{keysNote}</Alert>}
              {newKey && (
                <Alert severity="warning">
                  Copy this key now — it is shown once: <Box component="code" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>{newKey}</Box>
                </Alert>
              )}
              {keys.length === 0 ? (
                <EmptyState title="No API keys" description="Keys are stored hashed in the Enterprise database. Community servers do not issue them." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Prefix</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell>{k.name}</TableCell>
                        <TableCell>{k.key_prefix}</TableCell>
                        <TableCell>{k.role}</TableCell>
                        <TableCell>{k.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </GlassCard>
        )}

        {tab === 3 && (
          <GlassCard>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>Webhooks</Typography>
                <Button variant="contained" disabled={!enterpriseApi || busy} onClick={() => setHookDialog(true)}>
                  Add webhook
                </Button>
              </Stack>
              {hooksNote && <Alert severity="info">{hooksNote}</Alert>}
              {webhooks.length === 0 ? (
                <EmptyState title="No webhooks" description="Webhooks notify your systems when scans complete. They require the Enterprise database." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>URL</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhooks.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{h.name}</TableCell>
                        <TableCell>{h.url}</TableCell>
                        <TableCell>{h.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </GlassCard>
        )}

        {tab === 4 && (
          <GlassCard>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>SSO configuration</Typography>
              {ssoNote && <Alert severity="info">{ssoNote}</Alert>}
              {sso.length === 0 ? (
                <EmptyState title="No SSO providers stored" description="OIDC login and a full SAML ACS handshake are not live yet. You can store SAML metadata for operations." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Provider</TableCell>
                      <TableCell>Enabled</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sso.map((p, idx) => (
                      <TableRow key={`${p.provider}-${idx}`}>
                        <TableCell>{p.provider}</TableCell>
                        <TableCell>{p.enabled ? 'yes' : 'no'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <TextField label="SAML entity ID" size="small" value={samlEntity} onChange={(e) => setSamlEntity(e.target.value)} />
              <TextField label="ACS URL" size="small" value={samlAcs} onChange={(e) => setSamlAcs(e.target.value)} />
              <Button variant="outlined" disabled={!enterpriseApi || busy} onClick={saveSaml}>
                Store SAML config
              </Button>
            </Stack>
          </GlassCard>
        )}
      </Stack>

      <Dialog open={keyDialog} onClose={() => setKeyDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create API key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Key name"
            fullWidth
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !keyName} onClick={createKey}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hookDialog} onClose={() => setHookDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add webhook</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" fullWidth value={hookName} onChange={(e) => setHookName(e.target.value)} />
            <TextField label="HTTPS URL" fullWidth value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHookDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !hookName || !hookUrl} onClick={createWebhook}>Save</Button>
        </DialogActions>
      </Dialog>
    </PageFrame>
  );
};

export default Admin;
