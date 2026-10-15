import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';

type Props = {
  mode: 'light' | 'dark';
  onToggle: () => void;
  compact?: boolean;
};

const ThemeToggle: React.FC<Props> = ({ mode, onToggle, compact = false }) => {
  const current = mode === 'dark' ? 'Harbor' : 'Ledger';
  const next = mode === 'dark' ? 'Ledger' : 'Harbor';
  return (
    <Tooltip title={`Switch to ${next}`}>
      <Button
        onClick={onToggle}
        size="small"
        aria-label={`Theme ${current}. Switch to ${next}`}
        startIcon={mode === 'light' ? <DarkMode sx={{ fontSize: 16 }} /> : <LightMode sx={{ fontSize: 16 }} />}
        sx={{
          borderRadius: 999,
          border: '1px solid var(--rq-line)',
          bgcolor: 'var(--rq-surface)',
          color: 'var(--rq-text)',
          WebkitTextFillColor: 'var(--rq-text)',
          minHeight: compact ? 36 : 40,
          px: compact ? 1.25 : 1.5,
          fontWeight: 650,
          letterSpacing: '0.01em',
          '&:hover': { bgcolor: 'var(--rq-nav-hover)', borderColor: 'var(--rq-accent)' },
        }}
      >
        {current}
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;
