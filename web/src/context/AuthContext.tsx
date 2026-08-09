import React from 'react';
import { authService, syncAPIBaseURL } from '../services/api';
import { setEditionPreference, getEditionFromBackend, normalizeEdition, Edition } from '../config/editions';
import { supabaseAuthService, isSupabaseConfigured } from '../services/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  edition: Edition;
}

export interface RegisterResult {
  requiresConfirmation: boolean;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  edition: Edition;
  isAuthenticated: boolean;
  loading: boolean;
  supabaseEnabled: boolean;
  backendReachable: boolean;
  login: (email: string, password: string, edition: Edition) => Promise<void>;
  register: (name: string, email: string, password: string, edition: Edition) => Promise<RegisterResult>;
  supabaseLogin: (email: string, password: string, edition: Edition) => Promise<void>;
  supabaseRegister: (name: string, email: string, password: string, edition: Edition) => Promise<RegisterResult>;
  demoLogin: (edition: Edition) => Promise<void>;
  logout: () => void;
  setEdition: (edition: Edition) => void;
  persistAuth: (payload: any) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const userRaw = localStorage.getItem('auth_user');
    const edition = normalizeEdition(localStorage.getItem('app_edition')) || 'community';
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user, edition };
  } catch {
    return { token: null, user: null, edition: 'community' as Edition };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [edition, setEditionState] = React.useState<Edition>('community');
  const [backendReachable, setBackendReachable] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const stored = readStoredAuth();

      const sbSession = await supabaseAuthService.getSession();
      let sbUser: AuthUser | null = null;
      let sbToken: string | null = null;
      if (sbSession?.user?.email) {
        sbUser = {
          id: sbSession.user.id,
          name: (sbSession.user.user_metadata as any)?.name || sbSession.user.email.split('@')[0],
          email: sbSession.user.email,
          edition: normalizeEdition((sbSession.user.user_metadata as any)?.edition),
        };
        sbToken = sbSession.access_token ?? null;
      }

      let remote: { edition: string; features: Record<string, any>; baseURL: string } | null = null;
      try {
        remote = await getEditionFromBackend();
      } catch {
        remote = null;
      }
      if (cancelled) return;

      const detectedEdition = normalizeEdition(remote?.edition || stored.edition);
      if (remote?.edition) {
        syncAPIBaseURL();
        setEditionPreference(detectedEdition);
      }

      setBackendReachable(Boolean(remote?.edition));
      setToken(sbToken ?? stored.token);
      setUser(sbUser ?? stored.user);
      setEditionState(detectedEdition);
      setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, []);

  const persist = React.useCallback((nextToken: string | null, nextUser: AuthUser | null, nextEdition: Edition) => {
    try {
      if (nextToken) {
        localStorage.setItem('auth_token', nextToken);
      } else {
        localStorage.removeItem('auth_token');
      }
      if (nextUser) {
        localStorage.setItem('auth_user', JSON.stringify(nextUser));
      } else {
        localStorage.removeItem('auth_user');
      }
      setEditionPreference(nextEdition);
    } catch {
      // ignore storage failures
    }
    setToken(nextToken);
    setUser(nextUser);
    setEditionState(nextEdition);
  }, []);

  const completeAuth = React.useCallback((payload: any) => {
    const token = payload?.access_token || payload?.token;
    if (!token || !payload?.user) {
      throw new Error('Authentication service returned an invalid response');
    }
    const nextToken = String(token);
    const nextUser = payload.user;
    const nextEdition = normalizeEdition(payload?.edition || nextUser.edition || 'community');
    persist(nextToken, nextUser, nextEdition);
  }, [persist]);

  const supabaseLogin = React.useCallback(async (email: string, password: string, nextEdition: Edition) => {
    const supabaseUser = await supabaseAuthService.signIn(email, password);
    const sbToken = await supabaseAuthService.getSessionToken();
    persist(sbToken, supabaseUser, normalizeEdition(supabaseUser.edition || nextEdition));
  }, [persist]);

  const supabaseRegister = React.useCallback(async (name: string, email: string, password: string, nextEdition: Edition): Promise<RegisterResult> => {
    const { user: supabaseUser, session } = await supabaseAuthService.signUp(name, email, password, nextEdition);
    if (session?.access_token) {
      persist(session.access_token, supabaseUser, nextEdition);
      return { requiresConfirmation: false };
    }
    return { requiresConfirmation: true, email: supabaseUser.email };
  }, [persist]);

  const login = React.useCallback(async (email: string, password: string, nextEdition: Edition) => {
    if (backendReachable) {
      const response = await authService.login({ email, password, edition: nextEdition });
      completeAuth(response.data);
      return;
    }
    if (isSupabaseConfigured) {
      const supabaseUser = await supabaseAuthService.signIn(email, password);
      const sbToken = await supabaseAuthService.getSessionToken();
      persist(sbToken, supabaseUser, normalizeEdition(supabaseUser.edition || nextEdition));
      return;
    }
    throw new Error('No authentication provider is available on this deployment.');
  }, [backendReachable, completeAuth, persist]);

  const register = React.useCallback(async (name: string, email: string, password: string, nextEdition: Edition): Promise<RegisterResult> => {
    if (backendReachable) {
      const response = await authService.register({ name, email, password, edition: nextEdition });
      completeAuth(response.data);
      return { requiresConfirmation: false };
    }
    if (isSupabaseConfigured) {
      return supabaseRegister(name, email, password, nextEdition);
    }
    throw new Error('No authentication provider is available on this deployment.');
  }, [backendReachable, completeAuth, supabaseRegister]);

  const demoLogin = React.useCallback(async (nextEdition: Edition) => {
    const response = await authService.demo(nextEdition);
    completeAuth(response.data);
  }, [completeAuth]);

  const logout = React.useCallback(() => {
    if (isSupabaseConfigured) {
      supabaseAuthService.signOut().catch(() => undefined);
    }
    persist(null, null, edition);
  }, [edition, persist]);

  const setEdition = React.useCallback((nextEdition: Edition) => {
    persist(token, user, nextEdition);
  }, [persist, token, user]);

  const value = React.useMemo(() => ({
    user,
    token,
    edition,
    isAuthenticated: Boolean(token),
    loading,
    supabaseEnabled: isSupabaseConfigured,
    backendReachable,
    login,
    register,
    supabaseLogin,
    supabaseRegister,
    demoLogin,
    logout,
    setEdition,
    persistAuth: completeAuth,
  }), [edition, loading, backendReachable, login, register, supabaseLogin, supabaseRegister, demoLogin, logout, setEdition, token, user, completeAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
