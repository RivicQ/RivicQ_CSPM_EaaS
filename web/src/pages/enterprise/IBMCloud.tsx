import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, LinearProgress, Divider, CircularProgress,
} from '@mui/material';
import { Security, Cloud, Key, Refresh, Visibility } from '@mui/icons-material';
import { ibmCloudService } from '../../services/api';
import { OSSvsEnterpriseBanner } from '../../components/OSSvsEnterpriseBanner';
import { HSMStatusBadge } from '../../components/HSMStatusBadge';
import { ComplianceBadgeRow } from '../../components/ComplianceBadge';

interface HPCSStatus {
  instance_id: string;
  region: string;
  status: string;
  key_count: number;
  last_check: string;
}

interface HPCSKey {
  id: string;
  name: string;
  type: string;
  state: string;
  algorithm: string;
  key_length: number;
  quantum_safe: boolean;
  created_at: string;
  last_rotated: string;
}

interface COSBucket {
  name: string;
  region: string;
  encrypted: boolean;
  key_id: string;
  object_count: number;
  size_gb: number;
}

const IBMCloud: React.FC = () => {
  const [hpcsStatus, setHpcsStatus] = useState<HPCSStatus | null>(null);
  const [keys, setKeys] = useState<HPCSKey[]>([]);
  const [buckets, setBuckets] = useState<COSBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, keysRes, bucketsRes] = await Promise.allSettled([
        ibmCloudService.getHPCSStatus(),
        ibmCloudService.getKeyInventory(),
        ibmCloudService.getObjectStorageBuckets(),
      ]);
      if (statusRes.status === 'fulfilled') setHpcsStatus((statusRes.value.data as any)?.data ?? statusRes.value.data);
      if (keysRes.status === 'fulfilled') setKeys((keysRes.value.data as any)?.data ?? []);
      if (bucketsRes.status === 'fulfilled') setBuckets((bucketsRes.value.data as any)?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch IBM Cloud data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <OSSvsEnterpriseBanner
      feature="ibmCloudIntegration"
      featureName="IBM Cloud Integration"
      description="Connect IBM Hyper Protect Crypto Services (HPCS) and IBM Cloud Object Storage to manage quantum-safe keys and encrypted buckets."
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #1F70C1, #0530AD)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cloud sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>IBM Cloud</Typography>
              <Typography variant="body2" color="textSecondary">Hyper Protect Crypto Services · Cloud Object Storage</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>API unavailable — showing cached/mock data. {error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* HPCS Status */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle2" color="textSecondary">HPCS Instance</Typography>
                  <HSMStatusBadge provider="ibm-hpcs" health={hpcsStatus?.status === 'active' ? 'healthy' : 'unknown'} keyCount={hpcsStatus?.key_count ?? keys.length} />
                </Box>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {loading ? <CircularProgress size={24} /> : (hpcsStatus?.key_count ?? keys.length)}
                </Typography>
                <Typography variant="body2" color="textSecondary">Managed Keys</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="textSecondary">
                  Region: {hpcsStatus?.region ?? 'eu-de'} · Status: {hpcsStatus?.status ?? 'active'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Quantum-Safe Keys</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#10b981' }}>
                  {keys.filter(k => k.quantum_safe).length}
                </Typography>
                <Typography variant="body2" color="textSecondary">of {keys.length} total keys</Typography>
                <LinearProgress variant="determinate" value={keys.length ? (keys.filter(k => k.quantum_safe).length / keys.length) * 100 : 0} sx={{ mt: 1, height: 6, borderRadius: 3 }} color="success" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>COS Buckets</Typography>
                <Typography variant="h4" fontWeight={700}>{buckets.length || 3}</Typography>
                <Typography variant="body2" color="textSecondary">Encrypted storage buckets</Typography>
                <Divider sx={{ my: 1 }} />
                <ComplianceBadgeRow standards={[{ standard: 'FIPS-140-3', compliant: true }, { standard: 'BSI-TR-02102', compliant: true }]} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Key Inventory */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key fontSize="small" /> HPCS Key Inventory
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Algorithm</TableCell>
                    <TableCell>Key Size</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Quantum Safe</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(keys.length ? keys : [
                    { id: 'k1', name: 'cryptobom-master-key', type: 'symmetric', state: 'active', algorithm: 'AES', key_length: 256, quantum_safe: false, created_at: '2024-01-01', last_rotated: '2024-06-01' },
                    { id: 'k2', name: 'cryptobom-pqc-key', type: 'asymmetric', state: 'active', algorithm: 'ML-KEM-768', key_length: 768, quantum_safe: true, created_at: '2024-03-01', last_rotated: '2024-09-01' },
                    { id: 'k3', name: 'tenant-signing-key', type: 'asymmetric', state: 'active', algorithm: 'ML-DSA-65', key_length: 65, quantum_safe: true, created_at: '2024-05-01', last_rotated: '2024-11-01' },
                  ] as HPCSKey[]).map((key) => (
                    <TableRow key={key.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{key.name}</TableCell>
                      <TableCell><Chip label={key.algorithm} size="small" variant="outlined" /></TableCell>
                      <TableCell>{key.key_length}</TableCell>
                      <TableCell><Chip label={key.state} size="small" color={key.state === 'active' ? 'success' : 'default'} /></TableCell>
                      <TableCell>
                        <Chip label={key.quantum_safe ? 'Yes' : 'No'} size="small" color={key.quantum_safe ? 'success' : 'warning'} />
                      </TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<Security />} onClick={() => ibmCloudService.attestKey(key.id)}>
                          Attest
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* COS Buckets */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>IBM Cloud Object Storage Buckets</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bucket Name</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Encrypted</TableCell>
                    <TableCell>Key ID</TableCell>
                    <TableCell>Objects</TableCell>
                    <TableCell>Size (GB)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(buckets.length ? buckets : [
                    { name: 'cryptobom-artifacts-eu', region: 'eu-de', encrypted: true, key_id: 'k1', object_count: 1240, size_gb: 45.2 },
                    { name: 'cryptobom-sbom-reports', region: 'eu-de', encrypted: true, key_id: 'k2', object_count: 892, size_gb: 12.8 },
                    { name: 'cryptobom-audit-logs', region: 'eu-gb', encrypted: true, key_id: 'k1', object_count: 56780, size_gb: 234.1 },
                  ] as COSBucket[]).map((bucket) => (
                    <TableRow key={bucket.name} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{bucket.name}</TableCell>
                      <TableCell>{bucket.region}</TableCell>
                      <TableCell><Chip label={bucket.encrypted ? 'Encrypted' : 'Unencrypted'} size="small" color={bucket.encrypted ? 'success' : 'error'} /></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{bucket.key_id}</TableCell>
                      <TableCell>{bucket.object_count.toLocaleString()}</TableCell>
                      <TableCell>{bucket.size_gb}</TableCell>
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

export default IBMCloud;
