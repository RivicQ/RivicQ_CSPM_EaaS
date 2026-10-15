import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Mark from '../../brand/Mark';

const THEME_KEY = 'rivicq.theme';

type ThemeChoice = 'auto' | 'harbor' | 'ledger';

function normalizeChoice(value: string | null): ThemeChoice {
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
      return 'auto';
    default:
      return 'auto';
  }
}

function resolveChoice(choice: ThemeChoice): 'light' | 'dark' {
  switch (choice) {
    case 'harbor':
      return 'dark';
    case 'ledger':
      return 'light';
    case 'auto':
      return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}

function choiceLabel(choice: ThemeChoice): string {
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

export function readTheme(): 'light' | 'dark' {
  const current = document.documentElement.getAttribute('data-theme');
  return current === 'light' ? 'light' : 'dark';
}

export function applyTheme(choice: ThemeChoice) {
  const mode = resolveChoice(choice);
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.setAttribute('data-theme-choice', choice);
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* storage blocked */
  }
}

const CHOICES: ThemeChoice[] = ['auto', 'harbor', 'ledger'];

export const ThemeToggle: React.FC = () => {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      return normalizeChoice(localStorage.getItem(THEME_KEY));
    } catch {
      return 'auto';
    }
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (normalizeChoice(localStorage.getItem(THEME_KEY)) === 'auto') {
        applyTheme('auto');
        setChoice('auto');
      }
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  return (
    <div className="theme-choice" role="group" aria-label="Color scheme">
      {CHOICES.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={item === choice}
          onClick={() => {
            applyTheme(item);
            setChoice(item);
          }}
        >
          {choiceLabel(item)}
        </button>
      ))}
    </div>
  );
};

const PublicBar: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="public-bar">
    <Link to="/" className="mark">
      <Mark size={32} />
      <div>
        <strong>GRAPH</strong>
        <span>RivicQ Graph</span>
      </div>
    </Link>
    <div className="btn-row">
      {children}
      <ThemeToggle />
    </div>
  </div>
);

export default PublicBar;
