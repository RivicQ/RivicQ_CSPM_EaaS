import React from 'react';
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { GitHub, Cloud, Memory, Lock, Key, Dns, Hub, VerifiedUser, Shield, FactCheck, AutoAwesome } from '@mui/icons-material';
import { tokens } from '../../theme/tokens';

type Node = { label: string; icon: React.ReactNode };

const SIGNALS: Node[] = [
  { label: 'GitHub Repos', icon: <GitHub sx={{ fontSize: 15 }} /> },
  { label: 'Cloud KMS', icon: <Cloud sx={{ fontSize: 15 }} /> },
  { label: 'HSM', icon: <Memory sx={{ fontSize: 15 }} /> },
  { label: 'TLS / Certs', icon: <Lock sx={{ fontSize: 15 }} /> },
  { label: 'Secrets', icon: <Key sx={{ fontSize: 15 }} /> },
  { label: 'IaC', icon: <Dns sx={{ fontSize: 15 }} /> },
];

const ENGINE: Node[] = [
  { label: 'Discover', icon: <Hub sx={{ fontSize: 18 }} /> },
  { label: 'Analyze', icon: <AutoAwesome sx={{ fontSize: 18 }} /> },
  { label: 'Quantify', icon: <Shield sx={{ fontSize: 18 }} /> },
];

const OUTPUTS: Node[] = [
  { label: 'CBOM', icon: <FactCheck sx={{ fontSize: 15 }} /> },
  { label: 'PQC Readiness', icon: <Memory sx={{ fontSize: 15 }} /> },
  { label: 'Compliance', icon: <VerifiedUser sx={{ fontSize: 15 }} /> },
  { label: 'Attestation', icon: <Shield sx={{ fontSize: 15 }} /> },
  { label: 'Automation', icon: <AutoAwesome sx={{ fontSize: 15 }} /> },
];

const Pill: React.FC<{ node: Node; align?: 'left' | 'right'; dark: boolean; accent?: string; fullWidth?: boolean }> = ({
  node,
  align = 'left',
  dark,
  accent,
  fullWidth = true,
}) => (
  <Box
    sx={{
      display: 'inline-flex',
      flexDirection: align === 'right' ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: { xs: 0.5, sm: 1 },
      width: fullWidth ? '100%' : 'auto',
      minWidth: 0,
      px: { xs: 0.75, sm: 1.25 },
      py: { xs: 0.5, sm: 0.75 },
      borderRadius: 999,
      border: `1px solid ${dark ? 'rgba(200,197,206,0.16)' : 'rgba(90,82,104,0.16)'}`,
      bgcolor: dark ? 'rgba(37,36,41,0.92)' : '#ffffff',
      color: accent || (dark ? tokens.colors.textLight.secondary : tokens.colors.text.secondary),
      backdropFilter: 'none',
    }}
  >
    <Box sx={{ display: 'grid', placeItems: 'center', flexShrink: 0, color: accent || tokens.colors.rivicq[500] }}>{node.icon}</Box>
    <Typography sx={{ fontSize: { xs: '0.68rem', sm: '0.75rem' }, fontWeight: 600, lineHeight: 1.15, minWidth: 0, whiteSpace: fullWidth ? 'normal' : 'nowrap' }}>
      {node.label}
    </Typography>
  </Box>
);

const EngineNodes: React.FC<{ flow: string; row?: boolean }> = ({ flow, row }) => (
  <Stack direction={row ? 'row' : 'column'} spacing={row ? 1 : 1.5} alignItems="center" justifyContent="center">
    {ENGINE.map((n) => (
      <Box
        key={n.label}
        sx={{
          width: { xs: 84, md: 92 },
          height: { xs: 48, md: 56 },
          borderRadius: 1,
          display: 'grid',
          placeItems: 'center',
          gap: 0.25,
          color: '#fff',
          background: tokens.colors.rivicq[700],
          border: `1px solid ${flow}`,
        }}
      >
        <Box sx={{ display: 'grid', placeItems: 'center' }}>{n.icon}</Box>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em' }}>{n.label}</Typography>
      </Box>
    ))}
  </Stack>
);

type EncryptionLayerVisualProps = { dark?: boolean };

/**
 * Quiet "encryption intelligence layer" diagram: security signals connect into
 * the RivicQ Encryption-as-a-Service engine (Discover → Analyze → Quantify) and
 * out to protected posture outputs.
 */
const EncryptionLayerVisual: React.FC<EncryptionLayerVisualProps> = ({ dark }) => {
  const theme = useTheme();
  const isDark = dark ?? theme.palette.mode === 'dark';
  const mesh = isDark ? 'rgba(200,197,206,0.18)' : 'rgba(90,82,104,0.16)';
  const flow = isDark ? 'rgba(200,197,206,0.45)' : 'rgba(90,82,104,0.4)';
  const stacked = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 1,
        p: { xs: 2, md: 3 },
        border: `1px solid ${isDark ? 'rgba(200,197,206,0.14)' : 'rgba(90,82,104,0.16)'}`,
        background: isDark ? '#252429' : '#ffffff',
        backdropFilter: 'none',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2, gap: 1 }}>
        <Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary' }}>
          SIGNAL IN → RIVICQ EaaS → PROTECTED OUTPUT
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: tokens.colors.rivicq[500], display: { xs: 'none', md: 'block' } }}>
          The encryption intelligence layer
        </Typography>
      </Stack>

      {stacked ? (
        /* Compact stacked layout for small phones — chips wrap, no truncation. */
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled', mb: 0.75 }}>SIGNALS</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {SIGNALS.map((n) => (
                <Pill key={n.label} node={n} dark={isDark} fullWidth={false} />
              ))}
            </Stack>
          </Box>

          <Stack alignItems="center" spacing={0.5}>
            <Box sx={{ color: 'text.disabled', fontSize: 18, lineHeight: 1 }}>↓</Box>
            <EngineNodes flow={flow} row />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: tokens.colors.rivicq[500] }}>RivicQ EaaS</Typography>
            <Box sx={{ color: 'text.disabled', fontSize: 18, lineHeight: 1 }}>↓</Box>
          </Stack>

          <Box>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled', mb: 0.75 }}>OUTPUTS</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {OUTPUTS.map((n) => (
                <Pill key={n.label} node={n} dark={isDark} accent={tokens.colors.crypto.low} fullWidth={false} />
              ))}
            </Stack>
          </Box>
        </Stack>
      ) : (
        <>
          {/* Mesh connectors */}
          <Box
            component="svg"
            viewBox="0 0 1000 360"
            preserveAspectRatio="none"
            sx={{ position: 'absolute', left: 0, right: 0, top: 56, bottom: 0, width: '100%', height: 'calc(100% - 56px)', pointerEvents: 'none' }}
          >
            {[70, 130, 190, 250, 310].map((y, i) => (
              <path key={`l-${i}`} d={`M 210 ${y} C 360 ${y}, 380 180, 500 180`} fill="none" stroke={mesh} strokeWidth={1} />
            ))}
            {[110, 180, 250].map((y, i) => (
              <path key={`r-${i}`} d={`M 500 180 C 620 180, 640 ${y}, 790 ${y}`} fill="none" stroke={mesh} strokeWidth={1} />
            ))}
          </Box>

          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: { xs: 1, md: 2 },
              alignItems: 'center',
            }}
          >
            <Stack spacing={1} alignItems="stretch" sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled' }}>SIGNALS</Typography>
              {SIGNALS.map((n) => (
                <Pill key={n.label} node={n} dark={isDark} />
              ))}
            </Stack>

            <Stack spacing={1.5} alignItems="center">
              <EngineNodes flow={flow} />
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: tokens.colors.rivicq[500], mt: 0.5 }}>RivicQ EaaS</Typography>
            </Stack>

            <Stack spacing={1} alignItems="stretch" sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled', textAlign: 'right' }}>OUTPUTS</Typography>
              {OUTPUTS.map((n) => (
                <Pill key={n.label} node={n} align="right" dark={isDark} accent={tokens.colors.crypto.low} />
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
};

export default EncryptionLayerVisual;
