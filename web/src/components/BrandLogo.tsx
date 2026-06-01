import React from 'react';
import { Box, Typography } from '@mui/material';

type BrandLogoProps = {
  compact?: boolean;
  dark?: boolean;
};

const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, dark = false }) => {
  const titleColor = dark ? '#f8fafc' : '#0f172a';
  const subColor = dark ? 'rgba(226,232,240,0.78)' : 'rgba(71,85,105,0.82)';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: compact ? 34 : 44,
          height: compact ? 34 : 44,
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #06b6d4 0%, #d4af37 100%)',
          boxShadow: '0 14px 30px rgba(6,182,212,0.24)',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 8,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.86)',
          },
        }}
      />
      <Box>
        <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ lineHeight: 1.05, fontWeight: 900, color: titleColor }}>
          RivicQ
        </Typography>
        {!compact && (
          <Typography variant="caption" sx={{ color: subColor, letterSpacing: 1.7, textTransform: 'uppercase' }}>
            CryptoBOM EaaS
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default BrandLogo;
