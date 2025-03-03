import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * A component that enhances form input elements with proper accessibility attributes and error states
 * by cloning the child element with additional props.
 * 
 * This component is part of Engagerr's form system based on Shadcn UI patterns and ensures
 * that all form inputs have consistent accessibility attributes and state handling.
 */
const FormControl = forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"div"> & { children: React.ReactElement }
>(({ children, className, ...props }, ref) => {
  // Clone the child element with combined props to ensure proper accessibility
  return React.cloneElement(children, {
    ...children.props, // Preserve child's original props like event handlers
    ...props, // Apply our props, potentially overriding for accessibility
    ref: ref || children.props.ref, // Use our ref if provided, otherwise keep child's ref
    className: cn(children.props.className, className), // Combine classNames properly
    // Ensures ARIA attributes are properly forwarded
    "aria-invalid": props["aria-invalid"] !== undefined 
      ? props["aria-invalid"] 
      : children.props["aria-invalid"],
    "aria-describedby": props["aria-describedby"] !== undefined 
      ? props["aria-describedby"] 
      : children.props["aria-describedby"],
  });
});

// Set component display name for better debugging
FormControl.displayName = 'FormControl';

export default FormControl;