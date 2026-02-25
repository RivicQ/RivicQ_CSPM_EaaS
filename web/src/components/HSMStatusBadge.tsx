import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { VpnKey, Warning } from '@mui/icons-material';

type HSMProvider = 'ibm' | 'aws' | 'gcp';

interface HSMStatusBadgeProps {
  provider: HSMProvider;
  keyCount?: number;
  healthy?: boolean;
}

const PROVIDER_NAMES: Record<HSMProvider, string> = {
  ibm: 'IBM HPCS',
  aws: 'AWS CloudHSM',
  gcp: 'GCP Cloud HSM',
};

const HSMStatusBadge: React.FC<HSMStatusBadgeProps> = ({
  provider,
  keyCount,
  healthy = true,
}) => {
  const label = keyCount !== undefined
    ? `${PROVIDER_NAMES[provider]} · ${keyCount} keys`
    : PROVIDER_NAMES[provider];

  return (
    <Tooltip title={healthy ? `${PROVIDER_NAMES[provider]} is healthy` : `${PROVIDER_NAMES[provider]} health check failed`}>
      <Chip
        size="small"
        icon={
          healthy
            ? <VpnKey style={{ fontSize: 14, color: '#667eea' }} />
            : <Warning style={{ fontSize: 14, color: '#ef4444' }} />
        }
        label={label}
        variant="outlined"
        style={{
          borderColor: healthy ? '#667eea' : '#ef4444',
          color: healthy ? '#667eea' : '#ef4444',
          fontSize: '0.7rem',
          height: 24,
        }}
      />
    </Tooltip>
  );
};

export default HSMStatusBadge;
