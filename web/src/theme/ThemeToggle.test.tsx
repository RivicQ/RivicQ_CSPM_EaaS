import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import ThemeToggle from './ThemeToggle';

const wrap = (ui: React.ReactElement, mode: 'light' | 'dark') =>
  render(<ThemeProvider theme={createTheme({ palette: { mode } })}>{ui}</ThemeProvider>);

describe('ThemeToggle', () => {
  it('offers a light-mode switch when dark is active', async () => {
    const onToggle = jest.fn();
    wrap(<ThemeToggle mode="dark" onToggle={onToggle} compact />, 'dark');

    const button = screen.getByRole('button', { name: /switch to light mode/i });
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('offers a dark-mode switch when light is active', async () => {
    const onToggle = jest.fn();
    wrap(<ThemeToggle mode="light" onToggle={onToggle} compact />, 'light');

    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
