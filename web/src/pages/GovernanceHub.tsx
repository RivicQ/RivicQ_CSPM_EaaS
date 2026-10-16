import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService } from '../services/api';
import { GOVERNANCE_CONTROLS } from '../data/bomFramework';
import { isPaidEdition } from '../config/editions';
import { useAuth } from '../context/AuthContext';
import ChecklistPanel from '../components/ops/ChecklistPanel';

const GovernanceHub: React.FC = () => {
  const { edition } = useAuth();
  const paid = isPaidEdition(edition);
  const { data } = useQuery({
    queryKey: ['governance'],
    queryFn: () => bomService.getGovernance().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const rows = data?.controls?.length ? data.controls : GOVERNANCE_CONTROLS.map((c) => ({
    framework: c.framework, control: c.control, bom: c.bom, status: c.community || paid ? 'mapped' : 'locked', pack: paid,
  }));
  return (
    <PageFrame
      eyebrow="Governance"
      title="Compliance mapping"
      subtitle="Operator control mappings only. Community is JSON. Enterprise can add an evidence pack. Not a certification."
    >
      <Typography color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>{data?.note || 'Operator mappings only.'}</Typography>
      <Stack spacing={0.75} sx={{ mb: 1.5 }}>
        {rows.map((c: any) => (
          <Stack key={`${c.framework}-${c.control}`} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ px: 1, py: 0.7, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Chip size="small" color="primary" label={c.framework} />
            <Typography sx={{ flex: 1 }} fontWeight={600}>{c.control}</Typography>
            <Chip size="small" variant="outlined" label={String(c.bom || '').toUpperCase()} />
            <Chip size="small" label={c.status || (c.pack ? 'pack_enabled' : 'json_only')} />
          </Stack>
        ))}
      </Stack>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>Published checklists</Typography>
      <ChecklistPanel />
    </PageFrame>
  );
};

export default GovernanceHub;
