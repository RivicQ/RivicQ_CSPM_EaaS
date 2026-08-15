import React from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';

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
 * Animated background for the auth screens: an HSM chip motif, quantum
 * key-distribution orbits, and floating cryptographic algorithm glyphs.
 * Respects prefers-reduced-motion.
 */
const CryptoQuantumBackdrop: React.FC<CryptoQuantumBackdropProps> = ({ dark = true }) => {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const accent = dark ? 'rgba(96,165,250,0.55)' : 'rgba(37,99,235,0.4)';
  const accentSoft = dark ? 'rgba(96,165,250,0.18)' : 'rgba(37,99,235,0.14)';
  const glyphColor = dark ? 'rgba(147,197,253,0.42)' : 'rgba(30,64,128,0.32)';
  const orbit = dark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.22)';

  const float = reduceMotion
    ? {}
    : {
        animate: { y: [0, -14, 0], opacity: [0.5, 1, 0.5] },
      };

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Quantum key-distribution orbits */}
      <Box
        component="svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark ? 0.5 : 0.42 }}
      >
        <defs>
          <radialGradient id="qk-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {[220, 320, 430].map((r, i) => (
          <motion.ellipse
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
            initial={reduceMotion ? undefined : { rotate: i * 60 }}
            animate={reduceMotion ? undefined : { rotate: i * 60 + 360 }}
            transition={reduceMotion ? undefined : { duration: 60 + i * 20, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '600px 400px' }}
          />
        ))}

        <circle cx={600} cy={400} r={70} fill="url(#qk-core)" />

        {/* Entangled photon pulses travelling along a channel */}
        {!reduceMotion && [0, 1, 2].map((i) => (
          <motion.circle
            key={`p-${i}`}
            r={3.5}
            fill={accent}
            initial={{ opacity: 0 }}
            animate={{
              cx: [120, 600, 1080],
              cy: [180, 400, 620],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: i * 2, ease: 'easeInOut' }}
          />
        ))}
      </Box>

      {/* HSM secure element chip */}
      <Box
        component={motion.div}
        initial={reduceMotion ? undefined : { opacity: 0.35 }}
        animate={reduceMotion ? undefined : { opacity: [0.35, 0.7, 0.35], boxShadow: [`0 0 0 0 ${accentSoft}`, `0 0 40px 6px ${accentSoft}`, `0 0 0 0 ${accentSoft}`] }}
        transition={reduceMotion ? undefined : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          top: { xs: '10%', md: '22%' },
          right: { xs: '6%', md: '12%' },
          width: 96,
          height: 96,
          borderRadius: 2.5,
          border: `1.5px solid ${accent}`,
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          background: dark ? 'rgba(10,31,56,0.35)' : 'rgba(255,255,255,0.35)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <Box sx={{ position: 'relative', width: 52, height: 52, borderRadius: 1, border: `1.5px solid ${accent}` }}>
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

      {/* Floating algorithm glyphs */}
      {GLYPHS.map((g) => (
        <Box
          key={g.label}
          component={motion.div}
          {...float}
          transition={reduceMotion ? undefined : { duration: 6 + g.delay, repeat: Infinity, ease: 'easeInOut', delay: g.delay }}
          sx={{
            position: 'absolute',
            left: g.x,
            top: g.y,
            px: 1.25,
            py: 0.4,
            borderRadius: 999,
            border: `1px solid ${accentSoft}`,
            color: glyphColor,
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            display: { xs: g.delay > 1 ? 'none' : 'block', md: 'block' },
            background: dark ? 'rgba(15,39,68,0.25)' : 'rgba(255,255,255,0.4)',
          }}
        >
          {g.label}
        </Box>
      ))}
    </Box>
  );
};

export default CryptoQuantumBackdrop;
