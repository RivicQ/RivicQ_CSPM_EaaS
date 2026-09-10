import React from 'react';
import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import SitePage, { siteCardSx } from './SitePage';
import { platformService } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Mapping = {
  ibm_technology: string;
  rivicq_capability: string;
  integration_type: string;
  status: string;
  commercial_value: string;
};

const FALLBACK_MAPPINGS: Mapping[] = [
  {
    ibm_technology: 'IBM Cloud',
    rivicq_capability: 'Enterprise cloud connector / CSPM attach',
    integration_type: 'optional connector',
    status: 'connector_exists_opt_in',
    commercial_value: 'Inventory when the operator connects an IBM Cloud account',
  },
  {
    ibm_technology: 'IBM Cloud Hyper Protect Crypto Services',
    rivicq_capability: 'HSM / key-protect inventory',
    integration_type: 'optional connector',
    status: 'connector_exists_opt_in',
    commercial_value: 'Cryptographic inventory for regulated estates',
  },
  {
    ibm_technology: 'IBM Quantum / Qiskit',
    rivicq_capability: 'Local PQC taxonomy on scan results',
    integration_type: 'local library — not IBM Quantum Runtime',
    status: 'local_taxonomy_only',
    commercial_value: 'Do not sell as IBM Quantum hardware attestation',
  },
  {
    ibm_technology: 'IBM Security',
    rivicq_capability: 'CBOM + CSPM evidence packs',
    integration_type: 'none — no undocumented IBM Security API',
    status: 'not_integrated',
    commercial_value: 'Co-sell conversation only until an official integration exists',
  },
  {
    ibm_technology: 'watsonx',
    rivicq_capability: 'AIBOM / AI security inventory',
    integration_type: 'none',
    status: 'not_integrated',
    commercial_value: 'Future mapping only',
  },
];

type Checklist = { id: string; area: string; detail: string; status: string; stage: string };

const FALLBACK_CHECKLIST: Checklist[] = [
  { id: 'packaging', area: 'product packaging', detail: 'Community vs Enterprise SKUs documented', status: 'in_progress', stage: 'explore' },
  { id: 'billing', area: 'billing', detail: 'Payment adapter stub — no card data stored', status: 'not_started', stage: 'explore' },
  { id: 'marketplace_meta', area: 'Marketplace metadata', detail: 'Do not publish until IBM process permits', status: 'blocked', stage: 'marketplace_readiness' },
  { id: 'cosell', area: 'co-sell', detail: 'No fabricated IBM seller or deal-registration records', status: 'not_started', stage: 'grow' },
];

const IBMPartner: React.FC = () => {
  const { backendReachable } = useAuth();
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!backendReachable) return;
    platformService.ibm()
      .then((resp) => setData(resp.data))
      .catch((err) => setError(err?.message || 'IBM workspace unavailable'));
  }, [backendReachable]);

  const mappings: Mapping[] = data?.technology_mappings || FALLBACK_MAPPINGS;
  const checklist: Checklist[] = data?.checklist || FALLBACK_CHECKLIST;

  return (
    <SitePage
      maxWidth="lg"
      eyebrow="Partnerships · IBM Partner Plus"
      title="Selected. Readiness tracking only."
      lede="RivicQ has been selected for IBM Partner Plus. This page tracks RivicQ readiness. It does not call IBM seller, marketplace, or Partner Plus APIs."
      primary={{ label: 'Request a conversation', to: '/request-demo' }}
      secondary={{ label: 'Email sales@', to: 'mailto:sales@rivicq.com' }}
      notice="No fabricated co-sell records. Marketplace metadata is not auto-published. Qiskit scores on scans are a local taxonomy — not IBM Quantum hardware."
    >
      {!backendReachable && (
        <Box sx={{ p: 1.75, mb: 3, bgcolor: '#0a0a0f', border: '1px solid #1f1f2e', borderRadius: 2, color: '#d1d5db' }}>
          GitHub Pages cannot load live readiness state. Run the API to see the checklist.
        </Box>
      )}
      {error && (
        <Box sx={{ p: 1.75, mb: 3, bgcolor: '#0a0a0f', border: '1px solid #7f1d1d', borderRadius: 2, color: '#fecaca' }}>
          {error}
        </Box>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
        <Chip label={data?.status || 'selected — readiness tracking only'} sx={{ bgcolor: 'rgba(124,58,237,0.2)', color: '#fff', border: '1px solid #1f1f2e' }} />
        <Chip label={`IBM APIs connected: ${data?.ibm_apis_connected ? 'yes' : 'no'}`} variant="outlined" sx={{ color: '#d1d5db', borderColor: '#1f1f2e' }} />
        <Chip label={`Marketplace live: ${data?.marketplace_live ? 'yes' : 'no'}`} variant="outlined" sx={{ color: '#d1d5db', borderColor: '#1f1f2e' }} />
        <Chip label={`Co-sell records: ${(data?.cosell_records || []).length}`} variant="outlined" sx={{ color: '#d1d5db', borderColor: '#1f1f2e' }} />
      </Stack>

      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Technology mapping</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {mappings.map((m) => (
          <Grid item xs={12} md={6} key={m.ibm_technology}>
            <Box sx={siteCardSx}>
              <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a78bfa' }}>{m.status}</Typography>
              <Typography fontWeight={700} sx={{ mt: 0.75 }}>{m.ibm_technology}</Typography>
              <Typography variant="body2" sx={{ color: '#d1d5db', mt: 0.5 }}>{m.rivicq_capability}</Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1, color: '#9ca3af' }}>{m.integration_type}</Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>{m.commercial_value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Marketplace / Build checklist</Typography>
      <Grid container spacing={1.5}>
        {checklist.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Box sx={siteCardSx}>
              <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                <Typography variant="subtitle2">{item.area}</Typography>
                <Chip size="small" label={item.status} variant="outlined" sx={{ color: '#d1d5db', borderColor: '#1f1f2e' }} />
              </Stack>
              <Typography variant="body2" sx={{ color: '#d1d5db' }}>{item.detail}</Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>{item.stage}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </SitePage>
  );
};

export default IBMPartner;
