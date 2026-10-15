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

  it('normalizes legacy dark and light values', () => {
    expect(normalizeChoice('dark')).toBe('harbor');
    expect(normalizeChoice('light')).toBe('ledger');
    expect(normalizeChoice(null)).toBe('auto');
    expect(normalizeChoice('nope')).toBe('auto');
  });

  it('follows the OS in auto and pins Harbor and Ledger', () => {
    setScheme(true);
    expect(resolveTheme('auto')).toBe('light');
    setScheme(false);
    expect(resolveTheme('auto')).toBe('dark');
    expect(resolveTheme('harbor')).toBe('dark');
    expect(resolveTheme('ledger')).toBe('light');
  });

  it('cycles Auto, Harbor, Ledger', () => {
    expect(cycleChoice('auto')).toBe('harbor');
    expect(cycleChoice('harbor')).toBe('ledger');
    expect(cycleChoice('ledger')).toBe('auto');
    expect(choiceLabel('auto')).toBe('Auto');
  });

  it('persists the choice and the resolved palette', () => {
    persistChoice('ledger');
    expect(localStorage.getItem('rivicq.theme')).toBe('ledger');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-choice')).toBe('ledger');
  });
});
