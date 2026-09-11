import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Skeleton, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { BugReport, Download, Save } from '@mui/icons-material';
import PageFrame from '../components/PageFrame';
import { EmptyState, GlassCard } from '../components/ui';
import { cbomService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  deleteView, loadSavedViews, parseFindingsPayload, saveView, type OpsFinding, type SavedView,
} from '../ops/findings';
import ProvenanceChip from '../components/dashboard/ProvenanceChip';
import OpsHeroVisual from '../components/ops/OpsHeroVisual';

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

const Findings: React.FC = () => {
  const navigate = useNavigate();
  const { isDemo } = useAuth();
  const [params, setParams] = useSearchParams();
  const severity = (params.get('severity') || 'all').toLowerCase();
  const q = params.get('q') || '';
  const selectedId = params.get('id') || '';
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [views, setViews] = React.useState<SavedView[]>(() => loadSavedViews());
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [viewName, setViewName] = React.useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ops-findings'],
    queryFn: () => cbomService.getScanFindings().then((r) => r.data),
    retry: 1,
  });

  const source = data?.source === 'cbom_scans' ? 'live' : 'unknown';
  const all = parseFindingsPayload(data);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((f) => severity === 'all' || f.severity === severity)
      .filter((f) => {
        if (!needle) return true;
        return `${f.title} ${f.asset} ${f.algorithm || ''} ${f.evidence || ''} ${f.id}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => (SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0));
  }, [all, severity, q]);

  const open = filtered.find((f) => f.id === selectedId) || filtered[0];

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const exportRows = (rows: OpsFinding[]) => {
    const header = ['id', 'severity', 'title', 'asset', 'algorithm', 'evidence', 'remediation'];
    const csv = [header.join(','), ...rows.map((r) => header.map((h) => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rivicq-findings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = {
    all: all.length,
    critical: all.filter((f) => f.severity === 'critical').length,
    high: all.filter((f) => f.severity === 'high').length,
    medium: all.filter((f) => f.severity === 'medium').length,
    low: all.filter((f) => f.severity === 'low').length,
  };

  return (
    <PageFrame
      eyebrow="Operations"
      title="Findings"
      subtitle="Investigation queue from completed scans in this workspace. Evidence is scanner output. Secret values are never shown."
      badge={isDemo ? 'Demo session' : `${all.length} open`}
      visual={
        <OpsHeroVisual
          variant="findings"
          empty={all.length === 0}
          severity={{ critical: counts.critical, high: counts.high, medium: counts.medium, low: counts.low }}
        />
      }
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Save />} onClick={() => setSaveOpen(true)}>Save view</Button>
          <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => exportRows(selected.size ? filtered.filter((f) => selected.has(f.id)) : filtered)}>
            Export
          </Button>
        </Stack>
      }
    >
      {isError && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
          Findings API unreachable. Start the Community API on :8080 (or Enterprise :9090). GitHub Pages has no API.
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
          <Chip
            key={s}
            clickable
            color={severity === s ? 'primary' : 'default'}
            label={s === 'all' ? `All (${counts.all})` : s === 'critical' ? `Critical (${counts.critical})` : s === 'high' ? `High (${counts.high})` : s}
            onClick={() => setFilter('severity', s)}
          />
        ))}
        <TextField
          size="small"
          value={q}
          onChange={(e) => setFilter('q', e.target.value)}
          placeholder="Filter title, asset, algorithm…"
          sx={{ minWidth: 240 }}
          inputProps={{ 'aria-label': 'Filter findings' }}
        />
        <ProvenanceChip kind={source === 'live' && all.length ? 'live' : 'calculated'} label={all.length ? 'GET /scans/findings' : 'NO SCAN DATA'} />
      </Stack>

      {views.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {views.map((v) => (
            <Chip
              key={v.id}
              label={v.name}
              onClick={() => navigate(`/findings?${v.query}`)}
              onDelete={() => setViews(deleteView(v.id))}
            />
          ))}
        </Stack>
      )}

      {isLoading && <Skeleton variant="rounded" height={280} />}

      {!isLoading && all.length === 0 && (
        <EmptyState
          icon={<BugReport />}
          title="No findings in this workspace yet"
          description="Run a CBOM scan (website, host, or repository) or the CLI: rivicq scan . Demo findings are not mixed into Community."
          action={{ label: 'Run scan', onClick: () => navigate('/scanner') }}
        />
      )}

      {!isLoading && all.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' }, gap: 2 }}>
          <GlassCard hover={false}>
            <Table size="small" aria-label="Findings table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Severity</TableCell>
                  <TableCell>Finding</TableCell>
                  <TableCell>Asset</TableCell>
                  <TableCell>Algorithm</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow
                    key={f.id}
                    hover
                    selected={open?.id === f.id}
                    onClick={() => setFilter('id', f.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                        inputProps={{ 'aria-label': `Select ${f.title}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={f.severity.toUpperCase()}
                        color={f.severity === 'critical' || f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'default'}
                        aria-label={`Severity ${f.severity}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{f.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{f.id}</Typography>
                    </TableCell>
                    <TableCell>{f.asset || '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{f.algorithm || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">No findings match this filter. Clear severity or search.</Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5 }}>
              Bulk assign / suppress is not available on Community — the control plane does not persist finding workflow. Export is local CSV from this view.
            </Typography>
          </GlassCard>

          <GlassCard hover={false}>
            {!open && <Typography color="text.secondary">Select a finding.</Typography>}
            {open && (
              <Stack spacing={1.5}>
                <Typography variant="overline" color="primary" fontWeight={800}>{open.id}</Typography>
                <Typography variant="h6" fontWeight={800}>{open.title}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={open.severity.toUpperCase()} color={open.severity === 'critical' || open.severity === 'high' ? 'error' : 'default'} />
                  {open.quantumSafe ? <Chip size="small" label="PQC classified" /> : <Chip size="small" label="Classical crypto" />}
                </Stack>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Why this matters</Typography>
                  <Typography variant="body2" color="text.secondary">{open.description || 'Scanner classified this cryptographic surface. RSA-2048 is classified, not automatically vulnerable.'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Evidence</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}>
                    {open.evidence || 'No evidence payload on this finding.'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Impact</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {open.asset ? `Affected asset: ${open.asset}` : 'Asset label not provided by this scanner result.'}
                    {open.host ? ` · ${open.host}${open.port ? `:${open.port}` : ''}` : ''}
                    {open.protocol ? ` · ${open.protocol}` : ''}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Recommended remediation</Typography>
                  <Typography variant="body2">{open.remediation || 'No engine recommendation on this finding. Use PQC Migration for classified algorithms.'}</Typography>
                </Box>
                {open.bsiRef && (
                  <Typography variant="caption" color="text.secondary">Reference: {open.bsiRef}</Typography>
                )}
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => navigate('/migration')}>PQC roadmap</Button>
                  {open.asset && (
                    <Button size="small" onClick={() => navigate(`/assets?q=${encodeURIComponent(open.asset)}`)}>Related assets</Button>
                  )}
                </Stack>
              </Stack>
            )}
          </GlassCard>
        </Box>
      )}

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)}>
        <DialogTitle>Save this view</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="My critical RSA findings"
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Stored in this browser only. Not shared with other operators.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!viewName.trim()}
            onClick={() => {
              setViews(saveView(viewName.trim(), params.toString()));
              setSaveOpen(false);
              setViewName('');
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </PageFrame>
  );
};

export default Findings;
