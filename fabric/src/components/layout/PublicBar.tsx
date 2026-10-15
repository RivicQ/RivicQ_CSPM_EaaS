import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Mark from '../../brand/Mark';

const THEME_KEY = 'rivicq.theme';

export function readTheme(): 'light' | 'dark' {
  const current = document.documentElement.getAttribute('data-theme');
  return current === 'light' ? 'light' : 'dark';
}

export function applyTheme(next: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage blocked */
  }
}

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);
  const current = theme === 'dark' ? 'Harbor' : 'Ledger';
  const next = theme === 'dark' ? 'Ledger' : 'Harbor';
  return (
    <button
      type="button"
      className="btn"
      aria-label={`Theme ${current}. Switch to ${next}`}
      onClick={() => {
        const value = theme === 'dark' ? 'light' : 'dark';
        applyTheme(value);
        setTheme(value);
      }}
    >
      {current}
    </button>
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
