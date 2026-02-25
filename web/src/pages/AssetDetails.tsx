import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security,
  Assessment,
  Warning,
  CheckCircle,
  Error,
  RemoveCircle,
  Refresh,
  TrendingUp,
  Timeline,
  Storage,
  Analytics,
  CloudDownload,
  Launch,
  PlayArrow,
  Pause,
  Stop,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AssetDetail {
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

interface QuantumAssessment {
  provider: string;
  algorithm: string;
  keySize: number;
  quantumSafe: boolean;
  riskLevel: string;
  attackComplexity: string;
  vulnerableTo: string[];
  quantumAdvantage: number;
  recommendedActions: string[];
  timestamp: string;
}

interface ComplianceFramework {
  name: string;
  version: string;
  compliant: boolean;
  requirements: string[];
  gaps: string[];
  mitigations: string[];
}

interface HistoricalAnalysis {
  id: string;
  timestamp: string;
  analysisType: string;
  provider: string;
  result: any;
  riskScore: number;
  recommendations: string[];
}

const AssetDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { api } = useApi();
  const { data: wsData } = useWebSocket();
  
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [quantumAssessment, setQuantumAssessment] = useState<QuantumAssessment[]>([]);
  const [complianceFrameworks, setComplianceFrameworks] = useState<ComplianceFramework[]>([]);
  const [historicalAnalysis, setHistoricalAnalysis] = useState<HistoricalAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchAssetDetails = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/api/v1/assets/${id}`);
        if (response.success) {
          setAsset(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch asset details:', error);
        toast.error('Failed to load asset details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetails();
  }, [id, api]);

  useEffect(() => {
    if (wsData && wsData.type === 'asset_update' && wsData.data?.id === id) {
      setAsset(wsData.data);
      toast.info('Asset details updated');
    }
  }, [wsData, id]);

  useEffect(() => {
    if (wsData && wsData.type === 'quantum_assessment' && wsData.data?.assetId === id) {
      setQuantumAssessment(prev => [...prev, wsData.data]);
      toast.success('New quantum assessment completed');
    }
  }, [wsData, id]);

  const handleQuantumAssessment = async () => {
    if (!asset) return;
    
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/engine/quantum-assess', {
        algorithm: asset.algorithm,
        keySize: asset.keySize,
        providers: ['ibmq', 'kipu'],
        assetId: asset.id,
      });
      
      if (response.success) {
        setQuantumAssessment(response.data);
        toast.success('Quantum vulnerability assessment completed');
      }
    } catch (error) {
      console.error('Failed to perform quantum assessment:', error);
      toast.error('Quantum assessment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplianceCheck = async () => {
    if (!asset) return;
    
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/engine/compliance-validate', {
        assets: [asset.id],
        frameworks: ['NIST', 'ISO', 'BSI'],
        scope: 'full',
      });
      
      if (response.success) {
        setComplianceFrameworks(response.data.frameworks);
        toast.success('Compliance validation completed');
      }
    } catch (error) {
      console.error('Failed to validate compliance:', error);
      toast.error('Compliance validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrationPlanning = async () => {
    if (!asset) return;
    
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/engine/migration-plan', {
        currentAlgorithm: asset.algorithm,
        currentKeySize: asset.keySize,
        targetFramework: 'NIST-PQC',
      });
      
      if (response.success) {
        toast.success('Migration plan generated');
      }
    } catch (error) {
      console.error('Failed to generate migration plan:', error);
      toast.error('Migration planning failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getQuantumProviderColor = (provider: string) => {
    switch (provider) {
      case 'ibmq': return '#667eea';
      case 'kipu': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  if (isLoading && !asset) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!asset) {
    return (
      <ErrorBoundary>
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="info">
            <AlertTitle>Asset Not Found</AlertTitle>
            The requested asset could not be found or may have been deleted.
          </Alert>
        </Container>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="text"
            startIcon={<Refresh />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Asset Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {asset.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {asset.id}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Chip
                    label={asset.status}
                    color={asset.quantumSafe ? 'success' : getRiskLevelColor(asset.riskLevel)}
                    size="medium"
                    sx={{ mb: 1 }}
                  />
                  <Chip
                    label={`${asset.complianceScore.toFixed(1)}% Compliance`}
                    color="primary"
                    size="medium"
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Algorithm
                  </Typography>
                  <Typography variant="h6">
                    {asset.algorithm}
                  </Typography>
                  <Typography variant="body2">
                    Key Size: {asset.keySize} bits
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Usage
                  </Typography>
                  <Typography variant="h6">
                    {asset.usage}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Location
                  </Typography>
                  <Typography variant="h6">
                    {asset.location}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Owner
                  </Typography>
                  <Typography variant="h6">
                    {asset.owner}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                <Typography variant="subtitle2" color="textSecondary">
                    Risk Level
                  </Typography>
                  <Typography variant="h6">
                    <Chip
                      label={asset.riskLevel}
                      color={getRiskLevelColor(asset.riskLevel)}
                      size="small"
                    />
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Quantum Safe
                  </Typography>
                  <Typography variant="h6">
                    <Chip
                      label={asset.quantumSafe ? 'Yes' : 'No'}
                      color={asset.quantumSafe ? 'success' : 'error'}
                      size="small"
                    />
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Analysis Tabs */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue as number)}>
              <Tab label="Quantum Assessment" />
              <Tab label="Compliance" />
              <Tab label="Historical Analysis" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              {quantumAssessment.length === 0 ? (
                <Typography variant="body1" color="textSecondary">
                  No quantum assessments yet. Click "Run Quantum Assessment" to start.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {quantumAssessment.map((assessment, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <motion.div whileHover={{ scale: 1.02 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {assessment.algorithm}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              Provider: {assessment.provider}
                            </Typography>
                            <Typography variant="body2">
                              Risk Level: {assessment.riskLevel}
                            </Typography>
                            <Typography variant="body2">
                              Quantum Safe: {assessment.quantumSafe ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="body2">
                              Quantum Advantage: {assessment.quantumAdvantage}x
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(assessment.quantumAdvantage / 10, 1) * 100}
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                          <CardContent sx={{ pt: 0 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Recommended Actions:
                            </Typography>
                            <List dense>
                              {assessment.recommendedActions.map((action: string, idx: number) => (
                                <ListItem key={idx}>
                                  <ListItemIcon><Warning /></ListItemIcon>
                                  <ListItemText primary={action} />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Compliance Validation
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleComplianceValidation}
                  disabled={isLoading}
                >
                  Validate Now
                </Button>
              </Box>
              {complianceData.length === 0 ? (
                <Typography variant="body1" color="textSecondary">
                  No compliance data. Click "Validate Now" to check compliance.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {complianceData.map((framework, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <motion.div whileHover={{ scale: 1.02 }}>
                        <Card variant="outlined" sx={{ borderColor: framework.compliant ? '#10b981' : '#ff9800' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6">{framework.framework}</Typography>
                              <Chip
                                label={framework.version}
                                size="small"
                                color={framework.compliant ? 'success' : 'warning'}
                              />
                            </Box>
                            <Typography variant="body2" color={framework.compliant ? 'textPrimary' : 'textSecondary'} sx={{ mt: 1 }}>
                              Status: {framework.compliant ? 'Compliant' : 'Non-Compliant'}
                            </Typography>
                          </CardContent>
                          {framework.requirements.length > 0 && (
                            <CardContent sx={{ pt: 0 }}>
                              <Typography variant="subtitle2" gutterBottom>Requirements</Typography>
                              <List dense>
                                {framework.requirements.map((req: string, idx: number) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon><CheckCircle /></ListItemIcon>
                                    <ListItemText primary={req} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          )}
                          {framework.mitigations.length > 0 && (
                            <CardContent sx={{ pt: 0 }}>
                              <Typography variant="subtitle2" gutterBottom>Mitigations</Typography>
                              <List dense>
                                {framework.mitigations.map((mitigation: string, idx: number) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon><TrendingUp /></ListItemIcon>
                                    <ListItemText primary={mitigation} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          )}
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Historical Analysis</Typography>
                <Button variant="outlined" startIcon={<Visibility />}>View Full History</Button>
              </Box>
              {historicalAnalysis.length > 0 && (
                <List>
                  {historicalAnalysis.slice(0, 10).map((analysis, index) => (
                    <motion.div
                      key={analysis.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <ListItem>
                        <ListItemIcon>
                          {analysis.analysisType === 'quantum' ? <Analytics /> : <Assessment />}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${analysis.provider.toUpperCase()} - ${new Date(analysis.timestamp).toLocaleString()}`}
                          secondary={analysis.analysisType}
                        />
                        <ListItemText
                          primary={`Risk Score: ${analysis.riskScore}`}
                          secondary={analysis.recommendations.slice(0, 2).join(', ')}
                        />
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              )}
            </Box>
          )}
      </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<CloudDownload />}
              onClick={handleMigrationPlanning}
              disabled={isLoading}
              size="large"
              fullWidth
            >
              Generate Migration Plan
            </Button>
            <Button
              variant="outlined"
              startIcon={<Analytics />}
              onClick={() => navigate(`/analytics/${id}`)}
              size="large"
              fullWidth
            >
              View Analytics
            </Button>
          </Box>
        </motion.div>
      </Container>
    </ErrorBoundary>
  );
};

export default AssetDetails;