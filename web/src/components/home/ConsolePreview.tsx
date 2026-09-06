import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

const ROWS = [
  { id: 'F-1842', title: 'RSA-2048 on public TLS', sev: 'HIGH', asset: 'api.internal' },
  { id: 'F-1843', title: 'SHA-1 certificate chain', sev: 'MED', asset: 'edge-gw' },
  { id: 'F-1844', title: 'Unlabeled secret name', sev: 'INFO', asset: 'ci-runner' },
  { id: 'F-1845', title: 'Classic KEM, no hybrid', sev: 'HIGH', asset: 'vpn-term' },
];

const METRICS = [
  { label: 'Open', value: '12' },
  { label: 'Critical', value: '4' },
  { label: 'Posture', value: '81' },
  { label: 'CBOM', value: 'Ready' },
];

/** Product-console mock for the public landing — labeled fixture, not telemetry. */
const ConsolePreview: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#17150f',
        borderRadius: 1,
        overflow: 'hidden',
        color: '#f3eee4',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 1.5, py: 1, borderBottom: '1px solid #2c281f', bgcolor: '#0c0b09' }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#5c3519' }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2c281f' }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2c281f' }} />
        <Typography sx={{ fontFamily: 'Source Code Pro, monospace', fontSize: 11, color: '#8a8376', pl: 1 }}>
          workspace · community · labeled fixture
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #2c281f' }}>
        {METRICS.map((m) => (
          <Box key={m.label} sx={{ px: 1.5, py: 1.25, borderRight: '1px solid #2c281f', '&:last-child': { borderRight: 0 } }}>
            <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8376' }}>
              {m.label}
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 650, letterSpacing: '-0.03em', color: '#f3eee4' }}>
              {m.value}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: 1.5, py: 1, display: 'grid', gridTemplateColumns: '88px 1fr 56px 96px', gap: 1 }}>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8376' }}>ID</Typography>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8376' }}>Finding</Typography>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8376' }}>Sev</Typography>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8376' }}>Asset</Typography>
      </Box>
      {ROWS.map((row, i) => (
        <Box
          key={row.id}
          component={motion.div}
          initial={false}
          animate={reduce ? undefined : { opacity: [0.55, 1] }}
          transition={{ delay: 0.08 + i * 0.05, duration: 0.35 }}
          sx={{
            px: 1.5,
            py: 1.1,
            display: 'grid',
            gridTemplateColumns: '88px 1fr 56px 96px',
            gap: 1,
            borderTop: '1px solid #2c281f',
            '&:hover': { bgcolor: 'rgba(196,120,58,0.08)' },
          }}
        >
          <Typography sx={{ fontFamily: 'Source Code Pro, monospace', fontSize: 12, color: '#b8b0a2' }}>{row.id}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.title}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: row.sev === 'HIGH' ? '#d97706' : row.sev === 'MED' ? '#c9a227' : '#3d7ab8' }}>
            {row.sev}
          </Typography>
          <Typography sx={{ fontFamily: 'Source Code Pro, monospace', fontSize: 12, color: '#b8b0a2' }}>{row.asset}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default ConsolePreview;
