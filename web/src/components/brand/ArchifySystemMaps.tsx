import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  ARCHIFY_DIAGRAMS,
  ARCHIFY_DIAGRAMS_HUB,
  ARCHIFY_SITE,
  archifyDiagramHref,
} from '../../data/archifyDiagrams';
import { ARCHIFY_FONTS, NEBULA, archifyEyebrowSx } from '../../theme/nebulaSurfaces';

type ArchifySystemMapsProps = {
  compact?: boolean;
};

const ArchifySystemMaps: React.FC<ArchifySystemMapsProps> = ({ compact = false }) => (
  <Box id="diagrams" sx={{ mt: compact ? 3 : 6, scrollMarginTop: 96 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      justifyContent="space-between"
      alignItems={{ sm: 'flex-end' }}
      sx={{ mb: 2.5 }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={archifyEyebrowSx}>Systems · Archify</Typography>
        <Typography
          component="h2"
          sx={{
            fontFamily: ARCHIFY_FONTS.title,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            fontSize: compact ? { xs: '1.25rem', md: '1.5rem' } : { xs: '1.5rem', md: '1.85rem' },
            mt: 0.75,
            maxWidth: 640,
            lineHeight: 1.25,
          }}
        >
          Same maps as the Archify product site
        </Typography>
        <Typography sx={{ color: NEBULA.muted, mt: 0.75, maxWidth: '62ch', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Each plate is a live iframe of <code>archify/diagrams/*.html?embed=1&theme=dark</code>. Open a card for
          present mode, or the full gallery at <code>archify/site/index.html#diagrams</code>.
        </Typography>
      </Box>
      <Button
        href={ARCHIFY_DIAGRAMS_HUB}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: NEBULA.muted, textTransform: 'none', alignSelf: { xs: 'flex-start', sm: 'auto' } }}
      >
        Open Archify gallery
      </Button>
    </Stack>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
        gap: 1.5,
      }}
    >
      {ARCHIFY_DIAGRAMS.map((d) => (
        <Box
          key={d.id}
          component="a"
          href={archifyDiagramHref(d.file, 'present')}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            textDecoration: 'none',
            color: 'inherit',
            border: '1px solid',
            borderColor: 'rgba(255,255,255,0.14)',
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: NEBULA.panel,
            transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s, box-shadow 0.3s',
            '&:hover': {
              transform: 'translateY(-3px)',
              borderColor: 'rgba(124,58,237,0.45)',
              boxShadow: '0 24px 50px -24px rgba(124,58,237,0.45)',
            },
          }}
        >
          <Box sx={{ position: 'relative', height: compact ? 128 : 168, overflow: 'hidden', bgcolor: NEBULA.ink }}>
            <Box
              component="iframe"
              title={d.previewTitle}
              src={archifyDiagramHref(d.file, 'embed')}
              tabIndex={-1}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '238%',
                height: '238%',
                border: 0,
                pointerEvents: 'none',
                transform: 'scale(0.42)',
                transformOrigin: '0 0',
                bgcolor: NEBULA.ink,
              }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.86))',
                pointerEvents: 'none',
              }}
            />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pt: 1.5 }}>
            <Box
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 999,
                bgcolor: 'rgba(124,58,237,0.12)',
                color: NEBULA.accentSoft,
                fontFamily: ARCHIFY_FONTS.mono,
                fontSize: '0.625rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {d.kind}
            </Box>
            <Typography
              sx={{
                ml: 'auto',
                color: NEBULA.faint,
                fontFamily: ARCHIFY_FONTS.mono,
                fontSize: '0.6rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {d.file}
            </Typography>
          </Stack>
          <Typography sx={{ px: 2, pt: 1, fontWeight: 600, fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.35 }}>
            {d.question}
          </Typography>
          <Typography sx={{ px: 2, color: NEBULA.faint, fontSize: '0.75rem' }}>{d.title}</Typography>
          <Typography sx={{ px: 2, pb: 2, color: 'rgba(209,213,219,0.88)', fontSize: '0.75rem', lineHeight: 1.5 }}>
            {d.description}
          </Typography>
        </Box>
      ))}
    </Box>
    <Typography sx={{ mt: 2, color: NEBULA.faint, fontSize: '0.75rem' }}>
      Canonical gallery:{' '}
      <Box component="a" href={ARCHIFY_SITE} target="_blank" rel="noopener noreferrer" sx={{ color: NEBULA.accentSoft }}>
        archify/site/index.html
      </Box>
      . Numbers on those pages are illustrative or sample-labeled. Control mappings are not certifications.
    </Typography>
  </Box>
);

export default ArchifySystemMaps;
