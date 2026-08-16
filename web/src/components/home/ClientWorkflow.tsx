import React from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material';
import {
  Cable, DocumentScanner, Inventory2, Assessment, TrackChanges, ArrowForward, ArrowDownward,
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
    n: '01', title: 'Connect target', icon: <Cable />, accent: tokens.colors.rivicq[600],
    desc: 'Point RivicQ at a GitHub repository, container image, cloud account, or Kubernetes cluster.',
    tags: ['GitHub', 'Container', 'Cloud', 'Kubernetes'],
  },
  {
    n: '02', title: 'Run CBOM scan', icon: <DocumentScanner />, accent: tokens.colors.crypto.quantum,
    desc: 'The engine discovers cryptographic material and builds a Cryptographic Bill of Materials.',
    tags: ['SAST', 'SCA', 'TLS', 'Secrets'],
  },
  {
    n: '03', title: 'Inventory + quantum risk', icon: <Inventory2 />, accent: tokens.colors.crypto.info,
    desc: 'See algorithms, key sizes, certificates, and a quantum-exposure score across every asset.',
    tags: ['Algorithms', 'Key sizes', 'PQC exposure'],
  },
  {
    n: '04', title: 'Compliance & PQC report', icon: <Assessment />, accent: tokens.colors.gold[600],
    desc: 'Generate an evidence-backed report mapped to BSI TR-02102, DORA Art. 9, and eIDAS 2.0, with a PQC migration plan.',
    tags: ['BSI', 'DORA', 'eIDAS', 'Migration'],
  },
  {
    n: '05', title: 'Track remediation', icon: <TrackChanges />, accent: tokens.colors.crypto.low,
    desc: 'Assign fixes, rescan on each commit, and watch quantum risk trend down over time.',
    tags: ['Rescan', 'Trends', 'Audit trail'],
  },
];

/**
 * Additive homepage section: an animated, step-by-step visualization of the
 * full RivicQ client workflow. Connect → Scan → Inventory + Risk → Report →
 * Remediation. Cards reveal on scroll and respect prefers-reduced-motion via
 * the app-level MotionConfig.
 */
const ClientWorkflow: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.14)';

  return (
    <Box id="workflows" sx={{ mb: 10, scrollMarginTop: 80 }}>
      <Stack alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Chip label="How it works" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1, textAlign: 'center', letterSpacing: '-0.02em' }}>
        The RivicQ client workflow
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center', maxWidth: 720, mx: 'auto' }}>
        From first connection to continuous remediation — one guided path from cryptographic discovery to quantum-safe compliance.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' },
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

            {/* Connector between steps */}
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
                  // Horizontal arrow between columns on desktop, vertical on mobile.
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
