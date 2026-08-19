import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import {
  FactCheck, GppGood, Hub, Memory, Psychology, GitHub,
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
  { label: 'GitHub Scan', hint: 'Real repository analysis', icon: <GitHub />, path: '/scanner?tab=github', accent: tokens.colors.rivicq[500] },
  { label: 'CBOM', hint: 'Crypto bill of materials', icon: <Memory />, path: '/scanner', accent: tokens.colors.crypto.quantum },
  { label: 'PQC', hint: 'Quantum readiness', icon: <Psychology />, path: '/enterprise/quantum', accent: tokens.colors.gold[500] },
  { label: 'Compliance', hint: 'Control mapping', icon: <FactCheck />, path: '/enterprise/compliance', accent: tokens.colors.crypto.low },
  { label: 'CSPM', hint: 'Posture command', icon: <GppGood />, path: '/enterprise/cspm', accent: tokens.colors.rivicq[700] },
  { label: 'Graph', hint: 'Asset relationships', icon: <Hub />, path: '/analytics', accent: tokens.colors.crypto.info },
];

type CspmCapabilityStripProps = {
  onNavigate: (path: string) => void;
};

const CspmCapabilityStrip: React.FC<CspmCapabilityStripProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ mb: dashboardDesign.layout.sectionGap }}>
      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Cryptographic Security Posture Management
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
          Enterprise command modules
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
              borderColor: isDark ? 'rgba(186,230,253,0.14)' : 'rgba(14,165,233,0.14)',
              borderRadius: `${designSystem.radius.md}px`,
              bgcolor: isDark ? 'rgba(15,39,68,0.55)' : 'rgba(255,255,255,0.92)',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
              boxShadow: isDark ? 'none' : designSystem.shadow.sm,
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
