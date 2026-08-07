import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography,
} from '@mui/material';
import {
  ArrowBack, CheckCircle, LinkOff, PlayArrow, Radar, Tune, Warning,
} from '@mui/icons-material';
import { tokens } from '../../theme/tokens';
import PageFrame from '../../components/PageFrame';
import {
  getModuleById, SEVERITY_COLORS, STATUS_COLORS, SecurityModuleConfig,
} from '../../config/modules';

const SecurityModulePage: React.FC = () => {
  const navigate = useNavigate();
  const { moduleId } = useParams<{ moduleId: string }>();
  const moduleConfig = moduleId ? getModuleById(moduleId) : undefined;

  if (!moduleConfig) {
    return (
      <PageFrame title="Module not found" badge="MODULES">
        <Alert severity="warning">No security module registered with id "{moduleId}".</Alert>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/modules')}>
          Back to Modules
        </Button>
      </PageFrame>
    );
  }

  const m: SecurityModuleConfig = moduleConfig;
  const Icon = m.icon;
  const scoreColor = m.score >= 80 ? tokens.colors.crypto.low : m.score >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical;

  return (
    <PageFrame
      eyebrow="SECURITY MODULE"
      title={m.name}
      subtitle={m.tagline}
      badge={m.category.toUpperCase()}
      action={
        <Button variant="contained" startIcon={<PlayArrow />} onClick={() => {}}>
          Run assessment
        </Button>
      }
      secondaryAction={
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/modules')}>
          All modules
        </Button>
      }
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {m.kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="caption" sx={{ color: tokens.colors.text.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{kpi.label}</Typography>
                <Typography variant="h4" fontWeight={900} sx={{ color: kpi.color || tokens.colors.text.primary, mt: 0.5 }}>{kpi.value}</Typography>
                {kpi.delta && (
                  <Typography variant="caption" sx={{ color: tokens.colors.crypto.low }}>{kpi.delta}</Typography>
                )}
                {kpi.hint && (
                  <Typography variant="caption" sx={{ color: tokens.colors.text.muted }}> · {kpi.hint}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!m.connected && (
        <Alert severity="info" icon={<LinkOff />} sx={{ mb: 3 }}>
          Live connector for {m.name} is not configured yet. Data below is seeded baseline data from the module registry. Connect your provider to stream real findings.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Avatar sx={{ bgcolor: `${m.color}22`, color: m.color }}><Icon /></Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Module overview</Typography>
                </Box>
                <Chip
                  label={`${m.score}%`}
                  sx={{ bgcolor: `${scoreColor}22`, color: scoreColor, fontWeight: 800 }}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 2 }}>
                {m.description}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Tune sx={{ fontSize: 18, color: tokens.colors.text.secondary }} />
                <Typography variant="subtitle2" sx={{ color: tokens.colors.text.primary }}>Capabilities</Typography>
              </Box>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {m.capabilities.map((cap) => (
                  <Grid item key={cap}>
                    <Chip size="small" icon={<CheckCircle sx={{ fontSize: 14, color: tokens.colors.crypto.low }} />} label={cap} variant="outlined" />
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Radar sx={{ fontSize: 18, color: tokens.colors.text.secondary }} />
                <Typography variant="subtitle2" sx={{ color: tokens.colors.text.primary }}>Frameworks & standards</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {m.frameworks.map((fw) => (
                  <Chip key={fw} size="small" label={fw} color="secondary" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: tokens.colors.text.primary, mb: 2 }}>Coverage score</Typography>
              <LinearProgress
                variant="determinate"
                value={m.score}
                sx={{ height: 10, mb: 1, '& .MuiLinearProgress-bar': { backgroundColor: scoreColor } }}
              />
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 3 }}>
                {m.score >= 80 ? 'Strong posture. Continue monitoring for drift.' : m.score >= 60 ? 'Moderate posture. Prioritize the open findings below.' : 'Weak posture. High-risk findings require immediate attention.'}
              </Typography>
              <Typography variant="subtitle2" sx={{ color: tokens.colors.text.primary, mb: 1 }}>Integrations</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {m.integrations.map((it) => (
                  <Chip key={it} size="small" label={it} variant="outlined" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning sx={{ color: tokens.colors.rivicq[300] }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Findings</Typography>
            </Box>
            <Chip size="small" label={`${m.findings.length} open items`} color="error" />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Finding', 'Reference', 'Severity', 'Status', 'Scope'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${tokens.colors.border}`, color: tokens.colors.text.secondary, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.findings.map((f) => {
                  const sevColor = SEVERITY_COLORS[f.severity];
                  const statColor = STATUS_COLORS[f.status];
                  return (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                      <td style={{ padding: '10px 12px', color: tokens.colors.text.primary, fontWeight: 600 }}>{f.title}</td>
                      <td style={{ padding: '10px 12px', fontFamily: tokens.typography.mono, fontSize: 12, color: tokens.colors.text.secondary }}>{f.ref}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip size="small" label={f.severity.toUpperCase()} sx={{ bgcolor: `${sevColor}22`, color: sevColor, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip size="small" label={f.status.toUpperCase()} sx={{ bgcolor: `${statColor}22`, color: statColor, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: tokens.typography.mono, fontSize: 12, color: tokens.colors.text.secondary }}>{f.scope}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </PageFrame>
  );
};

export default SecurityModulePage;
