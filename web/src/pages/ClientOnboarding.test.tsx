import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ClientOnboarding from './ClientOnboarding';
import { useAuth } from '../context/AuthContext';
import { getAppTheme } from '../theme/theme';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const STORAGE_KEY = 'rivicq.client.onboarding.checklist.v1';

const renderPage = () =>
  render(
    <ThemeProvider theme={getAppTheme('dark')}>
      <MemoryRouter>
        <ClientOnboarding />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('ClientOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ backendReachable: true, edition: 'enterprise' });
  });

  it('links all five steps to real in-app destinations', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Client onboarding' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account Centre' })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: 'Labeled product demo' })).toHaveAttribute('href', '/demo');
    expect(screen.getByRole('link', { name: 'Workflow Studio' })).toHaveAttribute('href', '/workflow-studio');
    expect(screen.getByRole('link', { name: 'Archify diagrams' })).toHaveAttribute('href', '/diagrams');
    expect(screen.getByRole('link', { name: 'Contact sales' })).toHaveAttribute('href', '/contact');
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
  });

  it('persists checklist completion in localStorage and supports reset', async () => {
    renderPage();
    const accountStep = screen.getByLabelText('Mark complete: Confirm your account details');
    expect(accountStep).not.toBeChecked();
    expect(screen.getByText('0 of 5 complete (local only)')).toBeInTheDocument();

    fireEvent.click(accountStep);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').account).toBe(true));
    expect(accountStep).toBeChecked();
    expect(screen.getByText('1 of 5 complete (local only)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset checklist' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').account).toBe(false));
    expect(accountStep).not.toBeChecked();
    expect(screen.getByText('0 of 5 complete (local only)')).toBeInTheDocument();
  });

  it('states that progress is local only and reports honest maturity', () => {
    renderPage();

    expect(screen.getByText(/not a backend-customer record/i)).toBeInTheDocument();
    expect(screen.getByText('Production implemented')).toBeInTheDocument();
    expect(screen.getByText('Beta implemented')).toBeInTheDocument();
    expect(screen.getAllByText('Integration pending')).toHaveLength(3);
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.queryByText(/customer status: active/i)).not.toBeInTheDocument();
  });

  it('does not claim production account capability without a backend', () => {
    mockUseAuth.mockReturnValue({ backendReachable: false, edition: 'community' });
    renderPage();

    expect(screen.queryByText('Production implemented')).not.toBeInTheDocument();
    expect(screen.getAllByText('Integration pending')).toHaveLength(4);
    expect(screen.getByText('Beta implemented')).toBeInTheDocument();
  });
});
