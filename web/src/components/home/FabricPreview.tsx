import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

const NODES = [
  { x: 40, y: 70, label: 'Repo', c: '#60a5fa' },
  { x: 160, y: 36, label: 'App', c: '#a78bfa' },
  { x: 280, y: 70, label: 'TLS', c: '#f59e0b' },
  { x: 400, y: 36, label: 'Key', c: '#f472b6' },
  { x: 160, y: 130, label: 'Id', c: '#38bdf8' },
  { x: 280, y: 130, label: 'Data', c: '#34d399' },
  { x: 400, y: 130, label: 'PQC', c: '#818cf8' },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [2, 5], [5, 6], [3, 6],
];

const FabricPreview: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#18181b',
        borderRadius: 1.5,
        p: 2,
        overflow: 'hidden',
      }}
    >
      <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
        Live fabric preview · fixture
      </Typography>
      <svg viewBox="0 0 440 170" width="100%" height="170" role="img" aria-label="Animated security fabric preview">
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={`${a}-${b}`}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke="rgba(250,250,250,0.16)"
            strokeWidth="1.2"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: i * 0.08 }}
          />
        ))}
        {NODES.map((n, i) => (
          <g key={n.label}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={10}
              fill="#09090b"
              stroke={n.c}
              strokeWidth="1.6"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
            />
            <text x={n.x} y={n.y + 24} textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="Inter, sans-serif">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </Box>
  );
};

export default FabricPreview;
