import React from 'react';
import { authService } from '../services/api';
import { getEditionFromBackend, normalizeEdition, Edition } from '../config/editions';
import { supabaseAuthService, isSupabaseConfigured } from '../services/supabase';
import { API_UNAVAILABLE_MESSAGE, SESSION_VERIFICATION_MESSAGE, normalizeApiError } from '../services/network';
import { CLIENT_DEMO_TOKEN, DEMO_STORAGE_KEY, isClientDemoToken } from '../demo/constants';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  tenantId?: string;
  mfaEnabled?: boolean;
  edition: Edition;
  demo?: boolean;
}

export interface RegisterResult {
  requiresConfirmation?: boolean;
  email?: string;
  mfaRequired?: boolean;
  mfaSession?: string;
}

export type LoginResult = RegisterResult;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  edition: Edition;
  isAuthenticated: boolean;
  isDemo: boolean;
  loading: boolean;
  supabaseEnabled: boolean;
  backendReachable: boolean;
  login: (email: string, password: string, edition: Edition) => Promise<LoginResult>;
  register: (
    name: string,
    email: string,
    password: string,
    edition: Edition,
    extras?: { first_name?: string; last_name?: string; organisation?: string; job_title?: string; country?: string; industry?: string; organisation_size?: string; accept_terms?: boolean },
  ) => Promise<RegisterResult>;
  supabaseLogin: (email: string, password: string, edition: Edition) => Promise<void>;
  supabaseRegister: (name: string, email: string, password: string, edition: Edition) => Promise<RegisterResult>;
  demoLogin: (edition: Edition) => Promise<void>;
  verifyMfa: (email: string, code: string, session: string, edition: Edition) => Promise<void>;
  refreshMe: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  logout: () => void;
  setEdition: (edition: Edition) => void;
  persistAuth: (payload: any) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const userRaw = localStorage.getItem('auth_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const demo = Boolean(user?.demo) || localStorage.getItem(DEMO_STORAGE_KEY) === '1' || isClientDemoToken(token);
    if (user) user.demo = demo;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [backendReachable, setBackendReachable] = React.useState(false);

  const clearStoredAuth = React.useCallback(() => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('app_edition');
      localStorage.removeItem('api_base_url');
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const clearSession = React.useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, [clearStoredAuth]);

  const persist = React.useCallback((nextToken: string | null, nextUser: AuthUser | null) => {
    try {
      if (nextToken) localStorage.setItem('auth_token', nextToken);
      else localStorage.removeItem('auth_token');
      if (nextUser) localStorage.setItem('auth_user', JSON.stringify(nextUser));
      else localStorage.removeItem('auth_user');
      localStorage.removeItem('app_edition');
      localStorage.removeItem('api_base_url');
    } catch {
      // ignore storage failures
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const applyMe = React.useCallback((nextToken: string, data: any, demoHint = false) => {
    const nextUser: AuthUser = {
      id: String(data?.id || data?.user_id || ''),
      name: String(data?.name || data?.email || ''),
      email: String(data?.email || ''),
      role: String(data?.role || 'viewer'),
      tenantId: data?.tenant_id ? String(data.tenant_id) : undefined,
      mfaEnabled: Boolean(data?.mfa_enabled),
      edition: normalizeEdition(data?.edition),
      demo: demoHint || Boolean(data?.demo),
    };
    persist(nextToken, nextUser);
    return nextUser;
  }, [persist]);

  React.useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const stored = readStoredAuth();

      let remote: { edition: string; features?: Record<string, any>; baseURL?: string } | null = null;
      try {
        remote = await getEditionFromBackend();
      } catch {
        remote = null;
      }
      if (cancelled) return;
      setBackendReachable(Boolean(remote?.edition));

      let sbToken: string | null = null;
      let sbSessionUser: any = null;
      try {
        const sbSession = await supabaseAuthService.getSession();
        if (sbSession?.access_token && sbSession?.user?.email) {
          sbToken = sbSession.access_token;
          sbSessionUser = sbSession.user;
        }
      } catch {
        sbToken = null;
      }

      const nextToken = stored.token || sbToken;
      if (!nextToken) {
        clearStoredAuth();
        if (!cancelled) setLoading(false);
        return;
      }

      if (isClientDemoToken(nextToken)) {
        // Demo sessions are local-only labeled samples; keep only non-sensitive stored identity.
        const demoUser: AuthUser = {
          id: String(stored.user?.id || 'demo'),
          name: String(stored.user?.name || 'Demo'),
          email: String(stored.user?.email || ''),
          role: String(stored.user?.role || 'viewer'),
          edition: normalizeEdition(remote?.edition || 'community'),
          demo: true,
        };
        try { localStorage.setItem(DEMO_STORAGE_KEY, '1'); } catch {}
        persist(nextToken, demoUser);
        if (!cancelled) setLoading(false);
        return;
      }

      if (remote?.edition) {
        try {
          const me = await authService.me();
          if (!cancelled) applyMe(nextToken, me.data || {}, false);
        } catch {
          if (!cancelled) clearSession();
        }
      } else if (sbToken && sbSessionUser?.email) {
        // Supabase-backed session without configured API backend: keep session but do not grant entitlements beyond server-known defaults.
        const sbUser: AuthUser = {
          id: String(sbSessionUser.id),
          name: String((sbSessionUser.user_metadata as any)?.name || sbSessionUser.email.split('@')[0]),
          email: String(sbSessionUser.email),
          edition: 'community',
        };
        persist(sbToken, sbUser);
      } else {
        // No authoritative backend to validate token/entitlement.
        if (!cancelled) {
          clearStoredAuth();
          setToken(null);
          setUser(null);
        }
      }
      if (!cancelled) setLoading(false);
    };

    init().catch(() => {
      if (!cancelled) {
        clearStoredAuth();
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [applyMe, clearSession, clearStoredAuth, persist]);

  const completeAuth = React.useCallback(async (payload: any): Promise<void> => {
    const nextToken = String(payload?.access_token || payload?.token || '');
    if (!nextToken) throw normalizeApiError(new Error('Authentication service returned an invalid response'));
    try {
      const me = await authService.me();
      applyMe(nextToken, me.data || {}, Boolean(payload?.demo_mode || payload?.user?.demo));
    } catch (err) {
      clearSession();
      throw normalizeApiError(err, SESSION_VERIFICATION_MESSAGE);
    }
  }, [applyMe, clearSession]);

  const persistAuth = React.useCallback(async (payload: any): Promise<void> => {
    const nextToken = String(payload?.access_token || payload?.token || '');
    if (!nextToken) throw normalizeApiError(new Error('Authentication service returned an invalid response'));
    try { localStorage.setItem('auth_token', nextToken); } catch {}
    try {
      const me = await authService.me();
      applyMe(nextToken, me.data || {}, false);
    } catch (err) {
      clearSession();
      throw normalizeApiError(err, SESSION_VERIFICATION_MESSAGE);
    }
  }, [applyMe, clearSession]);

  const supabaseLogin = React.useCallback(async (email: string, password: string, _nextEdition: Edition) => {
    try {
      await supabaseAuthService.signIn(email, password);
      const sbToken = await supabaseAuthService.getSessionToken();
      if (!sbToken) throw new Error('Supabase session unavailable');
      if (backendReachable) {
        try {
          const me = await authService.me();
          persist(sbToken, {
            id: String(me.data?.id || me.data?.user_id || ''),
            name: String(me.data?.name || email.split('@')[0]),
            email: String(me.data?.email || email),
            role: String(me.data?.role || 'viewer'),
            tenantId: me.data?.tenant_id ? String(me.data.tenant_id) : undefined,
            mfaEnabled: Boolean(me.data?.mfa_enabled),
            edition: normalizeEdition(me.data?.edition),
          });
          return;
        } catch (err) {
          clearSession();
          throw normalizeApiError(err, SESSION_VERIFICATION_MESSAGE);
        }
      }
      clearSession();
      throw new Error('Unable to establish a server-validated session.');
    } catch (err) {
      throw normalizeApiError(err);
    }
  }, [backendReachable, clearSession, persist]);

  const supabaseRegister = React.useCallback(async (name: string, email: string, password: string, nextEdition: Edition): Promise<RegisterResult> => {
    let session: any = null;
    try {
      ({ session } = await supabaseAuthService.signUp(name, email, password, nextEdition));
    } catch (err) {
      throw normalizeApiError(err);
    }
    if (session?.access_token && backendReachable) {
      try {
        const me = await authService.me();
        applyMe(session.access_token, me.data || {}, false);
        return { requiresConfirmation: false };
      } catch {
        return { requiresConfirmation: true, email };
      }
    }
    return { requiresConfirmation: true, email };
  }, [applyMe, backendReachable]);

  const login = React.useCallback(async (email: string, password: string, _nextEdition: Edition): Promise<LoginResult> => {
    if (backendReachable) {
      let response;
      try {
        response = await authService.login({ email, password });
      } catch (err) {
        throw normalizeApiError(err);
      }
      const data = response.data;
      if (data?.mfa_required) {
        return { mfaRequired: true, mfaSession: data.mfa_session, email };
      }
      try { localStorage.setItem('auth_token', String(data.access_token)); } catch {}
      await completeAuth(data);
      return { requiresConfirmation: false };
    }
    if (isSupabaseConfigured) {
      await supabaseLogin(email, password, 'community');
      return { requiresConfirmation: false };
    }
    throw new Error(API_UNAVAILABLE_MESSAGE);
  }, [backendReachable, completeAuth, supabaseLogin]);

  const register = React.useCallback(async (
    name: string,
    email: string,
    password: string,
    _nextEdition: Edition,
    extras?: { first_name?: string; last_name?: string; organisation?: string; job_title?: string; country?: string; industry?: string; organisation_size?: string; accept_terms?: boolean },
  ): Promise<RegisterResult> => {
    if (backendReachable) {
      let response;
      try {
        response = await authService.register({ name, email, password, ...extras });
      } catch (err) {
        throw normalizeApiError(err);
      }
      const data = response.data;
      if (data?.access_token) {
        try { localStorage.setItem('auth_token', String(data.access_token)); } catch {}
        await completeAuth(data);
        return { requiresConfirmation: false };
      }
      return { requiresConfirmation: true, email };
    }
    if (isSupabaseConfigured) {
      return supabaseRegister(name, email, password, 'community');
    }
    throw new Error(API_UNAVAILABLE_MESSAGE);
  }, [backendReachable, completeAuth, supabaseRegister]);

  const demoLogin = React.useCallback(async (_nextEdition: Edition) => {
    if (backendReachable) {
      let response;
      try {
        response = await authService.demo();
      } catch (err) {
        throw normalizeApiError(err);
      }
      const data = response.data;
      try { localStorage.setItem('auth_token', String(data.access_token)); } catch {}
      await completeAuth(data);
      try { localStorage.setItem(DEMO_STORAGE_KEY, '1'); } catch {}
      return;
    }
    const demoToken = CLIENT_DEMO_TOKEN;
    const demoUser: AuthUser = { id: 'demo', name: 'Demo User', email: 'demo@rivicq.local', role: 'operator', edition: 'community', demo: true };
    try { localStorage.setItem(DEMO_STORAGE_KEY, '1'); } catch {}
    persist(demoToken, demoUser);
  }, [backendReachable, completeAuth, persist]);

  const verifyMfa = React.useCallback(async (email: string, code: string, session: string, _edition: Edition) => {
    let response;
    try {
      response = await authService.verifyMfa({ email, mfa_code: code, mfa_session: session });
    } catch (err) {
      throw normalizeApiError(err);
    }
    const data = response.data;
    try { localStorage.setItem('auth_token', String(data.access_token)); } catch {}
    await completeAuth(data);
  }, [completeAuth]);

  const refreshMe = React.useCallback(async () => {
    if (!token || isClientDemoToken(token)) return;
    try {
      const me = await authService.me();
      applyMe(token, me.data || {}, Boolean(user?.demo));
    } catch (err) {
      clearSession();
      throw normalizeApiError(err, SESSION_VERIFICATION_MESSAGE);
    }
  }, [applyMe, clearSession, token, user?.demo]);

  const updateProfile = React.useCallback(async (name: string) => {
    try {
      await authService.patchMe({ name });
    } catch (err) {
      throw normalizeApiError(err);
    }
    await refreshMe();
  }, [refreshMe]);

  const changePassword = React.useCallback(async (currentPassword: string, nextPassword: string) => {
    try {
      await authService.changePassword(currentPassword, nextPassword);
    } catch (err) {
      throw normalizeApiError(err);
    }
    await refreshMe();
  }, [refreshMe]);

  const logout = React.useCallback(() => {
    try { void authService.logout().catch(() => undefined); } catch {}
    try { void supabaseAuthService.signOut().catch(() => undefined); } catch {}
    clearSession();
  }, [clearSession]);

  const setEdition = React.useCallback((_next: Edition) => {
    // Edition/entitlement is server-derived; ignore client requests.
  }, []);

  const value = React.useMemo<AuthContextValue>(() => ({
    user,
    token,
    edition: user?.edition || 'community',
    isAuthenticated: Boolean(token && user),
    isDemo: Boolean(user?.demo) || localStorage.getItem(DEMO_STORAGE_KEY) === '1' || isClientDemoToken(token),
    loading,
    supabaseEnabled: isSupabaseConfigured,
    backendReachable,
    login,
    register,
    supabaseLogin,
    supabaseRegister,
    demoLogin,
    verifyMfa,
    refreshMe,
    updateProfile,
    changePassword,
    logout,
    setEdition,
    persistAuth,
  }), [user, token, loading, backendReachable, login, register, supabaseLogin, supabaseRegister, demoLogin, verifyMfa, refreshMe, updateProfile, changePassword, logout, setEdition, persistAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
