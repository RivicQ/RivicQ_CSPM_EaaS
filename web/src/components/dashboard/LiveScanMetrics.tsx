import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import { chartTheme } from '../../theme/chartTheme';
import designSystem, { metricValueSx } from '../../theme/designSystem';

export type LiveScanMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  live?: boolean;
  accent?: string;
};

type LiveScanMetricsProps = {
  metrics: LiveScanMetric[];
};

const LiveScanMetrics: React.FC<LiveScanMetricsProps> = ({ metrics }) => {
  const blue = designSystem.proBlue;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))',
        gap: { xs: 1, md: 1.25 },
      }}
    >
      {metrics.map((metric, index) => (
        <Box
          key={metric.id}
          component={motion.div}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.06 }}
          sx={{
            p: 1.5,
            borderRadius: `${dashboardDesign.radius.md}px`,
            bgcolor: 'rgba(255,255,255,0.07)',
            border: `1px solid ${blue.border}`,
            backdropFilter: 'none',
            minHeight: 72,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: dashboardDesign.motion.transition,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.11)',
              borderColor: 'rgba(90,82,104,0.35)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75, mb: 0.75 }}>
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: blue.textMuted,
                lineHeight: 1.3,
              }}
            >
              {metric.label}
            </Typography>
            {metric.live && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: chartTheme.live,
                    animation: 'livePulse 2s ease-in-out infinite',
                    '@keyframes livePulse': {
                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.45, transform: 'scale(0.85)' },
                    },
                  }}
                />
                <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: chartTheme.live, letterSpacing: '0.04em' }}>
                  LIVE
                </Typography>
              </Box>
            )}
          </Box>
          <Typography
            sx={{
              ...metricValueSx,
              fontSize: '1.25rem',
              color: metric.accent || blue.textPrimary,
              lineHeight: 1,
            }}
          >
            {metric.value}
          </Typography>
          {metric.hint && (
            <Typography sx={{ fontSize: '0.6875rem', color: blue.textMuted, mt: 0.5, lineHeight: 1.35 }}>
              {metric.hint}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default LiveScanMetrics;
