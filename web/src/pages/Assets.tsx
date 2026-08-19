import React, { useMemo, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Grid, IconButton, InputAdornment,
  LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import {
  Search, Refresh, Download, Visibility, Security, Assessment, Storage,
  Cloud, Category, Warning, CheckCircle,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../services/api';
import { downloadJSON, printBrandedReport } from '../utils/reportExport';
import PageFrame from '../components/PageFrame';
import StatCard from '../components/dashboard/StatCard';
import { GlassCard, EmptyState, DetailTabs, TabPanel } from '../components/ui';
import { metricValueSx } from '../theme/designSystem';
import { categoryColor } from '../theme/chartTheme';
import { tokens } from '../theme/tokens';
import { normalizeAssets, normalizeSummary } from '../data/workspaceDemo';

const CATEGORY_META: Record<string, { color: string; desc: string }> = {
  cryptographic: { color: categoryColor('cryptographic'), desc: 'Keys, certs, TLS, and HSM material' },
  ai: { color: categoryColor('ai'), desc: 'Model signing keys and inference secrets' },
  hardware: { color: categoryColor('hardware'), desc: 'HSM clusters and physical crypto modules' },
  software: { color: categoryColor('software'), desc: 'Libraries, SBOM crypto dependencies' },
  infrastructure: { color: categoryColor('infrastructure'), desc: 'KMS, vaults, and cloud crypto services' },
};

const Assets: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'risk' | 'algorithm'>('risk');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => inventoryService.getAssets().then((r) => r.data),
    retry: 1,
  });

  const { data: summaryRaw } = useQuery({
    queryKey: ['assets-summary'],
    queryFn: () => inventoryService.getInventorySummary().then((r) => r.data),
    retry: 1,
  });

  const assets = useMemo(() => normalizeAssets(data), [data]);
  const summary = useMemo(() => normalizeSummary(summaryRaw), [summaryRaw]);

  const filteredAssets = assets
    .filter((asset) =>
      (asset.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.algorithm || asset.crypto_algorithm || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      if (sortKey === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortKey === 'algorithm') return String(a.algorithm || a.crypto_algorithm || '').localeCompare(String(b.algorithm || b.crypto_algorithm || ''));
      const rank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (rank[String(a.risk_level || a.riskLevel || '').toUpperCase()] ?? 9)
        - (rank[String(b.risk_level || b.riskLevel || '').toUpperCase()] ?? 9);
    });
  const paginatedAssets = filteredAssets.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / rowsPerPage));

  const migrationQueue = assets.filter((a) => !(a.quantum_safe || a.quantumSafe));

  const getRiskColor = (level: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (level?.toUpperCase()) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH':
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAssets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const renderAssetTable = (rows: any[]) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>Name</TableCell>
            <TableCell>Algorithm</TableCell>
            <TableCell>Key Size</TableCell>
            <TableCell>Cloud</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell>Risk</TableCell>
            <TableCell>PQC</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((asset) => (
            <TableRow key={asset.id} hover selected={selectedAssets.includes(asset.id)}>
              <TableCell padding="checkbox">
                <input type="checkbox" checked={selectedAssets.includes(asset.id)} onChange={() => toggleSelect(asset.id)} />
              </TableCell>
              <TableCell><Typography variant="body2" fontWeight={600}>{asset.name}</Typography></TableCell>
              <TableCell>{asset.algorithm || asset.crypto_algorithm || 'N/A'}</TableCell>
              <TableCell>{asset.key_size || asset.keySize || '—'}</TableCell>
              <TableCell>{asset.cloud_provider || asset.cloudProvider || '—'}</TableCell>
              <TableCell><Typography variant="caption" color="text.secondary">{asset.owner || '—'}</Typography></TableCell>
              <TableCell><Chip label={asset.risk_level || asset.riskLevel || 'UNKNOWN'} color={getRiskColor(asset.risk_level || asset.riskLevel)} size="small" /></TableCell>
              <TableCell><Chip label={asset.quantum_safe || asset.quantumSafe ? 'Ready' : 'Migrate'} color={asset.quantum_safe || asset.quantumSafe ? 'success' : 'warning'} size="small" variant="outlined" /></TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => navigate(`/assets/${asset.id}`)}><Visibility fontSize="small" /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={36} thickness={3} />
      </Box>
    );
  }

  return (
    <PageFrame
      eyebrow="Inventory"
      title="Crypto Assets"
      subtitle="Discover, classify, and prioritize cryptographic material across cloud, Kubernetes, and HSM estates."
      badge={`${summary.total_assets} tracked`}
      secondaryAction={<Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>Refresh</Button>}
    >
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}><StatCard label="Total" value={summary.total_assets} icon={<Storage sx={{ fontSize: 20 }} />} accent={tokens.colors.rivicq[500]} delay={0} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Quantum Safe" value={summary.quantum_safe_count} icon={<Security sx={{ fontSize: 20 }} />} accent={tokens.colors.crypto.low} delay={1} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="At Risk" value={summary.vulnerable_assets} icon={<Assessment sx={{ fontSize: 20 }} />} accent={tokens.colors.crypto.critical} delay={2} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Compliance" value={`${summary.compliance_score}%`} icon={<CheckCircle sx={{ fontSize: 20 }} />} accent={tokens.colors.rivicq[700]} delay={3} /></Grid>
      </Grid>

      <GlassCard hover={false} padding={2} delay={1}>
        <DetailTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: 'All Assets', icon: <Storage fontSize="small" /> },
            { label: 'Categories', icon: <Category fontSize="small" /> },
            { label: 'Cloud', icon: <Cloud fontSize="small" /> },
            { label: 'PQC Migration', icon: <Security fontSize="small" /> },
            { label: 'Risk Queue', icon: <Warning fontSize="small" /> },
          ]}
        />

        <TabPanel value={tab} index={0}>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={2}>
            <TextField
              size="small"
              placeholder="Search by name or algorithm…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              select
              size="small"
              label="Sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              SelectProps={{ native: true }}
              sx={{ width: 140 }}
            >
              <option value="risk">Risk</option>
              <option value="name">Name</option>
              <option value="algorithm">Algorithm</option>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<Download />}
              disabled={!assets.length}
              onClick={() => {
                const rows = selectedAssets.length
                  ? assets.filter((a) => selectedAssets.includes(a.id))
                  : filteredAssets;
                downloadJSON('rivicq-inventory.json', { source: 'community_inventory', generated_at: new Date().toISOString(), assets: rows });
                printBrandedReport({
                  title: 'RivicQ cryptographic inventory',
                  subtitle: `${rows.length} assets`,
                  bodyHtml: `<table><thead><tr><th>Name</th><th>Algorithm</th><th>Risk</th><th>PQC</th></tr></thead><tbody>${
                    rows.slice(0, 80).map((a) => `<tr><td>${a.name || ''}</td><td>${a.algorithm || a.crypto_algorithm || ''}</td><td>${a.risk_level || a.riskLevel || ''}</td><td>${a.quantum_safe || a.quantumSafe ? 'Ready' : 'Migrate'}</td></tr>`).join('')
                  }</tbody></table>`,
                });
              }}
            >
              Export JSON + PDF
            </Button>
          </Box>
          {paginatedAssets.length ? renderAssetTable(paginatedAssets) : (
            <EmptyState icon={<Storage />} title="No assets match" description="Adjust filters or run a CBOM scan." action={{ label: 'Open Scanner', onClick: () => navigate('/scanner') }} />
          )}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" gap={2} mt={2} alignItems="center">
              <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Typography variant="body2" sx={metricValueSx} fontSize="0.8125rem">Page {page} / {totalPages}</Typography>
              <Button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            {Object.entries(summary.by_category).map(([cat, count]) => {
              const meta = CATEGORY_META[cat] ?? { color: tokens.colors.rivicq[400], desc: 'Discovered assets' };
              const pct = summary.total_assets ? Math.round((count / summary.total_assets) * 100) : 0;
              return (
                <Grid item xs={12} sm={6} md={4} key={cat}>
                  <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>{cat}</Typography>
                      <Chip label={count} size="small" sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontWeight: 700 }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>{meta.desc}</Typography>
                    <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mb: 0.5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: meta.color } }} />
                    <Typography variant="caption" color="text.secondary">{pct}% of inventory</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Grid container spacing={2.5}>
            {Object.entries(summary.by_cloud_provider).map(([provider, count]) => (
              <Grid item xs={12} md={6} key={provider}>
                <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Cloud color="primary" fontSize="small" />
                    <Typography fontWeight={700} sx={{ textTransform: 'uppercase' }}>{provider.replace('_', ' ')}</Typography>
                    <Chip label={`${count} resources`} size="small" variant="outlined" />
                  </Stack>
                  {renderAssetTable(assets.filter((a) => (a.cloud_provider || '').toLowerCase() === provider || (a.cloud_provider || '').toLowerCase().includes(provider.split('_')[0])))}
                </Box>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Legacy algorithms flagged for NIST PQC migration — prioritize CRITICAL and HIGH items first.
          </Typography>
          <Stack spacing={1.5}>
            {migrationQueue.map((asset, i) => (
              <Box key={asset.id} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={`#${i + 1}`} size="small" color="warning" />
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <Typography fontWeight={700}>{asset.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{asset.algorithm} · {asset.cloud_provider}</Typography>
                </Box>
                <Chip label="Target: ML-KEM / ML-DSA" size="small" variant="outlined" color="primary" />
                <Button size="small" onClick={() => navigate(`/assets/${asset.id}`)}>View plan</Button>
              </Box>
            ))}
            {!migrationQueue.length && <Typography color="text.secondary">All discovered assets are PQC-ready.</Typography>}
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Stack spacing={1.5}>
            {assets
              .filter((a) => ['HIGH', 'CRITICAL'].includes((a.risk_level || a.riskLevel || '').toUpperCase()))
              .slice(0, 8)
              .map((asset) => (
                <Box key={asset.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', borderLeft: 4, borderColor: getRiskColor(asset.risk_level || asset.riskLevel) === 'error' ? 'error.main' : 'warning.main' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography fontWeight={700}>{asset.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{asset.algorithm} — {asset.location || asset.cloud_provider}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75}>
                      <Chip label={asset.risk_level || asset.riskLevel} color={getRiskColor(asset.risk_level || asset.riskLevel)} size="small" />
                      <Button size="small" variant="outlined" onClick={() => navigate(`/assets/${asset.id}`)}>Remediate</Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
          </Stack>
        </TabPanel>
      </GlassCard>
    </PageFrame>
  );
};

export default Assets;
