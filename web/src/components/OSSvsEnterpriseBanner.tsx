import React from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import { Lock, Upgrade } from '@mui/icons-material';
import { hasFeature } from '../config/editions';
import type { EditionFeatures } from '../config/editions';

interface OSSvsEnterpriseBannerProps {
  feature: keyof EditionFeatures;
  featureName: string;
  description?: string;
  children?: React.ReactNode;
}

export const OSSvsEnterpriseBanner: React.FC<OSSvsEnterpriseBannerProps> = ({
  feature,
  featureName,
  description,
  children,
}) => {
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return (
    <Paper
      sx={{
        p: 3,
        border: '1px dashed #667eea',
        borderRadius: 2,
        background: 'linear-gradient(135deg, #667eea08, #764ba208)',
        textAlign: 'center',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock sx={{ color: 'white', fontSize: 24 }} />
        </Box>
      </Box>

      <Chip
        label="Enterprise Feature"
        size="small"
        sx={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          fontWeight: 600,
          mb: 1.5,
        }}
      />

      <Typography variant="h6" fontWeight={700} gutterBottom>
        {featureName}
      </Typography>

      {description && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
          {description}
        </Typography>
      )}

      <Button
        variant="contained"
        startIcon={<Upgrade />}
        href="mailto:enterprise@cryptobom.io?subject=Upgrade to Enterprise"
        sx={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          '&:hover': { opacity: 0.9 },
        }}
      >
        Upgrade to Enterprise
      </Button>
    </Paper>
  );
};

export default OSSvsEnterpriseBanner;
