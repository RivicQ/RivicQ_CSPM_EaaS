import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';
import { authService } from '../services/api';
import { DemoTrailProvider } from '../context/DemoTrailContext';
import { API_UNAVAILABLE_MESSAGE } from '../services/network';
import { PUBLIC_ENGINE_CHIP_DISCONNECTED, PUBLIC_ENGINE_STATIC_COPY } from '../data/publicInfrastructure';

jest.setTimeout(15000);

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockDemoLogin = jest.fn();
const mockStartTrail = jest.fn();

const mockAuthValue: any = {};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

jest.mock('../context/DemoTrailContext', () => {
  const actual = jest.requireActual('../context/DemoTrailContext');
  return {
    ...actual,
    useDemoTrail: () => ({ active: false, step: 0, start: mockStartTrail, next: jest.fn(), back: jest.fn(), skip: jest.fn(), stop: jest.fn() }),
  };
});

jest.mock('../services/api', () => ({
  authService: {
    githubStatus: jest.fn().mockResolvedValue({ data: {} }),
    googleStatus: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('../components/brand/AuthChrome', () => ({ children }: { children?: React.ReactNode }) => <>{children}</>);

const renderPage = async (defaultMode?: 'login' | 'register') => {
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <MemoryRouter>
        <DemoTrailProvider>
          <AuthPage defaultMode={defaultMode} />
        </DemoTrailProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
  await act(async () => {
    await Promise.resolve();
  });
};

const fillTextbox = (name: RegExp, value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
};

describe('AuthPage network failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.githubStatus as jest.Mock).mockResolvedValue({ data: {} });
    (authService.googleStatus as jest.Mock).mockResolvedValue({ data: {} });
    localStorage.clear();
    sessionStorage.clear();
    Object.assign(mockAuthValue, {
      login: mockLogin,
      register: mockRegister,
      supabaseLogin: jest.fn(),
      supabaseRegister: jest.fn(),
      demoLogin: mockDemoLogin,
      verifyMfa: jest.fn(),
      edition: 'community',
      setEdition: jest.fn(),
      isAuthenticated: false,
      supabaseEnabled: false,
      backendReachable: true,
    });
  });

  it('shows the friendly API message instead of a raw network error on login', async () => {
    mockLogin.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    await renderPage();

    fillTextbox(/^email$/i, 'ada@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    fillTextbox(/^password$/i, 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText(API_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    });
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument();
  });

  it('shows readable server errors on registration', async () => {
    mockRegister.mockRejectedValue({
      message: 'Request failed with status code 400',
      response: { data: { error: 'Invalid email or password' } },
    });
    await renderPage('register');

    fillTextbox(/^first name$/i, 'Ada');
    fillTextbox(/^last name$/i, 'Lovelace');
    fillTextbox(/^work email$/i, 'ada@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    fillTextbox(/^password$/i, 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Show confirmation' }));
    fillTextbox(/^confirm password$/i, 'password123');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
    expect(screen.queryByText('Request failed with status code 400')).not.toBeInTheDocument();
  });

  it('shows the honest disconnected state with demo and engine options', async () => {
    Object.assign(mockAuthValue, { backendReachable: false, supabaseEnabled: false });
    await renderPage();

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_DISCONNECTED)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_STATIC_COPY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try the interactive demo \(sample data\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Enterprise demo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Deploy the engine/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Enterprise$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/production authentication is unchanged/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Use password sign-in/i)).not.toBeInTheDocument();
  });
});
