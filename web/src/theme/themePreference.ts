export type ThemeChoice = 'auto' | 'harbor' | 'ledger';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'rivicq.theme';

export function normalizeChoice(value: string | null | undefined): ThemeChoice {
  switch (value) {
    case 'harbor':
    case 'dark':
      return 'harbor';
    case 'ledger':
    case 'light':
      return 'ledger';
    case 'auto':
    case '':
    case null:
    case undefined:
      return 'auto';
    default:
      return 'auto';
  }
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  switch (choice) {
    case 'harbor':
      return 'dark';
    case 'ledger':
      return 'light';
    case 'auto':
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
      return 'dark';
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}

export function choiceLabel(choice: ThemeChoice): string {
  switch (choice) {
    case 'auto':
      return 'Auto';
    case 'harbor':
      return 'Harbor';
    case 'ledger':
      return 'Ledger';
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}

export function cycleChoice(choice: ThemeChoice): ThemeChoice {
  switch (choice) {
    case 'auto':
      return 'harbor';
    case 'harbor':
      return 'ledger';
    case 'ledger':
      return 'auto';
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}

export function readStoredChoice(): ThemeChoice {
  try {
    return normalizeChoice(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

export function persistChoice(choice: ThemeChoice): ResolvedTheme {
  const mode = resolveTheme(choice);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-theme-choice', choice);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'light' ? '#F3EFE6' : '#101614');
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* storage blocked */
  }
  return mode;
}
