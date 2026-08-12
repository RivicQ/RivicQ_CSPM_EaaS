import React from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

type Framework = { id: string; name: string; score: number };

type ComplianceScoreGridProps = {
  frameworks: Framework[];
};

const scoreColor = (score: number) => {
  if (score >= 80) return dashboardDesign.severity.low;
  if (score >= 60) return dashboardDesign.severity.high;
  return dashboardDesign.severity.critical;
};

const ComplianceScoreGrid: React.FC<ComplianceScoreGridProps> = ({ frameworks }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={1.5}>
      {frameworks.map((fw) => {
        const color = scoreColor(fw.score);
        return (
          <Grid item xs={6} sm={4} md={3} key={fw.id}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: `${dashboardDesign.radius.md}px`,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                position: 'relative',
                overflow: 'hidden',
                transition: dashboardDesign.motion.transition,
                '&:hover': { borderColor: `${color}44`, transform: 'translateY(-1px)' },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  bgcolor: color,
                },
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {fw.name}
              </Typography>
              <Typography sx={{ ...metricValueSx, fontSize: '1.5rem', color, mt: 0.5 }}>{fw.score}%</Typography>
              <Box sx={{ mt: 1.25, height: 4, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.08)', overflow: 'hidden' }}>
                <Box sx={{ width: `${fw.score}%`, height: '100%', bgcolor: color, borderRadius: 2 }} />
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ComplianceScoreGrid;
