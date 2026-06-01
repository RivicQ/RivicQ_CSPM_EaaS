import React from 'react';
import { Box, Typography, Button, Chip, Stack } from '@mui/material';
import { Lock, Upgrade } from '@mui/icons-material';
import { tokens } from '../theme/tokens';

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
      background: `linear-gradient(135deg, rgba(6,182,212,0.12), rgba(212,175,55,0.14))`,
      border: `1px solid ${tokens.colors.rivicq[200]}`,
      borderRadius: 4,
      p: 3,
      textAlign: 'center',
    }}
  >
    <Stack spacing={1.5} alignItems="center">
      <Lock sx={{ fontSize: 42, color: '#d4af37' }} />
      <Typography variant="h6" fontWeight="bold">
        {featureName}
      </Typography>
      <Chip label="Enterprise Feature" color="secondary" size="small" />
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
      )}
    <Button
      variant="contained"
      startIcon={<Upgrade />}
      sx={{ background: 'linear-gradient(45deg, #06b6d4, #d4af37)' }}
      href="https://cryptobom.io/enterprise"
      target="_blank"
      rel="noopener noreferrer"
    >
      Upgrade to Enterprise
    </Button>
    </Stack>
  </Box>
);
