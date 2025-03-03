import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority"; // v0.6.0
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"; // v0.279.0
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11",
  {
    variants: {
      variant: {
        default: "bg-background border-border text-foreground",
        error: "border-red-200 text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/10 [&>svg]:text-red-500",
        warning: "border-amber-200 text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/10 [&>svg]:text-amber-500",
        info: "border-blue-200 text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/10 [&>svg]:text-blue-500",
        success: "border-emerald-200 text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 [&>svg]:text-emerald-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({
  className,
  variant,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export interface AlertIconProps {
  variant?: VariantProps<typeof alertVariants>["variant"];
}

export function AlertIcon({ variant }: AlertIconProps) {
  switch (variant) {
    case "error":
      return <AlertCircle className="h-5 w-5" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5" />;
    case "success":
      return <CheckCircle className="h-5 w-5" />;
    case "info":
    default:
      return <Info className="h-5 w-5" />;
  }
}

export { alertVariants };