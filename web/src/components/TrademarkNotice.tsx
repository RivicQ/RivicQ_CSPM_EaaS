import React from 'react';
import { Typography, TypographyProps } from '@mui/material';

/**
 * Required trademark line for IBM Quantum / IBM Cloud interoperability screens.
 * IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product.
 */
export const IBM_TRADEMARK_LINE =
  'IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications.';

const TrademarkNotice: React.FC<{ compact?: boolean; sx?: TypographyProps['sx'] }> = ({ compact, sx }) => (
  <Typography
    component="p"
    variant="caption"
    sx={{
      display: 'block',
      color: 'text.disabled',
      lineHeight: 1.45,
      fontSize: compact ? '0.62rem' : '0.7rem',
      maxWidth: 560,
      ...sx,
    }}
  >
    {IBM_TRADEMARK_LINE}
  </Typography>
);

export default TrademarkNotice;
