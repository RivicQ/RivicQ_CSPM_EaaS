import React from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material';
import {
  TravelExplore, Healing, Description, ArrowForward, ArrowDownward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { tokens } from '../../theme/tokens';
import designSystem from '../../theme/designSystem';

type Step = {
  n: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  tags: string[];
};

const STEPS: Step[] = [
  {
    n: '01', title: 'Discover', icon: <TravelExplore />, accent: tokens.colors.rivicq[600],
    desc: 'Point RivicQ at a website, host, IP, server, Kubernetes pod, or declared HSM/QSIC module. Community runs TLS/HTTPS/SSH/SBOM plus declared pod inventory.',
    tags: ['Website', 'IP', 'Server', 'Pod', 'Hardware'],
  },
  {
    n: '02', title: 'Mitigate', icon: <Healing />, accent: tokens.colors.crypto.quantum,
    desc: 'Map Shor/Grover-class algorithms to ML-KEM, ML-DSA, and SLH-DSA (FIPS 203/204/205). Hybrid classical + PQC is the migration path — this engine does not rotate production keys.',
    tags: ['ML-KEM', 'ML-DSA', 'HNDL', 'Hybrid PQC'],
  },
  {
    n: '03', title: 'Report', icon: <Description />, accent: tokens.colors.gold[600],
    desc: 'Every scan emits CycloneDX 1.6 CBOM, Qiskit/audit scores, and DORA RTS / NIS2 / BSI mappings. Community is JSON. Enterprise adds the DORA pack, SSO, and cloud connectors.',
    tags: ['CBOM', 'DORA RTS', 'NIS2', 'BSI TR-02102'],
  },
];

const ClientWorkflow: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.14)';

  return (
    <Box id="workflows" sx={{ mb: 10, scrollMarginTop: 80 }}>
      <Stack alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Chip label="Client architecture" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1, textAlign: 'center', letterSpacing: '-0.02em' }}>
        Discover → Mitigate → Report
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center', maxWidth: 720, mx: 'auto' }}>
        One cryptographic intelligence engine from open source to Enterprise. Community is limited to the scan engine. Enterprise enables the control plane, connectors, and evidence pack — without claiming shipped QSIC silicon or unlabeled demo estates.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 2, md: 1.5 },
          alignItems: 'stretch',
        }}
      >
        {STEPS.map((s, i) => (
          <Box key={s.n} sx={{ position: 'relative', display: 'flex' }}>
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ y: -4 }}
              sx={{ width: '100%' }}
            >
              <Card sx={{ height: '100%', bgcolor: cardBg, border: 1, borderColor: cardBorder, borderTop: `3px solid ${s.accent}` }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40, height: 40, borderRadius: `${designSystem.radius.md}px`,
                        display: 'grid', placeItems: 'center', color: s.accent, bgcolor: `${s.accent}18`,
                        '& svg': { fontSize: 20 },
                      }}
                    >
                      {s.icon}
                    </Box>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: `${s.accent}44`, letterSpacing: '-0.02em' }}>{s.n}</Typography>
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, lineHeight: 1.2 }}>{s.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>{s.desc}</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {s.tags.map((t) => (
                      <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 20 }} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {i < STEPS.length - 1 && (
              <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 + 0.2 }}
                sx={{
                  position: 'absolute',
                  color: 'text.disabled',
                  zIndex: 1,
                  right: { md: -10 }, top: { md: '50%' },
                  transform: { md: 'translateY(-50%)' },
                  left: { xs: '50%', md: 'auto' }, bottom: { xs: -16, md: 'auto' },
                  ml: { xs: '-9px', md: 0 },
                }}
              >
                <ArrowForward sx={{ fontSize: 18, display: { xs: 'none', md: 'block' } }} />
                <ArrowDownward sx={{ fontSize: 18, display: { xs: 'block', md: 'none' } }} />
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ClientWorkflow;
