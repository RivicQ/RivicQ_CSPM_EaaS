import React from 'react';
import { Typography, TypographyProps } from '@mui/material';

/** Product honesty line — not a certification and not a third-party brand. */
export const PRODUCT_NOTICE_LINE =
  'RivicQ GmbH · cryptographic security platform. Control mappings are not certifications.';

/** @deprecated Use PRODUCT_NOTICE_LINE */
export const IBM_TRADEMARK_LINE = PRODUCT_NOTICE_LINE;

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
    {PRODUCT_NOTICE_LINE}
  </Typography>
);

export default TrademarkNotice;
