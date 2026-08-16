import React from 'react';
import { Box, Typography } from '@mui/material';
import dashboardDesign from '../../theme/dashboardDesign';

const SEV_MAP: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

type SeverityBadgeProps = {
  severity: string;
  compact?: boolean;
};

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, compact }) => {
  const idx = SEV_MAP[severity.toLowerCase()] ?? 0;
  const color = dashboardDesign.severity.palette[idx] || dashboardDesign.severity.low;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: compact ? 1 : 1.25,
        py: compact ? 0.25 : 0.375,
        borderRadius: 1,
        bgcolor: `${color}16`,
        border: 1,
        borderColor: `${color}33`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${color}22`,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Typography
        sx={{
          fontSize: compact ? '0.625rem' : '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color,
          textTransform: 'uppercase',
        }}
      >
        {severity}
      </Typography>
    </Box>
  );
};

export default SeverityBadge;
