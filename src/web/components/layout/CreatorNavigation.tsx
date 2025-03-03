import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, BarChart2, Share2, FileStack, Users, Settings, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { UserType } from '../../types/user';

// Define navigation items for creator users
const CREATOR_NAV_ITEMS = [
  {
    path: '/creator/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    path: '/creator/content-mapping',
    label: 'Content Mapping',
    icon: Share2
  },
  {
    path: '/creator/analytics',
    label: 'Analytics',
    icon: BarChart2
  },
  {
    path: '/creator/media-kit',
    label: 'Media Kit',
    icon: FileStack
  },
  {
    path: '/creator/partnerships',
    label: 'Partnerships',
    icon: Users
  },
  {
    path: '/messages',
    label: 'Messages',
    icon: MessageSquare
  },
  {
    path: '/creator/settings',
    label: 'Settings',
    icon: Settings
  }
];

/**
 * Navigation sidebar component specifically for creator users.
 * Displays links to creator-specific pages with appropriate icons,
 * active state highlighting, and tooltips for collapsed view.
 */
const CreatorNavigation: React.FC = () => {
  // Access navigation context for sidebar state and active route detection
  const { sidebarOpen, isActive } = useNavigation();
  
  // Get authenticated user information
  const { user } = useAuth();
  
  // Only show creator navigation for creator users
  if (user?.userType !== UserType.CREATOR) {
    return null;
  }

  return (
    <div
      className={cn(
        "h-full py-4 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
      aria-label="Creator navigation"
      role="navigation"
    >
      <nav className="space-y-0.5 px-2 flex-1">
        <TooltipProvider>
          {CREATOR_NAV_ITEMS.map((item) => {
            const isActivePath = isActive(item.path);
            
            return (
              <div key={item.path} className="my-1">
                {sidebarOpen ? (
                  // Expanded navigation item
                  <Link href={item.path} passHref aria-current={isActivePath ? 'page' : undefined}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-base font-medium",
                        isActivePath
                          ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                      asChild
                    >
                      <span>
                        <item.icon className="h-5 w-5 mr-3 flex-shrink-0" aria-hidden="true" />
                        {item.label}
                      </span>
                    </Button>
                  </Link>
                ) : (
                  // Collapsed navigation item with tooltip
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={item.path} passHref aria-current={isActivePath ? 'page' : undefined}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "w-full p-2 flex justify-center",
                            isActivePath
                              ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                          asChild
                        >
                          <span>
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">{item.label}</span>
                          </span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-normal">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>
    </div>
  );
};

export default CreatorNavigation;