import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Home from './Home';
import { CLIENT_DEMO_TOKEN, DEMO_STORAGE_KEY } from '../demo/constants';

const mockDemoLogin = jest.fn(async () => {
  localStorage.setItem(DEMO_STORAGE_KEY, '1');
  localStorage.setItem('auth_token', CLIENT_DEMO_TOKEN);
});

const mockNavigate = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    backendReachable: false,
    demoLogin: mockDemoLogin,
    isDemo: false,
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
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

jest.mock('../components/brand/ArchifyWorkflowEmbed', () => () => null);
jest.mock('../components/brand/NebulaBackdrop', () => ({ children }: { children?: React.ReactNode }) => <>{children}</>);
jest.mock('../motion/primitives', () => ({
  MotionSection: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('Home static Pages scan fallback', () => {
  beforeEach(() => {
    localStorage.clear();
    mockDemoLogin.mockClear();
    mockNavigate.mockClear();
  });

  it('enables Run demo scan and routes into the Scanner console', async () => {
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
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/scanner\?target=.*autostart=1/));
    });
  });
});
