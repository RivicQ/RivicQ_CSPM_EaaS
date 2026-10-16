import { nextPreference, normalizePreference, resolveMode } from './preference';

describe('theme preference', () => {
  it('maps legacy Harbor/Ledger and dark/light names', () => {
    expect(normalizePreference('harbor')).toBe('nebula');
    expect(normalizePreference('dark')).toBe('nebula');
    expect(normalizePreference('ledger')).toBe('day');
    expect(normalizePreference('light')).toBe('day');
    expect(normalizePreference('auto')).toBe('auto');
  });

  it('defaults unknown values to nebula', () => {
    expect(normalizePreference('')).toBe('nebula');
    expect(normalizePreference('violet')).toBe('nebula');
  });

  it('resolves auto from the device, nebula to dark, day to light', () => {
    expect(resolveMode('nebula')).toBe('dark');
    expect(resolveMode('day')).toBe('light');
    expect(resolveMode('auto', true)).toBe('light');
    expect(resolveMode('auto', false)).toBe('dark');
  });

  it('cycles Auto → Nebula → Day', () => {
    expect(nextPreference('auto')).toBe('nebula');
    expect(nextPreference('nebula')).toBe('day');
    expect(nextPreference('day')).toBe('auto');
  });
});
