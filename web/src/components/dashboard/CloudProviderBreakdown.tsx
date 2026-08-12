import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dashboardDesign from '../../theme/dashboardDesign';
import { chartCursorFill, providerColor } from '../../theme/chartTheme';
import { metricValueSx } from '../../theme/designSystem';
import ChartTooltipBox from './ChartTooltip';

type ProviderDatum = { name: string; value: number };

type CloudProviderBreakdownProps = {
  data: ProviderDatum[];
  height?: number;
  selected?: string | null;
  onSelect?: (name: string | null) => void;
};

const CloudProviderBreakdown: React.FC<CloudProviderBreakdownProps> = ({
  data,
  height = 200,
  selected,
  onSelect,
}) => {
  const theme = useTheme();
  const tick = theme.palette.text.secondary;
  const total = data.reduce((s, d) => s + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography sx={{ ...metricValueSx, fontSize: '1.125rem' }}>{total.toLocaleString()}</Typography>
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600 }}>
          total resources
        </Typography>
      </Stack>

      <Box sx={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 28, left: 4, bottom: 0 }}
            barCategoryGap="14%"
          >
            <XAxis type="number" tick={{ fontSize: 10, fill: tick }} axisLine={false} tickLine={false} hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: tick, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: chartCursorFill(theme) }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as ProviderDatum;
                const pct = total ? Math.round((item.value / total) * 100) : 0;
                return (
                  <ChartTooltipBox
                    title={item.name}
                    accent={providerColor(item.name)}
                    rows={[
                      { label: 'Resources', value: item.value.toLocaleString(), color: providerColor(item.name) },
                      { label: 'Share', value: `${pct}%`, muted: true },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              onClick={(entry) => onSelect?.(selected === entry.name ? null : entry.name)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              {sorted.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={providerColor(entry.name)}
                  opacity={selected && selected !== entry.name ? 0.35 : 1}
                  stroke={selected === entry.name ? providerColor(entry.name) : 'none'}
                  strokeWidth={selected === entry.name ? 2 : 0}
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 10, fontWeight: 700, fill: tick }}
                formatter={(v: number) => `${Math.round((v / total) * 100)}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {selected && (() => {
        const item = data.find((d) => d.name === selected);
        if (!item) return null;
        return (
          <Box
            sx={{
              mt: 1,
              px: 1.25,
              py: 0.75,
              borderRadius: `${dashboardDesign.radius.sm}px`,
              bgcolor: `${providerColor(item.name)}12`,
              border: 1,
              borderColor: `${providerColor(item.name)}33`,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {item.name} · {item.value.toLocaleString()} resources ({Math.round((item.value / total) * 100)}%)
            </Typography>
          </Box>
        );
      })()}
    </Box>
  );
};

export default CloudProviderBreakdown;
