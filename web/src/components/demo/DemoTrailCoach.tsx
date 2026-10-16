import React from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { ArrowBack, ArrowForward, Close } from '@mui/icons-material';
import { useDemoTrail } from '../../context/DemoTrailContext';
import { DEMO_TRAIL_STEPS } from '../../demo/trail';
import { useAuth } from '../../context/AuthContext';
import { NEBULA } from '../../theme/nebulaSurfaces';

const DemoTrailCoach: React.FC = () => {
  const { isDemo } = useAuth();
  const { active, step, next, back, skip } = useDemoTrail();
  const current = DEMO_TRAIL_STEPS[step];

  if (!isDemo || !active || !current || current.id === 'welcome') return null;

  const progress = ((step) / (DEMO_TRAIL_STEPS.length - 1)) * 100;

  return (
    <Box
      role="dialog"
      aria-labelledby="demo-trail-title"
      aria-describedby="demo-trail-body"
      sx={{
        position: 'fixed',
        zIndex: (t) => t.zIndex.modal,
        right: 12,
        bottom: { xs: 72, sm: 12 },
        left: 'auto',
        width: 280,
        maxWidth: 'calc(100vw - 24px)',
        bgcolor: NEBULA.panel,
        border: '1px solid',
        borderColor: NEBULA.line,
        borderRadius: 1,
        p: 1.25,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: NEBULA.faint }}>
          Trail {step}/{DEMO_TRAIL_STEPS.length - 1}
        </Typography>
        <Button size="small" onClick={skip} aria-label="Skip demo trail" sx={{ minWidth: 0, px: 0.5, minHeight: 24 }}>
          <Close fontSize="small" />
        </Button>
      </Stack>
      <Typography id="demo-trail-title" sx={{ fontSize: '0.875rem', fontWeight: 700, mb: 0.35 }}>
        {current.title}
      </Typography>
      <Typography id="demo-trail-body" sx={{ fontSize: '0.75rem', color: NEBULA.muted, mb: 0.5, lineHeight: 1.4 }}>
        {current.body}
      </Typography>
      {current.hint && (
        <Typography sx={{ display: 'block', mb: 1, fontSize: '0.6875rem', color: NEBULA.faint }}>
          {current.hint}
        </Typography>
      )}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 1, height: 3, borderRadius: 1, bgcolor: NEBULA.line, '& .MuiLinearProgress-bar': { bgcolor: NEBULA.accent } }}
      />
      <Stack direction="row" spacing={0.75} justifyContent="flex-end">
        <Button size="small" startIcon={<ArrowBack />} onClick={back} disabled={step <= 1} sx={{ textTransform: 'none' }}>
          Back
        </Button>
        <Button size="small" variant="contained" endIcon={<ArrowForward />} onClick={next} sx={{ textTransform: 'none', boxShadow: 'none' }}>
          {step >= DEMO_TRAIL_STEPS.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
};

export default DemoTrailCoach;
