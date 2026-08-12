import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { tokens } from '../../theme/tokens';
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
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const color = accent || theme.palette.primary.main;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        px: 1.5,
        py: 1.25,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: `${dashboardDesign.radius.md}px`,
        transition: dashboardDesign.motion.transition,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: featured
            ? `linear-gradient(90deg, ${color}, ${tokens.colors.rivicq[400]})`
            : `linear-gradient(90deg, ${color}88, ${color}22)`,
          opacity: featured ? 1 : 0.7,
        },
        '&:hover': {
          borderColor: `${color}55`,
          boxShadow: isDark
            ? `0 8px 24px rgba(0,0,0,0.28), 0 0 0 1px ${color}22`
            : `0 6px 20px rgba(79,70,229,0.06), 0 0 0 1px ${color}18`,
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
                fontSize: featured ? '1.5rem' : '1.375rem',
                lineHeight: 1,
                color: accent || 'text.primary',
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
              background: isDark
                ? `linear-gradient(135deg, ${color}22, ${color}08)`
                : `linear-gradient(135deg, ${color}18, ${color}06)`,
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
