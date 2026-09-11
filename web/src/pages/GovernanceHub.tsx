import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService } from '../services/api';
import { GOVERNANCE_CONTROLS } from '../data/bomFramework';
import { isPaidEdition } from '../config/editions';
import { useAuth } from '../context/AuthContext';
import OpsHeroVisual from '../components/ops/OpsHeroVisual';
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
  const mapped = rows.filter((c: any) => c.status === 'mapped' || c.community || c.pack).length;
  const locked = Math.max(0, rows.length - mapped);
  return (
    <PageFrame
      eyebrow="Governance"
      title="Compliance mapping"
      subtitle="DORA, NIS2, EU AI Act, CRA, NIST Zero Trust, FIPS, BSI, plus OWASP API/publication/network lists and a RivicQ quantum checklist. Community is JSON mappings. Enterprise enables the evidence pack. Not a certification."
      visual={<OpsHeroVisual variant="governance" mapped={mapped} locked={locked} />}
    >
      <Alert severity="info" sx={{ mb: 2 }}>{data?.note || 'Operator mappings only.'}</Alert>
      <Stack spacing={1.25} sx={{ mb: 3 }}>
        {rows.map((c: any) => (
          <Stack key={`${c.framework}-${c.control}`} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Chip size="small" color="primary" label={c.framework} />
            <Typography sx={{ flex: 1 }} fontWeight={600}>{c.control}</Typography>
            <Chip size="small" variant="outlined" label={String(c.bom || '').toUpperCase()} />
            <Chip size="small" label={c.status || (c.pack ? 'pack_enabled' : 'json_only')} />
          </Stack>
        ))}
      </Stack>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Published checklists</Typography>
      <ChecklistPanel />
    </PageFrame>
  );
};

export default GovernanceHub;
