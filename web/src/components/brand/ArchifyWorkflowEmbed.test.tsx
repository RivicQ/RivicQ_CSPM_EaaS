import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import ArchifyWorkflowEmbed from './ArchifyWorkflowEmbed';

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>{ui}</ThemeProvider>,
);

describe('ArchifyWorkflowEmbed', () => {
  it('keeps the console reference to a single line without an iframe', () => {
    wrap(<ArchifyWorkflowEmbed compact diagramId="operator" />);
    const bar = document.querySelector('[data-embed="bar"]');
    expect(bar).toBeTruthy();
    expect(bar?.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: /open map/i })).toHaveAttribute('href', expect.stringContaining('rivicq-cspm-operator-workflow.html'));
  });

  it('uses a short plate on website pages', () => {
    wrap(<ArchifyWorkflowEmbed diagramId="architecture" />);
    const plate = document.querySelector('[data-embed="plate"]');
    expect(plate).toBeTruthy();
    expect(plate?.querySelector('iframe')).toBeTruthy();
    expect(document.querySelector('[data-embed="bar"]')).toBeNull();
  });
});
