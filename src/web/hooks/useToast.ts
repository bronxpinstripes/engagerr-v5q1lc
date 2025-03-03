import { useCallback } from 'react';
import { useToastContext } from '../context/ToastContext';
import { Toast, ToastOptions, ToastType, ToastPosition, createToast } from '../lib/toast';

/**
 * Interface defining the methods provided by the useToast hook
 */
export interface ToastAPI {
  /**
   * Show a default toast notification
   * @param title The main message to display
   * @param description Optional secondary message
   * @param options Additional configuration options
   * @returns The ID of the created toast for later reference
   */
  toast: (title: string, description?: string, options?: ToastOptions) => string;
  
  /**
   * Show a success toast notification
   * @param title The main message to display
   * @param description Optional secondary message
   * @param options Additional configuration options
   * @returns The ID of the created toast for later reference
   */
  success: (title: string, description?: string, options?: ToastOptions) => string;
  
  /**
   * Show an error toast notification
   * @param title The main message to display
   * @param description Optional secondary message
   * @param options Additional configuration options
   * @returns The ID of the created toast for later reference
   */
  error: (title: string, description?: string, options?: ToastOptions) => string;
  
  /**
   * Show a warning toast notification
   * @param title The main message to display
   * @param description Optional secondary message
   * @param options Additional configuration options
   * @returns The ID of the created toast for later reference
   */
  warning: (title: string, description?: string, options?: ToastOptions) => string;
  
  /**
   * Show an info toast notification
   * @param title The main message to display
   * @param description Optional secondary message
   * @param options Additional configuration options
   * @returns The ID of the created toast for later reference
   */
  info: (title: string, description?: string, options?: ToastOptions) => string;
  
  /**
   * Dismiss a specific toast notification
   * @param id The ID of the toast to dismiss
   */
  dismiss: (id: string) => void;
  
  /**
   * Update the content or options of an existing toast
   * @param id The ID of the toast to update
   * @param updates The changes to apply to the toast
   */
  update: (id: string, updates: Partial<Toast>) => void;
  
  /**
   * Remove all active toast notifications
   */
  clearAll: () => void;
}

/**
 * Custom hook that provides simplified methods for displaying toast notifications
 * throughout the Engagerr application. Abstracts away the toast context implementation
 * details and offers convenient methods for showing different types of toast notifications.
 * 
 * @returns Object with methods for managing toast notifications
 */
const useToast = (): ToastAPI => {
  const { addToast, removeToast, updateToast, clearToasts } = useToastContext();
  
  // Default toast (neutral style)
  const toast = useCallback((title: string, description?: string, options?: ToastOptions): string => {
    return addToast(title, description, { 
      type: ToastType.DEFAULT, 
      ...options 
    });
  }, [addToast]);
  
  // Success toast (green style)
  const success = useCallback((title: string, description?: string, options?: ToastOptions): string => {
    return addToast(title, description, { 
      type: ToastType.SUCCESS, 
      ...options 
    });
  }, [addToast]);
  
  // Error toast (red style)
  const error = useCallback((title: string, description?: string, options?: ToastOptions): string => {
    return addToast(title, description, { 
      type: ToastType.ERROR, 
      ...options 
    });
  }, [addToast]);
  
  // Warning toast (yellow style)
  const warning = useCallback((title: string, description?: string, options?: ToastOptions): string => {
    return addToast(title, description, { 
      type: ToastType.WARNING, 
      ...options 
    });
  }, [addToast]);
  
  // Info toast (blue style)
  const info = useCallback((title: string, description?: string, options?: ToastOptions): string => {
    return addToast(title, description, { 
      type: ToastType.INFO, 
      ...options 
    });
  }, [addToast]);
  
  // Dismiss a specific toast by ID
  const dismiss = useCallback((id: string): void => {
    removeToast(id);
  }, [removeToast]);
  
  // Update an existing toast
  const update = useCallback((id: string, updates: Partial<Toast>): void => {
    updateToast(id, updates);
  }, [updateToast]);
  
  // Clear all toast notifications
  const clearAll = useCallback((): void => {
    clearToasts();
  }, [clearToasts]);
  
  // Return the API object
  return {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    update,
    clearAll,
  };
};

export default useToast;