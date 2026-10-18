import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{nextTheme === 'light' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
