import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import PublicEngineNotice from '../components/brand/PublicEngineNotice';
import ArchifyWorkflowEmbed from '../components/brand/ArchifyWorkflowEmbed';
import { websiteCtaSx, websiteOutlineCtaSx } from '../theme/websiteChrome';
import {
  ARCHIFY_FONTS,
  NEBULA,
  archifyAuraLayersSx,
  archifyEyebrowSx,
  archifyTitleSx,
  nebulaPanelSx,
} from '../theme/nebulaSurfaces';

export type SiteBlock = { title: string; body: string };

const noticeSx = {
  ...nebulaPanelSx,
  p: 1.75,
  mb: 4,
  color: NEBULA.muted,
  fontSize: '0.9375rem',
  lineHeight: 1.6,
};

export const siteCardSx = {
  ...nebulaPanelSx,
  p: 2.25,
  height: '100%',
  transition: 'border-color 0.18s ease',
  '&:hover': { borderColor: 'rgba(255,255,255,0.28)' },
};

const SitePage: React.FC<{
  eyebrow: string;
  title: string;
  lede: string;
  blocks?: SiteBlock[];
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
  notice?: string;
  engineNotice?: 'scan' | 'ibm';
  maxWidth?: 'md' | 'lg';
  children?: React.ReactNode;
}> = ({ eyebrow, title, lede, blocks = [], primary, secondary, notice, engineNotice, maxWidth = 'md', children }) => {
  const navigate = useNavigate();
  const go = (to: string) => {
    if (to.startsWith('mailto:') || to.startsWith('http') || to.includes('.html')) {
      window.location.assign(to);
      return;
    }
    navigate(to);
  };

  return (
    <PublicShell>
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Box aria-hidden sx={archifyAuraLayersSx.radial} />
        <Box aria-hidden sx={archifyAuraLayersSx.grid} />
        <Container maxWidth={maxWidth} sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 12 }, scrollMarginTop: 96 }}>
          <Typography sx={archifyEyebrowSx}>{eyebrow}</Typography>
          <Typography
            component="h1"
            sx={{
              ...archifyTitleSx,
              fontSize: { xs: '2.1rem', md: '3rem' },
              mt: 1.25,
              mb: 2,
              maxWidth: 820,
              textWrap: 'balance',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(209,213,219,0.92)',
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.65,
              mb: 3,
              maxWidth: '64ch',
            }}
          >
            {lede}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: notice || blocks.length || children ? 4 : 0 }}>
            {primary && (
              <Button
                variant="contained"
                size="large"
                onClick={() => go(primary.to)}
                sx={{
                  ...websiteCtaSx,
                  borderRadius: '10px',
                  bgcolor: '#fff',
                  color: '#0a0b0d',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: NEBULA.accent, color: '#fff' },
                }}
              >
                {primary.label}
              </Button>
            )}
            {secondary && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => go(secondary.to)}
                sx={{
                  ...websiteOutlineCtaSx(),
                  borderRadius: '10px',
                  borderColor: NEBULA.lineHi,
                  color: NEBULA.text,
                  textTransform: 'none',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                {secondary.label}
              </Button>
            )}
          </Stack>
          {notice && <Box sx={noticeSx}>{notice}</Box>}
          {engineNotice && <PublicEngineNotice variant={engineNotice} />}
          {blocks.length > 0 && (
            <Grid container spacing={1.5} sx={{ mb: children ? 2 : 0 }}>
              {blocks.map((b, i) => (
                <Grid item xs={12} sm={6} key={b.title}>
                  <Box sx={siteCardSx}>
                    <Typography
                      sx={{
                        fontFamily: ARCHIFY_FONTS.mono,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: NEBULA.accentSoft,
                        letterSpacing: '0.04em',
                        mb: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </Typography>
                    <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, letterSpacing: '-0.02em', mb: 0.75 }}>
                      {b.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(209,213,219,0.88)', lineHeight: 1.55 }}>
                      {b.body}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
          {children}
          <ArchifyWorkflowEmbed />
        </Container>
      </Box>
    </PublicShell>
  );
};

export default SitePage;
