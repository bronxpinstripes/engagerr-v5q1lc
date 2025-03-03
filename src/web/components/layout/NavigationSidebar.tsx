import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeft, ChevronRight } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../hooks/useAuth';
import CreatorNavigation from './CreatorNavigation';
import BrandNavigation from './BrandNavigation';
import { UserType } from '../../types/user';

/**
 * A responsive navigation sidebar component that dynamically renders 
 * the appropriate navigation menu based on user type (creator or brand).
 * Handles sidebar visibility, collapsing behavior, and integration with
 * the NavigationContext system.
 */
const NavigationSidebar: React.FC = () => {
  // Access the navigation context to get sidebar state and toggle function
  const { sidebarOpen, toggleSidebar, userType } = useNavigation();
  
  // Access auth context to determine if user is authenticated and their type
  const { isAuthenticated, isCreator, isBrand } = useAuth();
  
  // Get current pathname for potential mobile navigation handling
  const pathname = usePathname();

  // Close sidebar automatically on mobile when navigating to a new page
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && sidebarOpen) {
      toggleSidebar();
    }
  }, [pathname, toggleSidebar, sidebarOpen]);

  return (
    <aside 
      className={cn(
        "h-full border-r border-gray-200 bg-white transition-all duration-300 relative",
        sidebarOpen ? "w-64" : "w-16"
      )}
      aria-label="Main navigation"
    >
      {/* Render the appropriate navigation based on user type */}
      {isAuthenticated && (
        <>
          {userType === UserType.CREATOR && <CreatorNavigation />}
          {userType === UserType.BRAND && <BrandNavigation />}
        </>
      )}
      
      {/* Toggle button for expanding/collapsing the sidebar */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-3 bottom-8 flex items-center justify-center h-6 w-6 bg-white rounded-full border border-gray-200 shadow-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
};

export default NavigationSidebar;