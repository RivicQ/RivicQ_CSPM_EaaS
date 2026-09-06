import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import OperatorRail, { DEFAULT_OPERATOR_STEPS } from './OperatorRail';
import { MotionSection } from '../../motion/primitives';

const COPY = [
  'Point the engine at a public website, host, IP, or GitHub repo. Community does not attach live clusters.',
  'Findings stay linked to assets, algorithms, and controls. Scores are calculated — not a certification.',
  'Remediation is approval-gated. This demo never applies a silent production change.',
  'Export CycloneDX CBOM and operator mappings (DORA, NIS2, BSI). Community is JSON.',
];

const ClientWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const [active, setActive] = React.useState(0);
  return (
    <Box id="workflows" sx={{ mb: 10, scrollMarginTop: 80 }}>
      <MotionSection>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
          How teams work
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 650, letterSpacing: '-0.03em', mb: 1 }}>
          Discover → Assess → Remediate → Report
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3, maxWidth: 680 }}>
          The product is a loop, not a landing page. Walk the same path a CISO, engineer, and auditor share.
        </Typography>
        <OperatorRail active={active} onChange={setActive} />
        <Box sx={{ mt: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2.5, bgcolor: 'background.paper' }}>
          <Typography sx={{ fontWeight: 700, mb: 0.75 }}>{DEFAULT_OPERATOR_STEPS[active].title}</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>{COPY[active]}</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={() => navigate(active === 3 ? '/register' : '/demo')}>
              {active === 3 ? 'Open workspace' : 'Run labeled demo'}
            </Button>
            <Button size="small" disabled={active === 0} onClick={() => setActive((n) => n - 1)}>Back</Button>
            <Button size="small" disabled={active === 3} onClick={() => setActive((n) => n + 1)}>Next</Button>
          </Stack>
        </Box>
      </MotionSection>
    </Box>
  );
};

export default ClientWorkflow;
