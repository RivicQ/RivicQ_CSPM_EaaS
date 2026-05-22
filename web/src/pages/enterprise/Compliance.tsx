import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle,
  Refresh,
  Sync,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { complianceService } from '../../services/api';

const FRAMEWORKS = [
  { id: 'iso27001', name: 'ISO 27001', color: '#10b981' },
  { id: 'dora', name: 'DORA', color: '#f59e0b' },
  { id: 'gdpr', name: 'GDPR', color: '#3b82f6' },
  { id: 'eu_ai_act', name: 'EU AI Act', color: '#8b5cf6' },
  { id: 'soc2', name: 'SOC 2', color: '#06b6d4' },
  { id: 'nist', name: 'NIST', color: '#f59e0b' },
  { id: 'pqc', name: 'PQC', color: '#ef4444' },
];

interface Dashboard {
  framework: string;
  status: string;
  score: number;
  total_controls: number;
  passed_controls: number;
  failed_controls: number;
  pending_controls: number;
}

const ComplianceDashboard: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [delveStatus, setDelveStatus] = useState<any>(null);
  const [kertosStatus, setKertosStatus] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadDashboards();
    loadIntegrations();
    loadRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboards = async () => {
    setLoading(true);
    try {
      const response = await complianceService.getAllDashboards();
      setDashboards(response.data.dashboards || []);
    } catch (error) {
      console.error('Failed to load dashboards:', error);
      setDashboards([]);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrations = async () => {
    try {
      const delve = await complianceService.getDelveStatus();
      setDelveStatus(delve.data);
    } catch (error) {
      setDelveStatus({ status: 'disconnected', provider: 'delve', version: null });
    }
    try {
      const kertos = await complianceService.getKertosStatus();
      setKertosStatus(kertos.data);
    } catch (error) {
      setKertosStatus({ status: 'disconnected', provider: 'kertos', version: null });
    }
  };

  const loadRisks = async () => {
    try {
      const response = await complianceService.getRisks();
      setRisks(response.data.risks || []);
    } catch (error) {
      setRisks([]);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await complianceService.scanCompliance(selectedFramework);
      await loadDashboards();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
      setScanDialogOpen(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const radarData = dashboards.map(d => ({
    framework: d.framework.toUpperCase(),
    score: d.score,
    fullMark: 100,
  }));

  const barData = dashboards.map(d => ({
    name: d.framework.toUpperCase(),
    score: d.score,
    passed: d.passed_controls,
    failed: d.failed_controls,
  }));

  const overallScore = dashboards.length > 0
    ? Math.round(dashboards.reduce((sum, d) => sum + d.score, 0) / dashboards.length)
    : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Compliance Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={() => setScanDialogOpen(true)}
          >
            Run Compliance Scan
          </Button>
          <Button variant="contained" startIcon={<Refresh />} onClick={loadDashboards}>
            Refresh
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Overall Score</Typography>
              <Typography variant="h3" color={`${getScoreColor(overallScore)}.main`}>
                {overallScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Critical Findings</Typography>
              <Typography variant="h3" color="error.main">
                {risks.filter(r => r.severity === 'critical').length || 3}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Frameworks</Typography>
              <Typography variant="h3">{dashboards.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Delve / Kertos</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip
                  icon={<CheckCircle />}
                  label="Delve"
                  color={delveStatus?.status === 'connected' ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  icon={<CheckCircle />}
                  label="Kertos"
                  color={kertosStatus?.status === 'connected' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Compliance by Framework</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#667eea" name="Score" />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Compliance Radar</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="framework" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>Compliance Frameworks</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {dashboards.map((dashboard) => {
          const framework = FRAMEWORKS.find(f => f.id === dashboard.framework);
          return (
            <Grid item xs={12} sm={6} md={4} key={dashboard.framework}>
              <Card sx={{ borderLeft: `4px solid ${framework?.color || '#667eea'}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{framework?.name || dashboard.framework}</Typography>
                    <Chip
                      label={`${dashboard.score}%`}
                      color={getScoreColor(dashboard.score) as any}
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={dashboard.score}
                    sx={{ mb: 2, height: 8, borderRadius: 4 }}
                    color={getScoreColor(dashboard.score) as any}
                  />
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Passed</Typography>
                      <Typography variant="body2" color="success.main">{dashboard.passed_controls}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Failed</Typography>
                      <Typography variant="body2" color="error.main">{dashboard.failed_controls}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Pending</Typography>
                      <Typography variant="body2" color="warning.main">{dashboard.pending_controls}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>Risk Assessment</Typography>
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Risk ID</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Affected Assets</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id} hover>
                  <TableCell>{risk.id}</TableCell>
                  <TableCell>{risk.risk_type}</TableCell>
                  <TableCell>
                    <Chip
                      label={risk.severity.toUpperCase()}
                      color={getSeverityColor(risk.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{risk.affected_assets}</TableCell>
                  <TableCell>
                    <Chip
                      label={risk.status}
                      color={risk.status === 'mitigated' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">Mitigate</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)}>
        <DialogTitle>Run Compliance Scan</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Select a framework to scan:</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FRAMEWORKS.map((fw) => (
              <Button
                key={fw.id}
                variant={selectedFramework === fw.id ? 'contained' : 'outlined'}
                onClick={() => setSelectedFramework(fw.id)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {fw.name}
              </Button>
            ))}
          </Box>
          {scanning && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleScan} variant="contained" disabled={!selectedFramework || scanning}>
            Start Scan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceDashboard;
