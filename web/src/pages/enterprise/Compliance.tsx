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
  GppGood,
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
import { useAuth } from '../../context/AuthContext';
import { buildDemoComplianceDashboards, buildDemoRisks } from '../../demo/demoViews';
import ProvenanceChip from '../../components/dashboard/ProvenanceChip';
import { EmptyState } from '../../components/ui';

const FRAMEWORKS = [
	{ id: 'iso27001', name: 'ISO 27001', color: '#24a148' },
  { id: 'nis2', name: 'NIS2', color: '#0ea5e9' },
  { id: 'dora', name: 'DORA', color: '#ff832b' },
  { id: 'gdpr', name: 'GDPR', color: '#0f62fe' },
  { id: 'bsi', name: 'BSI TR-02102', color: '#64748b' },
  { id: 'eu_ai_act', name: 'EU AI Act', color: '#8b5cf6' },
  { id: 'soc2', name: 'SOC 2', color: '#0f62fe' },
  { id: 'nist', name: 'NIST', color: '#ff832b' },
  { id: 'pqc', name: 'PQC', color: '#da1e28' },
];

interface Dashboard {
  framework: string;
  status: string;
  score: number;
  total_controls: number;
  passed_controls: number;
  failed_controls: number;
  pending_controls: number;
  controls?: Array<{
    id: string;
    title: string;
    status: string;
    critical: boolean;
    evidence: string;
  }>;
  note?: string;
}

const ComplianceDashboard: React.FC = () => {
  const { isDemo } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [delveStatus, setDelveStatus] = useState<any>(null);
  const [kertosStatus, setKertosStatus] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState('');
  const [scanning, setScanning] = useState(false);
  const [openFramework, setOpenFramework] = useState<Dashboard | null>(null);

  useEffect(() => {
    loadDashboards();
    loadIntegrations();
    loadRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboards = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await complianceService.getAllDashboards();
      const rows = response.data.dashboards || [];
      setDashboards(rows.length ? rows : (isDemo ? buildDemoComplianceDashboards() : []));
    } catch {
      if (isDemo) {
        setDashboards(buildDemoComplianceDashboards());
      } else {
        setDashboards([]);
        setLoadError('Unable to retrieve compliance results. Please retry or check the API connection.');
      }
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
      const rows = response.data.risks || [];
      if (rows.length) {
        setRisks(rows);
        return;
      }
    } catch {
      /* fall through to demo or empty */
    }
    setRisks(isDemo ? buildDemoRisks() : []);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      if (isDemo) {
        setDashboards(buildDemoComplianceDashboards());
      } else {
        await complianceService.scanCompliance(selectedFramework);
        await loadDashboards();
      }
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
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Compliance Dashboard
          </Typography>
          {isDemo && (
            <Box sx={{ mt: 1 }}>
              <ProvenanceChip kind="demo" label="DEMO control results — not a certification" />
            </Box>
          )}
        </Box>
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

      {loadError && !dashboards.length && (
        <Box sx={{ mb: 2 }}>
          <EmptyState
            icon={<GppGood />}
            title="Unable to retrieve compliance results"
            description={loadError}
            action={{ label: 'Retry', onClick: loadDashboards }}
          />
        </Box>
      )}

      {!loading && !loadError && !dashboards.length && (
        <Box sx={{ mb: 2 }}>
          <EmptyState
            icon={<GppGood />}
            title="No compliance mappings yet"
            description="Connect a workspace or run a compliance scan to populate control results."
            action={{ label: 'Retry', onClick: loadDashboards }}
          />
        </Box>
      )}

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
                {risks.filter(r => r.severity === 'critical').length}
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
                  <Bar dataKey="score" fill="#0f62fe" name="Score" />
                  <Bar dataKey="failed" fill="#da1e28" name="Failed" />
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
                  <Radar name="Score" dataKey="score" stroke="#0f62fe" fill="#0f62fe" fillOpacity={0.6} />
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
              <Card
                sx={{ borderLeft: `4px solid ${framework?.color || '#0f62fe'}`, cursor: 'pointer' }}
                onClick={() => setOpenFramework(dashboard)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenFramework(dashboard);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${framework?.name || dashboard.framework} controls`}
              >
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

      <Dialog open={Boolean(openFramework)} onClose={() => setOpenFramework(null)} fullWidth maxWidth="sm">
        <DialogTitle>{FRAMEWORKS.find((f) => f.id === openFramework?.framework)?.name || openFramework?.framework}</DialogTitle>
        <DialogContent>
          {openFramework && (
            <Box sx={{ mt: 1 }}>
              {isDemo && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  DEMO mapping. Scores are sample control results — RivicQ does not certify this estate.
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Score {openFramework.score}% · {openFramework.passed_controls} passed · {openFramework.failed_controls} failed
              </Typography>
              {(openFramework.controls || []).slice(0, 12).map((ctrl) => (
                <Box key={ctrl.id} sx={{ mb: 1.25, p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{ctrl.id} — {ctrl.title}</Typography>
                  <Chip size="small" label={ctrl.status} sx={{ mr: 1, mt: 0.5 }} />
                  {ctrl.critical && <Chip size="small" color="error" label="critical" sx={{ mt: 0.5 }} />}
                  {ctrl.evidence && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                      Evidence: {ctrl.evidence}
                    </Typography>
                  )}
                  {ctrl.status === 'failed' && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Recommended action: remediate {ctrl.id}, attach evidence, and re-evaluate.
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFramework(null)}>Close</Button>
        </DialogActions>
      </Dialog>

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
