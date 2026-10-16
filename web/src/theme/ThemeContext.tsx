import React from 'react';
import type { ResolvedTheme, ThemePreference } from './preference';

type ThemeContextType = {
  mode: ResolvedTheme;
  preference: ThemePreference;
  toggleMode: () => void;
  cyclePreference: () => void;
  setPreference: (pref: ThemePreference) => void;
};

export const ThemeModeContext = React.createContext<ThemeContextType>({
  mode: 'dark',
  preference: 'nebula',
  toggleMode: () => {},
  cyclePreference: () => {},
  setPreference: () => {},
});

export const ThemeModeProvider: React.FC<{
  mode: ResolvedTheme;
  preference: ThemePreference;
  toggleMode: () => void;
  cyclePreference: () => void;
  setPreference: (pref: ThemePreference) => void;
  children: React.ReactNode;
}> = ({ mode, preference, toggleMode, cyclePreference, setPreference, children }) => {
  return (
    <ThemeModeContext.Provider value={{ mode, preference, toggleMode, cyclePreference, setPreference }}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => React.useContext(ThemeModeContext);

export type { ThemePreference, ResolvedTheme };

export default ThemeModeContext;
