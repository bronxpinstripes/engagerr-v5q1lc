import React from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Search, 
  BarChart2, 
  Briefcase, 
  Users, 
  Settings, 
  MessageSquare 
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { UserType } from '../../types/user';

// Navigation items for brand users
const BRAND_NAV_ITEMS = [
  {
    path: '/brand/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/brand/discovery',
    label: 'Creator Discovery',
    icon: Search,
  },
  {
    path: '/brand/campaigns',
    label: 'Campaigns',
    icon: Briefcase,
  },
  {
    path: '/brand/partnerships',
    label: 'Partnerships',
    icon: Users,
  },
  {
    path: '/brand/analytics',
    label: 'Analytics',
    icon: BarChart2,
  },
  {
    path: '/messages',
    label: 'Messages',
    icon: MessageSquare,
  },
  {
    path: '/brand/settings',
    label: 'Settings',
    icon: Settings,
  },
];

/**
 * Component that renders the navigation sidebar for brand users
 * @returns The rendered navigation sidebar for brands
 */
const BrandNavigation = () => {
  // Access the navigation context to get sidebar state and active route detection
  const { sidebarOpen, isActive } = useNavigation();
  
  // Retrieve authenticated user information
  const { user } = useAuth();
  
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full py-6 transition-all duration-300",
        sidebarOpen ? "w-64 items-start" : "w-16 items-center"
      )}
    >
      <TooltipProvider>
        <nav className="flex flex-col space-y-1 w-full">
          {BRAND_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={item.path} className="w-full">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start p-3 font-normal",
                        active 
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                        !sidebarOpen && "justify-center px-0"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-blue-700" : "text-gray-500")} />
                      {sidebarOpen && <span className="ml-3">{item.label}</span>}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
    </aside>
  );
};

export default BrandNavigation;