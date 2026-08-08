import React from 'react';
import { Box, Typography } from '@mui/material';

type BrandLogoProps = {
  compact?: boolean;
  dark?: boolean;
};

const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, dark = false }) => {
  const titleColor = dark ? '#f8fafc' : '#0f172a';
  const subColor = dark ? 'rgba(226,232,240,0.72)' : 'rgba(71,85,105,0.78)';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: compact ? 34 : 44,
          height: compact ? 34 : 44,
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #059669 100%)',
          boxShadow: '0 10px 24px rgba(79,70,229,0.25)',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 8,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.9)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          },
        }}
      />
      <Box>
        <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em', color: titleColor }}>
          RivicQ
        </Typography>
        {!compact && (
          <Typography variant="caption" sx={{ color: subColor, letterSpacing: 1.7, textTransform: 'uppercase', fontWeight: 500 }}>
            CryptoBOM EaaS
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default BrandLogo;
