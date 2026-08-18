import React from 'react';
import { Chip } from '@mui/material';
import { DATA_KIND_LABEL } from '../../data/enterprise/sources';
import type { DataKind } from '../../data/enterprise/types';

const COLOR: Record<DataKind, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  live: 'success',
  demo: 'warning',
  benchmark: 'info',
  intel: 'secondary',
  calculated: 'primary',
};

type ProvenanceChipProps = {
  kind: DataKind;
  label?: string;
};

const ProvenanceChip: React.FC<ProvenanceChipProps> = ({ kind, label }) => (
  <Chip
    size="small"
    color={COLOR[kind]}
    variant="outlined"
    label={label || DATA_KIND_LABEL[kind]}
    sx={{ fontSize: '0.62rem', height: 20, fontWeight: 700, letterSpacing: '0.04em' }}
  />
);

export default ProvenanceChip;
