import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search,
  Add,
  Refresh,
  FilterList,
  Edit,
  Delete,
  Security,
  Memory,
  Storage,
  Cloud,
  GitHub,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { inventoryService } from '../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface Asset {
  id: string;
  asset_id: string;
  name: string;
  category: string;
  sub_category?: string;
  cloud_provider?: string;
  region?: string;
  quantum_safe?: boolean;
  vulnerability_score?: number;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'cryptographic',
    cloud_provider: '',
    region: '',
  });

  useEffect(() => {
    loadAssets();
    loadSummary();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getAssets({
        category: categoryFilter || undefined,
      });
      setAssets(response.data.assets || []);
    } catch (error) {
      console.error('Failed to load assets:', error);
      setAssets(getMockAssets());
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await inventoryService.getInventorySummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
      setSummary(getMockSummary());
    }
  };

  const getMockAssets = (): Asset[] => [
    { id: '1', asset_id: 'crypto-001', name: 'RSA-2048 Key', category: 'cryptographic', cloud_provider: 'aws', region: 'us-east-1', quantum_safe: false, vulnerability_score: 8 },
    { id: '2', asset_id: 'crypto-002', name: 'Kyber-1024 Key', category: 'cryptographic', cloud_provider: 'gcp', region: 'us-central1', quantum_safe: true, vulnerability_score: 1 },
    { id: '3', asset_id: 'ai-001', name: 'GPT-4 Model', category: 'ai', sub_category: 'LLM', cloud_provider: 'azure', region: 'eastus', quantum_safe: true },
    { id: '4', asset_id: 'hw-001', name: 'Quantum Computer', category: 'hardware', sub_category: 'Quantum', quantum_safe: true },
    { id: '5', asset_id: 'sw-001', name: 'PostgreSQL 15', category: 'software', cloud_provider: 'ibm_cloud', region: 'us-south' },
    { id: '6', asset_id: 'infra-001', name: 'VPC Network', category: 'infrastructure', cloud_provider: 'aws', region: 'us-east-1' },
  ];

  const getMockSummary = () => ({
    total_assets: 2847,
    by_category: { cryptographic: 450, ai: 180, hardware: 320, software: 890, infrastructure: 1007 },
    by_cloud_provider: { aws: 847, gcp: 523, ibm_cloud: 234, azure: 143 },
    quantum_safe_count: 35,
    non_quantum_safe: 65,
    vulnerable_assets: 127,
  });

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.asset_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryData = summary?.by_category ? Object.entries(summary.by_category).map(([name, value]) => ({ name, value })) : [
    { name: 'Cryptographic', value: 450 },
    { name: 'AI', value: 180 },
    { name: 'Hardware', value: 320 },
    { name: 'Software', value: 890 },
    { name: 'Infrastructure', value: 1007 },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cryptographic': return <Security />;
      case 'ai': return <Memory />;
      case 'hardware': return <Storage />;
      case 'software': return <GitHub />;
      case 'infrastructure': return <Cloud />;
      default: return <Storage />;
    }
  };

  const getQuantumBadge = (quantumSafe?: boolean) => {
    if (quantumSafe === undefined) return null;
    return quantumSafe ? (
      <Chip label="Quantum Safe" color="success" size="small" />
    ) : (
      <Chip label="At Risk" color="error" size="small" />
    );
  };

  const handleCreateAsset = async () => {
    try {
      await inventoryService.createAsset(newAsset);
      setCreateDialogOpen(false);
      loadAssets();
      loadSummary();
    } catch (error) {
      console.error('Failed to create asset:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Asset Inventory
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadAssets}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Add Asset
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Assets</Typography>
              <Typography variant="h4">{summary?.total_assets || '2,847'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Quantum Safe</Typography>
              <Typography variant="h4" color="success.main">{summary?.quantum_safe_count || '35'}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>At Risk</Typography>
              <Typography variant="h4" color="error.main">{summary?.vulnerable_assets || '127'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Cloud Providers</Typography>
              <Typography variant="h4">4</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assets by Category</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Cloud Distribution</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'AWS', value: summary?.by_cloud_provider?.aws || 847 },
                      { name: 'GCP', value: summary?.by_cloud_provider?.gcp || 523 },
                      { name: 'IBM Cloud', value: summary?.by_cloud_provider?.ibm_cloud || 234 },
                      { name: 'Azure', value: summary?.by_cloud_provider?.azure || 143 },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label="All Assets" />
            <Tab label="Cryptographic" />
            <Tab label="AI Models" />
            <Tab label="Hardware" />
            <Tab label="Software" />
            <Tab label="Infrastructure" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="cryptographic">Cryptographic</MenuItem>
              <MenuItem value="ai">AI</MenuItem>
              <MenuItem value="hardware">Hardware</MenuItem>
              <MenuItem value="software">Software</MenuItem>
              <MenuItem value="infrastructure">Infrastructure</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading && <LinearProgress />}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Cloud Provider</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id} hover>
                  <TableCell>{asset.asset_id}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCategoryIcon(asset.category)}
                      {asset.category}
                    </Box>
                  </TableCell>
                  <TableCell>{asset.cloud_provider || '-'}</TableCell>
                  <TableCell>{asset.region || '-'}</TableCell>
                  <TableCell>{getQuantumBadge(asset.quantum_safe)}</TableCell>
                  <TableCell>
                    <IconButton size="small"><Edit /></IconButton>
                    <IconButton size="small" color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Add New Asset</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Asset Name"
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newAsset.category}
                label="Category"
                onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
              >
                <MenuItem value="cryptographic">Cryptographic</MenuItem>
                <MenuItem value="ai">AI</MenuItem>
                <MenuItem value="hardware">Hardware</MenuItem>
                <MenuItem value="software">Software</MenuItem>
                <MenuItem value="infrastructure">Infrastructure</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Cloud Provider</InputLabel>
              <Select
                value={newAsset.cloud_provider}
                label="Cloud Provider"
                onChange={(e) => setNewAsset({ ...newAsset, cloud_provider: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="aws">AWS</MenuItem>
                <MenuItem value="gcp">GCP</MenuItem>
                <MenuItem value="ibm_cloud">IBM Cloud</MenuItem>
                <MenuItem value="azure">Azure</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Region"
              value={newAsset.region}
              onChange={(e) => setNewAsset({ ...newAsset, region: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateAsset} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
