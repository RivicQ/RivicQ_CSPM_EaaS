import React from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';

type QubitFieldProps = {
  dark?: boolean;
  density?: number;
};

const QUBITS = [
  { x: '10%', y: '22%', r: 16, delay: 0 },
  { x: '82%', y: '16%', r: 12, delay: 0.4 },
  { x: '68%', y: '70%', r: 18, delay: 0.9 },
  { x: '22%', y: '74%', r: 13, delay: 1.3 },
  { x: '46%', y: '30%', r: 10, delay: 0.6 },
  { x: '90%', y: '52%', r: 14, delay: 1.6 },
];

/**
 * Decorative background field of animated qubits: each qubit is a nucleus with
 * an orbiting electron, connected by faint entanglement links. Respects
 * prefers-reduced-motion (falls back to a static field).
 */
const QubitField: React.FC<QubitFieldProps> = ({ dark = false, density = 1 }) => {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const core = dark ? 'rgba(96,165,250,0.9)' : 'rgba(37,99,235,0.8)';
  const ring = dark ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.35)';
  const link = dark ? 'rgba(96,165,250,0.16)' : 'rgba(37,99,235,0.12)';
  const qubits = QUBITS.slice(0, Math.max(3, Math.round(QUBITS.length * density)));

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <Box component="svg" viewBox="0 0 100 100" preserveAspectRatio="none" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <line x1="10" y1="22" x2="46" y2="30" stroke={link} strokeWidth={0.2} />
        <line x1="46" y1="30" x2="82" y2="16" stroke={link} strokeWidth={0.2} />
        <line x1="46" y1="30" x2="68" y2="70" stroke={link} strokeWidth={0.2} />
        <line x1="22" y1="74" x2="68" y2="70" stroke={link} strokeWidth={0.2} />
        <line x1="68" y1="70" x2="90" y2="52" stroke={link} strokeWidth={0.2} />
      </Box>

      {qubits.map((q, i) => (
        <Box
          key={i}
          sx={{ position: 'absolute', left: q.x, top: q.y, width: q.r * 2, height: q.r * 2, transform: 'translate(-50%, -50%)' }}
        >
          {/* Orbit ring */}
          <Box
            component={motion.div}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: 8 + i * 2, repeat: Infinity, ease: 'linear' }}
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1px solid ${ring}`,
              transform: 'rotateX(62deg)',
            }}
          >
            <Box sx={{ position: 'absolute', top: -2, left: '50%', width: 4, height: 4, borderRadius: '50%', bgcolor: core }} />
          </Box>
          {/* Nucleus */}
          <Box
            component={motion.div}
            animate={reduceMotion ? undefined : { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
            transition={reduceMotion ? undefined : { duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: q.delay }}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: q.r * 0.7,
              height: q.r * 0.7,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              bgcolor: core,
              boxShadow: `0 0 12px ${core}`,
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default QubitField;
