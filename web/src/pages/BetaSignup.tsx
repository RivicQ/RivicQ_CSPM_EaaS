import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import ArchifyWorkflowEmbed from '../components/brand/ArchifyWorkflowEmbed';
import { useAuth } from '../context/AuthContext';
import { platformService } from '../services/api';
import { PUBLIC_PAGES_SALES_FORM } from '../data/publicInfrastructure';
import { ARCHIFY_FONTS, archifyEyebrowSx, nebulaPanelSx } from '../theme/nebulaSurfaces';

const ROLES = [
  'Security leader',
  'Security engineer',
  'Platform / DevOps engineer',
  'Compliance / risk',
  'Executive',
  'Partner',
  'Other',
];

const INTERESTS = ['CSPM Community', 'Enterprise pilot', 'EaaS beta', 'Open-Source Cloud', 'Partner'];

type FormState = {
  name: string;
  email: string;
  company: string;
  role: string;
  useCase: string;
  intent: string;
  consent: boolean;
  updates: boolean;
};

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  company: '',
  role: ROLES[0],
  useCase: '',
  intent: INTERESTS[0],
  consent: false,
  updates: false,
};

const SUCCESS_MESSAGE = 'Request recorded. No beta approval or invitation is implied.';
const ERROR_MESSAGE = 'We could not send your request right now. Please try again or email sales@rivicq.com.';
const OFFLINE_NOTICE = `${PUBLIC_PAGES_SALES_FORM} Nothing was submitted to a backend.`;

const BetaSignup: React.FC = () => {
  const { backendReachable } = useAuth();
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mailtoOpened, setMailtoOpened] = React.useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!backendReachable) {
      const subject = `RivicQ beta signup · ${form.intent}`;
      const body = [
        `Full name: ${form.name}`,
        `Work email: ${form.email}`,
        `Organisation: ${form.company}`,
        `Role: ${form.role}`,
        `Use case: ${form.useCase}`,
        `Interest: ${form.intent}`,
        `Consent: ${form.consent ? 'yes' : 'no'}`,
        `Updates: ${form.updates ? 'yes' : 'no'}`,
      ].join('\n');
      setMailtoOpened(true);
      window.location.assign(
        `mailto:sales@rivicq.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      );
      return;
    }
    setLoading(true);
    try {
      await platformService.createLead({ ...form, source: 'beta-signup' });
      setDone(true);
    } catch {
      setError(ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography sx={archifyEyebrowSx}>Access · Beta signup · RivicQ GmbH</Typography>
        <Typography
          sx={{
            fontFamily: ARCHIFY_FONTS.title,
            fontSize: { xs: '2rem', md: '2.6rem' },
            fontWeight: 500,
            letterSpacing: '-0.04em',
            color: 'text.primary',
            mt: 1,
          }}
        >
          Register your interest
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 1.5, mb: 3 }}>
          Tell us about your environment and interest. This records a sales request only; it does not enroll you in a
          beta, approve access, or issue an invitation.
        </Typography>
        {done ? (
          <Box role="status" sx={{ ...nebulaPanelSx, p: 2, color: 'text.secondary' }}>
            {SUCCESS_MESSAGE}
          </Box>
        ) : (
          <Box component="form" onSubmit={submit} sx={{ ...nebulaPanelSx, p: 3 }}>
            {!backendReachable && (
              <Box sx={{ ...nebulaPanelSx, p: 1.75, mb: 2, bgcolor: 'background.default', color: 'text.secondary' }}>
                <Typography sx={{ fontSize: '0.8125rem' }}>{OFFLINE_NOTICE}</Typography>
                {mailtoOpened && (
                  <Typography sx={{ fontSize: '0.8125rem', mt: 0.75 }}>
                    Email draft opened. Nothing was submitted to a backend or beta approval system.
                  </Typography>
                )}
              </Box>
            )}
            {error && (
              <Box sx={{ ...nebulaPanelSx, p: 1.75, mb: 2, borderColor: 'error.main', color: 'error.light' }}>
                <Typography sx={{ fontSize: '0.8125rem' }}>{error}</Typography>
              </Box>
            )}
            <Stack spacing={2}>
              <TextField
                label="Full name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Work email"
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Organisation"
                value={form.company}
                onChange={(event) => update('company', event.target.value)}
                required
                fullWidth
              />
              <TextField
                select
                label="Role"
                value={form.role}
                onChange={(event) => update('role', event.target.value)}
                required
                fullWidth
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Use case"
                value={form.useCase}
                onChange={(event) => update('useCase', event.target.value)}
                required
                multiline
                minRows={3}
                fullWidth
              />
              <TextField
                select
                label="Interest"
                value={form.intent}
                onChange={(event) => update('intent', event.target.value)}
                required
                fullWidth
              >
                {INTERESTS.map((interest) => (
                  <MenuItem key={interest} value={interest}>
                    {interest}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    required
                    checked={form.consent}
                    onChange={(event) => update('consent', event.target.checked)}
                  />
                }
                label="I consent to RivicQ storing these details to respond to this request."
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.updates}
                    onChange={(event) => update('updates', event.target.checked)}
                  />
                }
                label="Send me optional product updates."
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ borderRadius: 999, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                {loading ? 'Sending…' : backendReachable ? 'Submit request' : 'Email sales@'}
              </Button>
            </Stack>
          </Box>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Button component={RouterLink} to="/demo" variant="text">
            Labeled product demo
          </Button>
          <Button component="a" href={`${process.env.PUBLIC_URL || ''}/docs`} variant="text">
            Documentation
          </Button>
        </Stack>
        <ArchifyWorkflowEmbed
          compact
          diagramId="roadmap"
          kicker="Access · roadmap"
          title="Interest requests go to the sales desk; beta approval and invitations are never implied by this form."
        />
      </Container>
    </PublicShell>
  );
};

export default BetaSignup;
