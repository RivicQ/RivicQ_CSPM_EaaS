import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import { Security, CheckCircle, Warning, Error } from '@mui/icons-material';

type HSMHealth = 'healthy' | 'degraded' | 'offline' | 'unknown';

interface HSMStatusBadgeProps {
  provider: 'ibm-hpcs' | 'aws-cloudhsm' | 'gcp-hsm';
  health: HSMHealth;
  keyCount?: number;
  showKeyCount?: boolean;
}

const PROVIDER_LABELS = {
  'ibm-hpcs': 'IBM HPCS',
  'aws-cloudhsm': 'AWS CloudHSM',
  'gcp-hsm': 'GCP HSM',
};

const HEALTH_COLORS: Record<HSMHealth, string> = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  offline: '#ef4444',
  unknown: '#6b7280',
};

const HEALTH_ICONS: Record<HSMHealth, React.ReactElement> = {
  healthy: <CheckCircle sx={{ fontSize: 14 }} />,
  degraded: <Warning sx={{ fontSize: 14 }} />,
  offline: <Error sx={{ fontSize: 14 }} />,
  unknown: <Security sx={{ fontSize: 14 }} />,
};

export const HSMStatusBadge: React.FC<HSMStatusBadgeProps> = ({
  provider,
  health,
  keyCount,
  showKeyCount = true,
}) => {
  const color = HEALTH_COLORS[health];
  const label = `${PROVIDER_LABELS[provider]}${showKeyCount && keyCount !== undefined ? ` · ${keyCount} keys` : ''}`;

  return (
    <Tooltip title={`HSM Status: ${health}${keyCount !== undefined ? ` | ${keyCount} managed keys` : ''}`}>
      <Chip
        icon={HEALTH_ICONS[health]}
        label={label}
        size="small"
        sx={{
          color,
          borderColor: `${color}60`,
          backgroundColor: `${color}15`,
          border: `1px solid ${color}40`,
          fontWeight: 600,
          fontSize: '0.7rem',
        }}
        variant="outlined"
      />
    </Tooltip>
  );
};

/** Stacked HSM status for multiple providers. */
export const HSMStatusPanel: React.FC<{
  hsms: Array<HSMStatusBadgeProps>;
}> = ({ hsms }) => (
  <Box>
    <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
      HSM Status
    </Typography>
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {hsms.map((h) => (
        <HSMStatusBadge key={h.provider} {...h} />
      ))}
    </Box>
  </Box>
);

export default HSMStatusBadge;
