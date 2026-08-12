import React from 'react';
import { Box } from '@mui/material';
import RivicQMark from './brand/RivicQMark';
import RivicQWordmark from './brand/RivicQWordmark';
import { LOGO_SIZES, LogoSizeKey, LogoVariant } from '../theme/brandLogo';

type BrandLogoProps = {
  compact?: boolean;
  dark?: boolean;
  iconOnly?: boolean;
  sizeKey?: LogoSizeKey;
  animated?: boolean;
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  compact = false,
  dark = false,
  iconOnly = false,
  sizeKey,
  animated = false,
}) => {
  const variant: LogoVariant = dark ? 'dark' : 'light';
  const resolvedSizeKey: LogoSizeKey = sizeKey ?? (iconOnly ? 'icon' : compact ? 'compact' : 'default');
  const { mark, gap } = LOGO_SIZES[resolvedSizeKey];

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: iconOnly ? 0 : `${gap}px` }}>
      <RivicQMark size={mark} variant={variant} animated={animated} />
      {!iconOnly && (
        <RivicQWordmark
          variant={variant}
          sizeKey={resolvedSizeKey}
          compact={compact}
          showSubtitle={!compact}
        />
      )}
    </Box>
  );
};

export default BrandLogo;
