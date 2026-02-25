import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { quantumAttestationService } from '../services/api';

interface QuantumScanState {
  scanId: string | null;
  status: 'idle' | 'scanning' | 'complete' | 'error';
  progress: number;
  error: string | null;
}

/**
 * useQuantumScan provides controls for initiating quantum PQC scans
 * and streaming their progress via SSE.
 */
export function useQuantumScan(assetIds: string[] = []) {
  const [scanState, setScanState] = useState<QuantumScanState>({
    scanId: null,
    status: 'idle',
    progress: 0,
    error: null,
  });

  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ['quantumAssessment'],
    queryFn: () => quantumAttestationService.getQuantumRiskAssessment(),
    staleTime: 60_000,
  });

  const scanMutation = useMutation({
    mutationFn: (ids: string[]) => quantumAttestationService.scanForPQCAlgorithms(ids),
    onMutate: () => {
      setScanState({ scanId: null, status: 'scanning', progress: 0, error: null });
    },
    onSuccess: (data: any) => {
      const id = data?.data?.scan_id ?? null;
      setScanState((prev) => ({ ...prev, scanId: id, status: 'scanning', progress: 10 }));
    },
    onError: (err: any) => {
      setScanState((prev) => ({
        ...prev,
        status: 'error',
        error: err?.message ?? 'Quantum scan failed',
      }));
    },
  });

  const startScan = useCallback(
    (ids?: string[]) => scanMutation.mutate(ids ?? assetIds),
    [assetIds, scanMutation]
  );

  const reset = useCallback(() => {
    setScanState({ scanId: null, status: 'idle', progress: 0, error: null });
  }, []);

  return {
    ...scanState,
    assessment: assessment?.data ?? null,
    assessmentLoading,
    startScan,
    reset,
    isScanning: scanMutation.isPending,
  };
}
