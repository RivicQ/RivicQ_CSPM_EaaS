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
import PageFrame from '../components/PageFrame';

const data = [
  { name: 'Jan', assets: 400, compliance: 75 },
  { name: 'Feb', assets: 300, compliance: 78 },
  { name: 'Mar', assets: 550, compliance: 80 },
  { name: 'Apr', assets: 450, compliance: 82 },
  { name: 'May', assets: 600, compliance: 85 },
  { name: 'Jun', assets: 700, compliance: 78 },
];

const complianceData = [
  { name: 'Week 1', score: 72 },
  { name: 'Week 2', score: 75 },
  { name: 'Week 3', score: 78 },
  { name: 'Week 4', score: 82 },
];

const Analytics: React.FC = () => {
  return (
    <PageFrame
      eyebrow="Insights"
      title="Analytics"
      subtitle="A simple executive view of discovery trends, compliance movement, and high-level remediation status."
      badge="Live metrics"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Asset Discovery Trends</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="assets" fill="#667eea" name="Assets" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Compliance Score Trend</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={complianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[60, 100]} />
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
                  <Typography variant="body2" color="text.secondary">Total Scans</Typography>
                  <Typography variant="h4">1,247</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Avg. Compliance</Typography>
                  <Typography variant="h4" color="success.main">82%</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Vulnerabilities Found</Typography>
                  <Typography variant="h4" color="warning.main">156</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">Remediated</Typography>
                  <Typography variant="h4" color="info.main">89%</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default Analytics;
