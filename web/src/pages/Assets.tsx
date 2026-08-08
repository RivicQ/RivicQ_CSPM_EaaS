import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Refresh,
  Download,
  Visibility,
  Security,
  Assessment,
  Storage,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../services/api';
import PageFrame from '../components/PageFrame';

const Assets: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => inventoryService.getAssets().then(r => r.data),
    retry: 1,
  });

  const assets: any[] = Array.isArray(data) ? data : ((data as any)?.assets ?? []);

  const filteredAssets = assets.filter(asset =>
    (asset.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (asset.algorithm || asset.crypto_algorithm || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedAssets = filteredAssets.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredAssets.length / rowsPerPage);

  const handleSelectAsset = (id: string) => {
    setSelectedAssets(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getRiskColor = (level: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (level?.toUpperCase()) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageFrame
      eyebrow="Inventory"
      title="Crypto Assets"
      subtitle="Review cryptographic assets, filter risk, and export selected items for remediation or reporting."
      badge={`${assets.length} assets`}
      secondaryAction={(
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>
          Refresh
        </Button>
      )}
    >

      {error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Live asset data is unavailable. Connect the backend to populate this view.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Storage sx={{ color: '#667eea', fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">{assets.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security sx={{ color: '#10b981', fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">
                {assets.filter(a => a.quantum_safe || a.quantumSafe).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Quantum Safe</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ color: '#ef4444', fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">
                {assets.filter(a => ['HIGH', 'CRITICAL'].includes((a.risk_level || a.riskLevel || '').toUpperCase())).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">At Risk</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Visibility sx={{ color: '#764ba2', fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">{selectedAssets.length}</Typography>
              <Typography variant="caption" color="text.secondary">Selected</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)' }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Download />}
            disabled={selectedAssets.length === 0}
          >
            Export Selected
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedAssets.length === paginatedAssets.length && paginatedAssets.length > 0}
                  onChange={e => setSelectedAssets(e.target.checked ? paginatedAssets.map(a => a.id) : [])}
                  size="small"
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Algorithm</TableCell>
              <TableCell>Key Size</TableCell>
              <TableCell>Cloud</TableCell>
              <TableCell>Risk</TableCell>
              <TableCell>Quantum Safe</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={4}>
                    No assets found. Start a scan to discover crypto assets.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAssets.map(asset => (
                <TableRow key={asset.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedAssets.includes(asset.id)}
                      onChange={() => handleSelectAsset(asset.id)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">{asset.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {asset.algorithm || asset.crypto_algorithm || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>{asset.key_size || asset.keySize || 'N/A'}</TableCell>
                  <TableCell>{asset.cloud_provider || asset.cloudProvider || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={asset.risk_level || asset.riskLevel || 'UNKNOWN'}
                      color={getRiskColor(asset.risk_level || asset.riskLevel)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={asset.quantum_safe || asset.quantumSafe ? 'Yes' : 'No'}
                      color={asset.quantum_safe || asset.quantumSafe ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => navigate(`/assets/${asset.id}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" gap={2} mt={2} alignItems="center">
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Typography variant="body2">Page {page} of {totalPages}</Typography>
          <Button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Box>
      )}
    </PageFrame>
  );
};

export default Assets;
