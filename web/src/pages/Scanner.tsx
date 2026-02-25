import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  Stop,
  CheckCircle,
  Warning,
  Error,
  Schedule,
  CloudUpload,
  Visibility,
  Settings,
  Analytics,
  Security,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface ScanPod {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  image: string;
  namespace: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  findings: number;
  vulnerabilities: number;
  complianceScore: number;
  resourcesUsed: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

interface ScanConfig {
  scanType: 'full' | 'quick' | 'targeted' | 'compliance';
  namespaces: string[];
  includeContainers: boolean;
  checkQuantum: boolean;
  checkCompliance: boolean;
}

const Scanner: React.FC = () => {
  const { api } = useApi();
  const { data: wsData } = useWebSocket();
  
  const [scanPods, setScanPods] = useState<ScanPod[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeScan, setActiveScan] = useState<string | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    scanType: 'quick',
    namespaces: ['default', 'cryptobom-system', 'production'],
    includeContainers: true,
    checkQuantum: false,
    checkCompliance: false,
  });
  const [scanHistory, setScanHistory] = useState<any[]>([]);

  useEffect(() => {
    if (wsData && wsData.type === 'scan_pods') {
      setScanPods(wsData.data);
    }
  }, [wsData]);

  useEffect(() => {
    if (wsData && wsData.type === 'scan_progress' && wsData.data) {
      const updatedPods = scanPods.map(pod =>
        pod.id === wsData.data.podId ? { ...pod, ...wsData.data } : pod
      );
      setScanPods(updatedPods);
    }
  }, [wsData, scanPods]);

  const startScan = async () => {
    setIsScanning(true);
    try {
      const response = await api.post('/api/v1/engine/scan', scanConfig);
      if (response.status >= 200 && response.status < 300) {
        setActiveScan((response.data as any).scanId);
        toast.success(`Scan initiated: ${scanConfig.scanType} scan`);
      }
    } catch (error) {
      console.error('Failed to start scan:', error);
      toast.error('Failed to start scan');
    } finally {
      setIsScanning(false);
    }
  };

  const stopScan = async (scanId: string) => {
    try {
      const response = await api.post(`/api/v1/engine/scan/${scanId}/stop`);
      if (response.status >= 200 && response.status < 300) {
        toast.info('Scan stopped');
        setActiveScan(null);
      }
    } catch (error) {
      console.error('Failed to stop scan:', error);
      toast.error('Failed to stop scan');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <Schedule />;
      case 'running': return <PlayArrow sx={{ animation: 'spin' }} />;
      case 'completed': return <CheckCircle color="success" />;
      case 'failed': return <Error color="error" />;
      default: return <Warning />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'grey.500';
      case 'running': return '#4caf50';
      case 'completed': return '#4caf50';
      case 'failed': return '#f44336';
      default: return 'grey.500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'running': return 'Running';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  if (scanPods.length === 0 && !isScanning) {
    return (
      <ErrorBoundary>
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="info">
            <AlertTitle>No Scan Data</AlertTitle>
            No scan pods are currently running. Start a new scan to monitor your Kubernetes cluster.
          </Alert>
        </Container>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Scanner Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Kubernetes Scanner
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={isScanning ? `Scanning: ${scanConfig.scanType}` : 'Ready'}
                  color={isScanning ? 'warning' : 'primary'}
                />
                {isScanning && activeScan && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => stopScan(activeScan)}
                    startIcon={<Stop />}
                  >
                    Stop
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Scan Configuration */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scan Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Button
                  variant={scanConfig.scanType === 'full' ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, scanType: 'full' })}
                  sx={{ width: '100%' }}
                >
                  Full Scan
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant={scanConfig.scanType === 'quick' ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, scanType: 'quick' })}
                  sx={{ width: '100%' }}
                >
                  Quick Scan
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant={scanConfig.scanType === 'targeted' ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, scanType: 'targeted' })}
                  sx={{ width: '100%' }}
                >
                  Targeted Scan
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant={scanConfig.scanType === 'compliance' ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, scanType: 'compliance' })}
                  sx={{ width: '100%' }}
                >
                  Compliance Check
                </Button>
              </Grid>
            </Grid>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={3}>
                <Button
                  variant={scanConfig.includeContainers ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, includeContainers: !scanConfig.includeContainers })}
                  sx={{ width: '100%' }}
                >
                  {scanConfig.includeContainers ? 'Containers: ON' : 'Containers: OFF'}
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant={scanConfig.checkQuantum ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, checkQuantum: !scanConfig.checkQuantum })}
                  sx={{ width: '100%' }}
                >
                  {scanConfig.checkQuantum ? 'Quantum: ON' : 'Quantum: OFF'}
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant={scanConfig.checkCompliance ? 'contained' : 'outlined'}
                  onClick={() => setScanConfig({ ...scanConfig, checkCompliance: !scanConfig.checkCompliance })}
                  sx={{ width: '100%' }}
                >
                  {scanConfig.checkCompliance ? 'Compliance: ON' : 'Compliance: OFF'}
                </Button>
              </Grid>
            </Grid>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={startScan}
                  disabled={isScanning}
                  startIcon={<PlayArrow />}
                  sx={{ width: '100%' }}
                >
                  Start {scanConfig.scanType.charAt(0).toUpperCase() + scanConfig.scanType.slice(1)} Scan
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Active Scan Status */}
          {activeScan && (
            <Paper sx={{ p: 3, mb:3, backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Refresh sx={{ fontSize: 24, color: 'white' }} />
                </motion.div>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6" color="white">
                    Scanning...
                  </Typography>
                  <LinearProgress
                    variant="indeterminate"
                    sx={{ width: 200, color: 'white' }}
                  />
                </Box>
              </Box>
            </Paper>
          )}

          {/* Scan Pods Grid */}
          <Grid container spacing={3}>
            {scanPods.map((pod, index) => (
              <motion.div
                key={pod.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <Grid item xs={12} md={6} lg={4}>
                  <Card sx={{ height: 200, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {pod.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {pod.namespace}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getStatusIcon(pod.status)}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {getStatusText(pod.status)}
                          </Typography>
                          <Chip
                            label={pod.status}
                            size="small"
                            color={getStatusColor(pod.status)}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                    <CardContent sx={{ borderTop: 1, borderTopColor: 'divider', backgroundColor: '#fafafa', padding: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Image
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {pod.image}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          Status: {pod.duration ? `${Math.floor(pod.duration / 60)}s` : 'N/A'}
                          </Typography>
                        </Box>
                    </CardContent>
                    {pod.findings > 0 && (
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          Findings: {pod.findings}
                        </Typography>
                        <Chip
                          label="Vulnerabilities"
                          color="error"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label="Issues"
                          color="warning"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      </CardContent>
                    )}
                    {pod.resourcesUsed && (
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Resource Usage
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                          <Box>
                            <Typography variant="caption" color="textSecondary">CPU</Typography>
                            <LinearProgress variant="determinate" value={pod.resourcesUsed.cpu} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Memory</Typography>
                            <LinearProgress variant="determinate" value={pod.resourcesUsed.memory} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Storage</Typography>
                            <LinearProgress variant="determinate" value={pod.resourcesUsed.storage} />
                          </Box>
                        </Box>
                      </CardContent>
                    )}
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Compliance Score
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pod.complianceScore}
                          color={getComplianceScoreColor(pod.complianceScore)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                          {pod.complianceScore.toFixed(1)}%
                        </Typography>
                      </CardContent>
                  </Card>
                </Grid>
              </motion.div>
            ))}
          </Grid>
        </motion.div>
      </Container>
    </ErrorBoundary>
  );
};

export default Scanner;