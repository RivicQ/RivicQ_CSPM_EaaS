import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService } from '../services/api';
import ChecklistPanel from '../components/ops/ChecklistPanel';
import { SECURITY_CHECKLISTS } from '../data/securityChecklists';

const ApiSecurity: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['api-security'],
    queryFn: () => bomService.getApiSecurity().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const findings = data?.findings ?? [];
  return (
    <PageFrame
      eyebrow="API security"
      title="TLS and HTTPS API surface"
      subtitle="Community derives API hygiene from website/host scans (HSTS, CSP, protocol, certificates). Full API gateway inventory is Enterprise."
    >
      <Typography color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>{data?.note || 'Run a website scan to populate this view. Pages has no production API.'}</Typography>
      {findings.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>No TLS/HTTPS findings yet. Scan from the CBOM scanner.</Typography>
      ) : (
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {findings.slice(0, 40).map((f: any, i: number) => (
            <Stack key={`${f.title}-${i}`} direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 0.7, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Chip size="small" label={f.severity || 'INFO'} />
              <Chip size="small" variant="outlined" label={f.protocol} />
              <Typography fontWeight={700}>{f.title}</Typography>
              <Typography variant="caption" color="text.secondary">{f.control}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>OWASP API checklist</Typography>
      <ChecklistPanel lists={SECURITY_CHECKLISTS.filter((l) => l.id === 'owasp-api-2023')} />
    </PageFrame>
  );
};

export default ApiSecurity;
