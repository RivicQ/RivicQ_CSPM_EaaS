import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import PageFrame from '../components/PageFrame';
import { EmptyState } from '../components/ui';
import { bomService } from '../services/api';
import { layersForEdition } from '../data/bomFramework';
import { useAuth } from '../context/AuthContext';
import { isEnterpriseEdition } from '../config/editions';
import { NEBULA } from '../theme/nebulaSurfaces';

const BomIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const { edition, isDemo } = useAuth();
  const paid = isEnterpriseEdition(edition);
  const layers = layersForEdition(paid);
  const { data } = useQuery({
    queryKey: ['bom-unified'],
    queryFn: () => bomService.getUnified().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const { data: framework } = useQuery({
    queryKey: ['bom-framework'],
    queryFn: () => bomService.getFramework().then((r) => r.data).catch(() => null),
    retry: 0,
  });

  const counts: Record<string, number> = {
    cbom: data?.cbom?.length ?? 0,
    sbom: data?.sbom?.length ?? 0,
    qbom: data?.qbom?.length ?? 0,
    hbom: data?.hbom?.length ?? 0,
    aibom: data?.aibom?.length ?? 0,
    ibom: data?.ibom?.length ?? 0,
  };

  return (
    <PageFrame
      eyebrow="Inventory"
      title="CBOM · SBOM"
      subtitle="Community inventories cryptography and software. Q / H / AI / I stay locked until the workspace is licensed."
      badge={paid ? 'Enterprise' : 'Community'}
      action={<Button size="small" variant="contained" onClick={() => navigate('/scanner')}>Scan</Button>}
    >
      <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1 }}>
        {framework?.honesty || 'Mappings are not certifications. Partner APIs stay disconnected without credentials.'}
        {isDemo ? ' Demo uses labeled sample data.' : ''}
      </Typography>

      <Box
        sx={{
          border: '1px solid',
          borderColor: NEBULA.line,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: NEBULA.panel,
          mb: 1.25,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Layer</TableCell>
              <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Status</TableCell>
              <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }} align="right">Assets</TableCell>
              <TableCell sx={{ py: 0.75, fontSize: 11, color: NEBULA.faint }}>Role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {layers.map((l) => (
              <TableRow key={l.id} sx={{ opacity: l.enabled ? 1 : 0.55 }}>
                <TableCell sx={{ py: 0.75, fontWeight: 700, width: 88 }}>{l.name}</TableCell>
                <TableCell sx={{ py: 0.75 }}>
                  <Chip size="small" label={l.enabled ? 'On' : 'Enterprise'} variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                </TableCell>
                <TableCell sx={{ py: 0.75 }} align="right">{counts[l.id] || 0}</TableCell>
                <TableCell sx={{ py: 0.75, color: 'text.secondary', fontSize: '0.75rem' }}>{l.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box
        sx={{
          border: '1px solid',
          borderColor: NEBULA.line,
          borderRadius: 1,
          bgcolor: NEBULA.panel,
          p: 1.25,
        }}
      >
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 0.75 }}>CBOM records</Typography>
        {(!data?.cbom || data.cbom.length === 0) ? (
          <EmptyState
            title="No CBOM components yet"
            description="Run rivicq scan . or the website scanner. This list is not a simulated inventory."
            action={{ label: 'Open scans', onClick: () => navigate('/scanner') }}
          />
        ) : (
          <Stack spacing={0.5}>
            {data.cbom.slice(0, 40).map((row: any, i: number) => (
              <Box
                key={row.id || row.name || i}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '220px 1fr' },
                  gap: 0.5,
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: NEBULA.line,
                }}
              >
                <Typography fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                  {row.name || row.component || row.algorithm || `Component ${i + 1}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[row.algorithm, row.version, row.purl, row.risk].filter(Boolean).join(' · ') || 'No extra fields'}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </PageFrame>
  );
};

export default BomIntelligence;
