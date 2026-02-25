import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ibmCloudService } from '../services/api';

type HSMProvider = 'ibm' | 'aws' | 'gcp';

interface HSMStatusSummary {
  provider: HSMProvider;
  healthy: boolean;
  keyCount: number;
  fipsLevel: number;
  region: string;
  lastChecked: Date;
}

/**
 * useHSMStatus fetches IBM HPCS status and key inventory,
 * and provides an attestation trigger for individual keys.
 */
export function useHSMStatus(provider: HSMProvider = 'ibm') {
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: statusLoading, isError: statusError } = useQuery({
    queryKey: ['hsmStatus', provider],
    queryFn: () => ibmCloudService.getHPCSStatus(),
    refetchInterval: 60_000,
    retry: 1,
    enabled: provider === 'ibm',
  });

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['hsmKeys', provider],
    queryFn: () => ibmCloudService.getKeyInventory(),
    staleTime: 30_000,
    enabled: provider === 'ibm',
  });

  const attestMutation = useMutation({
    mutationFn: (keyId: string) => ibmCloudService.attestKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsmKeys', provider] });
    },
  });

  const status: HSMStatusSummary | null = statusData?.data
    ? {
        provider,
        healthy: statusData.data.state === 'active',
        keyCount: statusData.data.key_count ?? (keysData?.data?.length ?? 0),
        fipsLevel: statusData.data.fips_level ?? 4,
        region: statusData.data.region ?? 'eu-de',
        lastChecked: new Date(),
      }
    : null;

  return {
    status,
    keys: keysData?.data ?? [],
    isLoading: statusLoading || keysLoading,
    isError: statusError,
    attestKey: (keyId: string) => attestMutation.mutate(keyId),
    isAttesting: attestMutation.isPending,
    attestResult: attestMutation.data?.data ?? null,
  };
}
