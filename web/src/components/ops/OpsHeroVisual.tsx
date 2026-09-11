import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { tokens } from '../../theme/tokens';
import { PIPELINE_STAGES } from '../../data/bomFramework';

export type SeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type BomCounts = Record<string, number>;

type OpsHeroVisualProps = {
  variant: 'findings' | 'scans' | 'bom' | 'migration' | 'governance';
  severity?: SeverityCounts;
  bom?: BomCounts;
  mapped?: number;
  locked?: number;
  scanning?: boolean;
  empty?: boolean;
};

const SEV_COLORS = {
  critical: tokens.colors.crypto.critical,
  high: tokens.colors.crypto.high,
  medium: tokens.colors.crypto.medium,
  low: tokens.colors.crypto.low,
};

const OpsHeroVisual: React.FC<OpsHeroVisualProps> = ({
  variant,
  severity = { critical: 0, high: 0, medium: 0, low: 0 },
  bom = { cbom: 0, qbom: 0, sbom: 0, aibom: 0, ibom: 0 },
  mapped = 0,
  locked = 0,
  scanning = false,
  empty = false,
}) => {
  if (variant === 'findings') {
    const data = [
      { name: 'Crit', value: severity.critical, fill: SEV_COLORS.critical },
      { name: 'High', value: severity.high, fill: SEV_COLORS.high },
      { name: 'Med', value: severity.medium, fill: SEV_COLORS.medium },
      { name: 'Low', value: severity.low, fill: SEV_COLORS.low },
    ];
    return (
      <Box sx={{ width: '100%', minWidth: 200, height: 132 }} aria-label="Findings severity chart">
        <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', mb: 0.5 }}>
          {empty ? 'Severity · no scan series yet' : 'Severity in this workspace'}
        </Typography>
        <ResponsiveContainer width="100%" height={108}>
          <BarChart data={data} barSize={18} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  }

  if (variant === 'scans') {
    const steps = PIPELINE_STAGES.filter((s) => s.oss).slice(0, 4);
    return (
      <Box sx={{ width: '100%', minWidth: 220 }} aria-label="Scan pipeline">
        <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', mb: 1 }}>
          Discover → score → report
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <Box
                component={motion.div}
                animate={scanning && i === 0 ? { opacity: [0.55, 1, 0.55] } : { opacity: 1 }}
                transition={{ duration: 1.4, repeat: scanning ? Infinity : 0 }}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: '1px solid rgba(167,139,250,0.35)',
                  bgcolor: scanning && i === 0 ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.04)',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1.2 }} noWrap>
                  {s.name}
                </Typography>
                <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }} noWrap>
                  {s.artifact}
                </Typography>
              </Box>
              {i < steps.length - 1 && (
                <Box sx={{ width: 10, height: 1, bgcolor: 'rgba(167,139,250,0.45)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === 'bom') {
    const rows = [
      { id: 'CBOM', n: bom.cbom || 0 },
      { id: 'QBOM', n: bom.qbom || 0 },
      { id: 'SBOM', n: bom.sbom || 0 },
      { id: 'AIBOM', n: bom.aibom || 0 },
      { id: 'IBOM', n: bom.ibom || 0 },
    ];
    const max = Math.max(1, ...rows.map((r) => r.n));
    return (
      <Box sx={{ width: '100%', minWidth: 200 }} aria-label="BOM layer coverage">
        <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', mb: 1 }}>
          Layer coverage from scans
        </Typography>
        <Stack spacing={0.6}>
          {rows.map((r) => (
            <Stack key={r.id} direction="row" spacing={1} alignItems="center">
              <Typography sx={{ width: 44, fontSize: 10, fontWeight: 700, color: '#fff' }}>{r.id}</Typography>
              <Box sx={{ flex: 1, height: 8, borderRadius: 99, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <Box sx={{ width: `${(r.n / max) * 100}%`, height: '100%', bgcolor: tokens.colors.rivicq[400], borderRadius: 99 }} />
              </Box>
              <Typography sx={{ width: 24, fontSize: 10, color: 'rgba(255,255,255,0.65)', textAlign: 'right' }}>{r.n}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === 'migration') {
    const stages = [
      { id: 'Inventory', hint: 'CBOM / SBOM' },
      { id: 'Hybrid', hint: 'classical + PQC' },
      { id: 'ML-KEM', hint: 'FIPS 203' },
      { id: 'ML-DSA', hint: 'FIPS 204' },
    ];
    return (
      <Box sx={{ width: '100%', minWidth: 200 }} aria-label="PQC migration stages">
        <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', mb: 1 }}>
          Cut-over model · keys are not rotated here
        </Typography>
        <Stack direction="row" spacing={0.75}>
          {stages.map((s, i) => (
            <Box
              key={s.id}
              sx={{
                flex: 1,
                px: 1,
                py: 0.85,
                borderRadius: 1.5,
                border: '1px solid rgba(167,139,250,0.3)',
                bgcolor: i === 0 ? 'rgba(124,58,237,0.28)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{s.id}</Typography>
              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{s.hint}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minWidth: 180 }} aria-label="Governance mapping coverage">
      <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', mb: 1 }}>
        Mappings · not certifications
      </Typography>
      <Stack direction="row" spacing={1}>
        <Box sx={{ flex: 1, p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(124,58,237,0.28)', border: '1px solid rgba(167,139,250,0.35)' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{mapped}</Typography>
          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Mapped</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{locked}</Typography>
          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Enterprise pack</Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default OpsHeroVisual;
