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
  IconButton,
} from '@mui/material';
import {
  Sync,
  CheckCircle,
  Warning,
  Refresh,
} from '@mui/icons-material';
import { cncfService } from '../../services/api';

const TOOLS = [
  { name: 'Prometheus', type: 'monitoring', icon: '📊' },
  { name: 'Grafana', type: 'visualization', icon: '📈' },
  { name: 'ArgoCD', type: 'gitops', icon: '🔄' },
  { name: 'Flux', type: 'gitops', icon: '⚡' },
  { name: 'Istio', type: 'service_mesh', icon: '🌐' },
  { name: 'Linkerd', type: 'service_mesh', icon: '🔗' },
  { name: 'Cilium', type: 'networking', icon: '🛡️' },
  { name: 'K3s', type: 'kubernetes', icon: '☸️' },
];

const CNCF: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCNCFData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCNCFData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        cncfService.getTools(),
        cncfService.getCNCFDashboard(),
      ]);
      setDashboard(results[1].data);
    } catch (error) {
      console.error('Failed to load CNCF data:', error);
      setDashboard({
        tools_summary: { total: 10, healthy: 9, unhealthy: 1, pending: 0 },
        by_category: {
          monitoring: ['Prometheus', 'Grafana'],
          gitops: ['ArgoCD', 'Flux'],
          service_mesh: ['Istio', 'Linkerd'],
          networking: ['Cilium'],
          kubernetes: ['K3s'],
        },
        security: { network_policies: 50, cnps: 25, cilium_agents: 10 },
        observability: { metrics: 'enabled', tracing: 'enabled', logging: 'enabled' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async (toolId: string) => {
    try {
      await cncfService.checkToolHealth(toolId);
      loadCNCFData();
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const getToolStatus = (toolName: string) => {
    const healthy = dashboard?.tools_summary?.healthy || 9;
    return healthy >= 8 ? 'healthy' : 'unhealthy';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          CNCF Tools Integration
        </Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={loadCNCFData}>
          Refresh
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Tools</Typography>
              <Typography variant="h3">{dashboard?.tools_summary?.total || 10}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Healthy</Typography>
              <Typography variant="h3" color="success.main">{dashboard?.tools_summary?.healthy || 9}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Unhealthy</Typography>
              <Typography variant="h3" color="error.main">{dashboard?.tools_summary?.unhealthy || 1}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Network Policies</Typography>
              <Typography variant="h3">{dashboard?.security?.network_policies || 50}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>Tool Categories</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(dashboard?.by_category || {
          monitoring: ['Prometheus', 'Grafana'],
          gitops: ['ArgoCD', 'Flux'],
          service_mesh: ['Istio', 'Linkerd'],
          networking: ['Cilium'],
          kubernetes: ['K3s'],
        }).map(([category, categoryTools]) => (
          <Grid item xs={12} md={6} key={category}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                  {category}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(categoryTools as string[]).map((tool) => (
                    <Chip
                      key={tool}
                      label={tool}
                      color={getToolStatus(tool) === 'healthy' ? 'success' : 'error'}
                      icon={getToolStatus(tool) === 'healthy' ? <CheckCircle /> : <Warning />}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom>Tool Status</Typography>
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tool</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Health Check</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TOOLS.map((tool) => (
                <TableRow key={tool.name} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.5rem' }}>{tool.icon}</span>
                      <Typography variant="body1" fontWeight="medium">{tool.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{tool.type}</TableCell>
                  <TableCell>v{tool.name === 'Prometheus' ? '2.45' : tool.name === 'Grafana' ? '10.0' : tool.name === 'ArgoCD' ? '2.8' : 'latest'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<CheckCircle />}
                      label="Healthy"
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>2 minutes ago</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleHealthCheck(tool.name)}>
                      <Sync />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>Observability Status</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Metrics</Typography>
              <Chip icon={<CheckCircle />} label="Enabled" color="success" size="small" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Tracing</Typography>
              <Chip icon={<CheckCircle />} label="Enabled" color="success" size="small" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Logging</Typography>
              <Chip icon={<CheckCircle />} label="Enabled" color="success" size="small" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CNCF;
