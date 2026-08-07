import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Typography,
} from '@mui/material';
import {
  Assessment, CheckCircle, FactCheck, PlayArrow, Warning,
} from '@mui/icons-material';
import { tokens } from '../../theme/tokens';
import PageFrame from '../../components/PageFrame';
import { postureService } from '../../services/api';

const PACKS = [
  {
    id: 'cis-aws',
    name: 'CIS AWS Foundations v1.5',
    scope: 'AWS Production · Development',
    score: 72, total: 92, passed: 66, failed: 18, pending: 8,
    color: tokens.colors.crypto.info,
  },
  {
    id: 'nist-800-53',
    name: 'NIST SP 800-53 Rev 5',
    scope: 'GCP Core · Hybrid workloads',
    score: 81, total: 148, passed: 120, failed: 16, pending: 12,
    color: tokens.colors.crypto.quantum,
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    scope: 'All in-scope accounts',
    score: 68, total: 105, passed: 71, failed: 21, pending: 13,
    color: tokens.colors.crypto.medium,
  },
  {
    id: 'pci-dss',
    name: 'PCI DSS 4.0',
    scope: 'Cardholder data environments',
    score: 57, total: 96, passed: 55, failed: 29, pending: 12,
    color: tokens.colors.crypto.high,
  },
  {
    id: 'cis-azure',
    name: 'CIS Azure v2.0',
    scope: 'Azure East US',
    score: 84, total: 88, passed: 74, failed: 6, pending: 8,
    color: tokens.colors.crypto.low,
  },
  {
    id: 'iso-27001',
    name: 'ISO 27001:2022',
    scope: 'Enterprise-wide',
    score: 75, total: 114, passed: 86, failed: 12, pending: 16,
    color: tokens.colors.crypto.info,
  },
];

const CONTROLS = [
  { id: 'CIS-AWS-1.20', title: 'S3 buckets must not allow public write access', pack: 'CIS AWS Foundations', severity: 'critical', status: 'fail', resources: 3 },
  { id: 'CIS-AWS-1.16', title: 'Ensure IAM policies do not grant wildcard Actions on KMS', pack: 'CIS AWS Foundations', severity: 'critical', status: 'fail', resources: 2 },
  { id: 'CIS-AWS-4.3', title: 'Ensure security groups restrict inbound SSH to 0.0.0.0/0', pack: 'CIS AWS Foundations', severity: 'high', status: 'fail', resources: 1 },
  { id: 'NIST-800-53-CM-6', title: 'Configuration settings for cloud services use secure defaults', pack: 'NIST SP 800-53', severity: 'high', status: 'fail', resources: 4 },
  { id: 'NIST-800-53-SC-28', title: 'Protection of information at rest with strong cryptography', pack: 'NIST SP 800-53', severity: 'medium', status: 'fail', resources: 6 },
  { id: 'SOC2-CC6.1', title: 'Logical and physical access controls to protect assets', pack: 'SOC 2 Type II', severity: 'high', status: 'fail', resources: 5 },
  { id: 'PCI-3.4', title: 'PAN is rendered unreadable anywhere it is stored', pack: 'PCI DSS 4.0', severity: 'critical', status: 'fail', resources: 2 },
  { id: 'CIS-AZ-3.2', title: 'Ensure Azure Key Vault soft-delete and purge protection enabled', pack: 'CIS Azure', severity: 'medium', status: 'fail', resources: 1 },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: tokens.colors.crypto.critical,
  high: tokens.colors.crypto.high,
  medium: tokens.colors.crypto.medium,
  low: tokens.colors.crypto.low,
};

const ConformancePacks: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['conformance-packs'],
    queryFn: () => postureService.getConformancePacks().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const livePacks = data?.dashboards;
  const packs = PACKS.map((p) => {
    const live = livePacks?.find((d: any) => p.id.startsWith(d.framework));
    if (live) {
      return { ...p, score: live.score ?? p.score, passed: live.passed_controls ?? p.passed, failed: live.failed_controls ?? p.failed, pending: live.pending_controls ?? p.pending };
    }
    return p;
  });

  return (
    <PageFrame
      title="Conformance Packs"
      subtitle="Continuously validate cloud infrastructure against industry-standard security, compliance, and audit frameworks."
      badge="CSPM"
      action={
        <Button variant="contained" startIcon={<PlayArrow />} onClick={() => {}}>
          Run all assessments
        </Button>
      }
    >
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {packs.map((pack) => (
          <Grid item xs={12} sm={6} md={4} key={pack.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: `${pack.color}22`, color: pack.color }}><Assessment /></Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: tokens.colors.text.primary }} noWrap>{pack.name}</Typography>
                    <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }} noWrap>{pack.scope}</Typography>
                  </Box>
                  <Chip
                    label={`${pack.score}%`}
                    size="small"
                    sx={{ bgcolor: `${pack.score >= 80 ? tokens.colors.crypto.low : pack.score >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical}22`, color: pack.score >= 80 ? tokens.colors.crypto.low : pack.score >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical, fontWeight: 800 }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pack.score}
                  sx={{ height: 8, mb: 2, '& .MuiLinearProgress-bar': { backgroundColor: pack.score >= 80 ? tokens.colors.crypto.low : pack.score >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical } }}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip size="small" icon={<CheckCircle sx={{ fontSize: 14 }} />} label={`${pack.passed} passed`} sx={{ color: tokens.colors.crypto.low, bgcolor: `${tokens.colors.crypto.low}18` }} />
                  <Chip size="small" icon={<Warning sx={{ fontSize: 14 }} />} label={`${pack.failed} failed`} sx={{ color: tokens.colors.crypto.critical, bgcolor: `${tokens.colors.crypto.critical}18` }} />
                  <Chip size="small" label={`${pack.pending} pending`} variant="outlined" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.muted }}>{pack.total} controls</Typography>
                  <Button size="small" variant="outlined">Run assessment</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FactCheck sx={{ color: tokens.colors.rivicq[400] }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Failed Controls</Typography>
            </Box>
            <Chip size="small" label={`${CONTROLS.length} findings`} color="error" />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Control', 'Control ID', 'Pack', 'Severity', 'Status', 'Resources'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${tokens.colors.border}`, color: tokens.colors.text.secondary, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONTROLS.map((c) => {
                  const color = SEVERITY_COLORS[c.severity] || tokens.colors.text.muted;
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                      <td style={{ padding: '10px 12px', color: tokens.colors.text.primary, fontWeight: 600 }}>{c.title}</td>
                      <td style={{ padding: '10px 12px', fontFamily: tokens.typography.mono, fontSize: 12, color: tokens.colors.text.secondary }}>{c.id}</td>
                      <td style={{ padding: '10px 12px', color: tokens.colors.text.secondary }}>{c.pack}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip size="small" label={c.severity.toUpperCase()} sx={{ bgcolor: `${color}22`, color, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip size="small" label="FAIL" sx={{ bgcolor: `${tokens.colors.crypto.critical}22`, color: tokens.colors.crypto.critical, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 12px', color: tokens.colors.text.secondary }}>{c.resources}</td>
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

export default ConformancePacks;
