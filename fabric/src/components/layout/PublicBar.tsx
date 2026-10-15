import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Mark from '../../brand/Mark';

const THEME_KEY = 'rivicq.theme';

type ThemeChoice = 'auto' | 'nebula' | 'day';

function normalizeChoice(value: string | null): ThemeChoice {
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
      return 'nebula';
    default:
      return 'nebula';
  }
}

function resolveChoice(choice: ThemeChoice): 'light' | 'dark' {
  switch (choice) {
    case 'nebula':
      return 'dark';
    case 'day':
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

const CHOICES: ThemeChoice[] = ['auto', 'nebula', 'day'];

export const ThemeToggle: React.FC = () => {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      return normalizeChoice(localStorage.getItem(THEME_KEY));
    } catch {
      return 'nebula';
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
