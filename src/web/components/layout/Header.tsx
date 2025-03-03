import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, X, User, Settings, LogOut, HelpCircle, LayoutDashboard, FileText, BarChart, Briefcase, Search, Target, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/Avatar';
import ThemeToggle from '../ui/ThemeToggle';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';

// Types for the component
interface HeaderProps {
  className?: string;
}

// User type enum
enum UserType {
  CREATOR = 'creator',
  BRAND = 'brand'
}

// Navigation item structure
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

/**
 * Main header component that renders the application navigation bar with user profile and theme controls
 */
const Header = ({ className }: HeaderProps) => {
  // Get authentication state
  const { user, isAuthenticated, logout } = useAuth();
  
  // State for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for notifications
  const [hasNotifications, setHasNotifications] = useState(false);
  
  // Get current pathname for active link highlighting
  const pathname = usePathname();
  
  // Get navigation items based on user type
  const navItems = getNavItems(user?.userType as UserType);
  
  // Effect to check for notifications
  useEffect(() => {
    // In a real implementation, this would fetch notifications from an API
    if (user) {
      setHasNotifications(true);
    }
  }, [user]);
  
  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background", className)}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo and Brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">Engagerr</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {isAuthenticated && navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        {/* User Controls */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center rounded-full"
                >
                  <span className="sr-only">New notifications</span>
                </Badge>
              )}
            </Button>
          )}
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar size="sm">
                    <AvatarImage src={user?.avatar || undefined} alt={user?.fullName || "User"} />
                    <AvatarFallback>{getUserInitials(user?.fullName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user?.fullName}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
          
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 py-3">
            {isAuthenticated && navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            
            {!isAuthenticated && (
              <Link
                href="/auth/login"
                className="flex items-center rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

/**
 * Helper function to get user initials for avatar fallback
 */
const getUserInitials = (name: string | null | undefined): string => {
  if (!name) return "U";
  
  const parts = name.trim().split(" ");
  if (parts.length === 0) return "U";
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Helper function to get navigation items based on user type
 */
const getNavItems = (userType: UserType | null): NavItem[] => {
  if (userType === UserType.CREATOR) {
    return [
      { 
        label: 'Dashboard', 
        href: '/creator/dashboard', 
        icon: <LayoutDashboard className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Content', 
        href: '/creator/content', 
        icon: <FileText className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Analytics', 
        href: '/creator/analytics', 
        icon: <BarChart className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Partnerships', 
        href: '/creator/partnerships', 
        icon: <Users className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Media Kit', 
        href: '/creator/media-kit', 
        icon: <Briefcase className="mr-2 h-4 w-4" /> 
      }
    ];
  }
  
  if (userType === UserType.BRAND) {
    return [
      { 
        label: 'Dashboard', 
        href: '/brand/dashboard', 
        icon: <LayoutDashboard className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Discovery', 
        href: '/brand/discovery', 
        icon: <Search className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Campaigns', 
        href: '/brand/campaigns', 
        icon: <Target className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Partnerships', 
        href: '/brand/partnerships', 
        icon: <Users className="mr-2 h-4 w-4" /> 
      },
      { 
        label: 'Analytics', 
        href: '/brand/analytics', 
        icon: <BarChart className="mr-2 h-4 w-4" /> 
      }
    ];
  }
  
  return [];
};

export default Header;