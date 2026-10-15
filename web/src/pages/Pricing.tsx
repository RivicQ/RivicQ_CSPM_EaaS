import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Container, Grid, Typography, useTheme } from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import ArchifyWorkflowEmbed from '../components/brand/ArchifyWorkflowEmbed';
import { platformService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { websiteCtaSx, websiteOutlineCtaSx } from '../theme/websiteChrome';
import { ARCHIFY_FONTS, archifyEyebrowSx, nebulaPanelSx } from '../theme/nebulaSurfaces';

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
  const isDark = useTheme().palette.mode === 'dark';
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
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 96 }}>
        <Typography sx={archifyEyebrowSx}>
          Pricing · configuration, not a live PSP
        </Typography>
        <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 500, letterSpacing: '-0.04em', color: 'text.primary', mt: 1, maxWidth: 720 }}>
          Community engine. Licensed control plane.
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, maxWidth: 640 }}>{note}</Typography>
        <Box sx={{ ...nebulaPanelSx, mt: 2, maxWidth: 720, p: 1.75, color: 'text.secondary' }}>
          Card numbers never touch RivicQ. When a payment adapter is configured, provider-hosted checkout and signed webhooks activate entitlements.
        </Box>

        <Grid container spacing={2} sx={{ mt: 4 }}>
          {plans.filter((p) => p.id !== 'custom').map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Box sx={{ ...nebulaPanelSx, p: 2.5, height: '100%' }}>
                <Chip size="small" label={plan.tier} color={plan.enterprise_only ? 'primary' : 'default'} sx={{ mb: 1.5 }} />
                <Typography variant="h5" fontWeight={700}>{plan.name}</Typography>
                <Typography sx={{ color: 'primary.main', fontWeight: 700, my: 1 }}>{formatPrice(plan)}</Typography>
                {(plan.notes || []).map((n) => (
                  <Typography key={n} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{n}</Typography>
                ))}
                <Button
                  sx={{ mt: 2, ...(plan.tier === 'free' || plan.tier === 'developer' ? websiteCtaSx : websiteOutlineCtaSx(isDark)) }}
                  variant={plan.tier === 'free' || plan.tier === 'developer' ? 'contained' : 'outlined'}
                  onClick={() => navigate(plan.tier === 'free' || plan.tier === 'developer' ? '/demo' : '/request-demo')}
                >
                  {plan.tier === 'free' || plan.tier === 'developer' ? 'Start with Community' : 'Written license'}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>

        <ArchifyWorkflowEmbed
          kicker="Pricing · operator workflow"
          title="Community scans and exports evidence. Enterprise licenses the continuous control plane — list prices are not a live PSP."
        />
      </Container>
    </PublicShell>
  );
};

export default Pricing;
