import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import MemoryIcon from '@mui/icons-material/Memory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LockIcon from '@mui/icons-material/Lock';

const ossFeatures = [
  'Cryptographic asset discovery via eBPF',
  'CBOM generation (CycloneDX format)',
  'Kubernetes & container scanning',
  'Basic quantum vulnerability detection',
  'Dashboard, Assets, Scanner, Analytics',
  'REST API + OpenAPI docs',
  'Apache 2.0 licensed',
];

const enterpriseFeatures = [
  'Everything in OSS, plus:',
  'Multi-cloud orchestration (GCP, AWS, IBM)',
  'IBM HPCS BYOK integration',
  'AWS CloudHSM / KMS integration',
  'Quantum attestation with risk scores',
  'BSI TR-02102 / eIDAS 2.0 / DORA / FIPS 140-3 compliance reports',
  'Multi-tenancy & org-scoped isolation',
  'Cloud Armor WAF & GKE Autopilot deployment',
  'SLA-backed commercial support',
];

const complianceFrameworks = [
  { label: 'BSI TR-02102', color: '#1976d2' },
  { label: 'eIDAS 2.0', color: '#388e3c' },
  { label: 'DORA', color: '#f57c00' },
  { label: 'FIPS 140-3', color: '#7b1fa2' },
  { label: 'NIST PQC', color: '#c62828' },
  { label: 'ISO 27001', color: '#00838f' },
];

const ProjectPreview: React.FC = () => {
  return (
    <Box sx={{ py: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
      {/* Hero */}
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <LockIcon sx={{ fontSize: 64, color: '#fff' }} />
          </Box>
          <Typography variant="h2" sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
            CryptoBOM SaaS
          </Typography>
          <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.85)', mb: 3 }}>
            Cryptographic Bill of Materials for Banking &amp; Financial Services
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)', maxWidth: 720, mx: 'auto', mb: 4 }}>
            Discover, inventory, and govern every cryptographic asset across your hybrid cloud.
            Detect quantum-vulnerable algorithms, generate compliance reports, and orchestrate
            PQC migration — all from a single pane of glass.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {complianceFrameworks.map((f) => (
              <Chip
                key={f.label}
                label={f.label}
                sx={{ bgcolor: '#fff', color: f.color, fontWeight: 700, fontSize: '0.8rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* OSS vs Enterprise comparison */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* OSS Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 6 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon sx={{ color: '#667eea', mr: 1 }} />
                  <Typography variant="h5" fontWeight={700}>
                    CryptoBOM OSS
                  </Typography>
                  <Chip label="Free" size="small" color="primary" sx={{ ml: 'auto' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Apache 2.0 — deploy anywhere, contribute freely.
                </Typography>
                <List dense>
                  {ossFeatures.map((f) => (
                    <ListItem key={f} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon sx={{ color: '#667eea', fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  sx={{ mt: 3 }}
                  href="https://github.com/rivic-q/cryptobom-saas"
                  target="_blank"
                  rel="noopener"
                >
                  View on GitHub
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Enterprise Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 6, border: '2px solid #667eea' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccountBalanceIcon sx={{ color: '#764ba2', mr: 1 }} />
                  <Typography variant="h5" fontWeight={700}>
                    CryptoBOM Enterprise
                  </Typography>
                  <Chip label="MVP" size="small" color="secondary" sx={{ ml: 'auto' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Production-ready for regulated banking &amp; financial services environments.
                </Typography>
                <List dense>
                  {enterpriseFeatures.map((f) => (
                    <ListItem key={f} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon sx={{ color: '#764ba2', fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={f}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: f.startsWith('Everything') ? 700 : 400,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3, bgcolor: '#667eea', '&:hover': { bgcolor: '#764ba2' } }}
                  href="https://github.com/rivic-q/cryptobom-saas/blob/master/docs/ENTERPRISE_DEPLOYMENT.md"
                  target="_blank"
                  rel="noopener"
                >
                  Deployment Guide
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Architecture highlight */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 6 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#667eea' }}>
            Enterprise Architecture
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: <CloudIcon sx={{ color: '#1976d2' }} />,
                title: 'GCP Primary',
                desc: 'GKE Autopilot + Cloud SQL + Cloud Armor WAF + Artifact Registry',
              },
              {
                icon: <LockIcon sx={{ color: '#388e3c' }} />,
                title: 'HSM-Backed Keys',
                desc: 'IBM HPCS (BYOK) or AWS CloudHSM v2 for key operations',
              },
              {
                icon: <MemoryIcon sx={{ color: '#f57c00' }} />,
                title: 'Quantum Attestation',
                desc: 'Per-asset PQC-readiness detection with NIST PQC migration roadmap',
              },
              {
                icon: <VerifiedUserIcon sx={{ color: '#7b1fa2' }} />,
                title: 'Compliance Reporting',
                desc: 'Automated reports for BSI, eIDAS 2.0, DORA, FIPS 140-3, ISO 27001',
              },
            ].map((item) => (
              <Grid item xs={12} sm={6} key={item.title}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {item.icon}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.3)' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            CryptoBOM SaaS v1.0.0-enterprise-mvp · RivicQ ·{' '}
            <a
              href="https://github.com/rivic-q/cryptobom-saas"
              style={{ color: 'rgba(255,255,255,0.8)' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ProjectPreview;
