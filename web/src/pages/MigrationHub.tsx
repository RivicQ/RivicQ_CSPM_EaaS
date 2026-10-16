import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import PageFrame from '../components/PageFrame';
import { bomService, cbomService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';
import { NEBULA } from '../theme/nebulaSurfaces';

const MigrationHub: React.FC = () => {
  const { edition, isDemo } = useAuth();
  const paid = isPaidEdition(edition);
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
  const rows = intel?.pqc_readiness?.migration || [];
  const qbomLocked = !paid;
  const stats = [
    { label: 'Readiness', value: intel?.pqc_readiness?.overall != null ? `${intel.pqc_readiness.overall}/100` : '—' },
    { label: 'HNDL', value: intel?.pqc_readiness?.hndl_exposure ?? '—' },
    { label: 'Candidates', value: rows.length },
    { label: 'QBOM', value: qbomLocked ? 'Locked' : 'Enterprise' },
  ];

  return (
    <PageFrame
      eyebrow="Planning"
      title="PQC classification"
      subtitle="Scan taxonomy only. This page does not rotate keys or run IBM Quantum jobs."
      badge={isDemo ? 'Demo' : (paid ? 'Enterprise' : 'Plan only')}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1.25 }} flexWrap="wrap" useFlexGap>
        {stats.map((s) => (
          <Box
            key={s.label}
            sx={{
              minWidth: 120,
              px: 1.25,
              py: 0.75,
              border: '1px solid',
              borderColor: NEBULA.line,
              borderRadius: 1,
              bgcolor: NEBULA.panel,
            }}
          >
            <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: NEBULA.faint }}>
              {s.label}
            </Typography>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, mt: 0.25 }}>{s.value}</Typography>
          </Box>
        ))}
      </Stack>

      <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1 }}>
        Operator decision. RSA-2048 is classified, not auto-broken.
        {qbomLocked ? ' QBOM stays locked on Community.' : ''}
        {unified?.qbom && qbomLocked ? ' Unified QBOM payload is ignored until a licensed workspace is selected.' : ''}
      </Typography>

      <Box sx={{ border: '1px solid', borderColor: NEBULA.line, borderRadius: 1, overflow: 'hidden', bgcolor: NEBULA.panel }}>
        {rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 1.25, fontSize: '0.8125rem' }}>
            No classification candidates from this workspace. Run a scan.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Algorithm</TableCell>
                <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Plan</TableCell>
                <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Standard</TableCell>
                <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Class</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((m: Record<string, string>, i: number) => (
                <TableRow key={i}>
                  <TableCell sx={{ py: 0.75, fontWeight: 700 }}>{m.algorithm || m.name}</TableCell>
                  <TableCell sx={{ py: 0.75, fontSize: '0.8125rem' }}>{m.replace_with || m.replacement || 'Plan hybrid ML-KEM / ML-DSA'}</TableCell>
                  <TableCell sx={{ py: 0.75 }}>{m.standard ? <Chip size="small" label={m.standard} sx={{ height: 20, fontSize: 10 }} /> : '—'}</TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Chip size="small" variant="outlined" label={m.priority || m.attack_class || 'classified'} sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </PageFrame>
  );
};

export default MigrationHub;
