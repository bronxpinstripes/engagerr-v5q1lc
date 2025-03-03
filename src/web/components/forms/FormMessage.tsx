import React from "react";
import { AnimatePresence, motion } from "framer-motion"; // v10.12.16
import { cn } from "../../lib/utils";

/**
 * A component that displays validation error messages for form fields
 * with appropriate styling and animations
 */
export function FormMessage({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  // Return null if no children are provided to avoid rendering empty error messages
  if (!children) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.p
        className={cn("text-sm text-destructive font-medium mt-1", className)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        aria-live="polite"
        role="alert"
        {...props}
      >
        {children}
      </motion.p>
    </AnimatePresence>
  );
}