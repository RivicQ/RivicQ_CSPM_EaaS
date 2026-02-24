import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack,
  Shield,
  Warning,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/api';

const AssetDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => inventoryService.getAsset(id!).then(r => r.data),
    enabled: !!id,
    retry: 1,
  });

  const asset = (data as any)?.asset ?? data;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !asset) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/assets')} sx={{ mb: 2 }}>
          Back to Assets
        </Button>
        <Alert severity="info">
          Asset not found or backend not connected. This would show asset details in production.
        </Alert>
      </Box>
    );
  }

  const riskLevel = asset.risk_level || asset.riskLevel || 'UNKNOWN';
  const quantumSafe = asset.quantum_safe || asset.quantumSafe || false;
  const algorithm = asset.algorithm || asset.crypto_algorithm || 'N/A';
  const keySize = asset.key_size || asset.keySize || 'N/A';

  const getRiskColor = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (riskLevel.toUpperCase()) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/assets')} sx={{ mb: 2 }}>
        Back to Assets
      </Button>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {asset.name}
      </Typography>

      <Box display="flex" gap={1} mb={3}>
        <Chip label={riskLevel} color={getRiskColor()} />
        <Chip
          label={quantumSafe ? 'Quantum Safe' : 'Quantum Vulnerable'}
          color={quantumSafe ? 'success' : 'error'}
          icon={quantumSafe ? <Shield /> : <Warning />}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Crypto Details</Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText primary="Algorithm" secondary={algorithm} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Key Size" secondary={`${keySize} bits`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Cloud Provider" secondary={asset.cloud_provider || asset.cloudProvider || 'N/A'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Category" secondary={asset.category || 'N/A'} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Risk Assessment</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Compliance Score</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {asset.compliance_score || asset.complianceScore || 75}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={asset.compliance_score || asset.complianceScore || 75}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Remediation Steps:
                </Typography>
                <List dense>
                  {!quantumSafe && (
                    <ListItem>
                      <ListItemText primary="Migrate to post-quantum algorithm (CRYSTALS-Kyber or Dilithium)" />
                    </ListItem>
                  )}
                  {algorithm === 'RSA' && parseInt(String(keySize)) < 3072 && (
                    <ListItem>
                      <ListItemText primary="Upgrade RSA key size to at least 3072 bits" />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText primary="Review key rotation policy" />
                  </ListItem>
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {asset.metadata && Object.keys(asset.metadata).length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Metadata</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1}>
                  {Object.entries(asset.metadata).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Typography variant="caption" color="text.secondary">{key}</Typography>
                      <Typography variant="body2">{String(value)}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AssetDetails;
