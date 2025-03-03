import React from "react";
import { cn } from "../../lib/utils";

/**
 * A layout component that provides structure and spacing for form field elements
 */
export function FormItem({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2 mb-4", className)} {...props}>
      {children}
    </div>
  );
}