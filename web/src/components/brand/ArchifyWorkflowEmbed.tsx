import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ARCHIFY_FONTS, NEBULA } from '../../theme/nebulaSurfaces';
import {
  type ArchifyDiagramId,
  archifyDiagram,
  archifyDiagramHref,
} from '../../data/archifyDiagrams';

type ArchifyWorkflowEmbedProps = {
  /**
   * Console reference: one line, no iframe.
   * The operator app stays the page. The full stage stays on archify/site.
   */
  compact?: boolean;
  diagramId?: ArchifyDiagramId;
  kicker?: string;
  title?: string;
};

/** Matches archify/site sys-card plates. Never a viewport-height frame. */
const PLATE_HEIGHT = 132;

const ArchifyWorkflowEmbed: React.FC<ArchifyWorkflowEmbedProps> = ({
  compact = false,
  diagramId = 'operator',
  kicker,
  title,
}) => {
  const diagram = archifyDiagram(diagramId);
  const present = archifyDiagramHref(diagram.file, 'present');
  const embed = archifyDiagramHref(diagram.file, 'embed');
  const heading = title || diagram.question;

  if (compact) {
    return (
      <Stack
        data-embed="bar"
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          mt: 1.5,
          px: 1.25,
          py: 0.5,
          minHeight: 40,
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: '10px',
          bgcolor: NEBULA.panel,
        }}
      >
        <Typography
          component="span"
          sx={{
            flexShrink: 0,
            px: 0.75,
            py: 0.15,
            borderRadius: 999,
            bgcolor: 'rgba(255,255,255,0.06)',
            color: NEBULA.faint,
            fontFamily: ARCHIFY_FONTS.mono,
            fontSize: '0.625rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {kicker || diagram.kind}
        </Typography>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', color: NEBULA.muted }} noWrap>
          {heading}
        </Typography>
        <Button
          size="small"
          href={present}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ flexShrink: 0, minHeight: 32, color: NEBULA.text, textTransform: 'none' }}
        >
          Open map
        </Button>
      </Stack>
    );
  }

  return (
    <Box data-embed="plate" sx={{ mt: 3 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0.75 }}
      >
        <Typography
          sx={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: NEBULA.faint,
          }}
        >
          {kicker || `${diagram.kind} · Archify`}
        </Typography>
        <Button
          size="small"
          href={present}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: NEBULA.muted, textTransform: 'none', minHeight: 32 }}
        >
          Open diagram
        </Button>
      </Stack>
      <Box
        component="a"
        href={present}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={diagram.previewTitle}
        sx={{
          display: 'block',
          position: 'relative',
          height: PLATE_HEIGHT,
          overflow: 'hidden',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.12)',
          bgcolor: NEBULA.ink,
          textDecoration: 'none',
        }}
      >
        <Box
          component="iframe"
          title={diagram.previewTitle}
          src={embed}
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
      </Box>
      <Typography sx={{ mt: 0.75, color: NEBULA.muted, fontSize: '0.8125rem', maxWidth: 640 }}>
        {heading}
      </Typography>
    </Box>
  );
};

export default ArchifyWorkflowEmbed;
