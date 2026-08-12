import React from 'react';
import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';

export type HeatmapCellData = {
  id: string;
  risk: number;
  count: number;
  label: string;
  day: string;
};

type RiskHeatmapProps = {
  data: HeatmapCellData[];
  columns?: number;
  selectedId?: string | null;
  onSelect?: (cell: HeatmapCellData | null) => void;
};

const RISK_LABELS = ['None', 'Low', 'Medium', 'High', 'Critical'];

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({
  data,
  columns = 10,
  selectedId,
  onSelect,
}) => {
  const theme = useTheme();
  const rows = Math.ceil(data.length / columns);
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(0, Math.min(columns, 7));

  const totals = data.reduce(
    (acc, cell) => {
      if (cell.risk > 0) acc.events += cell.count;
      if (cell.risk >= 3) acc.high += cell.count;
      if (cell.risk >= 3) acc.critical += cell.count;
      return acc;
    },
    { events: 0, high: 0, critical: 0 },
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 0.75, pl: { xs: 0, sm: 3.5 }, display: { xs: 'none', sm: 'flex' } }}>
        {dayHeaders.map((day) => (
          <Typography
            key={day}
            sx={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.625rem',
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.03em',
            }}
          >
            {day}
          </Typography>
        ))}
      </Stack>

      <Box sx={{ overflowX: 'auto', overflowY: 'hidden', mx: { xs: -0.5, md: 0 }, pb: 0.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `28px repeat(${columns}, minmax(20px, 1fr))`, gap: 0.5, mb: 1, minWidth: columns > 7 ? 320 : undefined }}>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <React.Fragment key={`row-${rowIdx}`}>
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pr: 0.5,
              }}
            >
              W{rowIdx + 1}
            </Typography>
            {data.slice(rowIdx * columns, rowIdx * columns + columns).map((cell) => {
              const color = dashboardDesign.severity.palette[cell.risk] || theme.palette.divider;
              const isSelected = selectedId === cell.id;
              const isEmpty = cell.risk === 0;

              return (
                <Tooltip
                  key={cell.id}
                  arrow
                  placement="top"
                  title={
                    <Box sx={{ p: 0.25 }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{cell.label}</Typography>
                      <Typography sx={{ fontSize: '0.6875rem', mt: 0.25 }}>
                        {cell.count} finding{cell.count === 1 ? '' : 's'} · {RISK_LABELS[cell.risk] ?? 'None'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', mt: 0.25 }}>
                        Click to inspect
                      </Typography>
                    </Box>
                  }
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onSelect?.(isSelected ? null : cell)}
                    sx={{
                      aspectRatio: '1',
                      border: 'none',
                      p: 0,
                      borderRadius: 0.75,
                      cursor: 'pointer',
                      bgcolor: isEmpty
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(148,163,184,0.08)'
                          : 'rgba(100,116,139,0.08)'
                        : `${color}${cell.risk === 3 ? '' : 'cc'}`,
                      outline: isSelected ? `2px solid ${color}` : 'none',
                      outlineOffset: 1,
                      transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                      transition: dashboardDesign.motion.transition,
                      '&:hover': {
                        transform: 'scale(1.15)',
                        zIndex: 2,
                        boxShadow: `0 4px 14px ${color}55`,
                      },
                    }}
                  />
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </Box>
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {dashboardDesign.severity.labels.map((label, i) => (
            <Stack key={label} direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: 0.5,
                  bgcolor: i === 0 ? 'action.hover' : `${dashboardDesign.severity.palette[i]}cc`,
                }}
              />
              <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', fontWeight: 600 }}>
                {label}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
            <Box component="span" sx={{ ...metricValueSx, fontSize: '0.75rem', color: 'text.primary', mr: 0.5 }}>
              {totals.events}
            </Box>
            events
          </Typography>
          {totals.critical > 0 && (
            <Typography sx={{ fontSize: '0.6875rem', color: dashboardDesign.severity.critical, fontWeight: 600 }}>
              {totals.critical} critical
            </Typography>
          )}
        </Stack>
      </Stack>

      {selectedId && (() => {
        const cell = data.find((c) => c.id === selectedId);
        if (!cell) return null;
        return (
          <Box
            sx={{
              mt: 1,
              px: 1.25,
              py: 0.875,
              borderRadius: `${dashboardDesign.radius.sm}px`,
              bgcolor: `${dashboardDesign.severity.palette[cell.risk]}12`,
              border: 1,
              borderColor: `${dashboardDesign.severity.palette[cell.risk]}33`,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{cell.label}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 0.25 }}>
              {cell.count} findings detected · severity {RISK_LABELS[cell.risk]?.toLowerCase()}
            </Typography>
          </Box>
        );
      })()}
    </Box>
  );
};

export default RiskHeatmap;
