import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import { useAuth } from '../context/AuthContext';
import { platformService } from '../services/api';
import { PUBLIC_PAGES_SALES_FORM } from '../data/publicInfrastructure';

const INTENTS = [
  { value: 'demo', label: 'Enterprise demo' },
  { value: 'poc', label: 'Book a PoC' },
  { value: 'pilot', label: 'CBOM pilot' },
  { value: 'ibm', label: 'IBM Partner Plus conversation' },
];

const RequestDemo: React.FC = () => {
  const navigate = useNavigate();
  const { backendReachable } = useAuth();
  const [form, setForm] = React.useState({ name: '', email: '', company: '', intent: 'demo' });
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!backendReachable) {
      window.location.href = `mailto:sales@rivicq.com?subject=${encodeURIComponent('RivicQ ' + form.intent)}&body=${encodeURIComponent(
        `Name: ${form.name}\nCompany: ${form.company}\nIntent: ${form.intent}\n`,
      )}`;
      return;
    }
    setLoading(true);
    try {
      await platformService.createLead({ ...form, source: 'request-demo' });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to record the request. Email sales@rivicq.com.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Sales · RivicQ GmbH · Berlin
        </Typography>
        <Typography sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 750, letterSpacing: '-0.03em', color: '#fff', mt: 1 }}>
          Request an enterprise demo
        </Typography>
        <Typography sx={{ color: '#d1d5db', mt: 1.5, mb: 3 }}>
          Tell us who you are. This is not the labeled product demo. Sample dashboards stay on the Demo trail.
        </Typography>
        {done ? (
          <Box sx={{ p: 2, bgcolor: '#0a0a0f', border: '1px solid #1f1f2e', borderRadius: 2, color: '#d1d5db' }}>
            Request recorded. Sales follows up from sales@rivicq.com. Nothing was sent to Discord with your email.
          </Box>
        ) : (
          <Box component="form" onSubmit={submit} sx={{ p: 3, bgcolor: '#0a0a0f', border: '1px solid #1f1f2e', borderRadius: 2 }}>
            {!backendReachable && (
              <Box sx={{ p: 1.75, mb: 2, bgcolor: '#000', border: '1px solid #1f1f2e', borderRadius: 2, color: '#d1d5db' }}>
                {PUBLIC_PAGES_SALES_FORM}
              </Box>
            )}
            {error && (
              <Box sx={{ p: 1.75, mb: 2, bgcolor: '#000', border: '1px solid #7f1d1d', borderRadius: 2, color: '#fecaca' }}>
                {error}
              </Box>
            )}
            <Stack spacing={2}>
              <TextField label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required fullWidth />
              <TextField label="Work email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required fullWidth />
              <TextField label="Organisation" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} required fullWidth />
              <TextField select label="Intent" value={form.intent} onChange={(e) => setForm((p) => ({ ...p, intent: e.target.value }))} fullWidth>
                {INTENTS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ borderRadius: 999, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
                {loading ? 'Sending…' : backendReachable ? 'Submit request' : 'Email sales@'}
              </Button>
              <Stack direction="row" spacing={1}>
                <Button variant="text" onClick={() => navigate('/')}>Home</Button>
                <Button variant="text" onClick={() => navigate('/demo')}>Labeled product demo</Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Container>
    </PublicShell>
  );
};

export default RequestDemo;
