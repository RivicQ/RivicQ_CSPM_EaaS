import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import HomeScanReport from './HomeScanReport';
import { PUBLIC_ENGINE_CHIP_DISCONNECTED, PUBLIC_ENGINE_SCAN_COPY } from '../../data/publicInfrastructure';

const mockAuthValue: any = {};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

const renderErrorReport = () =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <HomeScanReport status="error" progress={0} onOpenApp={jest.fn()} onRegister={jest.fn()} />
    </ThemeProvider>
  );

describe('HomeScanReport scan errors', () => {
  beforeEach(() => {
    Object.assign(mockAuthValue, { backendReachable: true, isDemo: false });
  });

  it('uses generic scan-error copy when a configured engine is reachable', () => {
    renderErrorReport();

    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.getByText(/The scan request could not be completed/i)).toBeInTheDocument();
    expect(screen.queryByText(PUBLIC_ENGINE_SCAN_COPY)).not.toBeInTheDocument();
    expect(screen.queryByText(/static build has no CBOM engine/i)).not.toBeInTheDocument();
  });

  it('reserves static-build copy for a genuinely unreachable engine', () => {
    Object.assign(mockAuthValue, { backendReachable: false });
    renderErrorReport();

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_DISCONNECTED)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_SCAN_COPY)).toBeInTheDocument();
    expect(screen.queryByText(/The scan request could not be completed/i)).not.toBeInTheDocument();
  });
});
