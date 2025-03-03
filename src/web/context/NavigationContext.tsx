import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { UserType } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import useLocalStorage from '../hooks/useLocalStorage';
import useWindowSize from '../hooks/useWindowSize';

/**
 * Type definition for the navigation context value
 */
interface NavigationContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  isActive: (path: string) => boolean;
  userType: string;
}

/**
 * Props for the NavigationProvider component
 */
interface NavigationProviderProps {
  children: ReactNode;
}

/**
 * Context for navigation state and methods
 */
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * Helper function to check if a path is active based on the current pathname
 */
function isActivePath(pathname: string, path: string): boolean {
  // Exact match for home paths
  if (path === '/' || path === '/creator' || path === '/brand') {
    return pathname === path;
  }
  
  // For other routes, check if pathname starts with the path
  return pathname.startsWith(path);
}

/**
 * Provider component that manages navigation state and provides navigation functions
 */
export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  // State for sidebar visibility with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useLocalStorage('sidebar-open', true);
  
  // Get current user type from auth context
  const { user } = useAuth();
  const [userType, setUserType] = useState<string>(user?.userType || '');
  
  // Get window size for responsive behavior
  const windowSize = useWindowSize();
  
  // Get current path for active route detection
  const pathname = usePathname();

  /**
   * Toggles the sidebar visibility state
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen, setSidebarOpen]);

  /**
   * Sets the sidebar visibility to a specific state
   */
  const handleSetSidebarOpen = useCallback((isOpen: boolean) => {
    setSidebarOpen(isOpen);
  }, [setSidebarOpen]);

  /**
   * Checks if a given path matches the current route
   */
  const isActive = useCallback((path: string) => {
    return isActivePath(pathname, path);
  }, [pathname]);

  // Update user type when the authenticated user changes
  useEffect(() => {
    if (user?.userType) {
      setUserType(user.userType);
    }
  }, [user]);

  // Automatically collapse sidebar on small screens and expand on larger screens
  useEffect(() => {
    if (windowSize.width !== undefined) {
      if (windowSize.width < 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
  }, [windowSize.width, sidebarOpen, setSidebarOpen]);

  // Memoized context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen: handleSetSidebarOpen,
    isActive,
    userType
  }), [sidebarOpen, toggleSidebar, handleSetSidebarOpen, isActive, userType]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * Hook to access the navigation context, throws an error if used outside NavigationProvider
 */
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  
  return context;
}

export { NavigationContext };