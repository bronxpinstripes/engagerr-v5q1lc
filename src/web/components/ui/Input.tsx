import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * A versatile input component for text entry with support for different states and styling.
 * Provides consistent styling with proper focus states and accessibility features.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          // Focus styles
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          // Error styles
          error && "border-red-500 focus-visible:ring-red-500",
          // Custom classes
          className
        )}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        ref={ref}
        {...props}
      />
    );
  }
);

// Set display name for better debugging in React DevTools
Input.displayName = 'Input';

export default Input;