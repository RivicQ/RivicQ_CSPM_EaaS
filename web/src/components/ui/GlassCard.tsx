import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import designSystem, { glassSurface } from '../../theme/designSystem';

type GlassCardProps = {
  children: React.ReactNode;
  hover?: boolean;
  glow?: string;
  padding?: number | string;
  noBorder?: boolean;
  delay?: number;
  onClick?: () => void;
};

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  hover = true,
  glow,
  padding = 2.5,
  noBorder,
  delay = 0,
  onClick,
}) => {
  const theme = useTheme();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.07, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      sx={{
        ...glassSurface(theme, true),
        borderRadius: `${designSystem.radius.lg}px`,
        p: padding,
        border: noBorder ? 'none' : undefined,
        cursor: onClick ? 'pointer' : 'default',
        transition: designSystem.motion.smooth,
        position: 'relative',
        overflow: 'hidden',
        '&::before': glow ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: glow,
        } : undefined,
        ...(hover && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: glow ? designSystem.shadow.glow(glow) : designSystem.shadow.md,
            borderColor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)',
          },
        }),
      }}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
