import React from 'react';
import { Chip } from '@mui/material';
import { DATA_KIND_LABEL } from '../../data/enterprise/sources';
import type { DataKind } from '../../data/enterprise/types';
import { archifyChipTypographySx } from '../../theme/nebulaSurfaces';

const COLOR: Record<DataKind, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  live: 'success',
  demo: 'primary',
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
    sx={{ ...archifyChipTypographySx, height: 22, fontWeight: 700 }}
  />
);

export default ProvenanceChip;
