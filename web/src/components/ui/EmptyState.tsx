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
        py: 1.5,
        px: 1.5,
        textAlign: 'left',
        borderRadius: `${designSystem.radius.md}px`,
        border: `1px dashed ${theme.palette.divider}`,
        bgcolor: 'transparent',
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: `${designSystem.radius.md}px`,
            mb: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.04)',
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
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mb: action ? 1.25 : 0, fontSize: '0.75rem' }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button size="small" variant="outlined" onClick={action.onClick} sx={{ mt: 0.5, textTransform: 'none' }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
