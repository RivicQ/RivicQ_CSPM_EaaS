export type ThemePreference = 'auto' | 'nebula' | 'day';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'rivicq.theme';
const ORDER: ThemePreference[] = ['auto', 'nebula', 'day'];

export const THEME_LABEL: Record<ThemePreference, string> = {
  auto: 'Auto',
  nebula: 'Nebula',
  day: 'Day',
};

export function normalizePreference(raw: string | null | undefined): ThemePreference {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'day' || value === 'light' || value === 'ledger') return 'day';
  if (value === 'auto' || value === 'system') return 'auto';
  return 'nebula';
}

export function readPreference(): ThemePreference {
  try {
    return normalizePreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'nebula';
  }
}

export function writePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

export function resolveMode(pref: ThemePreference, prefersLight?: boolean): ResolvedTheme {
  if (pref === 'day') return 'light';
  if (pref === 'nebula') return 'dark';
  if (prefersLight === true) return 'light';
  if (prefersLight === false) return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function nextPreference(pref: ThemePreference): ThemePreference {
  const i = ORDER.indexOf(pref);
  return ORDER[(i + 1) % ORDER.length];
}

export function applyThemeDom(pref: ThemePreference, resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved === 'dark' ? 'nebula' : 'day');
  root.setAttribute('data-theme-pref', pref);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#f4f0fb');
}
