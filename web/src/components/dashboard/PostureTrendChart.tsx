import React from 'react';
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { TrendingDown, TrendingUp } from '@mui/icons-material';
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import dashboardDesign from '../../theme/dashboardDesign';
import { metricValueSx } from '../../theme/designSystem';
import { tokens } from '../../theme/tokens';
import ChartTooltipBox from './ChartTooltip';

export type TrendPoint = {
  label: string;
  score: number;
  findings?: number;
  scans?: number;
};

type PostureTrendChartProps = {
  data: TrendPoint[];
  height?: number;
  baseline?: number;
  activeIndex?: number | null;
  onActiveChange?: (index: number | null) => void;
};

const PostureTrendChart: React.FC<PostureTrendChartProps> = ({
  data,
  height = 200,
  baseline,
  activeIndex,
  onActiveChange,
}) => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'));
  const chartHeight = isCompact ? Math.min(height, 168) : height;
  const isDark = theme.palette.mode === 'dark';
  const grid = isDark ? dashboardDesign.chart.gridDark : dashboardDesign.chart.grid;
  const tick = theme.palette.text.secondary;

  const scores = data.map((d) => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const delta = data.length > 1 ? data[data.length - 1].score - data[0].score : 0;
  const activePoint = activeIndex != null ? data[activeIndex] : data[data.length - 1];

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current
          </Typography>
          <Typography sx={{ ...metricValueSx, fontSize: '1.125rem', color: tokens.colors.rivicq[600], lineHeight: 1.1 }}>
            {activePoint?.score ?? '—'}%
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Range
          </Typography>
          <Typography sx={{ ...metricValueSx, fontSize: '0.875rem', lineHeight: 1.2 }}>
            {minScore}–{maxScore}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Change
          </Typography>
          <Stack direction="row" spacing={0.35} alignItems="center">
            {delta >= 0 ? (
              <TrendingUp sx={{ fontSize: 14, color: dashboardDesign.severity.low }} />
            ) : (
              <TrendingDown sx={{ fontSize: 14, color: dashboardDesign.severity.high }} />
            )}
            <Typography
              sx={{
                ...metricValueSx,
                fontSize: '0.875rem',
                color: delta >= 0 ? dashboardDesign.severity.low : dashboardDesign.severity.high,
              }}
            >
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </Typography>
          </Stack>
        </Box>
        {activePoint?.findings != null && (
          <Box>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Findings
            </Typography>
            <Typography sx={{ ...metricValueSx, fontSize: '0.875rem' }}>{activePoint.findings}</Typography>
          </Box>
        )}
      </Stack>

      <Box sx={{ height: chartHeight, width: '100%', minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state?.activeTooltipIndex != null) {
                onActiveChange?.(Number(state.activeTooltipIndex));
              }
            }}
            onMouseLeave={() => onActiveChange?.(null)}
          >
            <defs>
              <linearGradient id="postureArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tokens.colors.rivicq[500]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={tokens.colors.rivicq[500]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: tick, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis domain={['dataMin - 5', 100]} tick={{ fontSize: 10, fill: tick }} axisLine={false} tickLine={false} width={36} />
            {baseline != null && (
              <ReferenceLine
                y={baseline}
                stroke={tokens.colors.rivicq[400]}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: 'Target 80', position: 'insideTopRight', fill: tick, fontSize: 9 }}
              />
            )}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as TrendPoint;
                const idx = data.findIndex((d) => d.label === label);
                const prev = idx > 0 ? data[idx - 1].score : null;
                const dayDelta = prev != null ? point.score - prev : null;
                return (
                  <ChartTooltipBox
                    title={String(label)}
                    rows={[
                      { label: 'Posture', value: `${point.score}%`, color: tokens.colors.rivicq[500] },
                      ...(dayDelta != null
                        ? [{ label: 'vs prior', value: `${dayDelta >= 0 ? '+' : ''}${dayDelta.toFixed(1)}%`, muted: true }]
                        : []),
                      ...(point.findings != null ? [{ label: 'Findings', value: point.findings, muted: true }] : []),
                      ...(point.scans != null ? [{ label: 'Scans', value: point.scans, muted: true }] : []),
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={tokens.colors.rivicq[500]}
              strokeWidth={2.5}
              fill="url(#postureArea)"
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const isActive = activeIndex === index || (activeIndex == null && index === data.length - 1);
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={isActive ? 5 : 3}
                    fill={isActive ? tokens.colors.rivicq[600] : tokens.colors.rivicq[500]}
                    stroke="#fff"
                    strokeWidth={isActive ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PostureTrendChart;
