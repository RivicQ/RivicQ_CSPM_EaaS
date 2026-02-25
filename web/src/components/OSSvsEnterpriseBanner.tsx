import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { Lock, Upgrade } from '@mui/icons-material';

interface OSSvsEnterpriseBannerProps {
  featureName: string;
  description?: string;
}

export const OSSvsEnterpriseBanner: React.FC<OSSvsEnterpriseBannerProps> = ({
  featureName,
  description,
}) => (
  <Box
    sx={{
      background: 'linear-gradient(135deg, #667eea20, #764ba220)',
      border: '1px solid #667eea40',
      borderRadius: 2,
      p: 3,
      textAlign: 'center',
    }}
  >
    <Lock sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
    <Typography variant="h6" fontWeight="bold" gutterBottom>
      {featureName}
    </Typography>
    <Chip label="Enterprise Feature" color="primary" size="small" sx={{ mb: 2 }} />
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
    )}
    <Button
      variant="contained"
      startIcon={<Upgrade />}
      sx={{ background: 'linear-gradient(45deg, #667eea, #764ba2)' }}
      href="https://cryptobom.io/enterprise"
      target="_blank"
      rel="noopener noreferrer"
    >
      Upgrade to Enterprise
    </Button>
  </Box>
);
