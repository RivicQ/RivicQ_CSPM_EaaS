import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, Divider, useTheme } from '@mui/material';
import { ArrowForward, Lock, Security, WorkspacePremium, CloudQueue, Psychology, Storage, Shield } from '@mui/icons-material';
import { setEditionPreference, Edition } from '../config/editions';
import BrandLogo from '../components/BrandLogo';
import designSystem from '../theme/designSystem';

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
      subtitle: 'Limited five-BOM engine: CBOM, SBOM, local QBOM, TLS API hygiene, pipeline stages 1–6, CLI, and GitHub Action.',
      icon: <Security sx={{ fontSize: 34 }} />,
      edition: 'community' as Edition,
      accent: '#c4783a',
      highlights: ['CBOM + SBOM + local QBOM', 'API security from TLS scans', 'Discover → mitigate → report', 'No AIBOM, IBOM, SSO, or DORA pack'],
      action: 'Continue with Community',
    },
    {
      title: 'RivicQ Professional',
      subtitle: 'Cloud posture, conformance packs, and the full security module suite for growing teams.',
      icon: <Shield sx={{ fontSize: 34 }} />,
      edition: 'professional' as Edition,
      accent: '#d97706',
      highlights: ['CSPM & conformance packs', 'AIBOM / IBOM workspace', 'Multi-cloud accounts', 'Threat & vuln management'],
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
  const cardBg = isDark ? '#17150f' : '#fffdf8';

  return (
    <Box sx={{ minHeight: '100vh', background: pageBg, py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo />
        </Box>
        <Stack spacing={2} sx={{ mb: 4, textAlign: 'center' }}>
          <Chip icon={<Lock />} label="Edition Selection" color="primary" sx={{ alignSelf: 'center', fontWeight: 600 }} />
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
            Choose your RivicQ workspace
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 900, mx: 'auto' }}>
            Start free with Community (CBOM, SBOM, local QBOM), grow into Professional for security modules, and license Enterprise for AIBOM, IBOM, HSM connectors, and the GRC pack. QSIC is declared research hardware — not a shipped chip.
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
                <CardContent sx={{ p: 4 }}>
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
            <Card sx={{ height: '100%', bgcolor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <CardContent>
                <Storage color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Community quick start</Typography>
                <Typography variant="body2" color="text.secondary">Login and scan assets locally without cloud credentials.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.18)' }}>
              <CardContent>
                <CloudQueue color="secondary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Professional unlocks</Typography>
                <Typography variant="body2" color="text.secondary">Cloud posture, conformance packs, and the full module suite.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.18)' }}>
              <CardContent>
                <Psychology color="success" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Enterprise extends</Typography>
                <Typography variant="body2" color="text.secondary">Quantum attestation, HSM, SSO, and executive reporting.</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            What gets locked in Community
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cloud posture, conformance packs, live Kubernetes attach, DORA evidence pack, AIBOM/IBOM connectors, PKCS#11 HSM, quantum runtime, and multi-cloud reporting stay in Professional and Enterprise. Community still scans websites, hosts, IPs, servers, and declared pods, and shows five-BOM layers with locked Enterprise tiles.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default EditionSwitcher;
