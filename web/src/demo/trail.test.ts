import { CLIENT_DEMO_TOKEN, isClientDemoToken } from './constants';
import { clampTrailStep, DEMO_TRAIL_STEPS, trailStepByPath } from './trail';

describe('demo trail', () => {
  it('has eight guided steps with unique ids and real routes', () => {
    expect(DEMO_TRAIL_STEPS).toHaveLength(8);
    const ids = DEMO_TRAIL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    DEMO_TRAIL_STEPS.forEach((s) => {
      expect(s.path.startsWith('/')).toBe(true);
      expect(s.title.length).toBeGreaterThan(4);
      expect(s.body.length).toBeGreaterThan(20);
    });
  });

  it('clamps step indexes', () => {
    expect(clampTrailStep(-3)).toBe(0);
    expect(clampTrailStep(99)).toBe(DEMO_TRAIL_STEPS.length - 1);
    expect(clampTrailStep(2)).toBe(2);
  });

  it('maps product routes back to trail steps', () => {
    expect(trailStepByPath('/dashboard')).toBeGreaterThan(0);
    expect(trailStepByPath('/scanner')).toBeGreaterThan(0);
    expect(trailStepByPath('/nope')).toBe(-1);
  });

  it('does not disguise the client demo marker as a JWT', () => {
    expect(CLIENT_DEMO_TOKEN.includes('.')).toBe(false);
    expect(isClientDemoToken(CLIENT_DEMO_TOKEN)).toBe(true);
    expect(isClientDemoToken('eyJhbGciOiJIUzI1NiJ9.e30.sig')).toBe(false);
  });
});
