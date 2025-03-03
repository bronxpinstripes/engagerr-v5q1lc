import * as React from "react";
import { cva } from "class-variance-authority"; // v0.7.0
import { cn } from "../../../lib/utils";

/**
 * Defines style variants for the form label using class-variance-authority
 */
const labelVariants = cva(
  "text-sm font-medium text-gray-700 dark:text-gray-300"
);

/**
 * A form label component with optional indicator and forwarded ref
 * Provides accessible labels for form controls with appropriate styling
 */
const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { optional?: boolean }
>(({ className, optional, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {props.children}
      {optional && (
        <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          (optional)
        </span>
      )}
    </label>
  );
});

FormLabel.displayName = "FormLabel";

export default FormLabel;