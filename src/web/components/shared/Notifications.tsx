import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BellIcon, CheckIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dropdown, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '../ui/Dropdown';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { formatDistanceToNow } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';

// Constants
const AUTO_REFRESH_INTERVAL = 1000 * 60 * 5; // 5 minutes

// Types
enum NotificationType {
  PARTNERSHIP_REQUEST = 'PARTNERSHIP_REQUEST',
  CONTENT_ANALYSIS = 'CONTENT_ANALYSIS',
  PLATFORM_UPDATE = 'PLATFORM_UPDATE',
  MESSAGE = 'MESSAGE',
  CONTRACT_UPDATE = 'CONTRACT_UPDATE',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
  SYSTEM = 'SYSTEM'
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  link: string | null;
  entityId: string | null;
  entityType: string | null;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

interface NotificationsProps {
  className?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

// Custom hook for managing notifications
const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get<NotificationsResponse>('/api/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
    } catch (err) {
      toast.error('Failed to mark notification as read');
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchNotifications, AUTO_REFRESH_INTERVAL);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  return {
    notifications,
    unreadCount,
    hasMore,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};

// Helper function to get appropriate icon for notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case NotificationType.PARTNERSHIP_REQUEST:
      return <div className="p-1 rounded-full bg-blue-100 text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      </div>;
    case NotificationType.CONTENT_ANALYSIS:
      return <div className="p-1 rounded-full bg-green-100 text-green-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path><path d="M12 3v6"></path></svg>
      </div>;
    case NotificationType.PLATFORM_UPDATE:
      return <div className="p-1 rounded-full bg-purple-100 text-purple-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
      </div>;
    case NotificationType.MESSAGE:
      return <div className="p-1 rounded-full bg-yellow-100 text-yellow-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>;
    case NotificationType.CONTRACT_UPDATE:
      return <div className="p-1 rounded-full bg-indigo-100 text-indigo-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M9 9h1"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg>
      </div>;
    case NotificationType.PAYMENT_UPDATE:
      return <div className="p-1 rounded-full bg-green-100 text-green-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>
      </div>;
    default:
      return <BellIcon className="h-5 w-5" />;
  }
};

// Helper function to get color based on notification type
const getNotificationColor = (type: string, isRead: boolean) => {
  const baseClasses = 'flex items-start gap-3 p-3 transition-colors';
  const unreadClasses = isRead ? '' : 'bg-blue-50 dark:bg-blue-950/20';
  
  switch (type) {
    case NotificationType.PARTNERSHIP_REQUEST:
      return cn(baseClasses, unreadClasses, 'hover:bg-blue-50 dark:hover:bg-blue-950/30');
    case NotificationType.CONTENT_ANALYSIS:
      return cn(baseClasses, unreadClasses, 'hover:bg-green-50 dark:hover:bg-green-950/30');
    case NotificationType.PLATFORM_UPDATE:
      return cn(baseClasses, unreadClasses, 'hover:bg-purple-50 dark:hover:bg-purple-950/30');
    case NotificationType.MESSAGE:
      return cn(baseClasses, unreadClasses, 'hover:bg-yellow-50 dark:hover:bg-yellow-950/30');
    case NotificationType.CONTRACT_UPDATE:
      return cn(baseClasses, unreadClasses, 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30');
    case NotificationType.PAYMENT_UPDATE:
      return cn(baseClasses, unreadClasses, 'hover:bg-green-50 dark:hover:bg-green-950/30');
    default:
      return cn(baseClasses, unreadClasses, 'hover:bg-gray-50 dark:hover:bg-gray-800/50');
  }
};

// Main Notifications component
const Notifications = ({ className }: NotificationsProps) => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    hasMore,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="primary"
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <NotificationsLoading />}
          
          {!loading && notifications.length === 0 && <NotificationsEmpty />}
          
          {!loading && notifications.length > 0 && (
            <DropdownMenuGroup>
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </DropdownMenuGroup>
          )}
        </div>
        
        {hasMore && (
          <div className="p-2 border-t text-center">
            <Link 
              href="/notifications" 
              className="text-sm text-blue-600 hover:underline block w-full"
              onClick={() => setOpen(false)}
            >
              See all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </Dropdown>
  );
};

// Individual notification item
const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { id, title, message, type, isRead, createdAt, link, sender } = notification;

  const icon = getNotificationIcon(type);
  const itemClasses = getNotificationColor(type, isRead);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  const handleClick = () => {
    // If not already read, mark as read
    if (!isRead) {
      onMarkAsRead(id);
    }
    
    // Navigation will happen through Link component
  };

  return (
    <DropdownMenuItem className="p-0 focus:bg-transparent" onSelect={e => e.preventDefault()}>
      <Link 
        href={link || '#'} 
        className={itemClasses}
        onClick={handleClick}
      >
        {sender?.avatar ? (
          <Avatar src={sender.avatar} alt={sender.name} />
        ) : (
          icon
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <p className="font-medium text-sm truncate">{title}</p>
            {!isRead && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-blue-600 hover:text-blue-800"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkAsRead(id);
                }}
                aria-label="Mark as read"
              >
                <CheckIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{message}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{timeAgo}</p>
        </div>
      </Link>
    </DropdownMenuItem>
  );
};

// Component to show when there are no notifications
const NotificationsEmpty = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-3">
        <BellIcon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium">No notifications yet</p>
      <p className="text-xs text-gray-500 mt-1">We'll notify you when something happens</p>
    </div>
  );
};

// Loading state for notifications
const NotificationsLoading = () => {
  return (
    <div className="p-3 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notifications;