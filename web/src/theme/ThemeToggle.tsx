import React from 'react';
import { Button, Stack } from '@mui/material';
import { ThemeChoice, choiceLabel } from './themePreference';

type Props = {
  choice: ThemeChoice;
  onChoose: (choice: ThemeChoice) => void;
  compact?: boolean;
};

const CHOICES: ThemeChoice[] = ['auto', 'nebula', 'day'];

const ThemeToggle: React.FC<Props> = ({ choice, onChoose, compact = false }) => {
  return (
    <Stack
      direction="row"
      role="group"
      aria-label="Color scheme"
      sx={{
        border: '1px solid var(--rq-line)',
        borderRadius: 999,
        overflow: 'hidden',
        bgcolor: 'var(--rq-surface)',
        flexShrink: 0,
      }}
    >
      {CHOICES.map((item) => {
        const selected = item === choice;
        const label = choiceLabel(item);
        return (
          <Button
            key={item}
            size="small"
            onClick={() => onChoose(item)}
            aria-pressed={selected}
            sx={{
              minHeight: compact ? 32 : 36,
              minWidth: compact ? 0 : 64,
              px: compact ? 1 : 1.25,
              borderRadius: 0,
              color: 'var(--rq-text)',
              WebkitTextFillColor: 'var(--rq-text)',
              bgcolor: selected ? 'var(--rq-nav-active)' : 'transparent',
              fontWeight: selected ? 750 : 550,
              fontSize: compact ? 12 : 13,
              lineHeight: 1.2,
              '&:hover': { bgcolor: 'var(--rq-nav-hover)' },
            }}
          >
            {label}
          </Button>
        );
      })}
    </Stack>
  );
};

export default ThemeToggle;
