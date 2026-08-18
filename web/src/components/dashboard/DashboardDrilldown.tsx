import React from 'react';
import {
  Box, Chip, Divider, Drawer, Link, List, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import { CVE_BY_ID } from '../../data/enterprise/cves';
import type { DashboardViewModel, DrilldownKind, FrameworkResult, SimulatedFinding } from '../../data/enterprise/types';
import ProvenanceChip from './ProvenanceChip';
import dashboardDesign from '../../theme/dashboardDesign';

export type DrilldownState = {
  kind: DrilldownKind;
  title: string;
  subtitle?: string;
  severity?: string;
  provider?: string;
  frameworkId?: string;
  cveId?: string;
} | null;

type DashboardDrilldownProps = {
  open: boolean;
  onClose: () => void;
  state: DrilldownState;
  model: DashboardViewModel;
  onSelectFinding?: (finding: SimulatedFinding) => void;
};

const DashboardDrilldown: React.FC<DashboardDrilldownProps> = ({ open, onClose, state, model, onSelectFinding }) => {
  if (!state) return null;

  let findings: SimulatedFinding[] = model.openFindings;
  if (state.severity) findings = findings.filter((f) => f.severity === state.severity);
  if (state.provider) {
    const p = state.provider.toLowerCase();
    findings = findings.filter((f) => f.provider === p || (p === 'k8s' && f.provider === 'kubernetes'));
  }
  if (state.cveId) findings = model.findings.filter((f) => f.cveId === state.cveId);
  if (state.kind === 'exposed') findings = findings.filter((f) => f.category === 'exposure' || model.assets.find((a) => a.id === f.assetId)?.internetExposed);

  const framework: FrameworkResult | undefined = state.frameworkId
    ? model.frameworks.find((f) => f.id === state.frameworkId)
    : undefined;
  const cve = state.cveId ? CVE_BY_ID[state.cveId] : undefined;
  const posture = state.kind === 'posture' ? model.posture : undefined;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{state.title}</Typography>
          <ProvenanceChip kind={model.dataMode} />
        </Stack>
        {state.subtitle && (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 2 }}>{state.subtitle}</Typography>
        )}

        {posture && (
          <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: `${dashboardDesign.radius.md}px` }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 1 }}>
              Risk score {posture.score} / 100 · CALCULATED
            </Typography>
            {posture.contributors.map((c) => (
              <Stack key={c.label} direction="row" justifyContent="space-between" sx={{ py: 0.35 }}>
                <Typography sx={{ fontSize: '0.75rem' }}>{c.label}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>+{c.points}</Typography>
              </Stack>
            ))}
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 1 }}>{posture.method}</Typography>
          </Box>
        )}

        {cve && (
          <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: `${dashboardDesign.radius.md}px` }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
              <ProvenanceChip kind="intel" label="REAL CVE" />
              {cve.kev && <ProvenanceChip kind="intel" label="CISA KEV" />}
            </Stack>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{cve.id}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>{cve.affectedProduct}</Typography>
            <Typography sx={{ fontSize: '0.75rem' }}>CVSS {cve.cvss} ({cve.severity}) · EPSS {cve.epss ? `${(cve.epss.score * 100).toFixed(2)}%` : 'n/a'}</Typography>
            <Typography sx={{ fontSize: '0.75rem', mt: 1 }}>{cve.description}</Typography>
            <Link href={cve.references[0]} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.75rem', display: 'block', mt: 1 }}>
              NVD record
            </Link>
          </Box>
        )}

        {framework && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
              Assessed {framework.assessed} · Passed {framework.passed} · Failed {framework.failed} · Partial {framework.partial} · Critical failures {framework.criticalFailures}
            </Typography>
            {framework.controls.map((c) => (
              <Stack key={c.id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                <Chip size="small" label={c.status} sx={{ height: 20, fontSize: '0.62rem' }} />
                <Typography sx={{ fontSize: '0.75rem' }}>{c.id} · {c.title}</Typography>
              </Stack>
            ))}
          </Box>
        )}

        {state.kind === 'resources' && (
          <List dense>
            {model.accounts.map((a) => (
              <ListItemButton key={a.id}>
                <ListItemText
                  primary={`${a.name} · ${a.resources.toLocaleString()} assets`}
                  secondary={`${a.provider.toUpperCase()} ${a.region} · ${a.exposed} internet-exposed · ${a.criticalAssets} critical`}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {(state.kind === 'findings' || state.kind === 'severity' || state.kind === 'exposed' || state.kind === 'provider' || state.kind === 'cve' || state.kind === 'feed') && (
          <>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
              Showing {findings.length} representative records from the {model.dataMode === 'demo' ? 'simulated' : 'live'} estate.
            </Typography>
            <List dense>
              {findings.slice(0, 40).map((f) => (
                <ListItemButton key={f.id} onClick={() => onSelectFinding?.(f)}>
                  <ListItemText
                    primary={f.title}
                    secondary={`${f.severity} · ${f.assetName} · ${f.provider.toUpperCase()} · ${f.region}${f.cveId ? ` · ${f.cveId}` : ''}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {state.kind === 'scans' && (
          <List dense>
            {model.scans.map((s) => (
              <ListItemButton key={s.id}>
                <ListItemText primary={s.target} secondary={`${s.status} · ${s.time}${s.findings != null ? ` · ${s.findings} findings` : ''}`} />
              </ListItemButton>
            ))}
          </List>
        )}

        {state.kind === 'risk' && (
          <List dense>
            {model.assets
              .slice()
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 24)
              .map((a) => (
                <ListItemButton key={a.id}>
                  <ListItemText
                    primary={`${a.name} · ${a.riskScore}/100 ${a.riskLevel}`}
                    secondary={a.riskContributors.map((c) => `${c.label} +${c.points}`).join(' · ') || 'No extra contributors'}
                  />
                </ListItemButton>
              ))}
          </List>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
          {model.environmentLabel}. Industry benchmarks are labeled separately and are not RivicQ telemetry.
        </Typography>
      </Box>
    </Drawer>
  );
};

export default DashboardDrilldown;
