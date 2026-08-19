import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Grid, Stack, Typography, useTheme } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import {
  Analytics as AnalyticsIcon, TrendingUp, Psychology, Description, Timeline,
} from '@mui/icons-material';
import PageFrame from '../components/PageFrame';
import StatCard from '../components/dashboard/StatCard';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import { EmptyState, DetailTabs, TabPanel } from '../components/ui';
import { analyticsService, inventoryService } from '../services/api';
import { categoryColor, chartGridStroke, chartTheme, chartTickFill, providerColor } from '../theme/chartTheme';
import designSystem from '../theme/designSystem';
import { tokens } from '../theme/tokens';
import PostureTrendChart from '../components/dashboard/PostureTrendChart';
import ChartTooltipBox from '../components/dashboard/ChartTooltip';
import {
  DEMO_ANALYTICS_INSIGHTS, DEMO_FORECAST, DEMO_POSTURE_TREND, DEMO_REPORTS,
  normalizeAssets, normalizeSummary,
} from '../data/workspaceDemo';

const Analytics: React.FC = () => {
  const theme = useTheme();
  const gridStroke = chartGridStroke(theme);
  const tickFill = chartTickFill(theme);
  const [tab, setTab] = useState(0);

  const { data: inventory } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: () => inventoryService.getInventorySummary().then((r) => r.data).catch(() => null),
    refetchInterval: 30_000,
  });

  const { data: assetsRaw } = useQuery({
    queryKey: ['analytics-assets'],
    queryFn: () => inventoryService.getAssets().then((r) => r.data).catch(() => null),
    refetchInterval: 30_000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: () => analyticsService.getInsights().then((r) => r.data).catch(() => null),
    refetchInterval: 60_000,
  });

  const { data: reportsData } = useQuery({
    queryKey: ['analytics-reports'],
    queryFn: () => analyticsService.getReports().then((r) => r.data).catch(() => null),
    refetchInterval: 60_000,
  });

  const summary = useMemo(() => normalizeSummary(inventory), [inventory]);
  const assets = useMemo(() => normalizeAssets(assetsRaw), [assetsRaw]);
  const byCategory = summary.by_category;
  const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, assets: value }));

  const trendRaw = insightsData?.posture_trend ?? insightsData?.trend ?? DEMO_POSTURE_TREND;
  const trendData = (Array.isArray(trendRaw) ? trendRaw : DEMO_POSTURE_TREND).map((p: any) => ({
    label: p.label ?? p.name,
    score: p.score ?? p.value ?? 0,
  }));

  const insights = insightsData?.insights?.length
    ? insightsData.insights.map((i: any, idx: number) => ({
        ...DEMO_ANALYTICS_INSIGHTS[idx % DEMO_ANALYTICS_INSIGHTS.length],
        ...i,
        description: i.description ?? DEMO_ANALYTICS_INSIGHTS[idx % DEMO_ANALYTICS_INSIGHTS.length]?.description,
      }))
    : DEMO_ANALYTICS_INSIGHTS;

  const reports = reportsData?.reports?.length ? reportsData.reports : DEMO_REPORTS;
  const complianceScore = summary.compliance_score;
  const pqcPct = summary.total_assets
    ? Math.round((summary.quantum_safe_count / summary.total_assets) * 100)
    : 62;

  return (
    <PageFrame eyebrow="Insights" title="Analytics" subtitle="Executive trends, ML intelligence, compliance reports, and PQC forecasts." badge="Live">
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}><StatCard label="Total Assets" value={summary.total_assets} accent={tokens.colors.rivicq[500]} delay={0} /></Grid>
        <Grid item xs={6} md={3}><StatCard label="PQC Readiness" value={`${pqcPct}%`} accent={tokens.colors.crypto.low} delay={1} /></Grid>
        <Grid item xs={6} md={3}><StatCard label="Vulnerable" value={summary.vulnerable_assets} accent={tokens.colors.crypto.high} delay={2} /></Grid>
        <Grid item xs={6} md={3}><StatCard label="Compliance" value={`${complianceScore}%`} accent={tokens.colors.rivicq[700]} delay={3} /></Grid>
      </Grid>

      <DetailTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: 'Overview', icon: <AnalyticsIcon fontSize="small" /> },
          { label: 'Trends', icon: <TrendingUp fontSize="small" /> },
          { label: 'ML Insights', icon: <Psychology fontSize="small" /> },
          { label: 'Reports', icon: <Description fontSize="small" /> },
          { label: 'Forecast', icon: <Timeline fontSize="small" /> },
        ]}
      />

      <TabPanel value={tab} index={0}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <DashboardPanel title="Discovery by Category" subtitle="Inventory breakdown across asset classes" delay={0}>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(14,165,233,0.05)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload as { name: string; assets: number };
                        return (
                          <ChartTooltipBox
                            title={item.name}
                            accent={categoryColor(item.name)}
                            rows={[
                              { label: 'Assets', value: item.assets, color: categoryColor(item.name) },
                              { label: 'Share', value: `${summary.total_assets ? Math.round((item.assets / summary.total_assets) * 100) : 0}%`, muted: true },
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar dataKey="assets" radius={[6, 6, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={categoryColor(entry.name, index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </DashboardPanel>
          </Grid>
          <Grid item xs={12} md={6}>
            <DashboardPanel title="Cloud Distribution" subtitle={`${assets.length} assets in active scan scope`} delay={1}>
              <Stack spacing={1.5} sx={{ py: 1 }}>
                {Object.entries(summary.by_cloud_provider).map(([provider, count], index) => {
                  const pct = summary.total_assets ? Math.round((count / summary.total_assets) * 100) : 0;
                  const color = providerColor(provider);
                  return (
                    <Box key={provider}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'uppercase' }}>{provider.replace('_', ' ')}</Typography>
                        <Typography variant="caption" color="text.secondary">{count} · {pct}%</Typography>
                      </Stack>
                      <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 4, opacity: index === 0 ? 1 : 0.85 - index * 0.05 }} />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </DashboardPanel>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <DashboardPanel title="Posture Trend" subtitle="7-day security posture score movement" delay={0}>
          <PostureTrendChart data={trendData} height={320} baseline={80} />
        </DashboardPanel>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Grid container spacing={2}>
          {insights.map((insight: any, idx: number) => (
            <Grid item xs={12} md={6} key={idx}>
              <Box sx={{ p: 2.5, borderRadius: `${designSystem.radius.lg}px`, border: 1, borderColor: 'divider', height: '100%', bgcolor: 'action.hover' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Chip
                    label={(insight.severity || 'info').toUpperCase()}
                    size="small"
                    color={insight.severity === 'critical' ? 'error' : insight.severity === 'high' ? 'warning' : 'default'}
                  />
                  <Chip label={insight.type || 'insight'} size="small" variant="outlined" />
                </Stack>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>{insight.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{insight.description}</Typography>
                <Typography variant="caption" color="primary.main" sx={{ mt: 1.5, display: 'block', fontWeight: 600 }}>
                  Confidence {Math.round((insight.confidence ?? 0.85) * 100)}%
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        {reports.length === 0 ? (
          <EmptyState title="No reports" description="Reports generate after your first weekly scan cycle." />
        ) : (
          <Stack spacing={1.5}>
            {reports.map((report: any) => (
              <Box key={report.id} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography fontWeight={700}>{report.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {report.type} · {report.pages ?? '—'} pages · {new Date(report.generated_at).toLocaleString()}
                  </Typography>
                </Box>
                <Chip label={report.format || 'PDF'} size="small" variant="outlined" />
                <Button size="small" variant="outlined">Download</Button>
                <Button size="small">Share</Button>
              </Box>
            ))}
          </Stack>
        )}
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <DashboardPanel title="PQC Migration Forecast" subtitle="Projected posture if current remediation velocity continues" delay={0}>
          <Box sx={{ height: 260, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO_FORECAST}>
                <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="projected_score" name="Posture score" stroke={chartTheme.pqc} strokeWidth={3} dot={{ r: 5, fill: chartTheme.pqc }} />
                <Line type="monotone" dataKey="migration_pct" name="Migration %" stroke={tokens.colors.rivicq[500]} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: tokens.colors.rivicq[500] }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={1.5}>
            {DEMO_FORECAST.map((f) => (
              <Box key={f.quarter} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography fontWeight={700}>{f.quarter}</Typography>
                <Typography variant="body2" color="text.secondary">{f.note} — target score {f.projected_score}%, migration {f.migration_pct}%</Typography>
              </Box>
            ))}
          </Stack>
        </DashboardPanel>
      </TabPanel>
    </PageFrame>
  );
};

export default Analytics;
