import { calculateAssetRisk, calculatePostureScore } from './scoring';

describe('RivicQ scoring engine', () => {
  it('calculates posture from contributors instead of a hardcoded score', () => {
    const low = calculatePostureScore({
      assets: 18742,
      openCritical: 0,
      openHigh: 0,
      exposed: 0,
      kevOpen: 0,
      failedCriticalControls: 0,
      quantumUnsafeShare: 0,
    });
    const high = calculatePostureScore({
      assets: 18742,
      openCritical: 49,
      openHigh: 279,
      exposed: 317,
      kevOpen: 14,
      failedCriticalControls: 6,
      quantumUnsafeShare: 0.35,
    });
    expect(low.score).toBe(100);
    expect(high.score).toBeLessThan(low.score);
    expect(high.contributors.length).toBeGreaterThan(0);
    expect(high.score).toBeGreaterThan(50);
    expect(high.score).toBeLessThan(95);
  });

  it('explains asset risk with labeled contributors', () => {
    const risk = calculateAssetRisk({
      criticalCve: true,
      kev: true,
      internetExposed: true,
      privilegedIam: true,
      misconfig: true,
      quantumUnsafe: true,
    });
    expect(risk.score).toBe(99);
    expect(risk.level).toBe('CRITICAL');
    expect(risk.contributors.find((c) => c.label === 'Critical CVE')?.points).toBe(30);
    expect(risk.contributors.find((c) => c.label === 'CISA KEV')?.points).toBe(10);
  });
});
