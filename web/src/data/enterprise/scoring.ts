import type { ScoreBreakdown, SimulatedAsset } from './types';

/**
 * Transparent posture model. Every point is documented so a user can ask
 * "why is this environment / asset scored this way?"
 *
 * Posture is 100 minus capped penalties. It is CALCULATED, never hardcoded.
 */
export const POSTURE_METHOD =
  'posture = 100 − min-capped penalties from open critical/high findings, internet exposure, CISA KEV presence, failed critical controls, and quantum-unsafe crypto share.';

export function calculatePostureScore(input: {
  assets: number;
  openCritical: number;
  openHigh: number;
  exposed: number;
  kevOpen: number;
  failedCriticalControls: number;
  quantumUnsafeShare: number;
}): ScoreBreakdown {
  const contributors: Array<{ label: string; points: number }> = [];

  const add = (label: string, raw: number, cap: number) => {
    const points = Math.min(cap, Math.max(0, Math.round(raw * 10) / 10));
    if (points > 0) contributors.push({ label, points });
    return points;
  };

  const perThousand = input.assets > 0 ? 1000 / input.assets : 0;
  add('Open critical findings', input.openCritical * 0.14, 18);
  add('Open high findings', input.openHigh * 0.014, 12);
  add('Internet-exposed assets', input.exposed * perThousand * 0.22, 10);
  add('Open CISA KEV vulnerabilities', input.kevOpen * 0.45, 8);
  add('Failed critical compliance controls', input.failedCriticalControls * 0.7, 10);
  add('Quantum-unsafe crypto share', input.quantumUnsafeShare * 8, 8);

  const totalPenalty = contributors.reduce((s, c) => s + c.points, 0);
  const score = Math.max(0, Math.min(100, Math.round((100 - totalPenalty) * 10) / 10));
  return { score, contributors, method: POSTURE_METHOD };
}

export function calculateAssetRisk(flags: {
  criticalCve: boolean;
  kev: boolean;
  internetExposed: boolean;
  privilegedIam: boolean;
  misconfig: boolean;
  quantumUnsafe: boolean;
}): { score: number; level: SimulatedAsset['riskLevel']; contributors: Array<{ label: string; points: number }> } {
  const contributors: Array<{ label: string; points: number }> = [];
  const add = (label: string, points: number) => {
    if (points) contributors.push({ label, points });
  };
  add('Critical CVE', flags.criticalCve ? 30 : 0);
  add('Internet exposure', flags.internetExposed ? 20 : 0);
  add('Privileged IAM role', flags.privilegedIam ? 18 : 0);
  add('Misconfiguration', flags.misconfig ? 13 : 0);
  add('CISA KEV', flags.kev ? 10 : 0);
  add('Quantum-unsafe cryptography', flags.quantumUnsafe ? 8 : 0);
  const score = Math.min(100, contributors.reduce((s, c) => s + c.points, 0));
  const level: SimulatedAsset['riskLevel'] =
    score >= 70 ? 'CRITICAL' : score >= 45 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
  return { score, level, contributors };
}

export function meanTimeToRemediateHours(resolved: Array<{ discoveredAt: string; resolvedAt: string }>): number {
  if (!resolved.length) return 0;
  const hours = resolved.map((r) => {
    const d = Date.parse(r.resolvedAt) - Date.parse(r.discoveredAt);
    return d / 36e5;
  });
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  return Math.round(avg * 10) / 10;
}
