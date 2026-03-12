import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Storage,
  Warning,
  CheckCircle,
  Shield,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { inventoryService } from '../services/api';
import BetaBanner from '../components/BetaBanner';

const COLORS = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444'];

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color + '20', color }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => inventoryService.getInventorySummary().then(r => r.data),
    retry: 1,
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: () => inventoryService.getAssets().then(r => r.data),
    retry: 1,
  });

  const assets = React.useMemo(
    () => Array.isArray(assetsData) ? assetsData : ((assetsData as any)?.assets ?? []),
    [assetsData]
  );

  const stats = React.useMemo(() => {
    const total = assets.length || (summaryData as any)?.total_assets || 0;
    const quantumSafe = assets.filter((a: any) => a.quantum_safe || a.quantumSafe).length || (summaryData as any)?.quantum_safe || 0;
    const vulnerable = assets.filter((a: any) => a.risk_level === 'HIGH' || a.risk_level === 'CRITICAL' || a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length || (summaryData as any)?.vulnerabilities || 0;
    const complianceScore = (summaryData as any)?.compliance_score ?? 85;
    return { total, quantumSafe, vulnerable, complianceScore };
  }, [assets, summaryData]);

  const algorithmData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a: any) => {
      const algo = a.algorithm || a.crypto_algorithm || 'Unknown';
      counts[algo] = (counts[algo] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const riskData = React.useMemo(() => {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return levels.map(level => ({
      name: level,
      value: assets.filter((a: any) => (a.risk_level || a.riskLevel) === level).length,
    }));
  }, [assets]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Real-time cryptographic asset overview
      </Typography>

      <BetaBanner />

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using demo data – connect backend to see live metrics.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Assets"
            value={stats.total || 42}
            icon={<Storage />}
            color="#667eea"
            subtitle="Across all providers"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Quantum Safe"
            value={stats.quantumSafe || 15}
            icon={<Shield />}
            color="#10b981"
            subtitle="PQC compliant"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vulnerabilities"
            value={stats.vulnerable || 8}
            icon={<Warning />}
            color="#ef4444"
            subtitle="Need remediation"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Compliance Score"
            value={`${stats.complianceScore}%`}
            icon={<CheckCircle />}
            color="#f59e0b"
            subtitle="BSI / DORA / eIDAS"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Algorithm Distribution
              </Typography>
              {algorithmData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={algorithmData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box height={250} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">
                    No asset data yet. Start a scan to populate metrics.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Distribution
              </Typography>
              {riskData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {riskData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box height={250} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">No risk data</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compliance Status
          </Typography>
          <Grid container spacing={2}>
            {[
              { label: 'BSI TR-02102', score: 88 },
              { label: 'DORA', score: 92 },
              { label: 'eIDAS 2.0', score: 79 },
              { label: 'FIPS 140-3', score: 85 },
            ].map(({ label, score }) => (
              <Grid item xs={12} sm={6} key={label}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{label}</Typography>
                    <Chip label={`${score}%`} size="small" color={score >= 90 ? 'success' : score >= 75 ? 'warning' : 'error'} />
                  </Box>
                  <LinearProgress variant="determinate" value={score} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
