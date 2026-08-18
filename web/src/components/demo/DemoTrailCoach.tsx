import React from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { ArrowBack, ArrowForward, Close } from '@mui/icons-material';
import { useDemoTrail } from '../../context/DemoTrailContext';
import { DEMO_TRAIL_STEPS } from '../../demo/trail';
import { useAuth } from '../../context/AuthContext';
import designSystem, { glassSurface } from '../../theme/designSystem';
import { useTheme } from '@mui/material/styles';

const DemoTrailCoach: React.FC = () => {
  const { isDemo } = useAuth();
  const { active, step, next, back, skip } = useDemoTrail();
  const theme = useTheme();
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
        right: { xs: 12, md: 24 },
        bottom: { xs: 76, sm: 24 },
        left: { xs: 12, md: 'auto' },
        width: { xs: 'auto', md: 380 },
        ...glassSurface(theme, true),
        borderRadius: `${designSystem.radius.xl}px`,
        boxShadow: designSystem.shadow.lg,
        p: 2.25,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Typography variant="overline" color="primary" fontWeight={800}>
          Demo trail · {step}/{DEMO_TRAIL_STEPS.length - 1}
        </Typography>
        <Button size="small" onClick={skip} aria-label="Skip demo trail" sx={{ minWidth: 0, px: 0.5 }}>
          <Close fontSize="small" />
        </Button>
      </Stack>
      <Typography id="demo-trail-title" variant="h6" fontWeight={800} sx={{ mb: 0.75, letterSpacing: '-0.02em' }}>
        {current.title}
      </Typography>
      <Typography id="demo-trail-body" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {current.body}
      </Typography>
      {current.hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontStyle: 'italic' }}>
          {current.hint}
        </Typography>
      )}
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 1.5, height: 6, borderRadius: 3 }} />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" startIcon={<ArrowBack />} onClick={back} disabled={step <= 1}>
          Back
        </Button>
        <Button size="small" variant="contained" endIcon={<ArrowForward />} onClick={next}>
          {step >= DEMO_TRAIL_STEPS.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
};

export default DemoTrailCoach;
