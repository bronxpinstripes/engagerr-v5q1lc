import { cva } from "class-variance-authority"; // v0.7.0
import { v4 as uuidv4 } from "uuid"; // v9.0.0
import { cn } from "./utils";

// Enum for toast notification types
export enum ToastType {
  DEFAULT = "default",
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info"
}

// Enum for toast notification positions
export enum ToastPosition {
  TOP_RIGHT = "top-right",
  TOP_LEFT = "top-left",
  BOTTOM_RIGHT = "bottom-right",
  BOTTOM_LEFT = "bottom-left"
}

// Default duration for toast notifications in milliseconds
export const DEFAULT_TOAST_DURATION = 5000;

// Interface for toast notification object
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  position: ToastPosition;
  createdAt: Date;
}

// Interface for toast configuration options
export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
}

// CSS variant generator for toast styling based on type
export const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
  ),
  {
    variants: {
      type: {
        default: "bg-background border",
        success: "bg-green-50 border-green-200 text-green-800",
        error: "bg-red-50 border-red-200 text-red-800",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
      },
    },
    defaultVariants: {
      type: "default",
    },
  }
);

/**
 * Creates a toast notification object with the specified properties
 * @param options Toast configuration options
 * @returns A formatted toast notification object with a unique ID
 */
export function createToast(options: ToastOptions & { title: string; description?: string }): Toast {
  return {
    id: uuidv4(),
    type: options.type || ToastType.DEFAULT,
    title: options.title,
    description: options.description,
    duration: options.duration || DEFAULT_TOAST_DURATION,
    position: options.position || ToastPosition.TOP_RIGHT,
    createdAt: new Date(),
  };
}

/**
 * Creates a default toast notification
 * @param title Toast title
 * @param description Optional toast description
 * @param options Optional configuration options
 * @returns A formatted default toast notification
 */
export function toast(title: string, description?: string, options?: ToastOptions): Toast {
  return createToast({
    title,
    description,
    type: ToastType.DEFAULT,
    ...options,
  });
}

/**
 * Creates a success toast notification
 * @param title Toast title
 * @param description Optional toast description
 * @param options Optional configuration options
 * @returns A formatted success toast notification
 */
export function toastSuccess(title: string, description?: string, options?: ToastOptions): Toast {
  return createToast({
    title,
    description,
    type: ToastType.SUCCESS,
    ...options,
  });
}

/**
 * Creates an error toast notification
 * @param title Toast title
 * @param description Optional toast description
 * @param options Optional configuration options
 * @returns A formatted error toast notification
 */
export function toastError(title: string, description?: string, options?: ToastOptions): Toast {
  return createToast({
    title,
    description,
    type: ToastType.ERROR,
    ...options,
  });
}

/**
 * Creates a warning toast notification
 * @param title Toast title
 * @param description Optional toast description
 * @param options Optional configuration options
 * @returns A formatted warning toast notification
 */
export function toastWarning(title: string, description?: string, options?: ToastOptions): Toast {
  return createToast({
    title,
    description,
    type: ToastType.WARNING,
    ...options,
  });
}

/**
 * Creates an info toast notification
 * @param title Toast title
 * @param description Optional toast description
 * @param options Optional configuration options
 * @returns A formatted info toast notification
 */
export function toastInfo(title: string, description?: string, options?: ToastOptions): Toast {
  return createToast({
    title,
    description,
    type: ToastType.INFO,
    ...options,
  });
}

/**
 * Function to dismiss a toast by ID
 * This is a placeholder function that will be replaced by the actual implementation
 * from a ToastContext or similar mechanism
 * @param id ID of toast to dismiss
 */
export function dismissToast(id: string): void {
  // This function will be implemented by the toast context provider
  // It's included here for API completeness
}