import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

/**
 * Type definition for the theme context value
 */
type ThemeContextType = {
  theme: string;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
};

/**
 * Props for the ThemeProvider component
 */
type ThemeProviderProps = {
  children: ReactNode;
};

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider component that manages theme state and preferences
 * Features:
 * - Light/dark mode support
 * - System preference detection
 * - Persistence across sessions via localStorage
 * - Theme toggling functionality
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Use localStorage to persist theme preference
  const [theme, setTheme] = useLocalStorage<string>('theme', 'system');
  
  // Track the actual theme applied after resolving system preference
  const [resolvedTheme, setResolvedTheme] = useState<string>('light');

  // Toggle between light and dark themes
  const toggleTheme = () => {
    if (theme === 'system') {
      // If current theme is system, explicitly set to opposite of resolved theme
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Otherwise toggle current explicit setting
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  // Effect to apply theme class to document and handle system preference changes
  useEffect(() => {
    // Function to determine and apply the appropriate theme
    const applyTheme = () => {
      let themeToApply = theme;
      
      // If theme is set to 'system', determine based on system preference
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeToApply = systemPrefersDark ? 'dark' : 'light';
      }
      
      // Update resolved theme state
      setResolvedTheme(themeToApply);
      
      // Apply appropriate class to document element
      if (themeToApply === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };
    
    // Apply theme immediately
    applyTheme();
    
    // Set up listener for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };
    
    // Add event listener for system preference changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);
  
  // Provide theme context to children
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook that provides access to the theme context
 * 
 * @throws Error if used outside of a ThemeProvider
 * @returns ThemeContextType containing theme state and functions
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};