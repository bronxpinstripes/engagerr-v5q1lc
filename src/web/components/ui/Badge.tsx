import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority"; // v0.6.0
import { cn } from "../../lib/utils";

/**
 * Defines the possible visual variations of the Badge component using class-variance-authority
 */
export const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs font-medium",
        sm: "px-2 py-0.5 text-xs font-medium",
        lg: "px-3 py-1 text-sm font-medium",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

/**
 * Props for the Badge component
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * A versatile badge component that displays short status labels, categories, or counts with appropriate styling.
 * Badges can be used to indicate status, categories, or numbers in a compact format.
 * 
 * @example
 * ```tsx
 * <Badge>New</Badge>
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="destructive" size="lg">Error</Badge>
 * ```
 */
const Badge = ({
  className,
  variant,
  size,
  ...props
}: BadgeProps) => {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
};

export default Badge;