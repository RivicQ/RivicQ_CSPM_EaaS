import React from 'react';
import { Box } from '@mui/material';
import { designSystem } from '../../theme/designSystem';

type HorizonCanvasProps = {
  dark?: boolean;
  children?: React.ReactNode;
};

/** Soft sky wash used on public and workspace canvases. No blur, no neon. */
const HorizonCanvas: React.FC<HorizonCanvasProps> = ({ dark = false, children }) => (
  <Box
    sx={{
      position: 'relative',
      isolation: 'isolate',
      background: dark ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
      backgroundColor: dark ? designSystem.proBlue.commandCenter : '#f4f9fd',
    }}
  >
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: dark ? designSystem.proBlue.commandGlow : designSystem.horizon.wash,
      }}
    />
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: dark ? 0.18 : 0.35,
        backgroundImage:
          'linear-gradient(rgba(14,165,233,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 62%)',
      }}
    />
    <Box sx={{ position: 'relative' }}>{children}</Box>
  </Box>
);

export default HorizonCanvas;
