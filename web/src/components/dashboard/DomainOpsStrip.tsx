import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Api, CloudQueue, Hub, Policy, Psychology, Timeline,
} from '@mui/icons-material';

const DOMAINS = [
  { title: 'AI engineering', desc: 'Model, dataset, and AI-identity inventory (AIBOM).', path: '/security/ai' },
  { title: 'DevSecOps', desc: 'Pipeline evidence from scan to policy gate.', path: '/pipeline' },
  { title: 'Cloud security', desc: 'CSPM and multi-cloud posture (connectors are Enterprise).', path: '/cspm' },
  { title: 'API security', desc: 'TLS hygiene and gateway inventory from scans.', path: '/security/api' },
  { title: 'GRC & risk', desc: 'Control mappings — not certifications.', path: '/governance' },
  { title: 'Quantum risk', desc: 'PQC readiness from scan intelligence, not a live estate feed on Pages.', path: '/migration' },
];

const DomainOpsStrip: React.FC = () => {
  const nav = useNavigate();
  const theme = useTheme();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1.25 }}>
      {DOMAINS.map((d) => (
        <Box
          key={d.title}
          component="button"
          type="button"
          onClick={() => nav(d.path)}
          sx={{
            textAlign: 'left',
            cursor: 'pointer',
            p: 1.75,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: theme.palette.background.paper,
            color: 'inherit',
            font: 'inherit',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            {d.title.startsWith('AI') && <Hub fontSize="small" color="primary" />}
            {d.title.startsWith('Dev') && <Timeline fontSize="small" color="primary" />}
            {d.title.startsWith('Cloud') && <CloudQueue fontSize="small" color="primary" />}
            {d.title.startsWith('API') && <Api fontSize="small" color="primary" />}
            {d.title.startsWith('GRC') && <Policy fontSize="small" color="primary" />}
            {d.title.startsWith('Quantum') && <Psychology fontSize="small" color="primary" />}
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.title}</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{d.desc}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default DomainOpsStrip;
