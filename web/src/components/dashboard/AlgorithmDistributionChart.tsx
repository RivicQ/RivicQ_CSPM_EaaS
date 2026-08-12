import React from 'react';
import { Box, useTheme } from '@mui/material';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { chartCursorFill, chartTheme } from '../../theme/chartTheme';
import dashboardDesign from '../../theme/dashboardDesign';
import { tokens } from '../../theme/tokens';
import ChartTooltipBox from './ChartTooltip';

const PQC_ALGORITHMS = new Set(['ML-KEM', 'ML-DSA', 'SLH-DSA', 'Kyber', 'Dilithium']);

const algorithmColor = (name: string, selected: boolean, isSelectedBar: boolean) => {
  if (isSelectedBar && selected) return tokens.colors.rivicq[700];
  if (PQC_ALGORITHMS.has(name) || name.includes('ML-')) return chartTheme.pqc;
  if (name.includes('3DES') || name.includes('RSA-1024') || name.includes('MD5')) return dashboardDesign.severity.high;
  return tokens.colors.rivicq[500];
};

type AlgorithmDatum = { name: string; value: number };

type AlgorithmDistributionChartProps = {
  data: AlgorithmDatum[];
  height?: number;
  selected?: string | null;
  onSelect?: (name: string | null) => void;
};

const AlgorithmDistributionChart: React.FC<AlgorithmDistributionChartProps> = ({
  data,
  height = 220,
  selected,
  onSelect,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const grid = isDark ? dashboardDesign.chart.gridDark : dashboardDesign.chart.grid;
  const tick = theme.palette.text.secondary;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Box sx={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="16%" margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: tick, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={42}
          />
          <YAxis tick={{ fontSize: 10, fill: tick }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ fill: chartCursorFill(theme) }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as AlgorithmDatum;
              const pct = total ? Math.round((item.value / total) * 100) : 0;
              const isPqc = PQC_ALGORITHMS.has(item.name) || item.name.includes('ML-');
              return (
                <ChartTooltipBox
                  title={item.name}
                  accent={algorithmColor(item.name, !!selected, false)}
                  rows={[
                    { label: 'Assets', value: item.value, color: algorithmColor(item.name, !!selected, false) },
                    { label: 'Share', value: `${pct}%`, muted: true },
                    { label: 'Class', value: isPqc ? 'PQC-ready' : 'Legacy', muted: true },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            onClick={(entry) => onSelect?.(selected === entry.name ? null : entry.name)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={algorithmColor(entry.name, !!selected, selected === entry.name)}
                opacity={selected && selected !== entry.name ? 0.45 : 1}
              />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              style={{ fontSize: 10, fontWeight: 700, fill: tick }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AlgorithmDistributionChart;
