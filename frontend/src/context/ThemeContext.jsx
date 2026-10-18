import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_KEY = 'hotsgen-theme';

const getInitialTheme = () => {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
    document.documentElement.dataset.theme = initialTheme;
    return initialTheme;
  } catch {
    document.documentElement.dataset.theme = 'dark';
    return 'dark';
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Keep the selected theme for this session if storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
