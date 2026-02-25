import React from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  LinearProgress,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Search,
  FilterList,
  FilterListOff,
  Refresh,
  PlayArrow,
  Download,
  Visibility,
  Security,
  Assessment,
  Storage,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { ErrorBoundary } from '../components/ErrorBoundary';

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
  lastScanned: string;
}

interface ScanResult {
  id: string;
  assetId: string;
  scanType: 'container' | 'kubernetes' | 'network' | 'code';
  timestamp: string;
  findings: Array<{
    type: 'vulnerability' | 'misconfiguration' | 'policy_violation' | 'weak_algorithm';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
}

const Assets: React.FC = () => {
  const { api } = useApi();
  const { data: wsData } = useWebSocket();
  
  const [assets, setAssets] = React.useState<CryptoAsset[]>([]);
  const [scanResults, setScanResults] = React.useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterRiskLevel, setFilterRiskLevel] = React.useState<string>('all');
  const [filterAlgorithm, setFilterAlgorithm] = React.useState<string>('all');
  const [filterLocation, setFilterLocation] = React.useState<string>('');
  const [selectedAssets, setSelectedAssets] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  // Fetch assets from WebSocket
  React.useEffect(() => {
    if (wsData && wsData.type === 'crypto_assets') {
      setAssets(wsData.data);
    }
  }, [wsData]);

  // Fetch scan results
  React.useEffect(() => {
    if (wsData && wsData.type === 'scan_results') {
      setScanResults(wsData.data);
    }
  }, [wsData]);

  const handleRefresh = React.useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setAssets(prev => [...prev]); // Trigger re-render
      setIsLoading(false);
      toast.info('Assets refreshed');
    }, 1000);
  }, []);

  const handleBulkScan = React.useCallback(() => {
    setIsLoading(true);
    // Mock bulk scan - in real implementation would call API
    setTimeout(() => {
      const mockScanResults: ScanResult[] = [
        {
          id: `scan-${Date.now()}`,
          assetId: assets[0]?.id || 'unknown',
          scanType: 'container',
          timestamp: new Date().toISOString(),
          findings: [
            {
              type: 'vulnerability',
              severity: 'high',
              description: 'Weak encryption algorithm detected',
              recommendation: 'Upgrade to stronger encryption',
            },
          ],
        },
        // Add more mock results...
      ];
      
      setScanResults(prev => [...prev, ...mockScanResults]);
      setIsLoading(false);
      toast.success('Bulk scan completed');
    }, 2000);
  }, [assets]);

  const handleSelectAsset = React.useCallback((assetId: string) => {
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  }, []);

  const handleQuantumAssessment = React.useCallback(async (assetIds: string[]) => {
    try {
      const response = await api.post('/api/v1/engine/quantum-assess/bulk', {
        assetIds,
        providers: ['ibmq', 'kipu'],
      });
      
      if (response.success) {
        toast.success(`Quantum assessment completed for ${assetIds.length} assets`);
      }
    } catch (error) {
      console.error('Failed to perform quantum assessment:', error);
      toast.error('Quantum assessment failed');
    }
  }, [api]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const filteredAssets = React.useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = filterRiskLevel === 'all' || asset.riskLevel === filterRiskLevel;
      const matchesAlgorithm = filterAlgorithm === 'all' || asset.algorithm === filterAlgorithm;
      const matchesLocation = filterLocation === '' || asset.location.toLowerCase().includes(filterLocation.toLowerCase());
      return matchesSearch && matchesRisk && matchesAlgorithm && matchesLocation;
    });
  }, [assets, searchQuery, filterRiskLevel, filterAlgorithm, filterLocation]);

  const paginatedAssets = React.useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAssets.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAssets, page, rowsPerPage]);

  const handleDownloadReport = React.useCallback(() => {
    const reportData = {
      assets: selectedAssets.map(id => assets.find(a => a.id === id)),
      scanResults: scanResults,
      timestamp: new Date().toISOString(),
      version: '1.3.0',
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptobom-report-${new Date().toISOString()}.json`;
    a.click();
    
    toast.success('Report downloaded');
  }, [assets, selectedAssets, scanResults]);

  if (isLoading) {
    return (
      <ErrorBoundary>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Refresh />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Loading Assets...
                </Typography>
                <LinearProgress sx={{ width: 300, mt: 2 }} />
              </Box>
            </motion.div>
          </Box>
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
          {/* Header with Search and Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Cryptographic Assets Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <IconButton>
                        <Search />
                      </IconButton>
                    ),
                  }}
                  sx={{ width: 300 }}
                />
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Risk Level"
                value={filterRiskLevel}
                onChange={(e) => setFilterRiskLevel(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <option value="all">All Levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </TextField>
              
              <TextField
                select
                size="small"
                label="Algorithm"
                value={filterAlgorithm}
                onChange={(e) => setFilterAlgorithm(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <option value="all">All Algorithms</option>
                <option value="AES">AES</option>
                <option value="RSA">RSA</option>
                <option value="ECC">ECC</option>
                <option value="SHA-256">SHA-256</option>
              </TextField>
              
              <TextField
                size="small"
                label="Location Filter"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <IconButton>
                      <FilterList />
                    </IconButton>
                  ),
                }}
                sx={{ minWidth: 120 }}
              />
            </Box>
          </Paper>

          {/* Assets Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card>
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Storage sx={{ fontSize: 40, color: '#667eea' }} />
                    </Box>
                    <Typography variant="h4" gutterBottom>
                      Total Assets
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {assets.length.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card>
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Security sx={{ fontSize: 40, color: '#ff9800' }} />
                    </Box>
                    <Typography variant="h4" gutterBottom>
                        Quantum Safe
                    </Typography>
                    <Typography variant="h3" color="success">
                      {assets.filter(a => a.quantumSafe).length.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card>
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Assessment sx={{ fontSize: 40, color: '#f57c00' }} />
                    </Box>
                    <Typography variant="h4" gutterBottom>
                        At Risk
                    </Typography>
                    <Typography variant="h3" color="error">
                      {assets.filter(a => !a.quantumSafe && a.riskLevel !== 'LOW').length.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Card>
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Visibility sx={{ fontSize: 40, color: '#10b981' }} />
                    </Box>
                    <Typography variant="h4" gutterBottom>
                        Selected
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {selectedAssets.length}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Assets Table */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Assets ({paginatedAssets.length} / {filteredAssets.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleDownloadReport}
                  disabled={selectedAssets.length === 0}
                >
                  Download Report
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Assessment />}
                  onClick={() => handleQuantumAssessment(selectedAssets)}
                  disabled={selectedAssets.length === 0}
                >
                  Quantum Assess
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={handleBulkScan}
                  disabled={isLoading}
                >
                  Bulk Scan
                </Button>
              </Box>
            </Box>
            
            <TableContainer>
              <Table stickyHeader aria-label="sticky table">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedAssets.length === paginatedAssets.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAssets(paginatedAssets.map(a => a.id));
                          } else {
                            setSelectedAssets([]);
                          }
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Algorithm</TableCell>
                    <TableCell>Key Size</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Quantum Safe</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Last Scanned</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {paginatedAssets.map((asset, index) => (
                      <motion.tr
                        key={asset.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.04)' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedAssets.includes(asset.id)}
                            onChange={() => handleSelectAsset(asset.id)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {asset.algorithm}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.keySize}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.usage}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.owner}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={asset.riskLevel}
                            color={getRiskLevelColor(asset.riskLevel)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={asset.quantumSafe ? 'Yes' : 'No'}
                            color={asset.quantumSafe ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.complianceScore.toFixed(1)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(asset.lastScanned).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Quantum Assessment">
                              <IconButton size="small">
                                <Assessment />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => {/* Navigate to details */}}>
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Page {page} of {Math.ceil(filteredAssets.length / rowsPerPage)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={page === Math.ceil(filteredAssets.length / rowsPerPage)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Box>

          {/* Scan Results Section */}
          <Paper sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Recent Scan Results
            </Typography>
            {scanResults.length > 0 ? (
              <Grid container spacing={2}>
                {scanResults.map((result, index) => (
                  <Grid item xs={12} md={6} key={result.id}>
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {result.scanType.toUpperCase()} Scan
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {result.timestamp}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Asset: {result.assetId}
                          </Typography>
                        </CardContent>
                        <CardContent>
                          <Box sx={{ mt: 2 }}>
                            {result.findings.map((finding, idx) => (
                              <Alert
                                key={idx}
                                severity={
                                  finding.severity === 'critical' ? 'error' :
                                  finding.severity === 'high' ? 'warning' :
                                  finding.severity === 'medium' ? 'info' : 'success'
                                }
                                sx={{ mb: 1 }}
                              >
                                <AlertTitle>
                                  {finding.type.replace('_', ' ').toUpperCase()}
                                </AlertTitle>
                                <Typography variant="body2">
                                  {finding.description}
                                </Typography>
                                <Typography variant="caption" sx={{ mt: 1, fontStyle: 'italic' }}>
                                  Recommendation: {finding.recommendation}
                                </Typography>
                              </Alert>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                  ))}
                </Grid>
            ) : (
              <Typography variant="body1" color="textSecondary">No scan results yet.</Typography>
            )}
          </Paper>
        </motion.div>
      </Container>
    </ErrorBoundary>
  );
};

export default Assets;