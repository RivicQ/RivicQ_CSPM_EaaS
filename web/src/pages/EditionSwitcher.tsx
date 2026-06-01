import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, Divider } from '@mui/material';
import { ArrowForward, Lock, Security, WorkspacePremium, CloudQueue, Psychology, Storage } from '@mui/icons-material';
import { setEditionPreference } from '../config/editions';
import BrandLogo from '../components/BrandLogo';

const EditionSwitcher: React.FC = () => {
  const navigate = useNavigate();

  const chooseEdition = (edition: 'oss' | 'enterprise') => {
    setEditionPreference(edition);
    navigate('/login', { replace: true });
  };

  const cards = [
    {
      title: 'CryptoBOM OSS',
      subtitle: 'Core CBOM scanning, dashboard, auth, and local operations.',
      icon: <Security sx={{ fontSize: 34 }} />,
      edition: 'oss' as const,
      highlights: ['CBOM scan basics', 'Dashboard & auth', 'Local workflows'],
      action: 'Continue with OSS',
    },
    {
      title: 'CryptoBOM Enterprise',
      subtitle: 'CISO, CSPM, HSM, PQC, multi-cloud, and compliance workflows.',
      icon: <WorkspacePremium sx={{ fontSize: 34 }} />,
      edition: 'enterprise' as const,
      highlights: ['CISO / CSPM / PQC', 'AWS / IBM / GCP', 'Compliance automation'],
      action: 'Continue with Enterprise',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(212,175,55,0.18), transparent 26%), linear-gradient(180deg, #08111f 0%, #0b1424 100%)', py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo dark />
        </Box>
        <Stack spacing={2} sx={{ mb: 4, textAlign: 'center' }}>
          <Chip icon={<Lock />} label="Edition Selection" color="primary" sx={{ alignSelf: 'center' }} />
          <Typography variant="h3" fontWeight={900} sx={{ color: '#f8fafc' }}>
            Choose your CryptoBOM workspace
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 900, mx: 'auto' }}>
            Pick OSS for the open source workflow and switch to Enterprise when you need compliance, IBM, HSM, PQC, and multi-cloud controls.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {cards.map((card) => (
            <Grid item xs={12} md={6} key={card.title}>
              <Card sx={{ height: '100%', borderRadius: 5, border: '1px solid rgba(212,175,55,0.18)', background: 'linear-gradient(180deg, rgba(16,26,45,0.98), rgba(8,17,31,0.96))' }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <Box sx={{ color: card.edition === 'enterprise' ? '#00c2ff' : '#d4af37' }}>
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
            <Card sx={{ height: '100%', bgcolor: 'rgba(212,175,55,0.08)' }}>
              <CardContent>
                <Storage color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>OSS quick start</Typography>
                <Typography variant="body2" color="text.secondary">Login and scan assets locally without cloud credentials.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(0,194,255,0.08)' }}>
              <CardContent>
                <CloudQueue color="secondary" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Enterprise unlocks</Typography>
                <Typography variant="body2" color="text.secondary">Multi-cloud posture, compliance, and executive reporting.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(16,185,129,0.08)' }}>
              <CardContent>
                <Psychology color="success" />
                <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>AI assistance</Typography>
                <Typography variant="body2" color="text.secondary">Plain-language guidance for DevSecOps, CBOM, and PQC migration.</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.03)' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            What gets locked in OSS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compliance, quantum attestation, IBM Cloud, AWS HSM, Terraform automation, and multi-cloud executive reporting are available in Enterprise.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default EditionSwitcher;
