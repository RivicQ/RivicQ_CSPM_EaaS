import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Home from './Home';
import { CLIENT_DEMO_TOKEN, DEMO_STORAGE_KEY } from '../demo/constants';
import { cbomService } from '../services/api';

const mockDemoLogin = jest.fn(async () => {
  localStorage.setItem(DEMO_STORAGE_KEY, '1');
  localStorage.setItem('auth_token', CLIENT_DEMO_TOKEN);
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    backendReachable: false,
    demoLogin: mockDemoLogin,
    isDemo: false,
  }),
}));

jest.mock('../services/api', () => {
  const findings = {
    total: 3,
    critical: 1,
    high: 1,
    medium: 1,
    low: 0,
  };
  const finding_items = [
    { title: 'Legacy SHA-1 certificate signature detected', severity: 'critical', protocol: 'https' },
    { title: 'RSA-2048 certificate key offered on TLS', severity: 'high', protocol: 'https' },
  ];
  let progress = 0;
  return {
    cbomService: {
      triggerScan: jest.fn(async () => ({ data: { scan_id: 'demo-test1' } })),
      getScanStatus: jest.fn(async () => {
        progress = Math.min(100, progress + 50);
        const completed = progress >= 100;
        return {
          data: {
            status: completed ? 'completed' : 'running',
            progress,
            findings: completed ? findings : { total: 0 },
            finding_items: completed ? finding_items : [],
            resources: { web: true },
          },
        };
      }),
      getScanReport: jest.fn(async () => ({ data: { findings: finding_items } })),
      getScanIntelligence: jest.fn(async () => ({ data: {} })),
      getScanQiskit: jest.fn(async () => ({ data: { qiskit: { estate_score: 0.6 }, audit_score: { overall: 0.7 } } })),
    },
    gitHubScanService: {
      scanRepos: jest.fn(),
      getScanStatus: jest.fn(),
    },
  };
});

jest.mock('../components/brand/ArchifyWorkflowEmbed', () => () => null);
jest.mock('../components/brand/NebulaBackdrop', () => ({ children }: { children?: React.ReactNode }) => <>{children}</>);
jest.mock('../motion/primitives', () => ({
  MotionSection: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('Home static Pages scan fallback', () => {
  beforeEach(() => {
    localStorage.clear();
    mockDemoLogin.mockClear();
    (cbomService.triggerScan as jest.Mock).mockImplementation(async () => ({ data: { scan_id: 'demo-test1' } }));
  });

  it('enables Run demo scan and auto-starts interactive demo', async () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </ThemeProvider>
    );

    const runBtn = screen.getByRole('button', { name: /Run demo scan/i });
    expect(runBtn).toBeEnabled();
    expect(screen.queryByText(/Run disabled here/i)).toBeNull();
    expect(screen.getAllByText(/Static Pages · demo scan ready|demo scan starts the interactive demo/i).length).toBeGreaterThan(0);

    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(mockDemoLogin).toHaveBeenCalledWith('community');
    });
    await waitFor(() => {
      expect(cbomService.triggerScan).toHaveBeenCalledWith(
        expect.stringMatching(/demo\.example\.com|example\.com|github/),
        expect.any(String),
      );
    });
  });
});
