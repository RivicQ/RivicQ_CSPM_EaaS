import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import ScanReportPanel from './ScanReportPanel';

const wrap = (ui: React.ReactElement) => render(
  <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>{ui}</ThemeProvider>,
);

describe('ScanReportPanel', () => {
  it('shows the three waiting phases before a scan', () => {
    wrap(<ScanReportPanel showIdle />);
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Mitigate')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getAllByText('waiting')).toHaveLength(3);
    expect(screen.getByText(/not binary reverse engineering/i)).toBeInTheDocument();
  });

  it('replaces the idle copy with scan intelligence', () => {
    wrap(
      <ScanReportPanel
        showIdle
        architecture={{
          target_class: 'website',
          edition: 'community',
          honesty: 'Static metadata only.',
          phases: [
            { id: 'discover', title: 'Discover', status: 'complete', summary: 'TLS and HTTPS ran.' },
            { id: 'mitigate', title: 'Mitigate', status: 'partial', summary: 'RSA maps to ML-KEM.' },
            { id: 'report', title: 'Report', status: 'complete', summary: 'CBOM is ready.' },
          ],
        }}
      />,
    );
    expect(screen.getByText('TLS and HTTPS ran.')).toBeInTheDocument();
    expect(screen.queryByText('waiting')).toBeNull();
    expect(screen.getByText('website')).toBeInTheDocument();
  });
});
