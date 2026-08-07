import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, Divider } from '@mui/material';
import { ArrowForward, Lock, Security, WorkspacePremium, CloudQueue, Psychology, Storage, Shield } from '@mui/icons-material';
import { setEditionPreference, Edition } from '../config/editions';
import BrandLogo from '../components/BrandLogo';

const EditionSwitcher: React.FC = () => {
  const navigate = useNavigate();

  const chooseEdition = (edition: Edition) => {
    setEditionPreference(edition);
    navigate('/login', { replace: true });
  };

  const cards = [
    {
      title: 'RivicQ Community',
      subtitle: 'Core CBOM scanning, dashboard, auth, and local operations. Free for open source teams.',
      icon: <Security sx={{ fontSize: 34 }} />,
      edition: 'community' as Edition,
      accent: '#78a9ff',
      highlights: ['CBOM scan basics', 'Dashboard & auth', 'GitHub & CI', 'Local workflows'],
      action: 'Continue with Community',
    },
    {
      title: 'RivicQ Professional',
      subtitle: 'Cloud posture, conformance packs, and the full security module suite for growing teams.',
      icon: <Shield sx={{ fontSize: 34 }} />,
      edition: 'professional' as Edition,
      accent: '#d4af37',
      highlights: ['CSPM & conformance packs', 'AI / Identity / Supply chain', 'Multi-cloud accounts', 'Threat & vuln management'],
      action: 'Continue with Professional',
    },
    {
      title: 'RivicQ Enterprise',
      subtitle: 'CISO-level controls, PQC / quantum attestation, HSM, SSO, and executive reporting.',
      icon: <WorkspacePremium sx={{ fontSize: 34 }} />,
      edition: 'enterprise' as Edition,
      accent: '#0f62fe',
      highlights: ['Quantum & HSM (IBM/HPCS)', 'SSO, audit & RBAC', 'Terraform & IaC scanning', 'Executive analytics'],
      action: 'Continue with Enterprise',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(15,98,254,0.20), transparent 26%), linear-gradient(180deg, #050a18 0%, #0b1530 100%)', py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo dark />
        </Box>
        <Stack spacing={2} sx={{ mb: 4, textAlign: 'center' }}>
          <Chip icon={<Lock />} label="Edition Selection" color="primary" sx={{ alignSelf: 'center' }} />
          <Typography variant="h3" fontWeight={900} sx={{ color: '#f8fafc' }}>
            Choose your RivicQ workspace
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 900, mx: 'auto' }}>
            Start free with Community, grow into Professional for the full security module suite, and scale to Enterprise when you need quantum, HSM, and CISO-level controls.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {cards.map((card) => (
            <Grid item xs={12} md={4} key={card.title}>
              <Card sx={{ height: '100%', borderRadius: 5, border: `1px solid ${card.accent}44`, background: 'linear-gradient(180deg, rgba(13,28,64,0.98), rgba(5,10,24,0.96))' }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <Box sx={{ color: card.accent }}>
                      {card.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={800}>
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

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.12)' }} />

        <Grid container spacing={2} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(120,169,255,0.08)' }}>
              <CardContent>
                <Storage color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Community quick start</Typography>
                <Typography variant="body2" color="text.secondary">Login and scan assets locally without cloud credentials.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(212,175,55,0.08)' }}>
              <CardContent>
                <CloudQueue color="secondary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Professional unlocks</Typography>
                <Typography variant="body2" color="text.secondary">Cloud posture, conformance packs, and the full module suite.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(15,98,254,0.08)' }}>
              <CardContent>
                <Psychology color="success" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Enterprise extends</Typography>
                <Typography variant="body2" color="text.secondary">Quantum attestation, HSM, SSO, and executive reporting.</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.03)' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            What gets locked in Community
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cloud posture, conformance packs, compliance, quantum attestation, IBM Cloud, AWS HSM, and multi-cloud executive reporting are available in Professional and Enterprise.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default EditionSwitcher;
