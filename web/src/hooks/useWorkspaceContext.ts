import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  analyticsService,
  complianceService,
  cspmService,
  inventoryService,
  postureService,
  securityService,
} from '../services/api';
import { Edition, isPaidEdition } from '../config/editions';
import type { WorkspaceContext } from '../types/assistant';

function pick<T>(result: PromiseSettledResult<unknown>, fallback?: T): T | undefined {
  if (result.status !== 'fulfilled') return fallback;
  const value = result.value as { data?: T };
  return value?.data ?? fallback;
}

export function useWorkspaceContext(edition: Edition) {
  const location = useLocation();
  const [context, setContext] = useState<WorkspaceContext | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setLastError(null);
    try {
      const paid = isPaidEdition(edition);
      const [
        summaryRes,
        assetsRes,
        cloudRes,
        eventsRes,
        complianceRes,
        cspmRes,
        insightsRes,
      ] = await Promise.allSettled([
        inventoryService.getInventorySummary(),
        inventoryService.getAssets(),
        postureService.getResourcesSummary(),
        securityService.getEvents(),
        paid ? complianceService.getAllDashboards() : Promise.reject(new Error('skip')),
        paid ? cspmService.getOverview() : Promise.reject(new Error('skip')),
        analyticsService.getInsights(),
      ]);

      const summary = pick<any>(summaryRes);
      const assetsPayload = pick<any>(assetsRes);
      const cloud = pick<any>(cloudRes);
      const eventsPayload = pick<any>(eventsRes);
      const compliancePayload = pick<any>(complianceRes);
      const cspm = pick<any>(cspmRes);
      const insights = pick<any>(insightsRes);

      const assets = Array.isArray(assetsPayload?.assets)
        ? assetsPayload.assets
        : Array.isArray(assetsPayload)
          ? assetsPayload
          : [];

      const events = Array.isArray(eventsPayload?.events)
        ? eventsPayload.events
        : Array.isArray(eventsPayload)
          ? eventsPayload
          : [];

      const frameworks = Array.isArray(compliancePayload?.dashboards)
        ? compliancePayload.dashboards
        : Array.isArray(compliancePayload)
          ? compliancePayload
          : [];

      const next: WorkspaceContext = {
        scannedAt: new Date().toISOString(),
        page: location.pathname,
        edition,
        inventory: summary
          ? {
              totalAssets: summary.total_assets ?? summary.totalAssets,
              complianceScore: summary.compliance_score ?? summary.complianceScore,
              quantumSafeCount: summary.quantum_safe_count ?? summary.quantumSafeCount,
              nonQuantumSafe: summary.non_quantum_safe ?? summary.nonQuantumSafe,
              vulnerableAssets: summary.vulnerable_assets ?? summary.vulnerableAssets,
              byCategory: summary.by_category ?? summary.byCategory,
              byCloudProvider: summary.by_cloud_provider ?? summary.byCloudProvider,
            }
          : undefined,
        assets: assets.slice(0, 12).map((a: any) => ({
          id: a.id,
          name: a.name,
          risk_level: a.risk_level ?? a.riskLevel,
          quantum_safe: a.quantum_safe ?? a.quantumSafe,
          algorithm: a.algorithm ?? a.crypto_algorithm,
          cloud_provider: a.cloud_provider ?? a.cloudProvider,
        })),
        cloud: cloud
          ? {
              totalResources: cloud.total_resources ?? cloud.totalResources,
              byProvider: cloud.by_provider ?? cloud.byProvider,
              securityFindings: cloud.security_findings ?? cloud.securityFindings,
              scanCoverage: cloud.scan_coverage ?? cloud.scanCoverage,
              scansToday: cloud.scans_today ?? cloud.scansToday,
            }
          : undefined,
        security: {
          events: events.slice(0, 8).map((e: any) => ({
            severity: e.severity,
            message: e.message ?? e.description ?? e.title,
            title: e.title,
          })),
          threats: insights,
        },
        compliance: compliancePayload
          ? {
              overallScore:
                compliancePayload.summary?.overall_score ??
                compliancePayload.overall_score ??
                compliancePayload.overallScore,
              frameworks: frameworks.slice(0, 8).map((f: any) => ({
                name: f.name ?? f.framework,
                framework: f.framework,
                score: f.score,
              })),
              criticalFindings:
                compliancePayload.summary?.critical_findings ??
                compliancePayload.critical_findings,
            }
          : undefined,
        cspm: cspm as Record<string, unknown> | undefined,
      };

      setContext(next);
    } catch (err: any) {
      setLastError(err?.message || 'Workspace scan failed');
    } finally {
      setScanning(false);
    }
  }, [edition, location.pathname]);

  useEffect(() => {
    void scan();
  }, [scan]);

  return { context, scanning, scan, lastError };
}
