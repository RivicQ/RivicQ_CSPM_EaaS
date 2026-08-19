import React from 'react';
import { Box } from '@mui/material';

type QubitFieldProps = {
  dark?: boolean;
  density?: number;
};

const QUBITS = [
  { x: '10%', y: '22%', r: 16 },
  { x: '82%', y: '16%', r: 12 },
  { x: '68%', y: '70%', r: 18 },
  { x: '22%', y: '74%', r: 13 },
  { x: '46%', y: '30%', r: 10 },
  { x: '90%', y: '52%', r: 14 },
];

/**
 * Decorative background field of qubits: each qubit is a nucleus with
 * a faint orbit ring, connected by entanglement links.
 */
const QubitField: React.FC<QubitFieldProps> = ({ dark = false, density = 1 }) => {
  const core = dark ? 'rgba(186,230,253,0.35)' : 'rgba(14,165,233,0.28)';
  const ring = dark ? 'rgba(186,230,253,0.18)' : 'rgba(14,165,233,0.16)';
  const link = dark ? 'rgba(186,230,253,0.08)' : 'rgba(14,165,233,0.08)';
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
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1px solid ${ring}`,
            }}
          >
            <Box sx={{ position: 'absolute', top: -2, left: '50%', width: 3, height: 3, borderRadius: '50%', bgcolor: core }} />
          </Box>
          {/* Nucleus */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: q.r * 0.7,
              height: q.r * 0.7,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              bgcolor: core,
              boxShadow: 'none',
              opacity: 0.55,
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default QubitField;
