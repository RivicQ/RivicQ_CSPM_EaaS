import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import { Psychology, Shield, Assessment } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { quantumAttestationService } from '../../services/api';

const QuantumAttestation: React.FC = () => {
  const { data: assessmentData, isLoading, error } = useQuery({
    queryKey: ['quantum-risk-assessment'],
    queryFn: () => quantumAttestationService.getQuantumRiskAssessment().then(r => r.data),
    retry: 1,
  });

  const { data: roadmapData } = useQuery({
    queryKey: ['quantum-migration-roadmap'],
    queryFn: () => quantumAttestationService.getMigrationRoadmap().then(r => r.data),
    retry: 1,
  });

  const milestones: any[] = Array.isArray(roadmapData) ? roadmapData : ((roadmapData as any)?.milestones ?? []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const riskScore = (assessmentData as any)?.risk_score ?? 72;
  const pqcReadiness = (assessmentData as any)?.pqc_readiness ?? 45;
  const assetsAtRisk = (assessmentData as any)?.assets_at_risk ?? 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Quantum Attestation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Post-quantum cryptography readiness assessment and migration roadmap
      </Typography>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your backend to see live quantum risk data.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Psychology sx={{ color: '#0f62fe' }} />
                <Typography variant="body2" color="text.secondary">Quantum Risk Score</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#da1e28">{riskScore}</Typography>
              <LinearProgress
                variant="determinate"
                value={riskScore}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color="error"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Shield sx={{ color: '#24a148' }} />
                <Typography variant="body2" color="text.secondary">PQC Readiness</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#24a148">{pqcReadiness}%</Typography>
              <LinearProgress
                variant="determinate"
                value={pqcReadiness}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Assessment sx={{ color: '#ff832b' }} />
                <Typography variant="body2" color="text.secondary">Assets at Risk</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#ff832b">{assetsAtRisk}</Typography>
              <Typography variant="caption" color="text.secondary">Quantum-vulnerable assets</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recommended PQC Algorithms</Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                {[
                  { name: 'CRYSTALS-Kyber', use: 'Key Encapsulation', status: 'NIST Standard' },
                  { name: 'CRYSTALS-Dilithium', use: 'Digital Signatures', status: 'NIST Standard' },
                  { name: 'FALCON', use: 'Digital Signatures', status: 'NIST Standard' },
                  { name: 'SPHINCS+', use: 'Hash-based Signatures', status: 'NIST Standard' },
                ].map(algo => (
                  <ListItem key={algo.name}>
                    <ListItemText primary={algo.name} secondary={algo.use} />
                    <Chip label={algo.status} size="small" color="success" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Migration Roadmap</Typography>
              <Divider sx={{ mb: 2 }} />
              {milestones.length === 0 ? (
                <Box>
                  {[
                    { phase: 'Phase 1: Inventory', desc: 'Identify all quantum-vulnerable assets', progress: 100 },
                    { phase: 'Phase 2: Assessment', desc: 'Risk assessment and prioritization', progress: 60 },
                    { phase: 'Phase 3: Migration', desc: 'Migrate to PQC algorithms', progress: 20 },
                    { phase: 'Phase 4: Validation', desc: 'Verify PQC implementation', progress: 0 },
                  ].map(item => (
                    <Box key={item.phase} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" fontWeight="medium">{item.phase}</Typography>
                        <Typography variant="caption">{item.progress}%</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        {item.desc}
                      </Typography>
                      <LinearProgress variant="determinate" value={item.progress} sx={{ height: 4, borderRadius: 2 }} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <List dense>
                  {milestones.map((m: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemText primary={m.name} secondary={m.description} />
                      <Chip label={m.status} size="small" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button
          variant="contained"
          sx={{ background: 'linear-gradient(45deg, #0f62fe, #8a3ffc)', mr: 2 }}
          onClick={() => quantumAttestationService.scanForPQCAlgorithms(['all'])}
        >
          Start PQC Scan (All Assets)
        </Button>
        <Button variant="outlined">
          Export Quantum BOM
        </Button>
      </Box>
    </Box>
  );
};

export default QuantumAttestation;
