import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService, cbomService } from '../services/api';

const MigrationHub: React.FC = () => {
  const { data: unified } = useQuery({
    queryKey: ['bom-unified-mig'],
    queryFn: () => bomService.getUnified().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const { data: intel } = useQuery({
    queryKey: ['latest-intel-mig'],
    queryFn: async () => {
      const list = await cbomService.listScans().then((r) => r.data).catch(() => null);
      const id = list?.scans?.[0]?.id || list?.scans?.[0]?.scan_id;
      if (!id) return null;
      return cbomService.getScanIntelligence(id).then((r) => r.data).catch(() => null);
    },
    retry: 0,
  });
  const rows = intel?.pqc_readiness?.migration || unified?.qbom || [];
  return (
    <PageFrame
      eyebrow="Migration"
      title="PQC shift roadmap"
      subtitle="Map Shor/Grover-class assets to ML-KEM, ML-DSA, and SLH-DSA. Hybrid classical + PQC is the recommended cut-over. This engine does not rotate production keys."
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        Workbook layers: SBOM / CBOM / HBOM / AIBOM → QBOM. CRQC dates in third-party roadmaps are not executed here.
      </Alert>
      {intel?.pqc_readiness && (
        <Typography sx={{ mb: 2 }}>PQC readiness {intel.pqc_readiness.overall}/100 · HNDL exposure {intel.pqc_readiness.hndl_exposure}</Typography>
      )}
      {rows.length === 0 ? (
        <Typography color="text.secondary">Scan a website or host to populate the migration list.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((m: any, i: number) => (
            <Stack key={i} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Typography fontWeight={800}>{m.algorithm || m.name}</Typography>
              <Typography sx={{ flex: 1 }} variant="body2">{m.replace_with || m.replacement}</Typography>
              <Chip size="small" label={m.standard} />
              <Chip size="small" color={m.priority === 'now' ? 'error' : 'default'} label={m.priority || m.attack_class} />
            </Stack>
          ))}
        </Stack>
      )}
    </PageFrame>
  );
};

export default MigrationHub;
