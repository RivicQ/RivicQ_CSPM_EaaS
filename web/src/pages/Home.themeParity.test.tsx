import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material';
import Home from './Home';
import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_SCAN_COPY,
  PUBLIC_ENGINE_STATIC_COPY,
  PUBLIC_STATUS_NEXT_MOVE,
} from '../data/publicInfrastructure';

const mockNavigate = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    backendReachable: false,
    demoLogin: jest.fn(async () => {}),
    isDemo: false,
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock('../services/api', () => ({
  cbomService: {
    triggerScan: jest.fn(),
    getScanStatus: jest.fn(),
    getScanReport: jest.fn(),
    getScanIntelligence: jest.fn(),
    getScanQiskit: jest.fn(),
  },
  gitHubScanService: {
    scanRepos: jest.fn(),
    getScanStatus: jest.fn(),
  },
}));

jest.mock('../components/brand/ArchifySurface', () => () => null);
jest.mock('../components/brand/ArchifySystemMaps', () => () => null);
jest.mock('../components/brand/NebulaBackdrop', () => () => null);
jest.mock('../components/home/HomeScanReport', () => () => null);
jest.mock('../components/home/ScanWorkflowStrip', () => () => null);
jest.mock('../motion/primitives', () => ({
  MotionSection: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const renderHome = () =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('Home dark nebula parity', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('locks the public front door to labelled dark-mode copy', () => {
    renderHome();

    expect(screen.queryByRole('button', { name: /switch to (dark|light) mode/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try the labelled demo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try the live demo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use community/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /read the docs/i })).toBeInTheDocument();
  });

  it('uses canonical public-engine copy and chips without duplicating one-off claims', () => {
    renderHome();

    expect(screen.getByText(PUBLIC_STATUS_NEXT_MOVE)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_STATIC_COPY)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_SCAN_COPY)).toBeInTheDocument();
    expect(screen.getAllByText(PUBLIC_ENGINE_CHIP_DEMO).length).toBeGreaterThan(0);
    expect(screen.queryByText(PUBLIC_ENGINE_DEMO_COPY)).not.toBeInTheDocument();
  });
});
