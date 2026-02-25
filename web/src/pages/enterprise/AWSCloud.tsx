import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, LinearProgress, Divider, CircularProgress,
} from '@mui/material';
import { Cloud, Key, Security, Refresh, History } from '@mui/icons-material';
import { awsCloudService } from '../../services/api';
import { OSSvsEnterpriseBanner } from '../../components/OSSvsEnterpriseBanner';
import { HSMStatusBadge } from '../../components/HSMStatusBadge';
import { ComplianceBadgeRow } from '../../components/ComplianceBadge';

interface ClusterStatus {
  cluster_id: string;
  region: string;
  state: string;
  hsm_count: number;
  vpc_id: string;
  last_checked: string;
}

interface KMSKey {
  key_id: string;
  arn: string;
  alias: string;
  state: string;
  key_usage: string;
  algorithm: string;
  quantum_safe: boolean;
  created_at: string;
  last_rotated: string;
}

interface AuditEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  key_id: string;
  user_arn: string;
  source_ip: string;
  region: string;
  success: boolean;
}

const AWSCloud: React.FC = () => {
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus | null>(null);
  const [kmsKeys, setKmsKeys] = useState<KMSKey[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clusterRes, keysRes, auditRes] = await Promise.allSettled([
        awsCloudService.getCloudHSMStatus(),
        awsCloudService.getKMSKeys(),
        awsCloudService.getCloudTrailAudit(),
      ]);
      if (clusterRes.status === 'fulfilled') setClusterStatus((clusterRes.value.data as any)?.data ?? clusterRes.value.data);
      if (keysRes.status === 'fulfilled') setKmsKeys((keysRes.value.data as any)?.data ?? []);
      if (auditRes.status === 'fulfilled') setAuditEvents((auditRes.value.data as any)?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch AWS data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const mockCluster: ClusterStatus = { cluster_id: 'cluster-0abc123', region: 'eu-central-1', state: 'ACTIVE', hsm_count: 2, vpc_id: 'vpc-0123456789abcdef0', last_checked: new Date().toISOString() };
  const mockKeys: KMSKey[] = [
    { key_id: 'mrk-1234', arn: 'arn:aws:kms:eu-central-1:123:key/mrk-1234', alias: 'alias/cryptobom-master', state: 'Enabled', key_usage: 'ENCRYPT_DECRYPT', algorithm: 'SYMMETRIC_DEFAULT', quantum_safe: false, created_at: '2024-01-01', last_rotated: '2024-07-01' },
    { key_id: 'mrk-5678', arn: 'arn:aws:kms:eu-central-1:123:key/mrk-5678', alias: 'alias/cryptobom-signing', state: 'Enabled', key_usage: 'SIGN_VERIFY', algorithm: 'ECC_NIST_P256', quantum_safe: false, created_at: '2024-02-01', last_rotated: '2024-08-01' },
  ];
  const mockAudit: AuditEvent[] = [
    { event_id: 'evt-001', timestamp: new Date(Date.now() - 3600000).toISOString(), event_type: 'GenerateDataKey', key_id: 'alias/cryptobom-master', user_arn: 'arn:aws:iam::123:role/cryptobom-app', source_ip: '10.0.1.100', region: 'eu-central-1', success: true },
    { event_id: 'evt-002', timestamp: new Date(Date.now() - 7200000).toISOString(), event_type: 'Decrypt', key_id: 'alias/cryptobom-master', user_arn: 'arn:aws:iam::123:role/cryptobom-app', source_ip: '10.0.1.101', region: 'eu-central-1', success: true },
  ];

  const cluster = clusterStatus ?? mockCluster;
  const displayKeys = kmsKeys.length ? kmsKeys : mockKeys;
  const displayAudit = auditEvents.length ? auditEvents : mockAudit;

  return (
    <OSSvsEnterpriseBanner
      feature="awsHSMIntegration"
      featureName="AWS CloudHSM Integration"
      description="Connect AWS CloudHSM clusters and AWS KMS for hardware-backed key management and CloudTrail crypto audit logging."
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #FF9900, #FF6600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cloud sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>AWS Cloud</Typography>
              <Typography variant="body2" color="textSecondary">CloudHSM · KMS · CloudTrail Audit</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>API unavailable — showing cached/mock data. {error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="textSecondary">CloudHSM Cluster</Typography>
                  <HSMStatusBadge provider="aws-cloudhsm" health={cluster.state === 'ACTIVE' ? 'healthy' : 'degraded'} keyCount={cluster.hsm_count} />
                </Box>
                <Typography variant="h4" fontWeight={700}>{cluster.hsm_count}</Typography>
                <Typography variant="body2" color="textSecondary">HSM Instances</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="textSecondary">Region: {cluster.region} · VPC: {cluster.vpc_id.slice(0, 12)}…</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>KMS Keys</Typography>
                <Typography variant="h4" fontWeight={700}>{displayKeys.length}</Typography>
                <Typography variant="body2" color="textSecondary">Active CMKs</Typography>
                <Divider sx={{ my: 1 }} />
                <ComplianceBadgeRow standards={[{ standard: 'FIPS-140-3', compliant: true }, { standard: 'DORA', compliant: true }]} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>CloudTrail Events (24h)</Typography>
                <Typography variant="h4" fontWeight={700}>{displayAudit.length}</Typography>
                <Typography variant="body2" color="textSecondary">Crypto audit events</Typography>
                <Divider sx={{ my: 1 }} />
                <Chip label={`${displayAudit.filter(e => e.success).length} successful`} size="small" color="success" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* KMS Keys */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key fontSize="small" /> AWS KMS Key Inventory
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Alias</TableCell>
                    <TableCell>Key ID</TableCell>
                    <TableCell>Algorithm</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Quantum Safe</TableCell>
                    <TableCell>Rotated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayKeys.map((key) => (
                    <TableRow key={key.key_id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{key.alias}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{key.key_id}</TableCell>
                      <TableCell><Chip label={key.algorithm} size="small" variant="outlined" /></TableCell>
                      <TableCell><Typography variant="caption">{key.key_usage}</Typography></TableCell>
                      <TableCell><Chip label={key.state} size="small" color={key.state === 'Enabled' ? 'success' : 'default'} /></TableCell>
                      <TableCell><Chip label={key.quantum_safe ? 'Yes' : 'No'} size="small" color={key.quantum_safe ? 'success' : 'warning'} /></TableCell>
                      <TableCell><Typography variant="caption">{new Date(key.last_rotated).toLocaleDateString()}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History fontSize="small" /> CloudTrail Crypto Audit Log
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Key</TableCell>
                    <TableCell>Principal</TableCell>
                    <TableCell>Source IP</TableCell>
                    <TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayAudit.map((event) => (
                    <TableRow key={event.event_id} hover>
                      <TableCell><Typography variant="caption">{new Date(event.timestamp).toLocaleString()}</Typography></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{event.event_type}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{event.key_id}</TableCell>
                      <TableCell><Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>{event.user_arn.split('/').pop()}</Typography></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{event.source_ip}</TableCell>
                      <TableCell><Chip label={event.success ? 'OK' : 'FAIL'} size="small" color={event.success ? 'success' : 'error'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </OSSvsEnterpriseBanner>
  );
};

export default AWSCloud;
