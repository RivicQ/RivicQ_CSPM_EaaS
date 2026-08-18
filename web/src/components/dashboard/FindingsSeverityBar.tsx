import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

type FindingsCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type FindingsSeverityBarProps = {
  findings: FindingsCounts;
  onSelect?: (severity: keyof FindingsCounts) => void;
};

const FindingsSeverityBar: React.FC<FindingsSeverityBarProps> = ({ findings, onSelect }) => {
  const theme = useTheme();
  const total = findings.critical + findings.high + findings.medium + findings.low || 1;

  const segments = [
    { key: 'Critical', sev: 'critical' as const, value: findings.critical, color: dashboardDesign.severity.palette[3] },
    { key: 'High', sev: 'high' as const, value: findings.high, color: dashboardDesign.severity.palette[2] },
    { key: 'Medium', sev: 'medium' as const, value: findings.medium, color: dashboardDesign.severity.palette[1] },
    { key: 'Low', sev: 'low' as const, value: findings.low, color: dashboardDesign.severity.palette[0] },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', mb: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.08)' }}>
        {segments.map((s) => (
          s.value > 0 && (
            <Box
              key={s.key}
              onClick={() => onSelect?.(s.sev)}
              sx={{
                width: `${(s.value / total) * 100}%`,
                bgcolor: s.color,
                transition: 'width 0.5s ease',
                minWidth: s.value > 0 ? 4 : 0,
                cursor: onSelect ? 'pointer' : 'default',
              }}
            />
          )
        ))}
      </Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {segments.map((s) => (
          <Stack key={s.key} direction="row" spacing={1} alignItems="center" onClick={() => onSelect?.(s.sev)} sx={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: s.color }} />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>{s.key}</Typography>
            <Typography sx={{ ...metricValueSx, fontSize: '0.875rem', color: s.color }}>{s.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default FindingsSeverityBar;
