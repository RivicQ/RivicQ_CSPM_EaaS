import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import { panelTitleSx } from '../../theme/designSystem';

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  height?: number | string;
  delay?: number;
};

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  title,
  subtitle,
  action,
  children,
  noPadding = false,
  height,
  delay = 0,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.08, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        height: height ?? '100%',
        minWidth: 0,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: `${dashboardDesign.radius.lg}px`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: dashboardDesign.motion.transition,
        '&:hover': {
          borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.18)',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.25)' : '0 8px 32px rgba(15,23,42,0.06)',
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 1.75, md: 2.5 },
          py: { xs: 1.5, md: 2 },
          display: 'flex',
          flexDirection: { xs: action ? 'column' : 'row', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'flex-start' },
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ ...panelTitleSx, fontSize: { xs: '0.875rem', md: '0.9375rem' } }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.6875rem', md: '0.75rem' },
                mt: 0.25,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && (
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {action}
          </Stack>
        )}
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: noPadding ? 0 : { xs: 1.75, md: 2.5 },
          pt: noPadding ? 0 : 0,
          borderTop: 1,
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardPanel;
