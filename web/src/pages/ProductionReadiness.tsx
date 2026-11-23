import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { AdminPanelSettings } from '@mui/icons-material';
import PageFrame from '../components/PageFrame';
import { EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  getProductionReadiness,
  normalizeProductionReadiness,
  READINESS_MESSAGES,
  ProductionReadiness,
  ReadinessOverall,
} from '../services/readiness';
import designSystem, { proBlueContainedButtonSx } from '../theme/designSystem';
import { ARCHIFY_FONTS, NEBULA, nebulaCardSx } from '../theme/nebulaSurfaces';
import { PRISM } from '../theme/prism';
import { tokens } from '../theme/tokens';

const MATURITY_LABELS = [
  'Production implemented',
  'Beta implemented',
  'Experimental',
  'Integration pending',
  'Planned',
  'Not supported',
];

const STATUS_LABELS: Record<string, string> = {
  production_implemented: 'Production implemented',
  beta_implemented: 'Beta implemented',
  experimental: 'Experimental',
  integration_pending: 'Integration pending',
  planned: 'Planned',
  not_supported: 'Not supported',
  ready: 'Ready',
  partial: 'Partial',
  not_ready: 'Not ready',
};

const STATUS_COLORS: Record<string, string> = {
  production_implemented: PRISM.compliance.pass,
  beta_implemented: PRISM.brand.violet400,
  experimental: PRISM.severity.quantum,
  integration_pending: PRISM.severity.high,
  planned: PRISM.severity.low,
  not_supported: PRISM.compliance.notApplicable,
  ready: PRISM.compliance.pass,
  partial: PRISM.compliance.warn,
  not_ready: PRISM.compliance.fail,
};

const OVERALL_META: Record<
  ReadinessOverall,
  { label: string; severity: 'success' | 'warning' | 'error'; color: string }
> = {
  ready: { label: 'Ready', severity: 'success', color: PRISM.compliance.pass },
  partial: { label: 'Partial', severity: 'warning', color: PRISM.compliance.warn },
  'not-ready': { label: 'Not ready', severity: 'error', color: PRISM.compliance.fail },
};

type PageState = 'loading' | 'ready' | 'error' | 'disconnected';

function statusKey(status: string): string {
  return status.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function statusLabel(status: string): string {
  return STATUS_LABELS[statusKey(status)] || status;
}

function statusColor(status: string): string {
  return STATUS_COLORS[statusKey(status)] || PRISM.compliance.notApplicable;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

const SectionCard: React.FC<{ title: string; caption?: string; children: React.ReactNode }> = ({
  title,
  caption,
  children,
}) => (
  <Box
    sx={{
      ...nebulaCardSx,
      p: { xs: 1.75, sm: 2.25 },
      minWidth: 0,
      overflow: 'hidden',
      borderColor: NEBULA.line,
    }}
  >
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.75, minWidth: 0 }}>
      <Box
        sx={{
          width: 6,
          height: 6,
          mt: 0.75,
          borderRadius: '50%',
          flexShrink: 0,
          background: designSystem.gradient.brand,
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: ARCHIFY_FONTS.title,
            fontWeight: 600,
            fontSize: '0.95rem',
            lineHeight: 1.3,
            color: NEBULA.text,
          }}
        >
          {title}
        </Typography>
        {caption && (
          <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', lineHeight: 1.45, mt: 0.25 }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Stack>
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      {children}
    </Stack>
  </Box>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const color = statusColor(status);
  return (
    <Chip
      label={statusLabel(status)}
      size="small"
      variant="outlined"
      sx={{
        color,
        borderColor: color,
        bgcolor: `${color}14`,
        maxWidth: '100%',
        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
      }}
    />
  );
};

const ProductionReadinessPage: React.FC = () => {
  const { user, edition, backendReachable } = useAuth();
  const [state, setState] = React.useState<PageState>('loading');
  const [data, setData] = React.useState<ProductionReadiness | null>(null);
  const [error, setError] = React.useState('');
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!backendReachable) {
      setData(null);
      setError('');
      setState('disconnected');
      return;
    }
    let active = true;
    setData(null);
    setError('');
    setState('loading');
    getProductionReadiness()
      .then((payload) => {
        if (!active) return;
        try {
          setData(normalizeProductionReadiness(payload));
          setState('ready');
        } catch {
          setError(READINESS_MESSAGES.invalid);
          setState('error');
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(errorMessage(reason, READINESS_MESSAGES.network));
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [backendReachable, attempt]);

  const overall = data ? OVERALL_META[data.overall] : null;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', pb: PRISM.spacing(4), boxSizing: 'border-box' }}>
      <PageFrame
        eyebrow="Administration / assurance"
        title="Production readiness"
        subtitle="Server-reported configuration assessment from the authenticated admin API."
        badge={edition.toUpperCase()}
        action={
          <Chip
            icon={<AdminPanelSettings />}
            label={user?.role || 'admin'}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ color: NEBULA.text, borderColor: NEBULA.line }}
          />
        }
      >
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Alert
            severity="info"
            sx={{
              ...nebulaCardSx,
              borderColor: tokens.colors.rivicq[400],
              '& .MuiAlert-icon': { color: tokens.colors.rivicq[400] },
            }}
          >
            <Typography sx={{ color: NEBULA.text, fontSize: '0.8125rem', fontWeight: 600 }}>
              Configuration-only assessment; no live cloud, quantum or hardware probes were performed.
            </Typography>
          </Alert>

          {state === 'disconnected' && (
            <EmptyState
              title="Readiness unavailable"
              description="No authoritative backend is connected; readiness cannot be evaluated."
            />
          )}

          {state === 'loading' && (
            <SectionCard title="Loading readiness" caption="Querying the authenticated admin API.">
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                  Loading production readiness…
                </Typography>
              </Stack>
            </SectionCard>
          )}

          {state === 'error' && (
            <Alert
              severity="error"
              action={
                <Button
                  type="button"
                  size="small"
                  onClick={() => setAttempt((previous) => previous + 1)}
                  sx={{ ...proBlueContainedButtonSx, borderRadius: `${designSystem.radius.sm}px`, px: 2 }}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {state === 'ready' && data && overall && (
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Alert
                severity={overall.severity}
                sx={{
                  ...nebulaCardSx,
                  borderColor: overall.color,
                  '& .MuiAlert-icon': { color: overall.color },
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Typography sx={{ color: NEBULA.text, fontWeight: 700, fontSize: '0.9375rem' }}>
                    Overall: {overall.label}
                  </Typography>
                  <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem' }}>
                    Server-reported assessment; not a certification.
                  </Typography>
                </Stack>
              </Alert>

              <SectionCard title="Assessment metadata" caption="Values returned by the readiness endpoint.">
                <Stack spacing={1} sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: NEBULA.text, fontSize: '0.8125rem', wordBreak: 'break-word' }}>
                    Checked at: {data.checked_at}
                  </Typography>
                  <Box>
                    <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', mb: 0.75 }}>Sources</Typography>
                    {data.sources.length > 0 ? (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {data.sources.map((source) => (
                          <Chip
                            key={source}
                            label={source}
                            size="small"
                            variant="outlined"
                            sx={{ maxWidth: '100%', color: NEBULA.text, borderColor: NEBULA.line }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                        No evidence sources were reported.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </SectionCard>

              <Grid container spacing={2}>
                {data.groups.length === 0 ? (
                  <Grid item xs={12}>
                    <EmptyState
                      title="No readiness checks"
                      description="The readiness service returned no checks."
                    />
                  </Grid>
                ) : (
                  data.groups.map((group) => (
                    <Grid item xs={12} md={6} key={group.id}>
                      <SectionCard
                        title={group.label}
                        caption={`${group.checks.length} check(s)${group.status ? ` · ${statusLabel(group.status)}` : ''}`}
                      >
                        {group.checks.length === 0 ? (
                          <Typography sx={{ color: NEBULA.muted, fontSize: '0.8125rem' }}>
                            No checks were returned for this group.
                          </Typography>
                        ) : (
                          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                            {group.checks.map((check) => (
                              <Box
                                key={check.id}
                                sx={{
                                  p: 1.25,
                                  minWidth: 0,
                                  borderRadius: `${designSystem.radius.md}px`,
                                  border: `1px solid ${NEBULA.line}`,
                                  bgcolor: 'rgba(127, 127, 127, 0.04)',
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  justifyContent="space-between"
                                  alignItems="flex-start"
                                  flexWrap="wrap"
                                  useFlexGap
                                  sx={{ minWidth: 0, mb: 0.75 }}
                                >
                                  <Typography sx={{ color: NEBULA.text, fontWeight: 600, fontSize: '0.8125rem', minWidth: 0 }}>
                                    {check.label}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                                    <StatusChip status={check.status} />
                                    {check.maturity && statusLabel(check.maturity) !== statusLabel(check.status) && (
                                      <StatusChip key="maturity" status={check.maturity} />
                                    )}
                                  </Stack>
                                </Stack>
                                <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                  {check.detail}
                                </Typography>
                                <Typography sx={{ color: NEBULA.faint, fontSize: '0.6875rem', mt: 0.5, wordBreak: 'break-all' }}>
                                  Source: {check.source}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </SectionCard>
                    </Grid>
                  ))
                )}
              </Grid>
            </Stack>
          )}

          <SectionCard
            title="Maturity legend"
            caption="Labels are reported by the readiness API; no live verification is implied."
          >
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {MATURITY_LABELS.map((label) => (
                <StatusChip key={label} status={label} />
              ))}
            </Stack>
          </SectionCard>
        </Stack>
      </PageFrame>
    </Box>
  );
};

export default ProductionReadinessPage;
