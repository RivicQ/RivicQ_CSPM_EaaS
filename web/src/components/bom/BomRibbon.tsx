import React from 'react';
import { Chip, Stack, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { layersForEdition } from '../../data/bomFramework';
import { isPaidEdition } from '../../config/editions';
import { useAuth } from '../../context/AuthContext';

const BomRibbon: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { edition } = useAuth();
  const paid = isPaidEdition(edition);
  const navigate = useNavigate();
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {layersForEdition(paid).map((l) => (
        <Tooltip key={l.id} title={l.honesty}>
          <Chip
            size="small"
            label={l.name}
            color={l.enabled ? 'primary' : 'default'}
            variant={l.enabled ? 'filled' : 'outlined'}
            onClick={() => navigate('/bom')}
            sx={{ fontWeight: 700, letterSpacing: '0.04em', height: compact ? 22 : 26 }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
};

export default BomRibbon;
