import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Grid, Stack, Typography, useTheme } from '@mui/material';
import { NorthEast } from '@mui/icons-material';
import PublicShell from '../components/brand/PublicShell';
import PublicEngineNotice from '../components/brand/PublicEngineNotice';
import ArchifyWorkflowEmbed from '../components/brand/ArchifyWorkflowEmbed';
import { websiteCtaSx, websiteOutlineCtaSx } from '../theme/websiteChrome';

export type SiteBlock = { title: string; body: string };

const noticeSx = {
  p: 1.75,
  mb: 4,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  color: 'text.secondary',
  fontSize: '0.9375rem',
  lineHeight: 1.65,
};

export const siteCardSx = {
  p: 2.5,
  height: '100%',
  minHeight: { xs: 0, sm: 168 },
  display: 'flex',
  flexDirection: 'column' as const,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

const SitePage: React.FC<{
  eyebrow: string;
  title: string;
  lede: string;
  blocks?: SiteBlock[];
  sectionEyebrow?: string;
  sectionTitle?: string;
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
  notice?: string;
  engineNotice?: 'scan' | 'ibm';
  diagramKicker?: string;
  diagramTitle?: string;
  maxWidth?: 'md' | 'lg';
  children?: React.ReactNode;
}> = ({
  eyebrow,
  title,
  lede,
  blocks = [],
  sectionEyebrow = 'On this page',
  sectionTitle,
  primary,
  secondary,
  notice,
  engineNotice,
  diagramKicker,
  diagramTitle,
  maxWidth = 'lg',
  children,
}) => {
  const navigate = useNavigate();
  const isDark = useTheme().palette.mode === 'dark';
  const go = (to: string) => {
    if (to.startsWith('mailto:') || to.startsWith('http') || to.includes('.html')) {
      window.location.assign(to);
      return;
    }
    navigate(to);
  };

  return (
    <PublicShell>
      <Container maxWidth={maxWidth} sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 96 }}>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled' }}>{eyebrow}</Typography>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 750,
            letterSpacing: '-0.03em',
            mt: 1.25,
            mb: 2,
            color: 'text.primary',
            maxWidth: 820,
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '1rem', md: '1.0625rem' }, lineHeight: 1.65, mb: 3, maxWidth: '62ch' }}>
          {lede}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: notice || blocks.length || children ? 4 : 0 }}>
          {primary && (
            <Button variant="contained" size="large" endIcon={<NorthEast />} onClick={() => go(primary.to)} sx={websiteCtaSx}>
              {primary.label}
            </Button>
          )}
          {secondary && (
            <Button variant="outlined" size="large" onClick={() => go(secondary.to)} sx={websiteOutlineCtaSx(isDark)}>
              {secondary.label}
            </Button>
          )}
        </Stack>
        {notice && <Box sx={noticeSx}>{notice}</Box>}
        {engineNotice && <PublicEngineNotice variant={engineNotice} />}
        {blocks.length > 0 && (
          <Box sx={{ mt: 1, mb: children ? 3 : 0 }}>
            <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled', mb: 1 }}>
              {sectionEyebrow}
            </Typography>
            {sectionTitle && (
              <Typography
                sx={{
                  fontWeight: 650,
                  fontSize: { xs: '1.35rem', md: '1.6rem' },
                  letterSpacing: '-0.03em',
                  mb: 2.25,
                  maxWidth: 560,
                  lineHeight: 1.25,
                  color: 'text.primary',
                }}
              >
                {sectionTitle}
              </Typography>
            )}
            <Grid container spacing={1.5} alignItems="stretch">
              {blocks.map((b, i) => (
                <Grid item xs={12} sm={6} key={b.title}>
                  <Box sx={siteCardSx}>
                    <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', mb: 1 }}>
                      {String(i + 1).padStart(2, '0')}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.75 }}>{b.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, flex: 1 }}>{b.body}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
        {children}
        <ArchifyWorkflowEmbed kicker={diagramKicker} title={diagramTitle} />
      </Container>
    </PublicShell>
  );
};

export default SitePage;
