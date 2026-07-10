import React from 'react';
import { authService, syncAPIBaseURL } from '../services/api';
import { setEditionPreference, getEditionFromBackend } from '../config/editions';

type Edition = 'oss' | 'enterprise';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  edition: Edition;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  edition: Edition;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, edition: Edition) => Promise<void>;
  register: (name: string, email: string, password: string, edition: Edition) => Promise<void>;
  logout: () => void;
  setEdition: (edition: Edition) => void;
  persistAuth: (payload: any) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth() {
  try {
    const token = localStorage.getItem('auth_token');
    const userRaw = localStorage.getItem('auth_user');
    const edition = (localStorage.getItem('app_edition') as Edition | null) || 'oss';
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user, edition };
  } catch {
    return { token: null, user: null, edition: 'oss' as Edition };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [edition, setEditionState] = React.useState<Edition>('oss');

  React.useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const stored = readStoredAuth();
      const remote = await getEditionFromBackend();
      if (cancelled) return;

      const detectedEdition = (remote?.edition as Edition) || stored.edition;
      if (remote?.edition) {
        syncAPIBaseURL();
        setEditionPreference(remote.edition as Edition);
      }

      setToken(stored.token);
      setUser(stored.user);
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
    const nextEdition = (payload?.edition || nextUser.edition || 'oss') as Edition;
    persist(nextToken, nextUser, nextEdition);
  }, [persist]);

  const login = React.useCallback(async (email: string, password: string, nextEdition: Edition) => {
    const response = await authService.login({ email, password, edition: nextEdition });
    completeAuth(response.data);
  }, [completeAuth]);

  const register = React.useCallback(async (name: string, email: string, password: string, nextEdition: Edition) => {
    const response = await authService.register({ name, email, password, edition: nextEdition });
    completeAuth(response.data);
  }, [completeAuth]);

  const logout = React.useCallback(() => {
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
    login,
    register,
    logout,
    setEdition,
    persistAuth: completeAuth,
  }), [edition, loading, login, logout, register, setEdition, token, user, completeAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
