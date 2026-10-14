import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

const DIAGRAM = `${process.env.PUBLIC_URL || ''}/archify/diagrams/rivicq-cspm-operator-workflow.html`;

type ArchifyWorkflowEmbedProps = {
  compact?: boolean;
};

const ArchifyWorkflowEmbed: React.FC<ArchifyWorkflowEmbedProps> = ({ compact = false }) => (
  <Box sx={{ mt: compact ? 3 : 6 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} sx={{ mb: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
          Operator workflow
        </Typography>
        <Typography sx={{ fontWeight: 650, letterSpacing: '-0.02em', maxWidth: 640 }}>
          Discover → classify → gate → CBOM report. QBOM stays on the licensed control plane.
        </Typography>
      </Box>
      <Button
        size="small"
        href={DIAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'text.secondary', alignSelf: { xs: 'flex-start', sm: 'auto' } }}
      >
        Open diagram
      </Button>
    </Stack>
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#0a0a0f',
        height: compact ? { xs: 360, md: 440 } : { xs: 420, md: 560 },
      }}
    >
      <Box
        component="iframe"
        title="RivicQ CSPM operator workflow"
        src={`${DIAGRAM}?embed=1`}
        sx={{ width: '100%', height: '100%', border: 0, display: 'block', bgcolor: '#000' }}
      />
    </Box>
  </Box>
);

export default ArchifyWorkflowEmbed;
