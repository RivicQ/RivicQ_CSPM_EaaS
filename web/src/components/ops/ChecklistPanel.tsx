import React from 'react';
import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import { SECURITY_CHECKLISTS, type SecurityChecklist } from '../../data/securityChecklists';
import { NEBULA } from '../../theme/nebulaSurfaces';

type Props = {
  lists?: SecurityChecklist[];
};

const ChecklistPanel: React.FC<Props> = ({ lists = SECURITY_CHECKLISTS }) => (
  <Stack spacing={1}>
    {lists.map((list) => (
      <Box key={list.id} sx={{ p: 1.25, border: 1, borderColor: NEBULA.line, borderRadius: 1, bgcolor: NEBULA.panel }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'baseline' }} sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{list.name}</Typography>
          <Link href={list.sourceUrl} target="_blank" rel="noopener noreferrer" variant="caption">
            {list.source}
          </Link>
        </Stack>
        <Typography sx={{ mb: 0.75, fontSize: '0.75rem', color: NEBULA.faint }}>{list.honesty}</Typography>
        <Stack spacing={0.5}>
          {list.items.map((item) => (
            <Stack key={item.id} direction={{ xs: 'column', md: 'row' }} spacing={0.75} alignItems={{ md: 'center' }}>
              <Chip size="small" label={item.id} variant="outlined" sx={{ height: 20, fontSize: 10 }} />
              <Typography sx={{ minWidth: { md: 240 }, fontSize: '0.8125rem', fontWeight: 600 }}>{item.title}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{item.rivicq}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    ))}
  </Stack>
);

export default ChecklistPanel;
