import { useEffect } from 'react';
import { themes } from '../config/themes';

export function useTheme(currentTheme: string) {
  useEffect(() => {
    const theme = themes[currentTheme] || themes.default;
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--tertiary-color', theme.tertiary);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--border-color', theme.border);
  }, [currentTheme]);
}
