import React from 'react';
import fs from 'fs';
import path from 'path';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Home from './Home';
import { CLIENT_DEMO_TOKEN, DEMO_STORAGE_KEY } from '../demo/constants';
import { ThemeModeProvider } from '../theme/ThemeContext';

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
jest.mock('../components/brand/ArchifySystemMaps', () => () => null);
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

  it('renders the one-product sections and exposes the real theme toggle', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
        <ThemeModeProvider mode="light" toggleMode={jest.fn()}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </ThemeModeProvider>
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Know what cryptography protects your business/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /One path from finding to evidence/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Public pages explain it/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Shared engine\. Different control plane\./i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Read the system, not a sales graphic\./i })).toBeInTheDocument();
    expect(screen.getByText(/Control mappings \(not certifications\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to dark mode/i })).toBeInTheDocument();
    expect(screen.queryByText(/Security score/i)).toBeNull();
  });

  it('uses Prism surface tokens instead of hardcoded dark-only colors', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'Home.tsx'), 'utf8');
    expect(source).not.toMatch(/#000000|#0a0a0f|#7c3aed/i);
    expect(source).toContain('NEBULA.ink');
  });
});
