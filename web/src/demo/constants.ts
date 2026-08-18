/** Client-only demo session marker used on static Pages when no API is reachable. Not a JWT. */
export const CLIENT_DEMO_TOKEN = 'rivicq-demo-session';

export const DEMO_STORAGE_KEY = 'rivicq.demo';
export const TRAIL_ACTIVE_KEY = 'rivicq.trail.active';
export const TRAIL_STEP_KEY = 'rivicq.trail.step';

export function isClientDemoToken(token: string | null | undefined): boolean {
  return token === CLIENT_DEMO_TOKEN;
}
