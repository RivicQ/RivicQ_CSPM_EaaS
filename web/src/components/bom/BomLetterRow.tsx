import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { BOM_LAYERS } from '../../data/bomFramework';
import designSystem from '../../theme/designSystem';

const BomLetterRow: React.FC<{ dark?: boolean; compact?: boolean }> = ({ compact }) => (
  <Stack direction="row" spacing={compact ? 0.75 : 1} flexWrap="wrap" useFlexGap>
    {BOM_LAYERS.map((layer) => (
      <Box
        key={layer.id}
        sx={{
          minWidth: compact ? 56 : 72,
          px: compact ? 1 : 1.25,
          py: compact ? 0.75 : 1,
          borderRadius: `${designSystem.radius.md}px`,
          border: '1px solid',
          borderColor: 'rgba(196,181,253,0.28)',
          bgcolor: '#0a0a0f',
          boxShadow: 'none',
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            letterSpacing: '0.08em',
            fontSize: compact ? '0.7rem' : '0.8125rem',
            color: '#ede9fe',
            lineHeight: 1,
          }}
        >
          {layer.name}
        </Typography>
        <Typography
          sx={{
            mt: 0.4,
            fontSize: '0.5625rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'rgba(196,181,253,0.72)',
          }}
        >
          {layer.community ? 'OSS' : 'Ent'}
        </Typography>
      </Box>
    ))}
  </Stack>
);

export default BomLetterRow;
