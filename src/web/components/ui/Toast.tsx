import React, { useEffect, forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

import { cn } from "../../lib/utils";
import { Toast as ToastType, ToastPosition, toastVariants } from "../../lib/toast";
import { Button } from "./Button";

// Duration for toast animations in milliseconds
const ANIMATION_DURATION = 300;

// Mapping of position values to Tailwind CSS classes
const POSITION_CLASSES: Record<string, string> = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
};

// Mapping toast types to their corresponding icons
const TOAST_ICONS: Record<string, React.ComponentType> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
};

// Props for the individual Toast component
interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

// Props for the Toaster container component
interface ToasterProps {
  toasts: ToastType[];
  position?: ToastPosition;
}

/**
 * Individual toast notification with styling based on type and animated entrance/exit
 */
const Toast = forwardRef<HTMLDivElement, ToastProps>(({ toast, onDismiss }, ref) => {
  const { id, type, title, description, duration } = toast;
  
  // Get the appropriate icon based on toast type
  const Icon = TOAST_ICONS[type] || TOAST_ICONS.default;
  
  // Auto-dismiss toast after specified duration
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);
  
  return (
    <motion.div
      ref={ref}
      className={cn(toastVariants({ type }), "flex items-start gap-3")}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: ANIMATION_DURATION / 1000 }}
      role="alert"
      aria-live="polite"
    >
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      
      <div className="flex-1">
        {title && <div className="font-medium">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 rounded-md p-0 opacity-70 hover:opacity-100"
        onClick={() => onDismiss(id)}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
});

Toast.displayName = "Toast";

/**
 * Container component that manages and displays multiple toast notifications
 */
const Toaster = ({ toasts, position = ToastPosition.TOP_RIGHT }: ToasterProps) => {
  // Use the position enum value as a key for the position classes
  const positionClass = POSITION_CLASSES[position] || POSITION_CLASSES["top-right"];
  
  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-2 w-full max-w-sm",
        positionClass
      )}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={(id) => {
              // This would be implemented by the toast context provider
              console.log(`Toast dismissed: ${id}`);
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export { Toast, Toaster };