import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  icon?: React.ReactNode;
  accent?: string;
  featured?: boolean;
  children?: React.ReactNode;
  delay?: number;
  onClick?: () => void;
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  trend,
  icon,
  accent,
  featured,
  children,
  delay = 0,
  onClick,
}) => {
  const theme = useTheme();
  const isZero = value === 0 || value === '0';
  const color = isZero ? '#9ca3af' : (accent || theme.palette.primary.main);
  const valueColor = isZero ? '#ffffff' : (accent || '#ffffff');

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05, ease: [0.4, 0, 0.2, 1] }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        px: 1.5,
        py: 1.25,
        bgcolor: '#0a0a0f',
        border: 1,
        borderColor: 'divider',
        borderRadius: `${dashboardDesign.radius.md}px`,
        transition: dashboardDesign.motion.transition,
        cursor: onClick ? 'pointer' : 'default',
        color: '#ffffff',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.22)',
          boxShadow: 'none',
          transform: dashboardDesign.motion.hoverLift,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontSize: '0.6rem',
              lineHeight: 1.2,
            }}
          >
            {label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 0.375 }}>
            <Typography
              sx={{
                ...metricValueSx,
                fontSize: featured ? '1.25rem' : '1.125rem',
                lineHeight: 1,
                color: valueColor,
              }}
            >
              {value}
            </Typography>
            {trend && (
              <Typography
                sx={{
                  ...metricValueSx,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: trend.positive ? dashboardDesign.severity.low : dashboardDesign.severity.high,
                }}
              >
                {trend.value}
              </Typography>
            )}
          </Box>
          {hint && (
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.6875rem',
                lineHeight: 1.35,
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {hint}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: `${dashboardDesign.radius.sm}px`,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              color,
              flexShrink: 0,
              border: 1,
              borderColor: `${color}22`,
              '& svg': { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      {children && <Box sx={{ mt: 0.875 }}>{children}</Box>}
    </Box>
  );
};

export default StatCard;
