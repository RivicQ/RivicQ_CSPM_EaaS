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
      background: 'rgba(14,165,233,0.1)',
      border: `1px solid ${tokens.colors.rivicq[200]}`,
      borderRadius: 4,
      p: 3,
      textAlign: 'center',
    }}
  >
    <Stack spacing={1.5} alignItems="center">
      <Lock sx={{ fontSize: 42, color: tokens.colors.brand.gold }} />
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
      sx={{ background: '#0284c7' }}
      href="https://rivicq.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      Upgrade to Enterprise
    </Button>
    </Stack>
  </Box>
);
