import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Container, Grid, Typography } from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import { platformService } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Plan = {
  id: string;
  name: string;
  tier: string;
  amount_cents: number;
  interval: string;
  notes?: string[];
  enterprise_only?: boolean;
};

const fallbackPlans: Plan[] = [
  { id: 'trial', name: 'Trial', tier: 'free', amount_cents: 0, interval: 'month', notes: ['GitHub Pages is static. Live scans need the CLI or API.'] },
  { id: 'developer', name: 'Developer', tier: 'developer', amount_cents: 0, interval: 'month', notes: ['Apache-2.0 Community engine.'] },
  { id: 'startup', name: 'Startup', tier: 'startup', amount_cents: 49000, interval: 'month', notes: ['List price. Checkout is not live.'] },
  { id: 'professional', name: 'Professional', tier: 'professional', amount_cents: 149000, interval: 'month', notes: ['List price. Webhook is authoritative.'] },
  { id: 'enterprise', name: 'Enterprise', tier: 'enterprise', amount_cents: 0, interval: 'year', enterprise_only: true, notes: ['Custom contract via sales@rivicq.com.'] },
];

const formatPrice = (plan: Plan) => {
  if (plan.enterprise_only || plan.amount_cents === 0) {
    return plan.tier === 'free' || plan.tier === 'developer' ? '€0' : 'Custom';
  }
  return `€${Math.round(plan.amount_cents / 100)} / ${plan.interval}`;
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { backendReachable } = useAuth();
  const [plans, setPlans] = React.useState<Plan[]>(fallbackPlans);
  const [note, setNote] = React.useState('List prices are configuration. Checkout is not live. Control mappings are not certifications.');

  React.useEffect(() => {
    if (!backendReachable) return;
    platformService.plans().then((resp) => {
      if (Array.isArray(resp.data?.plans)) setPlans(resp.data.plans);
      if (resp.data?.note) setNote(resp.data.note);
    }).catch(() => { /* keep fallback catalog */ });
  }, [backendReachable]);

  return (
    <PublicShell>
      <Box sx={{ position: 'relative', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Pricing · configuration, not a live PSP
          </Typography>
          <Typography sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 750, letterSpacing: '-0.03em', color: '#fff', mt: 1, maxWidth: 720 }}>
            Community engine. Licensed control plane.
          </Typography>
          <Typography sx={{ color: '#d1d5db', mt: 2, maxWidth: 640 }}>{note}</Typography>
          <Box sx={{ mt: 2, maxWidth: 720, p: 1.75, bgcolor: '#0a0a0f', border: '1px solid #1f1f2e', borderRadius: 2, color: '#d1d5db' }}>
            Card numbers never touch RivicQ. When a payment adapter is configured, provider-hosted checkout and signed webhooks activate entitlements.
          </Box>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Grid container spacing={2}>
          {plans.filter((p) => p.id !== 'custom').map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Box sx={{ p: 2.5, height: '100%', bgcolor: '#0a0a0f', border: '1px solid #1f1f2e', borderRadius: 2 }}>
                <Chip size="small" label={plan.tier} color={plan.enterprise_only ? 'primary' : 'default'} sx={{ mb: 1.5 }} />
                <Typography variant="h5" fontWeight={700}>{plan.name}</Typography>
                <Typography sx={{ color: '#a78bfa', fontWeight: 700, my: 1 }}>{formatPrice(plan)}</Typography>
                {(plan.notes || []).map((n) => (
                  <Typography key={n} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{n}</Typography>
                ))}
                <Button
                  sx={{ mt: 2, borderRadius: 999, ...(plan.enterprise_only ? { bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } } : { color: '#fff', borderColor: 'rgba(255,255,255,0.45)' }) }}
                  variant={plan.enterprise_only ? 'contained' : 'outlined'}
                  onClick={() => navigate(plan.enterprise_only ? '/request-demo' : '/register')}
                >
                  {plan.enterprise_only ? 'Talk to sales' : 'Start'}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </PublicShell>
  );
};

export default Pricing;
