import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import { ArrowForward, Lock, Security, WorkspacePremium, CloudQueue, Psychology, Storage, Shield } from '@mui/icons-material';
import { setEditionPreference, Edition } from '../config/editions';
import BrandLogo from '../components/BrandLogo';
import NebulaBackdrop from '../components/brand/NebulaBackdrop';
import {
  ARCHIFY_FONTS,
  NEBULA,
  archifyAuraLayersSx,
  archifyEyebrowSx,
  archifyTitleSx,
  nebulaPanelSx,
} from '../theme/nebulaSurfaces';

const EditionSwitcher: React.FC = () => {
  const navigate = useNavigate();

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
      accent: NEBULA.accent,
      highlights: ['CBOM + SBOM CSPM', 'API security from TLS scans', 'Discover → mitigate → report', 'No QBOM, HBOM, AIBOM, IBOM, SSO, or DORA pack'],
      action: 'Continue with Community',
    },
    {
      title: 'RivicQ Professional',
      subtitle: 'Cloud posture, conformance packs, and the full security module suite for growing teams.',
      icon: <Shield sx={{ fontSize: 34 }} />,
      edition: 'professional' as Edition,
      accent: NEBULA.accentSoft,
      highlights: ['CSPM & conformance packs', 'Security module suite', 'Multi-cloud accounts', 'Threat & vuln management'],
      action: 'Continue with Professional',
    },
    {
      title: 'RivicQ Enterprise',
      subtitle: 'Licensed control plane: SSO, audit, DORA pack, PKCS#11/HSM, optional quantum runtime, GRC connectors. Not granted by cloning GitHub.',
      icon: <WorkspacePremium sx={{ fontSize: 34 }} />,
      edition: 'enterprise' as Edition,
      accent: '#22c55e',
      highlights: ['HSM PKCS#11 + quantum connector', 'SSO, audit & RBAC', 'Governance evidence pack', 'Continuous production monitoring'],
      action: 'Continue with Enterprise',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: NEBULA.ink, color: NEBULA.text, py: 8, position: 'relative', overflow: 'hidden' }}>
      <NebulaBackdrop />
      <Box aria-hidden sx={archifyAuraLayersSx.radial} />
      <Box aria-hidden sx={archifyAuraLayersSx.grid} />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo dark />
        </Box>
        <Stack spacing={2} sx={{ mb: 4, textAlign: 'center' }} alignItems="center">
          <Chip
            icon={<Lock />}
            label="Edition selection"
            sx={{
              fontFamily: ARCHIFY_FONTS.mono,
              fontWeight: 600,
              bgcolor: NEBULA.accent,
              color: '#fff',
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
          <Typography component="h1" sx={{ ...archifyTitleSx, fontSize: { xs: '2.2rem', md: '3rem' }, maxWidth: 720 }}>
            Choose your RivicQ workspace
          </Typography>
          <Typography sx={{ color: 'rgba(209,213,219,0.92)', maxWidth: 720, lineHeight: 1.65 }}>
            Start free with Community Cryptographic Security Posture Management (CBOM + SBOM), grow into Professional for security modules, and license Enterprise for QBOM, HBOM, AIBOM, IBOM, HSM connectors, and the GRC pack. QSIC is declared research hardware — not a shipped chip.
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {cards.map((card, i) => (
            <Grid item xs={12} md={4} key={card.title}>
              <Box
                sx={{
                  ...nebulaPanelSx,
                  p: 3,
                  height: '100%',
                  borderColor: `${card.accent}55`,
                  transition: 'border-color 0.18s ease',
                  '&:hover': { borderColor: `${card.accent}aa` },
                }}
              >
                <Stack spacing={2}>
                  <Typography sx={{ fontFamily: ARCHIFY_FONTS.mono, fontSize: '0.6875rem', fontWeight: 600, color: card.accent, letterSpacing: '0.04em' }}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Box sx={{ color: card.accent }}>{card.icon}</Box>
                  <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(209,213,219,0.88)', lineHeight: 1.55 }}>
                    {card.subtitle}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {card.highlights.map((item) => (
                      <Chip
                        key={item}
                        size="small"
                        label={item}
                        variant="outlined"
                        sx={{ borderColor: 'rgba(255,255,255,0.18)', color: NEBULA.muted }}
                      />
                    ))}
                  </Stack>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => chooseEdition(card.edition)}
                    sx={{
                      alignSelf: 'flex-start',
                      mt: 1,
                      borderRadius: '10px',
                      bgcolor: i === 0 ? '#fff' : NEBULA.accent,
                      color: i === 0 ? '#0a0b0d' : '#fff',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { bgcolor: NEBULA.accent, color: '#fff' },
                    }}
                  >
                    {card.action}
                  </Button>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Typography sx={{ ...archifyEyebrowSx, mt: 6, mb: 1.5 }}>What each path unlocks</Typography>
        <Grid container spacing={1.5}>
          {[
            { icon: <Storage color="primary" />, title: 'Community quick start', body: 'Login and scan assets locally without cloud credentials.' },
            { icon: <CloudQueue sx={{ color: NEBULA.accentSoft }} />, title: 'Professional unlocks', body: 'Cloud posture, conformance packs, and the full module suite.' },
            { icon: <Psychology sx={{ color: '#22c55e' }} />, title: 'Enterprise extends', body: 'Quantum attestation, HSM, SSO, and executive reporting.' },
          ].map((item) => (
            <Grid item xs={12} md={4} key={item.title}>
              <Box sx={{ ...nebulaPanelSx, p: 2.5, height: '100%' }}>
                {item.icon}
                <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, mt: 1, mb: 0.5 }}>{item.title}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(209,213,219,0.88)' }}>{item.body}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ ...nebulaPanelSx, mt: 3, p: 3 }}>
          <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, mb: 1 }}>
            What gets locked in Community
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(209,213,219,0.88)', lineHeight: 1.6 }}>
            Cloud posture, conformance packs, live Kubernetes attach, DORA evidence pack, QBOM/HBOM/AIBOM/IBOM, PKCS#11 HSM, quantum runtime, and multi-cloud reporting stay on Enterprise. Community still scans websites, hosts, IPs, servers, and declared pods, and shows CBOM/SBOM Cryptographic Security Posture Management with locked Enterprise tiles.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default EditionSwitcher;
