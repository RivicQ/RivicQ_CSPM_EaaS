import React from 'react';
import { ThemeChoice, ResolvedTheme } from './themePreference';

type ThemeContextType = {
  mode: ResolvedTheme;
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
  toggleMode: () => void;
};

export const ThemeModeContext = React.createContext<ThemeContextType>({
  mode: 'dark',
  choice: 'auto',
  setChoice: () => {},
  toggleMode: () => {},
});

export const ThemeModeProvider: React.FC<{
  mode: ResolvedTheme;
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
  toggleMode: () => void;
  children: React.ReactNode;
}> = ({ mode, choice, setChoice, toggleMode, children }) => {
  return (
    <ThemeModeContext.Provider value={{ mode, choice, setChoice, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => React.useContext(ThemeModeContext);

export default ThemeModeContext;
