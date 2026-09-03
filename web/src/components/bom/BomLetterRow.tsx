import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { BOM_LAYERS } from '../../data/bomFramework';
import { tokens } from '../../theme/tokens';
import designSystem from '../../theme/designSystem';

const BomLetterRow: React.FC<{ dark?: boolean; compact?: boolean }> = ({ dark, compact }) => (
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
          borderColor: dark ? 'rgba(186,230,253,0.28)' : 'rgba(14,165,233,0.22)',
          bgcolor: dark ? 'rgba(14,165,233,0.16)' : '#ffffff',
          boxShadow: dark ? 'none' : designSystem.shadow.sm,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            letterSpacing: '0.08em',
            fontSize: compact ? '0.7rem' : '0.8125rem',
            color: dark ? '#e0f2fe' : tokens.colors.rivicq[700],
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
            color: dark ? 'rgba(186,230,253,0.72)' : tokens.colors.text.muted,
          }}
        >
          {layer.community ? 'OSS' : 'Ent'}
        </Typography>
      </Box>
    ))}
  </Stack>
);

export default BomLetterRow;
