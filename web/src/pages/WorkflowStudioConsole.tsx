import React from 'react';
import { Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import WorkflowStudio from '../components/workflow/WorkflowStudio';
import { ARCHIFY_FONTS, NEBULA } from '../theme/nebulaSurfaces';

const WorkflowStudioConsole: React.FC = () => (
  <PageFrame
    eyebrow="Workflows"
    title="Workflow studio"
    subtitle="Animated, data-driven stage maps with controls and static alternatives. SIMULATED means the stage model is explanatory, not a live backend event."
    badge="ARCHIFY PARITY"
  >
    <Typography sx={{ mb: 2, color: NEBULA.muted, fontFamily: ARCHIFY_FONTS.body, fontSize: '0.875rem' }}>
      Use the workflow selector to move between DevSecOps, CBOM, PQC, cloud posture, AI, HSM, wireless, EaaS, remediation, and incident response paths.
    </Typography>
    <WorkflowStudio compact />
  </PageFrame>
);

export default WorkflowStudioConsole;
