import React from 'react';
import { Box, Grid, LinearProgress, Typography, useTheme } from '@mui/material';
import { Psychology } from '@mui/icons-material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';
import { tokens } from '../../theme/tokens';

type PQCReadinessPanelProps = {
  quantumSafe: number;
  vulnerable: number;
  inMigration: number;
};

const PQCReadinessPanel: React.FC<PQCReadinessPanelProps> = ({ quantumSafe, vulnerable, inMigration }) => {
  const theme = useTheme();
  const total = quantumSafe + vulnerable + inMigration || 1;
  const safePct = Math.round((quantumSafe / total) * 100);
  const migratePct = Math.round((inMigration / total) * 100);
  const vulnPct = 100 - safePct - migratePct;

  const segments = [
    { label: 'Quantum Safe', value: quantumSafe, pct: safePct, color: dashboardDesign.severity.low },
    { label: 'In Migration', value: inMigration, pct: migratePct, color: tokens.colors.rivicq[500] },
    { label: 'Vulnerable', value: vulnerable, pct: vulnPct, color: dashboardDesign.severity.critical },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: `${dashboardDesign.radius.md}px`,
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${tokens.colors.rivicq[500]}14`,
            color: tokens.colors.rivicq[500],
            border: 1,
            borderColor: `${tokens.colors.rivicq[500]}33`,
          }}
        >
          <Psychology sx={{ fontSize: 24 }} />
        </Box>
        <Box>
          <Typography sx={{ ...metricValueSx, fontSize: '1.75rem', color: dashboardDesign.severity.low }}>{safePct}%</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>PQC-ready assets</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', mb: 2.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.08)' }}>
        {segments.map((s) => (
          <Box key={s.label} sx={{ width: `${s.pct}%`, bgcolor: s.color, transition: 'width 0.6s ease' }} />
        ))}
      </Box>

      <Grid container spacing={1.5}>
        {segments.map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Box sx={{ p: 1.5, borderRadius: `${dashboardDesign.radius.sm}px`, border: 1, borderColor: 'divider', bgcolor: `${s.color}08` }}>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </Typography>
              <Typography sx={{ ...metricValueSx, fontSize: '1.125rem', color: s.color, mt: 0.25 }}>{s.value}</Typography>
              <LinearProgress variant="determinate" value={s.pct} sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: `${s.color}18`, '& .MuiLinearProgress-bar': { bgcolor: s.color, borderRadius: 2 } }} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PQCReadinessPanel;
