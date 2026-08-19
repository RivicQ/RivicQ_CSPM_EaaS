import React from 'react';
import { Box, useTheme } from '@mui/material';
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
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.25, delay: delay * 0.04, ease: 'easeOut' }}
      whileHover={undefined}
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
            transform: 'none',
            boxShadow: 'none',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(200,197,206,0.2)' : 'rgba(90,82,104,0.22)',
          },
        }),
      }}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
