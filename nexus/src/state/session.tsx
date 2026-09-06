import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Mode, Role } from '../data/catalog';
import { tenant as defaultTenant, tenants } from '../data/catalog';

type Tenant = typeof defaultTenant;

type Session = {
  mode: Mode;
  setMode: (m: Mode) => void;
  role: Role;
  setRole: (r: Role) => void;
  tenant: Tenant;
  setTenant: (t: Tenant) => void;
  tenants: Tenant[];
};

const Ctx = createContext<Session | null>(null);

const readMode = (): Mode => {
  try {
    const raw = sessionStorage.getItem('nexus-mode');
    return raw === 'ciso' || raw === 'auditor' || raw === 'engineer' ? raw : 'engineer';
  } catch {
    return 'engineer';
  }
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<Mode>(readMode);
  const [role, setRole] = useState<Role>('Cloud Security Engineer');
  const [tenant, setTenant] = useState<Tenant>(tenants[0]);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      sessionStorage.setItem('nexus-mode', m);
    } catch {
      /* ignore quota / private-mode */
    }
  };
  const value = useMemo(() => ({ mode, setMode, role, setRole, tenant, setTenant, tenants }), [mode, role, tenant]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSession = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('session');
  return ctx;
};
