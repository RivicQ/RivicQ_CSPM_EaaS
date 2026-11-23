import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/api';
import { getEditionFromBackend } from '../config/editions';
import { supabaseAuthService } from '../services/supabase';
import { API_UNAVAILABLE_MESSAGE, SESSION_VERIFICATION_MESSAGE } from '../services/network';

jest.mock('../services/api', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    me: jest.fn(),
    demo: jest.fn(),
    patchMe: jest.fn(),
    changePassword: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('../config/editions', () => ({
  ...jest.requireActual('../config/editions'),
  getEditionFromBackend: jest.fn(),
}));

jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: false,
  supabaseAuthService: {
    getSession: jest.fn(),
    getSessionToken: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
}));

let auth: ReturnType<typeof useAuth> | null = null;

const Probe = () => {
  const value = useAuth();
  auth = value;
  return <div>{value.loading ? 'loading' : 'ready'}</div>;
};

const renderProvider = async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  expect(await screen.findByText('ready')).toBeInTheDocument();
};

describe('AuthContext network robustness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    auth = null;
    (getEditionFromBackend as jest.Mock).mockResolvedValue({
      edition: 'enterprise',
      features: {},
      baseURL: 'https://api.example.test/api/v1',
    });
    (supabaseAuthService.getSession as jest.Mock).mockResolvedValue(null);
    (authService.me as jest.Mock).mockResolvedValue({
      data: { id: 'user-1', email: 'ada@example.test', edition: 'enterprise', role: 'admin' },
    });
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    (supabaseAuthService.signOut as jest.Mock).mockResolvedValue(undefined);
  });

  it('clears the token and explains failed session verification after a successful login', async () => {
    (authService.login as jest.Mock).mockResolvedValue({ data: { access_token: 'token-1' } });
    (authService.me as jest.Mock).mockRejectedValueOnce(
      new TypeError('NetworkError when attempting to fetch resource.')
    );
    await renderProvider();

    await act(async () => {
      await expect(auth!.login('ada@example.test', 'password123', 'enterprise')).rejects.toThrow(
        SESSION_VERIFICATION_MESSAGE
      );
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(auth!.user).toBeNull();
  });

  it('normalizes a raw login network error', async () => {
    (authService.login as jest.Mock).mockRejectedValue(new Error('Network Error'));
    await renderProvider();

    await act(async () => {
      await expect(auth!.login('ada@example.test', 'password123', 'enterprise')).rejects.toThrow(API_UNAVAILABLE_MESSAGE);
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('keeps the confirmation result when registration succeeds without an access token', async () => {
    (authService.register as jest.Mock).mockResolvedValue({ data: { requires_confirmation: true } });
    await renderProvider();

    let result: any;
    await act(async () => {
      result = await auth!.register('Ada', 'ada@example.test', 'password123', 'community');
    });

    expect(result).toEqual({ requiresConfirmation: true, email: 'ada@example.test' });
    expect(authService.me).not.toHaveBeenCalled();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('clears local session even when logout calls reject', async () => {
    (authService.login as jest.Mock).mockResolvedValue({ data: { access_token: 'token-1' } });
    (authService.logout as jest.Mock).mockRejectedValue(new Error('Network Error'));
    (supabaseAuthService.signOut as jest.Mock).mockRejectedValue(new Error('Network Error'));
    await renderProvider();

    await act(async () => {
      await auth!.login('ada@example.test', 'password123', 'enterprise');
    });
    expect(localStorage.getItem('auth_token')).toBe('token-1');

    act(() => {
      auth!.logout();
    });

    expect(auth!.token).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
