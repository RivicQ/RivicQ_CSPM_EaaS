import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import PublicShell from '../components/brand/PublicShell';
import ArchifySystemMaps from '../components/brand/ArchifySystemMaps';
import { ARCHIFY_DIAGRAMS_HUB } from '../data/archifyDiagrams';
import { ARCHIFY_FONTS, NEBULA, archifyAuraLayersSx, archifyEyebrowSx } from '../theme/nebulaSurfaces';

const ArchifyMaps: React.FC = () => (
  <PublicShell>
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      <Box aria-hidden sx={archifyAuraLayersSx.radial} />
      <Box aria-hidden sx={archifyAuraLayersSx.grid} />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 12 }, scrollMarginTop: 96 }}>
        <Typography sx={archifyEyebrowSx}>Archify · product site</Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: ARCHIFY_FONTS.title,
            fontWeight: 500,
            letterSpacing: '-0.04em',
            fontSize: { xs: '2rem', md: '2.75rem' },
            mt: 1.25,
            mb: 2,
            maxWidth: 820,
            lineHeight: 1.05,
          }}
        >
          System maps from archify/site/index.html
        </Typography>
        <Typography sx={{ color: NEBULA.muted, maxWidth: '62ch', mb: 3, lineHeight: 1.65 }}>
          The gallery below is the same nine diagrams as the Archify explorer. Embeds use{' '}
          <code>?embed=1&theme=dark</code>. Cards open <code>?present=1</code>. The designed hub remains{' '}
          <code>archify/site/index.html#diagrams</code>.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            href={ARCHIFY_DIAGRAMS_HUB}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            sx={{
              borderRadius: '10px',
              bgcolor: '#fff',
              color: '#0a0b0d',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 44,
              '&:hover': { bgcolor: NEBULA.accent, color: '#fff' },
            }}
          >
            Open Archify gallery
          </Button>
        </Stack>
        <ArchifySystemMaps />
      </Container>
    </Box>
  </PublicShell>
);

export default ArchifyMaps;
