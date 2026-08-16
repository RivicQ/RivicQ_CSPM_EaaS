import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Skeleton, Stack, Typography, useTheme,
} from '@mui/material';
import { CheckCircle, ErrorOutline, GitHub, Lock, ArrowForward, Shield, Download } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { tokens } from '../../theme/tokens';
import designSystem from '../../theme/designSystem';
import { LoadingButton } from '../ui';
import type { NormalizedCbomReport } from '../../utils/cbomNormalize';
import { downloadCbomBundle } from '../../utils/exportCbom';

export type HomeScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

export type HomeScanReportData = NormalizedCbomReport;

type HomeScanReportProps = {
  status: HomeScanStatus;
  progress: number;
  stage?: string;
  report?: HomeScanReportData | null;
  errorMessage?: string | null;
  onOpenApp: () => void;
  onRegister: () => void;
};

const STAGES = ['Connecting', 'Discovering files', 'Analyzing crypto', 'Building CBOM', 'Quantifying risk'];

const HomeScanReport: React.FC<HomeScanReportProps> = ({
  status, progress, stage, report, errorMessage, onOpenApp, onRegister,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.9)';
  const activeStage = Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length));

  return (
    <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} sx={{ mb: 6 }}>
      <Card sx={{ bgcolor: cardBg, border: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <GitHub sx={{ color: tokens.colors.rivicq[500] }} />
            <Typography variant="h6" fontWeight={800}>CBOM scan</Typography>
            {status === 'scanning' && <Chip size="small" label={stage || 'Running'} color="primary" />}
            {status === 'complete' && <Chip size="small" label="Completed" color="success" />}
            {status === 'error' && <Chip size="small" label="Could not complete" />}
            {report?.source === 'public-github' && <Chip size="small" variant="outlined" label="Public GitHub analyzer" />}
            {report?.source === 'engine' && <Chip size="small" variant="outlined" label="RivicQ engine" />}
          </Stack>

          {status === 'scanning' && (
            <Box>
              <LinearProgress variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} sx={{ height: 8, borderRadius: 4, mb: 2 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {STAGES.map((s, i) => (
                  <Chip
                    key={s}
                    size="small"
                    icon={i <= activeStage ? <CheckCircle sx={{ fontSize: 14 }} /> : undefined}
                    label={s}
                    variant={i <= activeStage ? 'filled' : 'outlined'}
                    color={i <= activeStage ? 'primary' : 'default'}
                  />
                ))}
              </Stack>
              <Grid container spacing={2}>
                {[0, 1, 2].map((i) => (
                  <Grid item xs={12} sm={4} key={i}>
                    <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {status === 'complete' && report && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary">Security score</Typography>
                    <Typography variant="h5" fontWeight={900} sx={{ color: tokens.colors.rivicq[600] }}>{report.score ?? '—'}</Typography>
                  </Box>
                </Grid>
                {[
                  { k: 'critical', label: 'Critical', c: tokens.colors.crypto.critical },
                  { k: 'high', label: 'High', c: tokens.colors.crypto.high },
                  { k: 'medium', label: 'Medium', c: tokens.colors.crypto.medium },
                ].map((s) => (
                  <Grid item xs={6} sm={3} key={s.k}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="h5" fontWeight={900} sx={{ color: s.c }}>
                        {(report.severity as Record<string, number | undefined>)?.[s.k] ?? 0}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {report.quantumRisk && (
                <Alert icon={<Shield fontSize="inherit" />} severity="info" sx={{ mb: 2 }}>
                  Quantum exposure: <strong>{report.quantumRisk}</strong>
                  {report.defaultBranch && <> · branch {report.defaultBranch}</>}
                  {report.fileCount != null && <> · {report.fileCount} files analyzed</>}
                </Alert>
              )}
              {(report.algorithms?.length || 0) > 0 ? (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Cryptographic inventory
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {report.algorithms.slice(0, 12).map((a) => (
                      <Chip
                        key={a.id || a.algorithm}
                        size="small"
                        icon={a.quantumSafe ? <CheckCircle sx={{ fontSize: 14 }} /> : <Lock sx={{ fontSize: 14 }} />}
                        label={`${a.algorithm}${a.keySize ? ` · ${a.keySize}-bit` : ''} · ${a.riskLevel}`}
                        color={a.quantumSafe ? 'success' : a.riskLevel === 'CRITICAL' || a.riskLevel === 'HIGH' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Mapped to BSI TR-02102-1, DORA Art. 9, and eIDAS 2.0. Example:{' '}
                    {report.algorithms[0].bsiRef} · {report.algorithms[0].doraRef} · {report.algorithms[0].eidasRef}
                  </Typography>
                </Stack>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  No cryptographic material matched in the sampled public files. Sign in for a full engine scan of secrets, TLS, and dependencies.
                </Alert>
              )}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button variant="contained" endIcon={<ArrowForward />} onClick={onOpenApp} sx={{ backgroundImage: designSystem.gradient.brand }}>
                  Open full report
                </Button>
                <LoadingButton variant="outlined" startIcon={<Download />} onClick={() => downloadCbomBundle(report)}>
                  Export JSON + PDF
                </LoadingButton>
              </Stack>
            </Box>
          )}

          {status === 'error' && (
            <Stack spacing={2}>
              <Alert severity="warning" icon={<ErrorOutline fontSize="inherit" />}>
                {errorMessage || 'Live scanning could not finish. Paste a public GitHub URL, or sign in to run a full engine scan. We never show fabricated findings.'}
              </Alert>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button variant="contained" endIcon={<ArrowForward />} onClick={onRegister} sx={{ backgroundImage: designSystem.gradient.brand }}>
                  Start free — run a real scan
                </Button>
                <Button variant="outlined" startIcon={<GitHub />} onClick={onOpenApp}>
                  Open the scanner
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HomeScanReport;
