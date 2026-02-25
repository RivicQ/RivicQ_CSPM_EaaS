import React from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';

export type CloudProvider = 'gcp' | 'aws' | 'ibm';

interface CloudConnectionStatusProps {
  provider: CloudProvider;
  status: 'connected' | 'disconnected' | 'degraded' | 'loading';
  latencyMs?: number;
  showLatency?: boolean;
}

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  gcp: 'GCP',
  aws: 'AWS',
  ibm: 'IBM Cloud',
};

const PROVIDER_COLORS: Record<CloudProvider, string> = {
  gcp: '#4285F4',
  aws: '#FF9900',
  ibm: '#1F70C1',
};

export const CloudConnectionStatus: React.FC<CloudConnectionStatusProps> = ({
  provider,
  status,
  latencyMs,
  showLatency = true,
}) => {
  const label = PROVIDER_LABELS[provider];
  const color = PROVIDER_COLORS[provider];

  const statusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle sx={{ fontSize: 14, color: '#10b981' }} />;
      case 'disconnected': return <Error sx={{ fontSize: 14, color: '#ef4444' }} />;
      case 'degraded': return <Warning sx={{ fontSize: 14, color: '#f59e0b' }} />;
      case 'loading': return <CircularProgress size={12} />;
    }
  };

  const tooltipText = status === 'connected' && latencyMs
    ? `${label}: ${status} (${latencyMs}ms)`
    : `${label}: ${status}`;

  return (
    <Tooltip title={tooltipText}>
      <Chip
        icon={statusIcon() as React.ReactElement}
        label={showLatency && latencyMs ? `${label} ${latencyMs}ms` : label}
        size="small"
        sx={{
          borderColor: color,
          color,
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

/** Shows status for all three clouds in a compact row. */
export const MultiCloudStatus: React.FC<{
  connections: Array<{ provider: CloudProvider; status: 'connected' | 'disconnected' | 'degraded' | 'loading'; latencyMs?: number }>;
}> = ({ connections }) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
    {connections.map((c) => (
      <CloudConnectionStatus key={c.provider} {...c} />
    ))}
  </Box>
);

export default CloudConnectionStatus;
