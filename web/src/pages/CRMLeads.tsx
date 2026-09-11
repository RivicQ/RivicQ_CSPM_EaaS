import React from 'react';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import { platformService } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  intent: string;
  stage: string;
  source: string;
  created_at: string;
};

const CRMLeads: React.FC = () => {
  const { backendReachable } = useAuth();
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [stages, setStages] = React.useState<string[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!backendReachable) return;
    Promise.all([platformService.leads(), platformService.funnel()])
      .then(([leadResp, funnelResp]) => {
        setLeads(leadResp.data?.leads || []);
        setStages(funnelResp.data?.stages || []);
      })
      .catch((err) => setError(err?.response?.data?.error || err?.message || 'CRM requires an admin session'));
  }, [backendReachable]);

  return (
    <PageFrame
      eyebrow="Commercial"
      title="CRM"
      subtitle="One inbound list. Empty until someone requests a demo or PoC. No seeded Acme pipeline."
      badge="admin"
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        Funnel stages exist as a model. Opportunities stay empty until an operator promotes a real lead. Discord is not the system of record.
      </Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {stages.map((s) => <Chip key={s} size="small" label={s} variant="outlined" />)}
      </Stack>
      {leads.length === 0 ? (
        <GlassCard hover={false} padding={3}>
          <Typography fontWeight={700}>No leads yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Public /request-demo writes here when the API is running. GitHub Pages falls back to mailto:sales@rivicq.com.
          </Typography>
        </GlassCard>
      ) : (
        <Stack spacing={1.5}>
          {leads.map((lead) => (
            <GlassCard key={lead.id} hover={false} padding={2}>
              <Stack direction="row" justifyContent="space-between" spacing={2} flexWrap="wrap">
                <BoxBlock title={lead.company || lead.name || 'Lead'} detail={`${lead.intent} · ${lead.stage} · ${lead.source}`} />
                <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>{lead.email}</Typography>
              </Stack>
            </GlassCard>
          ))}
        </Stack>
      )}
    </PageFrame>
  );
};

const BoxBlock: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <Stack>
    <Typography fontWeight={700}>{title}</Typography>
    <Typography variant="body2" color="text.secondary">{detail}</Typography>
  </Stack>
);

export default CRMLeads;
