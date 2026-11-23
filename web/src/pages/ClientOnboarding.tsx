import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PageFrame from '../components/PageFrame';
import { useAuth } from '../context/AuthContext';
import { ARCHIFY_FONTS, NEBULA, nebulaCardSx, nebulaPanelSx } from '../theme/nebulaSurfaces';
import { PRISM } from '../theme/prism';

const STORAGE_KEY = 'rivicq.client.onboarding.checklist.v1';

const STEPS = [
  {
    id: 'account',
    title: 'Confirm your account details',
    detail: 'Open Account Centre to review the identity supplied by your authenticated session.',
    to: '/account',
    linkLabel: 'Account Centre',
  },
  {
    id: 'demo',
    title: 'Explore the labeled product demo',
    detail: 'Use the Demo trail to evaluate sample data; it is not a live scan or customer workspace.',
    to: '/demo',
    linkLabel: 'Labeled product demo',
  },
  {
    id: 'workflow',
    title: 'Build a workflow',
    detail: 'Open Workflow Studio to inspect the available workflow stages.',
    to: '/workflow-studio',
    linkLabel: 'Workflow Studio',
  },
  {
    id: 'diagrams',
    title: 'Review the system diagrams',
    detail: 'Browse the Archify diagrams for the operator and component views.',
    to: '/diagrams',
    linkLabel: 'Archify diagrams',
  },
  {
    id: 'sales',
    title: 'Contact sales',
    detail: 'Request an enterprise conversation when you need licensed access or a pilot discussion.',
    to: '/contact',
    linkLabel: 'Contact sales',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];
type Checklist = Record<StepId, boolean>;

const emptyChecklist = (): Checklist => ({
  account: false,
  demo: false,
  workflow: false,
  diagrams: false,
  sales: false,
});

function loadChecklist(): Checklist {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyChecklist();
    const parsed = JSON.parse(raw) as Partial<Checklist> | null;
    const next = emptyChecklist();
    STEPS.forEach((step) => {
      next[step.id] = parsed?.[step.id] === true;
    });
    return next;
  } catch {
    return emptyChecklist();
  }
}

const ClientOnboarding: React.FC = () => {
  const { backendReachable, edition } = useAuth();
  const [checklist, setChecklist] = React.useState<Checklist>(loadChecklist);
  const completed = STEPS.filter((step) => checklist[step.id]).length;

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
    } catch {
      return;
    }
  }, [checklist]);

  const maturity = [
    {
      area: 'Account / profile',
      status: backendReachable ? 'Production implemented' : 'Integration pending',
      detail: backendReachable
        ? 'Profile updates use the backend account endpoints.'
        : 'No backend is reachable here, so account changes cannot be persisted.',
    },
    {
      area: 'EaaS pilot',
      status: 'Beta implemented',
      detail: 'Pilot capability exists in beta; this page grants no approval, allocation, or invitation.',
    },
    {
      area: 'Cloud connectors',
      status: 'Integration pending',
      detail: 'Connector status is not read or asserted by this checklist.',
    },
    {
      area: 'Quantum readiness',
      status: 'Integration pending',
      detail: 'No hardware or quantum result is claimed on this page.',
    },
    {
      area: 'Hardware / HSM',
      status: 'Integration pending',
      detail: 'No device allocation or hardware attestation is claimed here.',
    },
    {
      area: 'Automated provisioning',
      status: 'Planned',
      detail: 'Automated tenant or workspace provisioning is not wired into this page.',
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', pb: PRISM.spacing(4), boxSizing: 'border-box' }}>
      <PageFrame
        eyebrow="Getting started"
        title="Client onboarding"
        subtitle="A local guide to the surfaces that exist today. It does not create a customer record."
        badge={edition}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Box sx={{ ...nebulaCardSx, p: { xs: 1.75, sm: 2.25 }, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, color: NEBULA.text }}>
                    Five-step checklist
                  </Typography>
                  <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem' }}>
                    {completed} of {STEPS.length} complete (local only)
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => setChecklist(emptyChecklist())}>
                  Reset checklist
                </Button>
              </Stack>
              <Box sx={{ ...nebulaPanelSx, p: 1.5, mt: 1.75, bgcolor: 'background.default' }}>
                <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                  Progress is local only: it is saved in this browser through localStorage, is not a backend-customer
                  record, does not change account status, and is not visible to sales.
                </Typography>
              </Box>
              <Stack spacing={1.5} sx={{ mt: 1.75 }}>
                {STEPS.map((step, index) => (
                  <Box
                    key={step.id}
                    sx={{ ...nebulaPanelSx, p: 1.75, minWidth: 0, borderColor: NEBULA.line }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 1.5 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                      <Typography
                        sx={{
                          width: 28,
                          height: 28,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          borderRadius: '50%',
                          border: `1px solid ${NEBULA.line}`,
                          color: NEBULA.text,
                          fontFamily: ARCHIFY_FONTS.mono,
                          fontSize: '0.75rem',
                        }}
                      >
                        {index + 1}
                      </Typography>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ color: NEBULA.text, fontWeight: 600, fontSize: '0.875rem' }}>
                          {step.title}
                        </Typography>
                        <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', lineHeight: 1.5 }}>
                          {step.detail}
                        </Typography>
                        <Button component={RouterLink} to={step.to} size="small" sx={{ mt: 0.5, textTransform: 'none' }}>
                          {step.linkLabel}
                        </Button>
                      </Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist[step.id]}
                            onChange={() =>
                              setChecklist((previous) => ({ ...previous, [step.id]: !previous[step.id] }))
                            }
                          />
                        }
                        label={`Mark complete: ${step.title}`}
                        sx={{ color: NEBULA.text, flexShrink: 0 }}
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Box sx={{ ...nebulaCardSx, p: { xs: 1.75, sm: 2.25 }, minWidth: 0 }}>
              <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, color: NEBULA.text }}>
                Maturity at a glance
              </Typography>
              <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', mb: 1.75 }}>
                Statuses describe implemented surfaces, not customer standing.
              </Typography>
              <Stack spacing={1.25}>
                {maturity.map((item) => (
                  <Box key={item.area} sx={{ ...nebulaPanelSx, p: 1.5, borderColor: NEBULA.line }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography sx={{ color: NEBULA.text, fontWeight: 600, fontSize: '0.8125rem' }}>
                        {item.area}
                      </Typography>
                      <Chip
                        label={item.status}
                        size="small"
                        variant="outlined"
                        sx={{ color: NEBULA.text, borderColor: NEBULA.line }}
                      />
                    </Stack>
                    <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', lineHeight: 1.5, mt: 0.75 }}>
                      {item.detail}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </PageFrame>
    </Box>
  );
};

export default ClientOnboarding;
