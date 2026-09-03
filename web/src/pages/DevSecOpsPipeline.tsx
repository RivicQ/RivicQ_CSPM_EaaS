import React from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { PIPELINE_STAGES } from '../data/bomFramework';
import { isPaidEdition } from '../config/editions';
import { useAuth } from '../context/AuthContext';
import { tokens } from '../theme/tokens';

const DevSecOpsPipeline: React.FC = () => {
  const { edition } = useAuth();
  const paid = isPaidEdition(edition);
  return (
    <PageFrame
      eyebrow="DevSecOps"
      title="Eight-stage BOM pipeline"
      subtitle="From IDE to regulator pack. Community runs stages 1–6 and JSON evidence. Continuous production monitoring is Enterprise."
      badge="rivicq scan ."
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        The GitHub Action policy gate is unchanged (`BLOCK` fails CI). RSA-2048 is classified, not auto-blocked.
      </Alert>
      <Stack spacing={1.5}>
        {PIPELINE_STAGES.map((s) => {
          const locked = !s.oss && !paid;
          return (
            <Box key={s.id} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', opacity: locked ? 0.6 : 1 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                <Typography fontFamily={tokens.typography.mono} fontWeight={800} color="primary">
                  {String(s.id).padStart(2, '0')}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={800}>{s.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.action}</Typography>
                </Box>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {s.boms.map((b) => <Chip key={b} size="small" label={b.toUpperCase()} />)}
                </Stack>
                <Chip size="small" label={s.artifact} variant="outlined" />
                <Chip size="small" color={locked ? 'default' : 'success'} label={locked ? 'Enterprise' : (s.oss ? 'OSS' : 'Ent')} />
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </PageFrame>
  );
};

export default DevSecOpsPipeline;
