import React from 'react';
import { Box, Typography } from '@mui/material';
import { Shield, TrendingDown, TrendingUp, Warning } from '@mui/icons-material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

type ThreatMetric = {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'low' | 'medium' | 'high' | 'critical';
};

type ThreatIntelStripProps = {
  metrics: ThreatMetric[];
  onSelect?: (label: string) => void;
};

const severityColor = (s?: string) => {
  if (s === 'critical') return dashboardDesign.severity.critical;
  if (s === 'high') return dashboardDesign.severity.high;
  if (s === 'medium') return dashboardDesign.severity.medium;
  return dashboardDesign.severity.low;
};

const ThreatIntelStrip: React.FC<ThreatIntelStripProps> = ({ metrics, onSelect }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 128px), 1fr))',
      gap: 1.25,
    }}
  >
    {metrics.map((m) => (
      <Box
        key={m.label}
        onClick={() => onSelect?.(m.label)}
        sx={{
          minWidth: 0,
          p: 1.75,
          cursor: onSelect ? 'pointer' : 'default',
          borderRadius: `${dashboardDesign.radius.md}px`,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
        }}
      >
        <Box sx={{ color: severityColor(m.severity), mt: 0.25 }}>
          {m.severity === 'critical' || m.severity === 'high' ? <Warning sx={{ fontSize: 18 }} /> : <Shield sx={{ fontSize: 18 }} />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {m.label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
            <Typography sx={{ ...metricValueSx, fontSize: '1.125rem' }}>{m.value}</Typography>
            {m.trend === 'up' && <TrendingUp sx={{ fontSize: 16, color: dashboardDesign.severity.critical }} />}
            {m.trend === 'down' && <TrendingDown sx={{ fontSize: 16, color: dashboardDesign.severity.low }} />}
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);

export default ThreatIntelStrip;
