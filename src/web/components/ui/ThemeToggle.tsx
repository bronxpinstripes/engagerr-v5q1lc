import React from 'react';
import { Sun, Moon, Computer } from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

/**
 * Props for the ThemeToggle component
 */
type ThemeToggleProps = React.HTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

/**
 * A button component that allows users to toggle between light, dark, and system theme preferences.
 * Displays different icons based on the current theme state.
 */
const ThemeToggle = ({ className, ...props }: ThemeToggleProps) => {
  // Access the current theme and toggle function from context
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn("transition-colors", className)}
      {...props}
    >
      {theme === 'light' && <Sun className="h-5 w-5" />}
      {theme === 'dark' && <Moon className="h-5 w-5" />}
      {theme === 'system' && <Computer className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggle;