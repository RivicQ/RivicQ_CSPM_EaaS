import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Download,
  Share,
  Timeline,
  Speed,
  Shield,
  Upgrade,
  TrendingDown,
  Assignment,
} from '@mui/icons-material';

interface QBOMAlgorithm {
  name: string;
  type: 'encryption' | 'signature' | 'key_exchange' | 'hashing';
  asset_count: number;
  quantum_score: number; // 0-100, where 0 = most vulnerable
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  break_time: string; // e.g., "8 hours with 4000 qubits"
  pqc_alternatives: Array<{
    name: string;
    nist_status: 'standardized' | 'candidate' | 'under_review';
    migration_effort: 'low' | 'medium' | 'high';
    timeline: string; // e.g., "2027-Q3"
  }>;
  affected_services?: string[];
  last_seen?: string;
}

interface QBOMData {
  scan_id: string;
  scan_date: string;
  total_assets: number;
  quantum_safe_assets: number;
  quantum_vulnerable_assets: number;
  quantum_readiness_score: number; // 0-100
  algorithms: QBOMAlgorithm[];
  migration_roadmap: Array<{
    quarter: string;
    milestone: string;
    target_algorithms: string[];
    estimated_effort: string;
  }>;
  critical_actions: string[];
}

interface QBOMViewerProps {
  qbom: QBOMData;
  onExport?: () => void;
  onShareMigrationPlan?: () => void;
}

const getRiskColor = (score: number): 'error' | 'warning' | 'info' | 'success' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'info';
  if (score >= 40) return 'warning';
  return 'error';
};

const getRiskLabel = (score: number): string => {
  if (score >= 80) return 'SAFE';
  if (score >= 60) return 'LOW RISK';
  if (score >= 40) return 'MEDIUM RISK';
  if (score >= 20) return 'HIGH RISK';
  return 'CRITICAL';
};

const QBOMViewer: React.FC<QBOMViewerProps> = ({ qbom, onExport, onShareMigrationPlan }) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<QBOMAlgorithm | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const criticalAlgorithms = qbom.algorithms.filter((a) => a.risk_level === 'critical');
  const highRiskAlgorithms = qbom.algorithms.filter((a) => a.risk_level === 'high');
  const safeAlgorithms = qbom.algorithms.filter((a) => a.risk_level === 'safe');

  const handleViewDetail = (algorithm: QBOMAlgorithm) => {
    setSelectedAlgorithm(algorithm);
    setOpenDetail(true);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Quantum Bill of Materials (QBOM)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Assessment from {qbom.scan_date} • {qbom.quantum_vulnerable_assets} vulnerable assets identified
        </Typography>
      </Box>

      {/* Main Risk Score Card */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 0.5 }}>
                Quantum Readiness Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h3" fontWeight={700}>
                  {qbom.quantum_readiness_score}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  / 100
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label={getRiskLabel(qbom.quantum_readiness_score)}
                color={getRiskColor(qbom.quantum_readiness_score)}
                size="medium"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {qbom.quantum_safe_assets} of {qbom.total_assets} assets quantum-safe
              </Typography>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={qbom.quantum_readiness_score}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.disabledBackground',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background:
                  qbom.quantum_readiness_score >= 80
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : qbom.quantum_readiness_score >= 60
                    ? 'linear-gradient(90deg, #3b82f6, #1e40af)'
                    : qbom.quantum_readiness_score >= 40
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : 'linear-gradient(90deg, #ef4444, #b91c1c)',
              },
            }}
          />

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Quantum Threat Assessment:</strong> Your infrastructure is vulnerable to
            harvest-now-decrypt-later (HNDL) attacks. Begin migration to post-quantum cryptography
            immediately. Target completion: Q3 2027.
          </Alert>
        </CardContent>
      </Card>

      {/* Critical Actions */}
      {qbom.critical_actions.length > 0 && (
        <Card sx={{ mb: 3, borderLeft: '4px solid', borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: 'error.main' }}>
              ⚠️ Critical Actions Required
            </Typography>
            <List dense>
              {qbom.critical_actions.map((action, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Error fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText primary={action} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Risk Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Error sx={{ color: 'error.main' }} />
                <Typography variant="overline" color="text.secondary">
                  Critical Risk
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {criticalAlgorithms.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {criticalAlgorithms.reduce((sum, a) => sum + a.asset_count, 0)} assets affected
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Warning sx={{ color: 'warning.main' }} />
                <Typography variant="overline" color="text.secondary">
                  High Risk
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {highRiskAlgorithms.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {highRiskAlgorithms.reduce((sum, a) => sum + a.asset_count, 0)} assets affected
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Typography variant="overline" color="text.secondary">
                  Quantum Safe
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {safeAlgorithms.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {safeAlgorithms.reduce((sum, a) => sum + a.asset_count, 0)} assets affected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vulnerable Algorithms */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Quantum-Vulnerable Algorithms
          </Typography>

          {[...criticalAlgorithms, ...highRiskAlgorithms].length > 0 ? (
            <Stack spacing={2}>
              {[...criticalAlgorithms, ...highRiskAlgorithms].map((algo) => (
                <Box
                  key={algo.name}
                  onClick={() => handleViewDetail(algo)}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {algo.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {algo.asset_count} assets • {algo.type.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <Chip
                      label={getRiskLabel(algo.quantum_score)}
                      size="small"
                      color={getRiskColor(algo.quantum_score)}
                    />
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={algo.quantum_score}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      mb: 1,
                      '& .MuiLinearProgress-bar': {
                        background:
                          algo.quantum_score >= 60
                            ? '#10b981'
                            : algo.quantum_score >= 40
                            ? '#f59e0b'
                            : '#ef4444',
                      },
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Break time: {algo.break_time}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ fontWeight: 600, cursor: 'pointer' }}
                    >
                      View Options →
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : (
            <Alert severity="success">No quantum-vulnerable algorithms detected!</Alert>
          )}
        </CardContent>
      </Card>

      {/* Migration Roadmap */}
      {qbom.migration_roadmap.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Migration Roadmap
              </Typography>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={onShareMigrationPlan}
              >
                Share Plan
              </Button>
            </Box>

            <Stack spacing={2}>
              {qbom.migration_roadmap.map((milestone, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </Box>
                    {idx < qbom.migration_roadmap.length - 1 && (
                      <Box
                        sx={{
                          width: 2,
                          height: 40,
                          bgcolor: 'divider',
                          mt: 0.5,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, py: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {milestone.quarter}: {milestone.milestone}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Migrate: {milestone.target_algorithms.join(', ')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Effort: {milestone.estimated_effort}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Detail Modal */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        {selectedAlgorithm && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedAlgorithm.quantum_score >= 60 ? (
                  <CheckCircle sx={{ color: 'success.main' }} />
                ) : selectedAlgorithm.quantum_score >= 40 ? (
                  <Warning sx={{ color: 'warning.main' }} />
                ) : (
                  <Error sx={{ color: 'error.main' }} />
                )}
                {selectedAlgorithm.name}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 2 }}>
                <Alert severity={selectedAlgorithm.quantum_score >= 60 ? 'success' : 'warning'}>
                  Quantum Risk Score: <strong>{selectedAlgorithm.quantum_score}/100</strong>
                </Alert>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Vulnerability
                  </Typography>
                  <Typography variant="body2">
                    Break time with 4000-qubit machine: <code>{selectedAlgorithm.break_time}</code>
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Affected Assets
                  </Typography>
                  <Typography variant="body2">{selectedAlgorithm.asset_count} endpoints</Typography>
                  {selectedAlgorithm.affected_services && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                      Services: {selectedAlgorithm.affected_services.join(', ')}
                    </Typography>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Post-Quantum Alternatives
                  </Typography>
                  <Stack spacing={1}>
                    {selectedAlgorithm.pqc_alternatives.map((alt) => (
                      <Box key={alt.name} sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {alt.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={alt.nist_status} size="small" variant="outlined" />
                          <Chip
                            label={`${alt.migration_effort} effort`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip label={alt.timeline} size="small" variant="outlined" />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetail(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default QBOMViewer;
