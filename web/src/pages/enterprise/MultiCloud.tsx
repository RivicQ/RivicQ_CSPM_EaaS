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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Cloud,
  Sync,
  Add,
  Warning,
  CheckCircle,
  Storage,
  Dns,
  Security,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cloudService } from '../../services/api';

const CLOUD_COLORS = {
  aws: '#FF9900',
  gcp: '#4285F4',
  ibm_cloud: '#052FAD',
  azure: '#0078D4',
};

const MultiCloud: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    provider: 'aws',
    account_id: '',
    account_name: '',
    regions: [] as string[],
  });

  useEffect(() => {
    loadCloudData();
  }, []);

  const loadCloudData = async () => {
    setLoading(true);
    try {
      const [accountsRes, summaryRes] = await Promise.all([
        cloudService.getCloudAccounts(),
        cloudService.getResourcesSummary(),
      ]);
      setAccounts(accountsRes.data.accounts || []);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to load cloud data:', error);
      setSummary({
        total_resources: 1604,
        by_provider: { aws: 847, gcp: 523, ibm_cloud: 234 },
        by_service: { ec2: 120, s3: 85, compute: 95, storage: 65, vsi: 45 },
        security_findings: { critical: 2, high: 8, medium: 15, low: 22 },
        compliance: { iso27001: '85%', nist: '78%', pqc: '65%' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      await cloudService.addCloudAccount(newAccount);
      setCreateDialogOpen(false);
      loadCloudData();
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  };

  const handleSync = async (accountId: string) => {
    try {
      await cloudService.syncCloudAccount(accountId);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const barData = summary?.by_provider ? Object.entries(summary.by_provider).map(([name, value]) => ({
    name: name.toUpperCase(),
    resources: value,
  })) : [
    { name: 'AWS', resources: 847 },
    { name: 'GCP', resources: 523 },
    { name: 'IBM', resources: 234 },
  ];

  const serviceData = summary?.by_service ? Object.entries(summary.by_service).map(([name, value]) => ({
    name,
    count: value,
  })) : [
    { name: 'EC2', count: 120 },
    { name: 'S3', count: 85 },
    { name: 'RDS', count: 45 },
    { name: 'Compute', count: 95 },
    { name: 'Storage', count: 65 },
    { name: 'VSI', count: 45 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Multi-Cloud Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Sync />} onClick={loadCloudData}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Add Cloud Account
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Resources</Typography>
              <Typography variant="h3">{summary?.total_resources || '1,604'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>AWS Resources</Typography>
              <Typography variant="h4" sx={{ color: CLOUD_COLORS.aws }}>{summary?.by_provider?.aws || '847'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>GCP Resources</Typography>
              <Typography variant="h4" sx={{ color: CLOUD_COLORS.gcp }}>{summary?.by_provider?.gcp || '523'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Security Findings</Typography>
              <Typography variant="h4" color="error.main">{summary?.security_findings?.critical || '2'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Resources by Cloud Provider</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="resources" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Resources by Service</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab icon={<Cloud />} label="AWS" iconPosition="start" />
            <Tab icon={<Cloud />} label="GCP" iconPosition="start" />
            <Tab icon={<Cloud />} label="IBM Cloud" iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <Grid container spacing={2}>
              {[
                { type: 'EC2', count: 120, icon: <Dns /> },
                { type: 'S3 Buckets', count: 85, icon: <Storage /> },
                { type: 'RDS', count: 45, icon: <Dns /> },
                { type: 'EKS Clusters', count: 8, icon: <Cloud /> },
                { type: 'Security Groups', count: 120, icon: <Security /> },
              ].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.type}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.icon}
                        <Typography variant="h6">{item.type}</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ color: CLOUD_COLORS.aws }}>{item.count}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          {activeTab === 1 && (
            <Grid container spacing={2}>
              {[
                { type: 'Compute Instances', count: 95, icon: <Dns /> },
                { type: 'Storage Buckets', count: 65, icon: <Storage /> },
                { type: 'Cloud SQL', count: 30, icon: <Dns /> },
                { type: 'GKE Clusters', count: 6, icon: <Cloud /> },
                { type: 'Firewall Rules', count: 85, icon: <Security /> },
              ].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.type}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.icon}
                        <Typography variant="h6">{item.type}</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ color: CLOUD_COLORS.gcp }}>{item.count}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          {activeTab === 2 && (
            <Grid container spacing={2}>
              {[
                { type: 'VSI Instances', count: 45, icon: <Dns /> },
                { type: 'COS Buckets', count: 25, icon: <Storage /> },
                { type: 'DB2', count: 15, icon: <Dns /> },
                { type: 'IKS Clusters', count: 4, icon: <Cloud /> },
                { type: 'Quantum Instances', count: 3, icon: <Cloud /> },
              ].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.type}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.icon}
                        <Typography variant="h6">{item.type}</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ color: CLOUD_COLORS.ibm_cloud }}>{item.count}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Card>

      <Typography variant="h5" gutterBottom>Compliance Status</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(summary?.compliance || { iso27001: '85%', nist: '78%', pqc: '65%' }).map(([framework, score]) => (
          <Grid item xs={12} sm={4} key={framework}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{framework.toUpperCase()}</Typography>
                <Chip
                  label={score as string}
                  color={parseInt(score as string) >= 70 ? 'success' : 'warning'}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Add Cloud Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Cloud Provider</InputLabel>
              <Select
                value={newAccount.provider}
                label="Cloud Provider"
                onChange={(e) => setNewAccount({ ...newAccount, provider: e.target.value })}
              >
                <MenuItem value="aws">AWS</MenuItem>
                <MenuItem value="gcp">GCP</MenuItem>
                <MenuItem value="ibm_cloud">IBM Cloud</MenuItem>
                <MenuItem value="azure">Azure</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Account ID"
              value={newAccount.account_id}
              onChange={(e) => setNewAccount({ ...newAccount, account_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="Account Name"
              value={newAccount.account_name}
              onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateAccount} variant="contained">Add Account</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultiCloud;
