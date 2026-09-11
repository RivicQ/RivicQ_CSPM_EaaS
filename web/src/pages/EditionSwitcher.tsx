import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, Divider, useTheme } from '@mui/material';
import { ArrowForward, Lock, Security, WorkspacePremium, CloudQueue, Psychology, Storage, Shield } from '@mui/icons-material';
import { setEditionPreference, Edition } from '../config/editions';
import BrandLogo from '../components/BrandLogo';
import designSystem from '../theme/designSystem';
import NebulaBackdrop from '../components/brand/NebulaBackdrop';

const EditionSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const chooseEdition = (edition: Edition) => {
    setEditionPreference(edition);
    navigate('/login', { replace: true });
  };

  const cards = [
    {
      title: 'RivicQ Community',
      subtitle: 'Cryptographic Security Posture Management: CBOM, SBOM, TLS API hygiene, pipeline stages 1–6, CLI, and GitHub Action.',
      icon: <Security sx={{ fontSize: 34 }} />,
      edition: 'community' as Edition,
      accent: '#7c3aed',
      highlights: ['CBOM + SBOM CSPM', 'API security from TLS scans', 'Discover → mitigate → report', 'No QBOM, HBOM, AIBOM, IBOM, SSO, or DORA pack'],
      action: 'Continue with Community',
    },
    {
      title: 'RivicQ Professional',
      subtitle: 'Cloud posture, conformance packs, and the full security module suite for growing teams.',
      icon: <Shield sx={{ fontSize: 34 }} />,
      edition: 'professional' as Edition,
      accent: '#a78bfa',
      highlights: ['CSPM & conformance packs', 'Security module suite', 'Multi-cloud accounts', 'Threat & vuln management'],
      action: 'Continue with Professional',
    },
    {
      title: 'RivicQ Enterprise',
      subtitle: 'Licensed control plane: SSO, audit, DORA pack, PKCS#11/HSM, optional quantum runtime, GRC connectors. Not granted by cloning GitHub.',
      icon: <WorkspacePremium sx={{ fontSize: 34 }} />,
      edition: 'enterprise' as Edition,
      accent: '#198038',
      highlights: ['HSM PKCS#11 + quantum connector', 'SSO, audit & RBAC', 'Governance evidence pack', 'Continuous production monitoring'],
      action: 'Continue with Enterprise',
    },
  ];

  const pageBg = isDark ? designSystem.gradient.meshDark : designSystem.gradient.meshLight;
  const cardBg = '#0a0a0f';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', background: pageBg, py: 8, position: 'relative', overflow: 'hidden' }}>
      {isDark && <NebulaBackdrop />}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo dark={isDark} />
        </Box>
        <Stack spacing={2} sx={{ mb: 4, textAlign: 'center' }}>
          <Chip icon={<Lock />} label="Edition Selection" color="primary" sx={{ alignSelf: 'center', fontWeight: 600 }} />
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
            Choose your RivicQ workspace
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 900, mx: 'auto' }}>
            Start free with Community Cryptographic Security Posture Management (CBOM + SBOM), grow into Professional for security modules, and license Enterprise for QBOM, HBOM, AIBOM, IBOM, HSM connectors, and the GRC pack. QSIC is declared research hardware — not a shipped chip.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {cards.map((card) => (
            <Grid item xs={12} md={4} key={card.title}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: `1px solid ${card.accent}44`,
                  background: cardBg,
                  transition: 'border-color 0.15s ease',
                  '&:hover': { transform: 'none', boxShadow: 'none', borderColor: `${card.accent}88` },
                }}
              >
                <CardContent sx={{ p: 4, color: '#fff' }}>
                  <Stack spacing={2}>
                    <Box sx={{ color: card.accent }}>
                      {card.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {card.highlights.map((item) => (
                        <Chip key={item} size="small" label={item} variant="outlined" />
                      ))}
                    </Stack>
                    <Button
                      variant="contained"
                      endIcon={<ArrowForward />}
                      onClick={() => chooseEdition(card.edition)}
                      sx={{ alignSelf: 'flex-start', mt: 1 }}
                    >
                      {card.action}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Grid container spacing={2} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' }}>
              <CardContent>
                <Storage color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Community quick start</Typography>
                <Typography variant="body2" color="text.secondary">Login and scan assets locally without cloud credentials.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' }}>
              <CardContent>
                <CloudQueue color="secondary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Professional unlocks</Typography>
                <Typography variant="body2" color="text.secondary">Cloud posture, conformance packs, and the full module suite.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' }}>
              <CardContent>
                <Psychology color="success" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Enterprise extends</Typography>
                <Typography variant="body2" color="text.secondary">Quantum attestation, HSM, SSO, and executive reporting.</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, borderRadius: 3, border: '1px solid #1f1f2e', bgcolor: '#0a0a0f', color: '#fff' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            What gets locked in Community
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cloud posture, conformance packs, live Kubernetes attach, DORA evidence pack, QBOM/HBOM/AIBOM/IBOM, PKCS#11 HSM, quantum runtime, and multi-cloud reporting stay on Enterprise. Community still scans websites, hosts, IPs, servers, and declared pods, and shows CBOM/SBOM Cryptographic Security Posture Management with locked Enterprise tiles.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default EditionSwitcher;
