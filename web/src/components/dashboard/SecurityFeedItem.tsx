import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import SeverityBadge from './SeverityBadge';
import dashboardDesign from '../../theme/dashboardDesign';

type SecurityFeedItemProps = {
  message: string;
  severity: string;
  time: string;
  onClick?: () => void;
};

const SecurityFeedItem: React.FC<SecurityFeedItemProps> = ({ message, severity, time, onClick }) => {
  const theme = useTheme();
  const idx = ['low', 'medium', 'high', 'critical'].indexOf(severity.toLowerCase());
  const color = dashboardDesign.severity.palette[idx >= 0 ? idx : 0];

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        gap: 1.5,
        py: 1.5,
        px: 1,
        mx: -1,
        borderRadius: `${dashboardDesign.radius.sm}px`,
        transition: dashboardDesign.motion.transition,
        '&:hover': { bgcolor: theme.palette.action.hover },
        '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' },
      }}
    >
      <Box
        sx={{
          width: 4,
          borderRadius: 1,
          bgcolor: color,
          flexShrink: 0,
          alignSelf: 'stretch',
          minHeight: 36,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.55, color: 'text.primary', fontWeight: 500 }}>
          {message}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
          <SeverityBadge severity={severity} compact />
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontWeight: 500 }}>
            {time}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SecurityFeedItem;
