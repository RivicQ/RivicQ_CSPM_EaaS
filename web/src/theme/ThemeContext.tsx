import React from 'react';

type ThemeContextType = {
  mode: 'light' | 'dark';
  toggleMode: () => void;
};

export const ThemeModeContext = React.createContext<ThemeContextType>({
  mode: 'light',
  toggleMode: () => {},
});

export const ThemeModeProvider: React.FC<{ mode: 'light' | 'dark'; toggleMode: () => void; children: React.ReactNode }> = ({ mode, toggleMode, children }) => {
  return <ThemeModeContext.Provider value={{ mode, toggleMode }}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = () => React.useContext(ThemeModeContext);

export default ThemeModeContext;
