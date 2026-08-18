import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TRAIL_ACTIVE_KEY, TRAIL_STEP_KEY } from '../demo/constants';
import { clampTrailStep, DEMO_TRAIL_STEPS } from '../demo/trail';

type DemoTrailContextValue = {
  active: boolean;
  step: number;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  stop: () => void;
};

const DemoTrailContext = React.createContext<DemoTrailContextValue | undefined>(undefined);

function readStep(): number {
  try {
    return clampTrailStep(Number(sessionStorage.getItem(TRAIL_STEP_KEY) || '0'));
  } catch {
    return 0;
  }
}

function readActive(): boolean {
  try {
    return sessionStorage.getItem(TRAIL_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export const DemoTrailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = React.useState(readActive);
  const [step, setStep] = React.useState(readStep);

  const persist = React.useCallback((nextActive: boolean, nextStep: number) => {
    const clamped = clampTrailStep(nextStep);
    try {
      if (nextActive) {
        sessionStorage.setItem(TRAIL_ACTIVE_KEY, '1');
        sessionStorage.setItem(TRAIL_STEP_KEY, String(clamped));
      } else {
        sessionStorage.removeItem(TRAIL_ACTIVE_KEY);
        sessionStorage.removeItem(TRAIL_STEP_KEY);
      }
    } catch {
      /* ignore */
    }
    setActive(nextActive);
    setStep(clamped);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('trail') === '1' && !active) {
      persist(true, 1);
    }
  }, [location.search, active, persist]);

  const start = React.useCallback(() => {
    persist(true, 1);
    navigate(DEMO_TRAIL_STEPS[1].path);
  }, [navigate, persist]);

  const go = React.useCallback((nextStep: number) => {
    const clamped = clampTrailStep(nextStep);
    persist(true, clamped);
    navigate(DEMO_TRAIL_STEPS[clamped].path);
  }, [navigate, persist]);

  const next = React.useCallback(() => {
    if (step >= DEMO_TRAIL_STEPS.length - 1) {
      persist(false, 0);
      return;
    }
    go(step + 1);
  }, [go, persist, step]);

  const back = React.useCallback(() => {
    go(Math.max(0, step - 1));
  }, [go, step]);

  const skip = React.useCallback(() => persist(false, 0), [persist]);
  const stop = skip;

  const value = React.useMemo(
    () => ({ active, step, start, next, back, skip, stop }),
    [active, step, start, next, back, skip, stop],
  );

  return <DemoTrailContext.Provider value={value}>{children}</DemoTrailContext.Provider>;
};

export const useDemoTrail = () => {
  const ctx = React.useContext(DemoTrailContext);
  if (!ctx) {
    throw new Error('useDemoTrail must be used within DemoTrailProvider');
  }
  return ctx;
};
