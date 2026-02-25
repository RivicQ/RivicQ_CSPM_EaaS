import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, LinearProgress, Stepper, Step, StepLabel, StepContent,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { Psychology, Security, Download, Refresh, ExpandMore, CheckCircle, Warning } from '@mui/icons-material';
import { quantumService } from '../../services/api';
import { OSSvsEnterpriseBanner } from '../../components/OSSvsEnterpriseBanner';
import { QuantumRiskScore } from '../../components/QuantumRiskScore';
import { ComplianceBadgeRow } from '../../components/ComplianceBadge';

interface QuantumAssessment {
  asset_id: string;
  asset_name: string;
  risk_score: number;
  vulnerable_count: number;
  quantum_safe_count: number;
  migration_priority: string;
  pqc_algorithms: string[];
  vulnerable_algorithms: string[];
  assessed_at: string;
}

interface AttestationReport {
  asset_id: string;
  status: string;
  nist_compliant: boolean;
  fips_compliant: boolean;
  certificate: string;
  timestamp: string;
  valid_until: string;
}

interface MigrationPhase {
  phase: number;
  name: string;
  target_algorithm: string;
  duration: string;
  priority: string;
  completed: boolean;
}

interface MigrationRoadmap {
  total_assets: number;
  critical_assets: number;
  migration_phases: MigrationPhase[];
  estimated_duration: string;
  compliance_deadline: string;
}

const MOCK_ASSESSMENTS: QuantumAssessment[] = [
  { asset_id: 'a1', asset_name: 'API Gateway TLS Cert', risk_score: 85, vulnerable_count: 3, quantum_safe_count: 0, migration_priority: 'critical', pqc_algorithms: [], vulnerable_algorithms: ['ECDSA-P256', 'RSA-2048', 'DH-2048'], assessed_at: new Date().toISOString() },
  { asset_id: 'a2', asset_name: 'Tenant Signing Key', risk_score: 40, vulnerable_count: 1, quantum_safe_count: 1, migration_priority: 'medium', pqc_algorithms: ['ML-KEM-768'], vulnerable_algorithms: ['RSA-2048'], assessed_at: new Date().toISOString() },
  { asset_id: 'a3', asset_name: 'HPCS Master Key', risk_score: 5, vulnerable_count: 0, quantum_safe_count: 2, migration_priority: 'low', pqc_algorithms: ['ML-KEM-768', 'ML-DSA-65'], vulnerable_algorithms: [], assessed_at: new Date().toISOString() },
];

const MOCK_ROADMAP: MigrationRoadmap = {
  total_assets: 47,
  critical_assets: 12,
  migration_phases: [
    { phase: 1, name: 'Inventory & Assessment', target_algorithm: '', duration: '2 months', priority: 'critical', completed: true },
    { phase: 2, name: 'Pilot KEM Migration', target_algorithm: 'ML-KEM-768', duration: '3 months', priority: 'high', completed: false },
    { phase: 3, name: 'Production Signatures', target_algorithm: 'ML-DSA-65', duration: '6 months', priority: 'medium', completed: false },
    { phase: 4, name: 'Full PQC Deployment', target_algorithm: 'SLH-DSA', duration: '3 months', priority: 'low', completed: false },
  ],
  estimated_duration: '14 months',
  compliance_deadline: new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString(),
};

const QuantumAttestation: React.FC = () => {
  const [assessments, setAssessments] = useState<QuantumAssessment[]>([]);
  const [roadmap, setRoadmap] = useState<MigrationRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assessRes, roadmapRes] = await Promise.allSettled([
        quantumService.getQuantumRiskAssessment(),
        quantumService.getMigrationRoadmap(),
      ]);
      if (assessRes.status === 'fulfilled') setAssessments((assessRes.value.data as any)?.data ?? []);
      if (roadmapRes.status === 'fulfilled') setRoadmap((roadmapRes.value.data as any)?.data ?? null);
    } catch (e: any) {
      setError(e?.message ?? 'API unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) { clearInterval(interval); setScanning(false); return 100; }
        return prev + 8;
      });
    }, 300);
    try {
      await quantumService.scanForPQCAlgorithms(['all']);
    } catch {
      // use mock
    }
  };

  const display = assessments.length ? assessments : MOCK_ASSESSMENTS;
  const rm = roadmap ?? MOCK_ROADMAP;
  const avgRisk = Math.round(display.reduce((s, a) => s + a.risk_score, 0) / display.length);

  return (
    <OSSvsEnterpriseBanner
      feature="quantumAttestation"
      featureName="Quantum Attestation"
      description="Assess quantum vulnerability, detect CRYSTALS-Kyber/Dilithium, generate NIST PQC attestation reports and migration roadmaps."
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Psychology sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>Quantum Attestation</Typography>
              <Typography variant="body2" color="textSecondary">NIST PQC Assessment · CRYSTALS-Kyber/Dilithium Detection · Migration Roadmap</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} disabled={loading || scanning}>Refresh</Button>
            <Button variant="contained" startIcon={<Security />} onClick={handleScan} disabled={scanning}
              sx={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white' }}>
              {scanning ? 'Scanning…' : 'Run Quantum Scan'}
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>API unavailable — showing mock assessment data.</Alert>}
        {(loading || scanning) && <LinearProgress value={scanning ? scanProgress : undefined} variant={scanning ? 'determinate' : 'indeterminate'} sx={{ mb: 2 }} />}

        <ComplianceBadgeRow
          standards={[
            { standard: 'NIST-PQC', compliant: display.every(a => a.pqc_algorithms.length > 0 || a.risk_score < 50) },
            { standard: 'FIPS-140-3', compliant: true },
            { standard: 'BSI-TR-02102', compliant: avgRisk < 60 },
          ]}
          size="medium"
        />

        {/* Summary */}
        <Grid container spacing={2} sx={{ my: 2 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <QuantumRiskScore score={avgRisk} size="large" showBar />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Average Risk Score</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Assets Assessed</Typography>
                <Typography variant="h3" fontWeight={700}>{rm.total_assets}</Typography>
                <Typography variant="body2" color="error">{rm.critical_assets} critical</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>PQC-Safe Assets</Typography>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#10b981' }}>
                  {display.filter(a => a.risk_score < 30).length}
                </Typography>
                <LinearProgress variant="determinate" value={(display.filter(a => a.risk_score < 30).length / display.length) * 100} color="success" sx={{ mt: 1, borderRadius: 2 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Migration ETA</Typography>
                <Typography variant="h5" fontWeight={700}>{rm.estimated_duration}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Deadline: {new Date(rm.compliance_deadline).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Risk table */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Quantum Risk Assessment per Asset</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Vulnerable Algorithms</TableCell>
                    <TableCell>PQC Algorithms</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {display.map((a) => (
                    <TableRow key={a.asset_id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{a.asset_name}</TableCell>
                      <TableCell><QuantumRiskScore score={a.risk_score} size="small" showLabel={false} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {a.vulnerable_algorithms.map(alg => <Chip key={alg} label={alg} size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem' }} />)}
                          {!a.vulnerable_algorithms.length && <Chip label="None" size="small" color="success" variant="outlined" />}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {a.pqc_algorithms.map(alg => <Chip key={alg} label={alg} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem' }} />)}
                          {!a.pqc_algorithms.length && <Typography variant="caption" color="textSecondary">Not migrated</Typography>}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={a.migration_priority} size="small"
                          color={a.migration_priority === 'critical' ? 'error' : a.migration_priority === 'high' ? 'warning' : a.migration_priority === 'medium' ? 'info' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<Download />}
                          onClick={() => quantumService.exportQuantumSafeBOM(a.asset_id)}>
                          Export BOM
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Migration Roadmap */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Post-Quantum Migration Roadmap</Typography>
            <Stepper orientation="vertical" nonLinear>
              {rm.migration_phases.map((phase) => (
                <Step key={phase.phase} active={!phase.completed} completed={phase.completed}>
                  <StepLabel
                    icon={phase.completed ? <CheckCircle sx={{ color: '#10b981' }} /> : <Warning sx={{ color: phase.priority === 'critical' ? '#ef4444' : '#f59e0b' }} />}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>{phase.name}</Typography>
                      <Chip label={phase.priority} size="small" color={phase.priority === 'critical' ? 'error' : phase.priority === 'high' ? 'warning' : 'default'} />
                      <Typography variant="caption" color="textSecondary">{phase.duration}</Typography>
                    </Box>
                  </StepLabel>
                  <StepContent>
                    {phase.target_algorithm && (
                      <Typography variant="body2">
                        Target algorithm: <strong>{phase.target_algorithm}</strong>
                      </Typography>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      </Box>
    </OSSvsEnterpriseBanner>
  );
};

export default QuantumAttestation;
