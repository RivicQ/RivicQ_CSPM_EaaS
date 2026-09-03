import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';

const AiSecurity: React.FC = () => {
  const navigate = useNavigate();
  const { edition } = useAuth();
  const paid = isPaidEdition(edition);
  const { data } = useQuery({
    queryKey: ['ai-security'],
    queryFn: () => bomService.getAiSecurity().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const enabled = Boolean(data?.enabled ?? paid);
  const rows = data?.aibom ?? [];
  return (
    <PageFrame
      eyebrow="AI security"
      title="AIBOM — model provenance"
      subtitle="EU AI Act technical documentation layer. Community can still scan serving-stack crypto into CBOM. Declared AIBOM is Enterprise."
    >
      <Alert severity={enabled ? 'info' : 'warning'} sx={{ mb: 2 }}>
        {data?.note || 'AIBOM is an Enterprise declared inventory. This is not a model-weight or training-data scanner.'}
      </Alert>
      {!enabled && (
        <Button variant="contained" sx={{ mb: 2 }} onClick={() => navigate('/switcher')}>View Enterprise edition</Button>
      )}
      {enabled && rows.length === 0 && (
        <Typography color="text.secondary">No declared models. Register AIBOM entries after connecting a model registry.</Typography>
      )}
      <Stack spacing={1.25}>
        {rows.map((m: any) => (
          <Stack key={m.identifier} spacing={0.5} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" spacing={1}>
              <Typography fontWeight={800}>{m.identifier}</Typography>
              <Chip size="small" label={`EU AI Act tier ${m.risk_tier ?? '?'}`} />
              {m.declared && <Chip size="small" label="Declared" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">{m.adversarial_risk}</Typography>
          </Stack>
        ))}
      </Stack>
    </PageFrame>
  );
};

export default AiSecurity;
