import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import PageFrame from './PageFrame';

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>{ui}</ThemeProvider>,
);

describe('PageFrame', () => {
  it('renders standard header, breadcrumbs, badge and content slots', () => {
    wrap(
      <PageFrame
        eyebrow="Console"
        title="Command Center"
        subtitle="Tenant-scoped cryptographic posture"
        badge="Live"
        breadcrumbs={<span>Workspace / Command Center</span>}
        action={<button type="button">Scan now</button>}
      >
        <div>Scan evidence</div>
      </PageFrame>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Command Center' })).toBeInTheDocument();
    expect(screen.getByText('Workspace / Command Center')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan now' })).toBeInTheDocument();
    expect(screen.getByText('Scan evidence')).toBeInTheDocument();
  });
});
