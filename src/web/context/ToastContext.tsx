import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { Toaster } from '../components/ui/Toast';
import { 
  Toast, 
  ToastType, 
  ToastPosition, 
  ToastOptions, 
  createToast, 
  DEFAULT_TOAST_DURATION 
} from '../lib/toast';

/**
 * Interface defining the shape of the toast context
 */
export interface ToastContextType {
  toasts: Toast[];
  addToast: (title: string, description?: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearToasts: () => void;
}

/**
 * Props for the ToastProvider component
 */
export interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
}

/**
 * Context for toast notification management
 */
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Provider component that manages toast state and provides toast functionality
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = ToastPosition.TOP_RIGHT 
}) => {
  // State to track all toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Ref to store timeouts for auto-dismissal
  const toastTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Adds a new toast notification to the state
   * @param title The main message of the toast
   * @param description Optional secondary message
   * @param options Additional configuration options
   * @returns The ID of the created toast
   */
  const addToast = useCallback((title: string, description?: string, options?: ToastOptions): string => {
    const toast = createToast({
      title,
      description,
      position,
      ...options,
    });

    setToasts(prev => [...prev, toast]);

    // Set up auto-dismissal if duration is specified and greater than 0
    if (toast.duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
      
      toastTimeoutsRef.current.set(toast.id, timeout);
    }

    return toast.id;
  }, [position]);

  /**
   * Removes a toast notification by its ID
   * @param id The ID of the toast to remove
   */
  const removeToast = useCallback((id: string) => {
    // Clear any existing timeout
    if (toastTimeoutsRef.current.has(id)) {
      clearTimeout(toastTimeoutsRef.current.get(id));
      toastTimeoutsRef.current.delete(id);
    }

    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  /**
   * Updates an existing toast notification with new properties
   * @param id The ID of the toast to update
   * @param updates The properties to update
   */
  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  /**
   * Removes all toast notifications at once
   */
  const clearToasts = useCallback(() => {
    // Clear all timeouts to prevent memory leaks
    toastTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    toastTimeoutsRef.current.clear();
    
    setToasts([]);
  }, []);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      toastTimeoutsRef.current.clear();
    };
  }, []);

  // Create the context value
  const contextValue = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster 
        toasts={toasts}
        position={position}
      />
    </ToastContext.Provider>
  );
};

/**
 * Hook to access the toast context
 * @throws Error if used outside of a ToastProvider
 * @returns The toast context
 */
export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  
  return context;
};