import React from 'react';
import { Box } from '@mui/material';

type CryptoQuantumBackdropProps = {
  dark?: boolean;
};

const GLYPHS = [
  { label: 'RSA-2048', x: '8%', y: '18%', delay: 0 },
  { label: 'ML-KEM', x: '82%', y: '12%', delay: 0.6 },
  { label: 'AES-256-GCM', x: '72%', y: '68%', delay: 1.1 },
  { label: 'SHA-384', x: '14%', y: '72%', delay: 0.3 },
  { label: 'ECDSA', x: '46%', y: '10%', delay: 0.9 },
  { label: 'ML-DSA', x: '90%', y: '44%', delay: 1.4 },
  { label: 'X25519', x: '30%', y: '52%', delay: 0.5 },
  { label: 'HSM', x: '58%', y: '80%', delay: 1.7 },
];

/**
 * Quiet background for the auth screens: an HSM chip motif, faint
 * key-distribution orbits, and cryptographic algorithm glyphs.
 */
const CryptoQuantumBackdrop: React.FC<CryptoQuantumBackdropProps> = ({ dark = true }) => {
  const accent = dark ? 'rgba(186,230,253,0.28)' : 'rgba(14,165,233,0.22)';
  const accentSoft = dark ? 'rgba(186,230,253,0.1)' : 'rgba(14,165,233,0.1)';
  const glyphColor = dark ? 'rgba(186,230,253,0.32)' : 'rgba(3,105,161,0.45)';
  const orbit = dark ? 'rgba(186,230,253,0.14)' : 'rgba(14,165,233,0.14)';

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <Box
        component="svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark ? 0.22 : 0.16 }}
      >
        <defs>
          <radialGradient id="qk-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {[220, 320, 430].map((r, i) => (
          <ellipse
            key={r}
            cx={600}
            cy={400}
            rx={r}
            ry={r * 0.42}
            fill="none"
            stroke={orbit}
            strokeWidth={1.2}
            strokeDasharray="4 10"
            transform={`rotate(${i * 60} 600 400)`}
          />
        ))}

        <circle cx={600} cy={400} r={70} fill="url(#qk-core)" />
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: { xs: '10%', md: '22%' },
          right: { xs: '6%', md: '12%' },
          width: 96,
          height: 96,
          borderRadius: 1,
          border: `1px solid ${accent}`,
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          background: dark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.82)',
        }}
      >
        <Box sx={{ position: 'relative', width: 52, height: 52, borderRadius: 1, border: `1px solid ${accent}` }}>
          <Box sx={{ position: 'absolute', inset: 10, borderRadius: 0.5, border: `1px solid ${accentSoft}` }} />
          <Box sx={{ position: 'absolute', inset: 20, borderRadius: '50%', bgcolor: accent, opacity: 0.8 }} />
          {[-6, 16, 38].map((t) => (
            <React.Fragment key={t}>
              <Box sx={{ position: 'absolute', left: -8, top: t + 8, width: 8, height: 2, bgcolor: accent }} />
              <Box sx={{ position: 'absolute', right: -8, top: t + 8, width: 8, height: 2, bgcolor: accent }} />
              <Box sx={{ position: 'absolute', top: -8, left: t + 8, height: 8, width: 2, bgcolor: accent }} />
              <Box sx={{ position: 'absolute', bottom: -8, left: t + 8, height: 8, width: 2, bgcolor: accent }} />
            </React.Fragment>
          ))}
        </Box>
      </Box>

      {GLYPHS.map((g) => (
        <Box
          key={g.label}
          sx={{
            position: 'absolute',
            left: g.x,
            top: g.y,
            px: 1.25,
            py: 0.4,
            borderRadius: 1,
            border: `1px solid ${accentSoft}`,
            color: glyphColor,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            display: { xs: g.delay > 1 ? 'none' : 'block', md: 'block' },
            background: dark ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.55)',
          }}
        >
          {g.label}
        </Box>
      ))}
    </Box>
  );
};

export default CryptoQuantumBackdrop;
