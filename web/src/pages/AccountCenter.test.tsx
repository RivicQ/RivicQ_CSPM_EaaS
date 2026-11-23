import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import AccountCenter from './AccountCenter';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { getAppTheme } from '../theme/theme';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => ({
  authService: {
    patchMe: jest.fn(),
    forgotPassword: jest.fn(),
    changePassword: jest.fn(),
    mfaSetup: jest.fn(),
    mfaConfirm: jest.fn(),
    mfaDisable: jest.fn(),
    workspaceUsers: jest.fn(),
    providers: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockChangePassword = jest.fn().mockResolvedValue(undefined);
const mockRefreshMe = jest.fn().mockResolvedValue(undefined);
const PREFS_KEY = 'rivicq.account.preferences';

const renderPage = () =>
  render(
    <ThemeProvider theme={getAppTheme('dark')}>
      <MemoryRouter>
        <AccountCenter />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('AccountCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global as any).fetch = undefined;
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Ada',
        email: 'ada@example.test',
        role: 'admin',
        tenantId: 'tenant-1',
        mfaEnabled: false,
        edition: 'enterprise',
      },
      token: 'token-1',
      edition: 'enterprise',
      backendReachable: true,
      isDemo: false,
      updateProfile: mockUpdateProfile,
      changePassword: mockChangePassword,
      refreshMe: mockRefreshMe,
    });
    (authService.workspaceUsers as jest.Mock).mockResolvedValue({
      data: {
        users: [
          { id: 'u-1', name: 'Grace Hopper', email: 'grace@example.test', role: 'admin' },
          { id: 'u-2', name: 'Linus Torvalds', email: 'linus@example.test', role: 'viewer' },
        ],
      },
    });
    (authService.mfaSetup as jest.Mock).mockResolvedValue({
      data: { secret: 'JBSWY3DPEHPK3PXP', provisioning_uri: 'otpauth://totp/rivicq:ada' },
    });
    (authService.mfaConfirm as jest.Mock).mockResolvedValue({ data: { mfa_enabled: true } });
    (authService.mfaDisable as jest.Mock).mockResolvedValue({ data: { mfa_enabled: false } });
  });

  it('renders every account section tab', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Account Centre' })).toBeInTheDocument();
    ['Profile', 'Security', 'Workspace', 'Integrations', 'Developer', 'Preferences', 'Privacy'].forEach((label) => {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    });
  });

  it('saves the profile through the auth context when the backend is reachable', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith('Ada Lovelace'));
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });

  it('uses real password and MFA endpoints for security changes', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-secret' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-secret' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith('old-secret', 'new-secret'));

    fireEvent.change(screen.getByLabelText('Password for MFA setup'), { target: { value: 'mfa-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enroll authenticator' }));
    await waitFor(() => expect(authService.mfaSetup).toHaveBeenCalledWith({ password: 'mfa-secret' }));

    fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm MFA' }));
    await waitFor(() =>
      expect(authService.mfaConfirm).toHaveBeenCalledWith({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    );

    expect(await screen.findByText('MFA enabled for this account.')).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Current password for MFA'), { target: { value: 'mfa-secret' } });
    fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Disable MFA' }));
    await waitFor(() =>
      expect(authService.mfaDisable).toHaveBeenCalledWith({ password: 'mfa-secret', code: '654321' }),
    );
  });

  it('lists workspace members returned by the Enterprise control plane', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Workspace' }));

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('grace@example.test')).toBeInTheDocument();
    expect(screen.getByText('Linus Torvalds')).toBeInTheDocument();
    expect(screen.getByText('linus@example.test')).toBeInTheDocument();
    expect(authService.workspaceUsers).toHaveBeenCalledTimes(1);
  });

  it('reports integration maturity without claiming live connections', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Integrations' }));

    expect(screen.getAllByText('Integration pending')).toHaveLength(4);
    expect(screen.getByText('Not supported')).toBeInTheDocument();
    expect(screen.queryByText(/connected|connection established|connection active/i)).not.toBeInTheDocument();
  });

  it('links to documentation and exposes honest API key and privacy states', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Developer' }));

    const docsBase = `${process.env.PUBLIC_URL || ''}/docs`;
    expect(screen.getByRole('link', { name: 'API documentation' })).toHaveAttribute('href', `${docsBase}/API.md`);
    expect(screen.getByRole('link', { name: `${docsBase}/QUICKSTART_CBOM.md` })).toBeInTheDocument();
    expect(screen.getByText('No API keys are created here; Enterprise keys are admin-managed.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Privacy' }));
    expect(screen.getByRole('link', { name: 'Privacy documentation' })).toHaveAttribute('href', `${docsBase}/PRIVACY.md`);
    expect(screen.getByRole('link', { name: 'Legal documentation' })).toHaveAttribute('href', `${docsBase}/LEGAL.md`);
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('No billing history exists in the local sandbox.')).toBeInTheDocument();
  });

  it('persists notification preferences and confirms the save', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Preferences' }));

    const securityToggle = screen.getByLabelText('Security alerts');
    expect(securityToggle).toBeChecked();
    fireEvent.click(securityToggle);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')).toEqual(
        expect.objectContaining({ securityAlerts: false, complianceUpdates: true, quantumAlerts: false }),
      );
    });
    expect(screen.getByText('Preferences saved in this browser.')).toBeInTheDocument();
  });
});
