import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ArrowBack, Shield, Warning } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import { inventoryService } from '../services/api';
import { tokens } from '../theme/tokens';

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={36} thickness={3} />
      </Box>
    );
  }

  if (error || !asset) {
    return (
      <PageFrame
        eyebrow="Inventory"
        title="Asset Details"
        subtitle="Asset record could not be loaded."
        secondaryAction={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/assets')} variant="outlined">
            Back to Assets
          </Button>
        }
      >
        <GlassCard hover={false} glow={tokens.colors.rivicq[500]}>
          <Typography variant="body2" color="text.secondary">
            Asset not found or backend not connected. Connect the backend to view live asset details.
          </Typography>
        </GlassCard>
      </PageFrame>
    );
  }

  const riskLevel = asset.risk_level || asset.riskLevel || 'UNKNOWN';
  const quantumSafe = asset.quantum_safe || asset.quantumSafe || false;
  const algorithm = asset.algorithm || asset.crypto_algorithm || 'N/A';
  const keySize = asset.key_size || asset.keySize || 'N/A';
  const complianceScore = asset.compliance_score || asset.complianceScore || 75;

  const getRiskColor = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (riskLevel.toUpperCase()) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH':
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  return (
    <PageFrame
      eyebrow="Inventory"
      title={asset.name}
      subtitle={`${algorithm} · ${keySize}${typeof keySize === 'number' ? ' bits' : ''}`}
      badge={riskLevel}
      secondaryAction={
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/assets')} variant="outlined">
          Back
        </Button>
      }
    >
      <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
        <Chip label={riskLevel} color={getRiskColor()} sx={{ fontWeight: 600 }} />
        <Chip
          label={quantumSafe ? 'Quantum Safe' : 'Quantum Vulnerable'}
          color={quantumSafe ? 'success' : 'error'}
          icon={quantumSafe ? <Shield /> : <Warning />}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <GlassCard hover={false} glow={tokens.colors.rivicq[500]} delay={0}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Crypto Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemText primary="Algorithm" secondary={algorithm} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText primary="Key Size" secondary={`${keySize}${typeof keySize === 'number' ? ' bits' : ''}`} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText primary="Cloud Provider" secondary={asset.cloud_provider || asset.cloudProvider || 'N/A'} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText primary="Category" secondary={asset.category || 'N/A'} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItem>
            </List>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard hover={false} glow={quantumSafe ? tokens.colors.crypto.low : tokens.colors.crypto.critical} delay={1}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Risk Assessment
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box mb={2.5}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Compliance Score</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: tokens.typography.mono }}>
                  {complianceScore}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={complianceScore} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600}>
              Remediation Steps
            </Typography>
            <List dense disablePadding>
              {!quantumSafe && (
                <ListItem disableGutters>
                  <ListItemText primary="Migrate to post-quantum algorithm (CRYSTALS-Kyber or Dilithium)" />
                </ListItem>
              )}
              {algorithm.toUpperCase().includes('RSA') && typeof keySize === 'number' && keySize < 3072 && (
                <ListItem disableGutters>
                  <ListItemText primary="Upgrade RSA key size to at least 3072 bits" />
                </ListItem>
              )}
              <ListItem disableGutters>
                <ListItemText primary="Review key rotation policy" />
              </ListItem>
            </List>
          </GlassCard>
        </Grid>

        {asset.metadata && Object.keys(asset.metadata).length > 0 && (
          <Grid item xs={12}>
            <GlassCard hover={false} delay={2}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Metadata
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {Object.entries(asset.metadata).map(([key, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {key}
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>{String(value)}</Typography>
                  </Grid>
                ))}
              </Grid>
            </GlassCard>
          </Grid>
        )}
      </Grid>
    </PageFrame>
  );
};

export default AssetDetails;
