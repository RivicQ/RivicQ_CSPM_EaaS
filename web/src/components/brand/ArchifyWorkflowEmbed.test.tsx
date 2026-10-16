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
    expect(screen.queryByTitle('RivicQ operator workflow preview')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open map/i })).toHaveAttribute(
      'href',
      expect.stringContaining('rivicq-cspm-operator-workflow.html'),
    );
    expect(screen.getByText('How does an operator scan run?')).toBeInTheDocument();
  });

  it('uses a short plate on website pages', () => {
    wrap(<ArchifyWorkflowEmbed diagramId="architecture" />);
    expect(screen.getByTitle('RivicQ Platform Architecture preview')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open diagram/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open map/i })).not.toBeInTheDocument();
  });
});
