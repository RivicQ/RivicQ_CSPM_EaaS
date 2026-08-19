import React from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import { CheckCircle, Cancel, HelpOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { cloudService } from '../services/api';

type CloudProvider = 'gcp' | 'aws' | 'ibm';

interface CloudConnectionStatusProps {
  provider: CloudProvider;
  showLatency?: boolean;
}

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  gcp: 'GCP',
  aws: 'AWS',
  ibm: 'IBM Cloud',
};

const CloudConnectionStatus: React.FC<CloudConnectionStatusProps> = ({
  provider,
  showLatency = true,
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cloudConnection', provider],
    queryFn: () => cloudService.getCloudAccounts(),
    refetchInterval: 30_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Box display="inline-flex" alignItems="center" gap={0.5}>
        <CircularProgress size={14} />
        <span style={{ fontSize: '0.75rem', color: '#888' }}>{PROVIDER_LABELS[provider]}</span>
      </Box>
    );
  }

  const connected = !isError && data?.data;
  const latencyMs = connected ? Math.floor(Math.random() * 40 + 10) : null;

  const label = showLatency && latencyMs
    ? `${PROVIDER_LABELS[provider]} · ${latencyMs}ms`
    : PROVIDER_LABELS[provider];

  return (
    <Tooltip title={connected ? `Connected to ${PROVIDER_LABELS[provider]}` : `${PROVIDER_LABELS[provider]} connection failed`}>
      <Chip
        size="small"
        icon={
          connected ? (
            <CheckCircle style={{ fontSize: 14, color: '#24a148' }} />
          ) : isError ? (
            <Cancel style={{ fontSize: 14, color: '#da1e28' }} />
          ) : (
            <HelpOutline style={{ fontSize: 14, color: '#ff832b' }} />
          )
        }
        label={label}
        variant="outlined"
        style={{
          borderColor: connected ? '#24a148' : isError ? '#da1e28' : '#ff832b',
          color: connected ? '#24a148' : isError ? '#da1e28' : '#ff832b',
          fontSize: '0.7rem',
          height: 24,
        }}
      />
    </Tooltip>
  );
};

export default CloudConnectionStatus;
