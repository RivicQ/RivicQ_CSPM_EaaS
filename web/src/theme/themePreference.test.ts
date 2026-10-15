import { choiceLabel, cycleChoice, normalizeChoice, persistChoice, resolveTheme } from './themePreference';

function setScheme(light: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: light && query.includes('light'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-choice');
    setScheme(false);
  });

  it('defaults to nebula and keeps legacy harbor and ledger values', () => {
    expect(normalizeChoice('dark')).toBe('nebula');
    expect(normalizeChoice('harbor')).toBe('nebula');
    expect(normalizeChoice('light')).toBe('day');
    expect(normalizeChoice('ledger')).toBe('day');
    expect(normalizeChoice(null)).toBe('nebula');
    expect(normalizeChoice('auto')).toBe('auto');
    expect(normalizeChoice('nope')).toBe('nebula');
  });

  it('follows the OS in auto and pins Nebula and Day', () => {
    setScheme(true);
    expect(resolveTheme('auto')).toBe('light');
    setScheme(false);
    expect(resolveTheme('auto')).toBe('dark');
    expect(resolveTheme('nebula')).toBe('dark');
    expect(resolveTheme('day')).toBe('light');
  });

  it('cycles Auto, Nebula, Day', () => {
    expect(cycleChoice('auto')).toBe('nebula');
    expect(cycleChoice('nebula')).toBe('day');
    expect(cycleChoice('day')).toBe('auto');
    expect(choiceLabel('nebula')).toBe('Nebula');
    expect(choiceLabel('day')).toBe('Day');
  });

  it('persists the choice and the resolved palette', () => {
    persistChoice('day');
    expect(localStorage.getItem('rivicq.theme')).toBe('day');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-choice')).toBe('day');
    persistChoice('nebula');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
