import React from 'react';
import { usePathname } from 'next/navigation';

import Header from './Header';
import Footer from './Footer';
import NavigationSidebar from './NavigationSidebar';
import { cn } from '../../lib/utils';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../hooks/useAuth';
import { NavigationProvider } from '../../context/NavigationContext';
import { ToastProvider } from '../ui/Toast';

/**
 * Props for the DashboardLayout component
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main layout component for dashboard pages in the Engagerr platform.
 * Provides the structure for the application with header, sidebar, content area, and footer.
 * Adapts to both creator and brand user types with appropriate navigation.
 */
const DashboardLayout = ({ children, className }: DashboardLayoutProps) => {
  // Access auth state to determine if user is authenticated
  const { isAuthenticated } = useAuth();
  
  // Access navigation context to get sidebar state
  const { sidebarOpen } = useNavigation();
  
  // Determine main content width based on sidebarOpen state
  const mainContentClass = isAuthenticated 
    ? sidebarOpen 
      ? 'md:ml-64' 
      : 'md:ml-16' 
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Render layout with header at top */}
      <Header />
      
      <div className="flex flex-1">
        {/* Render NavigationSidebar when user is authenticated */}
        {isAuthenticated && <NavigationSidebar />}
        
        {/* Render main content area with appropriate spacing and width */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300",
            mainContentClass, // Apply dynamic width based on sidebar state
            className
          )}
        >
          {/* Apply container and positioning classes for layout structure */}
          <div className="container mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Render footer at bottom of layout */}
      <Footer />
    </div>
  );
};

export default DashboardLayout;