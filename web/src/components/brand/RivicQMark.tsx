import React from 'react';
import { Box } from '@mui/material';
import { LogoVariant } from '../../theme/brandLogo';
import markUrl from './rivicq-mark.svg';

type RivicQMarkProps = {
  size?: number;
  variant?: LogoVariant;
  animated?: boolean;
};

/** Official RivicQ mark: geometric R on a rounded black square. */
const RivicQMark: React.FC<RivicQMarkProps> = ({
  size = 40,
}) => (
  <Box
    component="img"
    src={markUrl}
    alt="RivicQ"
    width={size}
    height={size}
    sx={{
      display: 'block',
      flexShrink: 0,
      width: size,
      height: size,
      borderRadius: '22%',
    }}
  />
);

export default RivicQMark;
