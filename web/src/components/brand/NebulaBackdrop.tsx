import React from 'react';
import { Box } from '@mui/material';

/** Deep-space nebula: black canvas, violet glow, sparse starfield. */
const NebulaBackdrop: React.FC<{ height?: string | number }> = ({ height = '100%' }) => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      inset: 0,
      height,
      overflow: 'hidden',
      pointerEvents: 'none',
      background:
        'radial-gradient(ellipse 55% 48% at 50% 42%, rgba(124,58,237,0.42), transparent 68%), #000',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundImage: [
          'radial-gradient(1.2px 1.2px at 8% 18%, rgba(255,255,255,0.85), transparent)',
          'radial-gradient(1px 1px at 22% 64%, rgba(255,255,255,0.55), transparent)',
          'radial-gradient(1.4px 1.4px at 41% 28%, rgba(255,255,255,0.9), transparent)',
          'radial-gradient(1px 1px at 63% 12%, rgba(255,255,255,0.45), transparent)',
          'radial-gradient(1.2px 1.2px at 78% 48%, rgba(255,255,255,0.7), transparent)',
          'radial-gradient(1px 1px at 91% 22%, rgba(255,255,255,0.5), transparent)',
          'radial-gradient(1.5px 1.5px at 14% 82%, rgba(255,255,255,0.65), transparent)',
          'radial-gradient(1px 1px at 34% 91%, rgba(255,255,255,0.4), transparent)',
          'radial-gradient(1.2px 1.2px at 55% 76%, rgba(255,255,255,0.8), transparent)',
          'radial-gradient(1px 1px at 72% 88%, rgba(255,255,255,0.5), transparent)',
          'radial-gradient(1px 1px at 48% 8%, rgba(255,255,255,0.6), transparent)',
          'radial-gradient(1.3px 1.3px at 86% 70%, rgba(255,255,255,0.55), transparent)',
        ].join(','),
        opacity: 0.9,
      },
    }}
  />
);

export default NebulaBackdrop;
