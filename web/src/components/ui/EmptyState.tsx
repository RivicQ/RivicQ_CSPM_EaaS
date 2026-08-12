import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import designSystem from '../../theme/designSystem';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: 'center',
        borderRadius: `${designSystem.radius.lg}px`,
        border: `1px dashed ${theme.palette.divider}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.04)' : 'rgba(79,70,229,0.03)',
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: `${designSystem.radius.md}px`,
            mx: 'auto',
            mb: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.08)',
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto', mb: action ? 2.5 : 0 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
