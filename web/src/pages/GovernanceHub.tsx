import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService } from '../services/api';
import { GOVERNANCE_CONTROLS } from '../data/bomFramework';
import { isPaidEdition } from '../config/editions';
import { useAuth } from '../context/AuthContext';

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
      subtitle="DORA, NIS2, EU AI Act, CRA, NIST Zero Trust, FIPS, BSI. Community is JSON mappings. Enterprise enables the evidence pack. Not a certification."
    >
      <Alert severity="info" sx={{ mb: 2 }}>{data?.note || 'Operator mappings only.'}</Alert>
      <Stack spacing={1.25}>
        {rows.map((c: any) => (
          <Stack key={`${c.framework}-${c.control}`} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Chip size="small" color="primary" label={c.framework} />
            <Typography sx={{ flex: 1 }} fontWeight={600}>{c.control}</Typography>
            <Chip size="small" variant="outlined" label={String(c.bom || '').toUpperCase()} />
            <Chip size="small" label={c.status || (c.pack ? 'pack_enabled' : 'json_only')} />
          </Stack>
        ))}
      </Stack>
    </PageFrame>
  );
};

export default GovernanceHub;
