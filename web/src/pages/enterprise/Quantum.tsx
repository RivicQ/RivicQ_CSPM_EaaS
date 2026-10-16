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
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Security,
  Warning,
  CheckCircle,
  Sync,
} from '@mui/icons-material';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { quantumService } from '../../services/api';

const ALGORITHMS = [
  { name: 'ML-KEM (FIPS 203)', type: 'KEM', status: 'NIST standard', security_level: 5 },
  { name: 'ML-DSA (FIPS 204)', type: 'Signature', status: 'NIST standard', security_level: 5 },
  { name: 'SLH-DSA (FIPS 205)', type: 'Signature', status: 'NIST standard', security_level: 5 },
];

const COLORS = ['#059669', '#ea580c', '#dc2626'];

const QuantumReadiness: React.FC = () => {
  const [readiness, setReadiness] = useState<any>(null);
  const [networks, setNetworks] = useState<any[]>([]);
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuantumData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuantumData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        quantumService.getQuantumReadiness(),
        quantumService.getQuantumNetworks(),
        quantumService.getPQCAlgorithms(),
        quantumService.getAttestations(),
      ]);
      setReadiness(results[0].data);
      setNetworks(results[1].data.networks || []);
      setAlgorithms(results[2].data.algorithms || []);
    } catch (error) {
      console.error('Failed to load quantum data:', error);
      setReadiness({
        overall_score: 0,
        quantum_safe_assets: 0,
        at_risk_assets: 0,
        migration_progress: 0,
        recommendations: [],
        by_category: {},
        by_algorithm: {},
      });
      setNetworks([]);
      setAlgorithms(ALGORITHMS);
    } finally {
      setLoading(false);
    }
  };

  const categoryData = readiness?.by_category
    ? Object.entries(readiness.by_category).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">
          Quantum Readiness
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Sync />} onClick={loadQuantumData}>
            Refresh
          </Button>
        </Box>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Overall Readiness</Typography>
              <Typography variant="h3" color={readiness?.overall_score >= 70 ? 'success.main' : 'warning.main'}>
                {readiness?.overall_score ?? 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Quantum Safe</Typography>
              <Typography variant="h3" color="success.main">{readiness?.quantum_safe_assets ?? 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>At Risk</Typography>
              <Typography variant="h3" color="error.main">{readiness?.at_risk_assets ?? 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Plan coverage</Typography>
              <Typography variant="h3" color="info.main">{readiness?.migration_progress ?? 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(readiness?.at_risk_assets ?? 0) > 0 && (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Quantum-era exposure</AlertTitle>
        {readiness.at_risk_assets}% of inventoried cryptographic assets in this workspace are classified as quantum-era risk. RSA-2048 is classified, not automatically marked vulnerable.
      </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Readiness by Category</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>NIST PQC Algorithms</Typography>
      <Card sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Algorithm</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Security Level</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {algorithms.map((alg) => (
                <TableRow key={alg.name} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Security fontSize="small" color="primary" />
                      {alg.name}
                    </Box>
                  </TableCell>
                  <TableCell>{alg.type}</TableCell>
                  <TableCell>{alg.security_level}</TableCell>
                  <TableCell>
                    <Chip icon={<CheckCircle />} label={alg.status} color="success" size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>Quantum Networks</Typography>
      {networks.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No backends connected. Optional quantum providers use customer credentials when configured.
        </Typography>
      )}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {networks.map((network) => (
          <Grid item xs={12} md={4} key={network.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{network.name}</Typography>
                  <Chip label={network.status || 'Configured'} size="small" variant="outlined" />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Qubits</Typography>
                    <Typography variant="h5">{network.qubits}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Error Rate</Typography>
                    <Typography variant="h5">{(network.error_rate * 100).toFixed(2)}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Fidelity</Typography>
                    <Typography variant="h5">{(network.fidelity * 100).toFixed(1)}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Region</Typography>
                    <Typography variant="body2">{network.region}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>Recommendations</Typography>
      <Card>
        <CardContent>
          {readiness?.recommendations?.map((rec: string, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Warning color="warning" fontSize="small" />
              <Typography>{rec}</Typography>
            </Box>
          )) || (
            <Typography color="text.secondary">
              No engine recommendations. This workspace classifies algorithms; it does not rotate production keys.
            </Typography>
          )}
        </CardContent>
      </Card>

    </Box>
  );
};

export default QuantumReadiness;
