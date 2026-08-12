import React from 'react';
import { Box, Typography } from '@mui/material';
import { getLogoColors, LOGO_SIZES, LogoSizeKey, LogoVariant } from '../../theme/brandLogo';
import { tokens } from '../../theme/tokens';

type RivicQWordmarkProps = {
  variant?: LogoVariant;
  sizeKey?: LogoSizeKey;
  showSubtitle?: boolean;
  compact?: boolean;
};

const RivicQWordmark: React.FC<RivicQWordmarkProps> = ({
  variant = 'light',
  sizeKey = 'default',
  showSubtitle = true,
  compact = false,
}) => {
  const colors = getLogoColors(variant);
  const effectiveSizeKey = compact ? 'compact' : sizeKey;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontFamily: tokens.typography.fontFamily,
          fontWeight: 600,
          fontSize: LOGO_SIZES[effectiveSizeKey].wordmark,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: colors.wordmark,
        }}
      >
        Rivic
        <Box
          component="span"
          sx={{
            color: colors.wordmark,
            position: 'relative',
            display: 'inline-block',
          }}
        >
          Q
        </Box>
      </Typography>
      {showSubtitle && !compact && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: colors.subtitle,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 500,
            fontSize: '0.625rem',
            mt: 0.25,
          }}
        >
          CryptoBOM EaaS
        </Typography>
      )}
    </Box>
  );
};

export default RivicQWordmark;
