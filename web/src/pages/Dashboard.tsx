import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Menu,
  MenuItem,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Security,
  Assessment,
  CloudDownload,
  Refresh,
  Settings,
  CheckCircle,
  Warning,
  Error,
  RemoveCircle,
  Timeline,
  TrendingUp,
  Shield,
  Visibility,
  BugReport,
  Speed,
  Storage,
  Analytics,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import DevSecOpsLayout from '../layouts/DevSecOpsLayout';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

// TypeScript interfaces
interface CryptoAsset {
  id: string;
  name: string;
  algorithm: string;
  keySize: number;
  usage: string;
  location: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  quantumSafe: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complianceScore: number;
  metadata: Record<string, any>;
}

interface ScanPod {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  image: string;
  namespace: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  findings: Array<{
    type: 'vulnerability' | 'compliance' | 'configuration' | 'security';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    assetId?: string;
  }>;
}

interface KubernetesSecurityEvent {
  id: string;
  type: 'security' | 'compliance' | 'configuration' | 'runtime';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  message: string;
  source: string;
  namespace: string;
  details?: Record<string, any>;
}

const Dashboard: React.FC = () => {
  const { api, isConnected, apiVersion, config } = useApi();
  const { data: wsData, send } = useWebSocket();
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);
  
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [scanPods, setScanPods] = useState<ScanPod[]>([]);
  const [securityEvents, setSecurityEvents] = useState<KubernetesSecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'assets' | 'scans' | 'security'>('overview');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default

  // WebSocket message handling
  useEffect(() => {
    if (wsData) {
      switch (wsData.type) {
        case 'crypto_assets':
          setAssets(wsData.data);
          toast.success(`Updated ${wsData.data.length} crypto assets`);
          break;
        case 'scan_pods':
          setScanPods(wsData.data);
          break;
        case 'security_events':
          setSecurityEvents(wsData.data);
          break;
        case 'quantum_assessment':
          toast.success('Quantum vulnerability assessment completed');
          break;
        case 'compliance_scan':
          toast.success('Compliance scan completed');
          break;
      }
    }
  }, [wsData]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch crypto assets
      const assetsResponse = await api.get('/api/v1/assets');
      if (assetsResponse.success) {
        setAssets(assetsResponse.data);
      }

      // Fetch scan pods
      const podsResponse = await api.get('/api/v1/engine/scanner/pods');
      if (podsResponse.success) {
        setScanPods(podsResponse.data);
      }

      // Fetch security events
      const eventsResponse = await api.get('/api/v1/security/events');
      if (eventsResponse.success) {
        setSecurityEvents(eventsResponse.data);
      }

    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchInitialData();
  }, [api]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        send({ type: 'ping' });
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isConnected, refreshInterval, send]);

  // Memoized data calculations
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const quantumSafeAssets = assets.filter(asset => asset.quantumSafe).length;
    const criticalAssets = assets.filter(asset => asset.riskLevel === 'CRITICAL').length;
    const highRiskAssets = assets.filter(asset => asset.riskLevel === 'HIGH').length;
    const averageRiskScore = assets.reduce((acc, asset) => acc + asset.complianceScore, 0) / totalAssets;
    
    return {
      totalAssets,
      quantumSafeAssets,
      criticalAssets,
      highRiskAssets,
      averageRiskScore,
      riskDistribution: {
        LOW: assets.filter(a => a.riskLevel === 'LOW').length,
        MEDIUM: assets.filter(a => a.riskLevel === 'MEDIUM').length,
        HIGH: assets.filter(a => a.riskLevel === 'HIGH').length,
        CRITICAL: assets.filter(a => a.riskLevel === 'CRITICAL').length,
      },
      algorithmDistribution: assets.reduce((acc, asset) => {
        acc[asset.algorithm] = (acc[asset.algorithm] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [assets]);

  const scanStats = useMemo(() => {
    const totalPods = scanPods.length;
    const runningPods = scanPods.filter(pod => pod.status === 'running').length;
    const completedPods = scanPods.filter(pod => pod.status === 'completed').length;
    const failedPods = scanPods.filter(pod => pod.status === 'failed').length;
    
    return {
      totalPods,
      runningPods,
      completedPods,
      failedPods,
      totalFindings: scanPods.reduce((acc, pod) => acc + pod.findings.length, 0),
    };
  }, [scanPods]);

  const securityStats = useMemo(() => {
    const totalEvents = securityEvents.length;
    const criticalEvents = securityEvents.filter(event => event.severity === 'critical').length;
    const errorEvents = securityEvents.filter(event => event.severity === 'error').length;
    const warningEvents = securityEvents.filter(event => event.severity === 'warning').length;
    
    return {
      totalEvents,
      criticalEvents,
      errorEvents,
      warningEvents,
      eventsByType: securityEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [securityEvents]);

  const handleRefresh = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleManualScan = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/engine/scan', {
        scanType: 'full',
        namespaces: ['default', 'cryptobom-system', 'production'],
        includeContainers: true,
        checkCompliance: true,
        quantumAssessment: true,
      });
      
      if (response.status >= 200 && response.status < 300) {
        toast.success('Manual scan initiated successfully');
      }
    } catch (error) {
      console.error('Failed to initiate manual scan:', error);
      toast.error('Failed to initiate scan');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const handleQuantumAssessment = useCallback(async (assetId: string) => {
    try {
      const response = await api.post('/api/v1/engine/quantum-assess', {
        algorithm: assets.find(a => a.id === assetId)?.algorithm,
        keySize: assets.find(a => a.id === assetId)?.keySize,
        providers: ['ibmq', 'kipu'],
      });
      
      if (response.status >= 200 && response.status < 300) {
        toast.success(`Quantum assessment completed for ${assetId}`);
      }
    } catch (error) {
      console.error('Failed to perform quantum assessment:', error);
      toast.error('Quantum assessment failed');
    }
  }, [api, assets]);

  if (isLoading && !assets.length && !scanPods.length && !securityEvents.length) {
    return <LoadingScreen />;
  }

  return (
    <DevSecOpsLayout
      title="CryptoBOM SaaS Dashboard"
      subtitle="DevSecOps Quantum-Ready Cryptographic Asset Management"
      version={apiVersion}
    >
      <ErrorBoundary>
        <CssBaseline />
        <Container maxWidth="xl">
          {/* Header with controls */}
          <AppBar position="static" sx={{ mb: 3, borderRadius: 2 }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                RivicQ CryptoBOM v1.3.0
                {isConnected && (
                  <Chip
                    size="small"
                    label="Connected"
                    color="success"
                    icon={<CheckCircle />}
                    sx={{ ml: 2 }}
                  />
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Manual Scan">
                  <IconButton onClick={handleManualScan} disabled={isLoading}>
                    <Security />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Refresh Data">
                  <IconButton onClick={handleRefresh} disabled={isLoading}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Settings">
                  <IconButton onClick={() => setSelectedView('settings')}>
                    <Settings />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
                  <IconButton onClick={() => setDarkMode(!darkMode)}>
                    {darkMode ? <CloudDownload /> : <Speed />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Main Dashboard Content */}
          <Box sx={{ mt: 3 }}>
            {/* Overview Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 3 }}>
              {/* Total Assets Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {stats.totalAssets.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Total Assets
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <Storage />
                    </Avatar>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.quantumSafeAssets / stats.totalAssets) * 100}
                    sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
                  />
                </Box>
              </motion.div>

              {/* Quantum Safe Assets Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #10b981 0%, #0d8040 100%)',
                    color: 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {stats.quantumSafeAssets.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Quantum Safe
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <Shield />
                    </Avatar>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.quantumSafeAssets / stats.totalAssets) * 100}
                    sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
                  />
                </Box>
              </motion.div>

              {/* Risk Score Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    color: 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {stats.averageRiskScore.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Avg Risk Score
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <TrendingUp />
                    </Avatar>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats.averageRiskScore * 20}
                    sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
                  />
                </Box>
              </motion.div>
            </Box>

            {/* View Selection Tabs */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                {['overview', 'assets', 'scans', 'security'].map((view) => (
                  <motion.button
                    key={view}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedView(view)}
                    sx={{
                      background: selectedView === view ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                      border: 'none',
                      borderRadius: 2,
                      px: 3,
                      py: 2,
                      mx: 1,
                      cursor: 'pointer',
                      textTransform: 'none',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        color: selectedView === view ? 'white' : 'text.primary',
                        fontWeight: selectedView === view ? 'bold' : 'normal',
                      }}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </Typography>
                  </motion.button>
                ))}
              </Box>
            </Box>

            {/* Content based on selected view */}
            {selectedView === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Risk Distribution Chart */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                  <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="h6" gutterBottom>
                      Risk Distribution
                    </Typography>
                    {Object.entries(stats.riskDistribution).map(([risk, count]) => (
                      <Box key={risk} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2">
                          {risk}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LinearProgress
                            variant="determinate"
                            value={(count / stats.totalAssets) * 100}
                            sx={{ width: 100, ml: 2 }}
                          />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {count} ({((count / stats.totalAssets) * 100).toFixed(1)}%)
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                    <Typography variant="h6" gutterBottom>
                      Algorithm Distribution
                    </Typography>
                    {Object.entries(stats.algorithmDistribution).slice(0, 8).map(([algo, count]) => (
                      <Box key={algo} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {algo}
                          </Typography>
                          <Typography variant="body2">
                            {count} assets
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </motion.div>
            )}

            {selectedView === 'assets' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Crypto Assets
                  </Typography>
                  {assets.slice(0, 10).map((asset, index) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Box sx={{ p: 2, borderRadius: 1, border: '1px solid #f0f0f0', '&:hover': { borderColor: '#667eea', cursor: 'pointer' } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {asset.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {asset.algorithm}-{asset.keySize}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              size="small"
                              label={asset.status}
                              color={asset.quantumSafe ? 'success' : asset.riskLevel === 'CRITICAL' ? 'error' : 'warning'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                            {asset.riskLevel === 'CRITICAL' && (
                              <Tooltip title="Quantum Assessment">
                                <IconButton size="small" onClick={() => handleQuantumAssessment(asset.id)}>
                                  <Assessment />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </motion.div>
            )}

            {selectedView === 'scans' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" gutterBottom>
                    Scan Pods Status
                  </Typography>
                  {scanPods.map((pod, index) => (
                    <motion.div
                      key={pod.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Box sx={{ p: 2, borderRadius: 1, border: '1px solid #f0f0f0', mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {pod.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {pod.namespace}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip
                              size="small"
                              label={pod.status}
                              color={
                                pod.status === 'running' ? 'success' :
                                pod.status === 'completed' ? 'primary' :
                                pod.status === 'failed' ? 'error' : 'default'
                              }
                            />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {pod.createdAt}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      {pod.duration && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={(pod.duration / 60) * 100}
                            sx={{ height: 4 }}
                          />
                          <Typography variant="caption" sx={{ mt: 0.5 }}>
                            {Math.floor(pod.duration / 60)}s {pod.duration % 60}s
                          </Typography>
                        </Box>
                      )}
                      {pod.findings.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
                          {pod.findings.length} findings detected
                        </Typography>
                      )}
                  </motion.div>
                  ))}
                </Box>
              </motion.div>
            )}

            {selectedView === 'security' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" gutterBottom>
                    Security Events Timeline
                  </Typography>
                  {securityEvents.slice(0, 20).map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                    >
                      <Box sx={{ p: 2, borderRadius: 1, border: '1px solid #f0f0f0', mb: 2, display: 'flex', alignItems: 'flex' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {event.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {event.timestamp} · {event.namespace}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ ml: 2, flex: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Type: {event.type}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Severity: {event.severity}
                          </Typography>
                        </Box>
                        {event.details && (
                          <Typography variant="caption" color="textSecondary">
                            Source: {event.source}
                          </Typography>
                        )}
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </motion.div>
            )}
          </Box>
          </Container>
      </ErrorBoundary>
    </DevSecOpsLayout>
    );
};

export default Dashboard;