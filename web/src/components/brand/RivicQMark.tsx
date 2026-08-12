import React from 'react';
import { Box } from '@mui/material';
import { getLogoColors, LogoVariant } from '../../theme/brandLogo';

type RivicQMarkProps = {
  size?: number;
  variant?: LogoVariant;
  animated?: boolean;
};

/** Three orbital ellipses + hex shield core — cybersecurity mark */
const RivicQMark: React.FC<RivicQMarkProps> = ({
  size = 40,
  variant = 'light',
  animated = false,
}) => {
  const colors = getLogoColors(variant);
  const strokeWidth = size >= 32 ? 1.75 : 1.5;
  const cx = 24;
  const cy = 24;
  const rx = 14;
  const ry = 6;

  const orbits = [
    { rotate: 0, primary: true },
    { rotate: 60, primary: false },
    { rotate: 120, primary: false },
  ];

  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label="RivicQ"
      sx={{
        display: 'block',
        flexShrink: 0,
        ...(animated && {
          '& .orbit-primary': {
            transformOrigin: '24px 24px',
            animation: 'orbitSpin 12s linear infinite',
          },
          '@keyframes orbitSpin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }),
      }}
    >
      <g fill="none" strokeLinecap="round">
        {orbits.map(({ rotate, primary }) => (
          <ellipse
            key={rotate}
            className={primary ? 'orbit-primary' : undefined}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            stroke={primary ? colors.orbitPrimary : colors.orbitSecondary}
            strokeWidth={strokeWidth}
            transform={`rotate(${rotate} ${cx} ${cy})`}
          />
        ))}
      </g>
      {/* Hex shield nucleus */}
      <path
        d="M24 17 L29.2 20 V26 L24 29 L18.8 26 V20 Z"
        fill={colors.coreFill}
        stroke={colors.core}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx={24} cy={23} r={1.75} fill={colors.orbitPrimary} />
    </Box>
  );
};

export default RivicQMark;
