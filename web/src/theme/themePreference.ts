export type ThemeChoice = 'auto' | 'nebula' | 'day';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'rivicq.theme';

const NEBULA_CANVAS = '#05040a';
const DAY_CANVAS = '#f6f3fb';

export function normalizeChoice(value: string | null | undefined): ThemeChoice {
  switch (value) {
    case 'nebula':
    case 'harbor':
    case 'dark':
      return 'nebula';
    case 'day':
    case 'ledger':
    case 'light':
      return 'day';
    case 'auto':
      return 'auto';
    case '':
    case null:
    case undefined:
      return 'nebula';
    default:
      return 'nebula';
  }
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  switch (choice) {
    case 'nebula':
      return 'dark';
    case 'day':
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
    case 'nebula':
      return 'Nebula';
    case 'day':
      return 'Day';
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}

export function cycleChoice(choice: ThemeChoice): ThemeChoice {
  switch (choice) {
    case 'auto':
      return 'nebula';
    case 'nebula':
      return 'day';
    case 'day':
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
    return 'nebula';
  }
}

export function persistChoice(choice: ThemeChoice): ResolvedTheme {
  const mode = resolveTheme(choice);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-theme-choice', choice);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'light' ? DAY_CANVAS : NEBULA_CANVAS);
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* storage blocked */
  }
  return mode;
}
