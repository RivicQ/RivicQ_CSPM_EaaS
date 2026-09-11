import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  FactCheck, Hub, Memory, Psychology, GitHub, AccountTree,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import designSystem from '../../theme/designSystem';
import { tokens } from '../../theme/tokens';

type Capability = {
  label: string;
  hint: string;
  icon: React.ReactNode;
  path: string;
  accent: string;
};

const CAPABILITIES: Capability[] = [
  { label: 'CBOM', hint: 'Cryptographic inventory', icon: <AccountTree />, path: '/bom', accent: tokens.colors.rivicq[500] },
  { label: 'SBOM', hint: 'Software + crypto libraries', icon: <GitHub />, path: '/bom', accent: tokens.colors.crypto.quantum },
  { label: 'Scanner', hint: 'Website, host, repo scans', icon: <Memory />, path: '/scanner', accent: tokens.colors.crypto.quantum },
  { label: 'PQC', hint: 'Quantum readiness', icon: <Psychology />, path: '/migration', accent: tokens.colors.gold[500] },
  { label: 'Governance', hint: 'Control mapping', icon: <FactCheck />, path: '/governance', accent: tokens.colors.crypto.low },
  { label: 'Pipeline', hint: 'Eight-stage DevSecOps', icon: <Hub />, path: '/pipeline', accent: tokens.colors.crypto.info },
];

type CspmCapabilityStripProps = {
  onNavigate: (path: string) => void;
};

const CspmCapabilityStrip: React.FC<CspmCapabilityStripProps> = ({ onNavigate }) => {
  return (
    <Box sx={{ mb: dashboardDesign.layout.sectionGap }}>
      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Cryptographic Security Posture Management
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
          Community CBOM + SBOM — Enterprise Q/H/AI/I locked
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(6, minmax(0, 1fr))',
          },
          gap: { xs: 1, md: 1.25 },
        }}
      >
        {CAPABILITIES.map((item, index) => (
          <Box
            key={item.label}
            component={motion.button}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
            onClick={() => onNavigate(item.path)}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 1,
              textAlign: 'left',
              minHeight: { xs: 76, md: 64 },
              px: 1.5,
              py: 1.25,
              border: 1,
              borderColor: 'rgba(196,181,253,0.14)',
              borderRadius: `${designSystem.radius.md}px`,
              bgcolor: '#0a0a0f',
              cursor: 'pointer',
              font: 'inherit',
              color: '#fff',
              boxShadow: 'none',
              transition: designSystem.motion.smooth,
              '&:hover': {
                borderColor: `${item.accent}66`,
                transform: 'none',
                boxShadow: 'none',
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: `${designSystem.radius.sm}px`,
                display: 'grid',
                placeItems: 'center',
                bgcolor: `${item.accent}18`,
                color: item.accent,
                flexShrink: 0,
                '& svg': { fontSize: 18 },
              }}
            >
              {item.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.2 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 0.25 }}>{item.hint}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CspmCapabilityStrip;
