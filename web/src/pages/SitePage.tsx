import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import { websiteCtaSx, websiteOutlineCtaSx } from '../theme/websiteChrome';

export type SiteBlock = { title: string; body: string };

const noticeSx = {
  p: 1.75,
  mb: 4,
  bgcolor: '#0a0a0f',
  border: '1px solid #1f1f2e',
  borderRadius: 2,
  color: '#d1d5db',
  fontSize: '0.9375rem',
  lineHeight: 1.6,
};

export const siteCardSx = {
  p: 2.25,
  height: '100%',
  bgcolor: '#0a0a0f',
  border: '1px solid #1f1f2e',
  borderRadius: 2,
};

const SitePage: React.FC<{
  eyebrow: string;
  title: string;
  lede: string;
  blocks?: SiteBlock[];
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
  notice?: string;
  maxWidth?: 'md' | 'lg';
  children?: React.ReactNode;
}> = ({ eyebrow, title, lede, blocks = [], primary, secondary, notice, maxWidth = 'md', children }) => {
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
      <Container maxWidth={maxWidth} sx={{ py: { xs: 8, md: 12 } }}>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9ca3af' }}>{eyebrow}</Typography>
        <Typography sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 750, letterSpacing: '-0.03em', mt: 1, mb: 2 }}>{title}</Typography>
        <Typography sx={{ color: '#d1d5db', fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.65, mb: 3 }}>{lede}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: notice || blocks.length || children ? 4 : 0 }}>
          {primary && <Button variant="contained" size="large" onClick={() => go(primary.to)} sx={websiteCtaSx}>{primary.label}</Button>}
          {secondary && (
            <Button variant="outlined" size="large" onClick={() => go(secondary.to)} sx={websiteOutlineCtaSx}>
              {secondary.label}
            </Button>
          )}
        </Stack>
        {notice && <Box sx={noticeSx}>{notice}</Box>}
        {blocks.length > 0 && (
          <Grid container spacing={2}>
            {blocks.map((b) => (
              <Grid item xs={12} sm={6} key={b.title}>
                <Box sx={siteCardSx}>
                  <Typography fontWeight={700} sx={{ mb: 0.75 }}>{b.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#d1d5db' }}>{b.body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
        {children}
      </Container>
    </PublicShell>
  );
};

export default SitePage;
