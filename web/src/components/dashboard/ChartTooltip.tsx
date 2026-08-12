import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

export type ChartTooltipRow = {
  label: string;
  value: string | number;
  color?: string;
  muted?: boolean;
};

type ChartTooltipProps = {
  title?: string;
  rows: ChartTooltipRow[];
  accent?: string;
};

export const ChartTooltipBox: React.FC<ChartTooltipProps> = ({ title, rows, accent }) => (
  <Box
    sx={{
      px: 1.5,
      py: 1.125,
      minWidth: 140,
      bgcolor: 'background.paper',
      border: 1,
      borderColor: accent ? `${accent}33` : 'divider',
      borderRadius: `${dashboardDesign.radius.sm}px`,
      boxShadow: dashboardDesign.chart.tooltipShadow,
    }}
  >
    {title && (
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
        {title}
      </Typography>
    )}
    <Stack spacing={0.5}>
      {rows.map((row) => (
        <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {row.color && (
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
            )}
            <Typography sx={{ fontSize: '0.75rem', color: row.muted ? 'text.secondary' : 'text.primary', fontWeight: row.muted ? 500 : 600 }}>
              {row.label}
            </Typography>
          </Stack>
          <Typography sx={{ ...metricValueSx, fontSize: '0.8125rem', color: row.color || 'primary.main' }}>
            {row.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </Box>
);

export default ChartTooltipBox;
