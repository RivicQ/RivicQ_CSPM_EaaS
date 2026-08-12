import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

type PostureRingProps = {
  score: number;
  size?: number;
  label?: string;
  onDark?: boolean;
};

const PostureRing: React.FC<PostureRingProps> = ({ score, size = 120, label = 'Posture', onDark = false }) => {
  const theme = useTheme();
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? dashboardDesign.severity.low
      : score >= 60
        ? dashboardDesign.severity.high
        : dashboardDesign.severity.critical;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={onDark ? 'rgba(255,255,255,0.14)' : (theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.1)')}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            ...metricValueSx,
            fontSize: size * 0.26,
            lineHeight: 1,
            color,
          }}
        >
          {score}
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: onDark ? 'rgba(226,232,240,0.72)' : 'text.secondary', fontWeight: 600, mt: 0.25, letterSpacing: '0.04em' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

export default PostureRing;
