import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import PageFrame from '../components/PageFrame';
import { analyticsService, inventoryService } from '../services/api';

const Analytics: React.FC = () => {
  const { data: inventory } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: () => inventoryService.getAssets().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: () => analyticsService.getInsights().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: reportsData } = useQuery({
    queryKey: ['analytics-reports'],
    queryFn: () => analyticsService.getReports().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const assets = inventory?.assets ?? inventory?.items ?? [];
  const byCategory = (inventory?.by_category ?? {}) as Record<string, number>;

  // Asset discovery trend by category (real inventory data when available).
  const data = Object.entries(byCategory).map(([name, value]) => ({
    name,
    assets: value,
  }));

  const report = reportsData?.reports?.[0] ?? {};
  const complianceScore = Number(report.pqc_readiness ?? 0);
  const totalScans = Number(report.total_assets ?? assets.length ?? 0);
  const vulnerable = Number(report.vulnerable_assets ?? 0);
  const quantumSafe = Number(report.quantum_safe_assets ?? 0);

  const complianceData = [
    { name: 'Quantum-safe', score: complianceScore },
    { name: 'At risk', score: Math.max(0, 100 - complianceScore) },
  ];

  const insights = insightsData?.insights ?? [];

  return (
    <PageFrame
      eyebrow="Insights"
      title="Analytics"
      subtitle="Executive view of discovery trends, posture movement, and ML-generated risk intelligence."
      badge="Live metrics"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Asset Discovery by Category</Typography>
              {data.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                  No inventory assets discovered yet. Run a scan to populate discovery trends.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="assets" fill="#667eea" name="Assets" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Posture Readiness</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={complianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Summary Statistics</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Total Assets</Typography>
                  <Typography variant="h4">{totalScans}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">PQC Readiness</Typography>
                  <Typography variant="h4" color="success.main">{complianceScore.toFixed(1)}%</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Vulnerable Assets</Typography>
                  <Typography variant="h4" color="warning.main">{vulnerable}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Quantum-safe</Typography>
                  <Typography variant="h4" color="info.main">{quantumSafe}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>ML Intelligence</Typography>
              {insights.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No insights generated yet. The ML engine produces insights after the first CBOM scan.
                </Typography>
              ) : (
                insights.map((insight: any, idx: number) => (
                  <Card key={idx} variant="outlined" sx={{ mb: 1.5 }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight={700}>{insight.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{insight.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Confidence {Math.round((insight.confidence ?? 0) * 100)}% · {insight.severity}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default Analytics;
