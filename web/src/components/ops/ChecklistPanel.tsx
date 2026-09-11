import React from 'react';
import { Alert, Box, Chip, Link, Stack, Typography } from '@mui/material';
import { SECURITY_CHECKLISTS, type SecurityChecklist } from '../../data/securityChecklists';

type Props = {
  lists?: SecurityChecklist[];
};

const ChecklistPanel: React.FC<Props> = ({ lists = SECURITY_CHECKLISTS }) => (
  <Stack spacing={2}>
    {lists.map((list) => (
      <Box key={list.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'baseline' }} sx={{ mb: 1 }}>
          <Typography fontWeight={800}>{list.name}</Typography>
          <Link href={list.sourceUrl} target="_blank" rel="noopener noreferrer" variant="caption">
            {list.source}
          </Link>
        </Stack>
        <Alert severity="info" sx={{ mb: 1.5 }}>{list.honesty}</Alert>
        <Stack spacing={1}>
          {list.items.map((item) => (
            <Stack key={item.id} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
              <Chip size="small" label={item.id} color="primary" variant="outlined" />
              <Typography fontWeight={600} sx={{ minWidth: { md: 280 } }}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">{item.rivicq}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    ))}
  </Stack>
);

export default ChecklistPanel;
