import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService } from '../services/api';
import ChecklistPanel from '../components/ops/ChecklistPanel';
import { SECURITY_CHECKLISTS } from '../data/securityChecklists';
import OpsHeroVisual from '../components/ops/OpsHeroVisual';

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
      visual={<OpsHeroVisual variant="findings" empty={!findings.length} />}
    >
      <Alert severity="info" sx={{ mb: 2 }}>{data?.note || 'Run a website scan to populate this view. Pages has no production API.'}</Alert>
      {findings.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>No TLS/HTTPS findings yet. Scan https://example.com from the CBOM scanner.</Typography>
      ) : (
        <Stack spacing={1.25} sx={{ mb: 3 }}>
          {findings.slice(0, 40).map((f: any, i: number) => (
            <Stack key={`${f.title}-${i}`} direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Chip size="small" label={f.severity || 'INFO'} />
              <Chip size="small" variant="outlined" label={f.protocol} />
              <Typography fontWeight={700}>{f.title}</Typography>
              <Typography variant="caption" color="text.secondary">{f.control}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>OWASP API checklist</Typography>
      <ChecklistPanel lists={SECURITY_CHECKLISTS.filter((l) => l.id === 'owasp-api-2023')} />
    </PageFrame>
  );
};

export default ApiSecurity;
