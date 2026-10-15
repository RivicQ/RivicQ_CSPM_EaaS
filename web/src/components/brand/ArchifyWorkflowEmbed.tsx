import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ARCHIFY_FONTS, NEBULA } from '../../theme/nebulaSurfaces';
import {
  type ArchifyDiagramId,
  archifyDiagram,
  archifyDiagramHref,
} from '../../data/archifyDiagrams';

type ArchifyWorkflowEmbedProps = {
  compact?: boolean;
  diagramId?: ArchifyDiagramId;
  kicker?: string;
  title?: string;
};

const ArchifyWorkflowEmbed: React.FC<ArchifyWorkflowEmbedProps> = ({
  compact = false,
  diagramId = 'operator',
  kicker,
  title,
}) => {
  const diagram = archifyDiagram(diagramId);
  const present = archifyDiagramHref(diagram.file, 'present');
  const embed = archifyDiagramHref(diagram.file, 'embed');

  return (
    <Box sx={{ mt: compact ? 3 : 6 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ sm: 'flex-end' }}
        sx={{ mb: 1.5 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: NEBULA.faint,
              mb: 0.5,
            }}
          >
            {kicker || `${diagram.kind} · Archify`}
          </Typography>
          <Typography
            sx={{
              fontFamily: ARCHIFY_FONTS.title,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              maxWidth: 640,
              lineHeight: 1.35,
            }}
          >
            {title || diagram.question}
          </Typography>
        </Box>
        <Button
          size="small"
          href={present}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: NEBULA.muted, alignSelf: { xs: 'flex-start', sm: 'auto' }, textTransform: 'none' }}
        >
          Open diagram
        </Button>
      </Stack>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: NEBULA.panel,
          height: compact ? { xs: 360, md: 440 } : { xs: 420, md: 560 },
        }}
      >
        <Box
          component="iframe"
          title={diagram.previewTitle}
          src={embed}
          sx={{ width: '100%', height: '100%', border: 0, display: 'block', bgcolor: NEBULA.ink }}
        />
      </Box>
    </Box>
  );
};

export default ArchifyWorkflowEmbed;
