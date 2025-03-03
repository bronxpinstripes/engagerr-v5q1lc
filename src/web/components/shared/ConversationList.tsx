import React, { useState, useEffect, useMemo } from 'react'; // react ^18.0.0
import { Search, Clock, UserCircle2 } from 'lucide-react'; // lucide-react ^0.279.0

import useMessages from '../../hooks/useMessages';
import useAuth from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { formatDateTime } from '../../lib/formatters';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Skeleton from '../ui/Skeleton';
import { Conversation, ConversationFilter, ParticipantType } from '../../types/message';

/**
 * Type definition for the props of the ConversationList component
 */
interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  filter?: ConversationFilter;
  activeConversationId?: string;
  className?: string;
}

/**
 * Type definition for the props of the ConversationItem subcomponent
 */
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}

/**
 * Formats the conversation's last message timestamp in a user-friendly way
 * @param date The date
 * @returns Formatted date string
 */
const formatConversationTime = (date: Date): string => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date >= startOfToday) {
    return formatDateTime(date, 'h:mm A'); // e.g., 3:45 PM
  } else {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    if (date >= startOfWeek) {
      return formatDateTime(date, 'EEEE'); // e.g., Monday
    } else {
      return formatDateTime(date, 'MMM d'); // e.g., Oct 15
    }
  }
};

/**
 * Gets the other participant in the conversation (not the current user)
 * @param conversation The conversation
 * @param currentUserId The current user's ID
 * @returns The other participant in the conversation
 */
const getOtherParticipant = (conversation: Conversation, currentUserId: string) => {
  return conversation.participants.find(p => p.userId !== currentUserId);
};

/**
 * Renders an individual conversation item in the list
 */
const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  currentUserId,
}) => {
  const otherParticipant = useMemo(() => getOtherParticipant(conversation, currentUserId), [conversation, currentUserId]);

  return (
    <div
      className={cn(
        "flex items-center space-x-3 rounded-md p-2 transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        isActive && "bg-blue-50 text-blue-700 dark:bg-blue-700 dark:text-blue-50",
        "cursor-pointer"
      )}
      onClick={onClick}
      aria-label={`Conversation with ${otherParticipant?.name}`}
    >
      <Avatar
        src={otherParticipant?.avatarUrl}
        alt={otherParticipant?.name || "Conversation"}
        name={otherParticipant?.name}
        size="sm"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium leading-none">
            {otherParticipant?.name || "Unknown"}
          </span>
          {conversation.lastMessage && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatConversationTime(conversation.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p className="line-clamp-1 text-sm text-gray-500 dark:text-gray-400">
          {conversation.lastMessage?.content || "No messages yet"}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <Badge variant="secondary">{conversation.unreadCount}</Badge>
      )}
      {otherParticipant?.isOnline && (
        <UserCircle2 className="h-4 w-4 text-green-500" aria-label="Online" />
      )}
    </div>
  );
};

/**
 * Renders an empty state for the conversation list
 */
const EmptyState: React.FC<{ isLoading: boolean; filtered: boolean }> = ({ isLoading, filtered }) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (filtered) {
    return (
      <div className="p-4 text-center text-gray-500">
        No conversations match your filter.
      </div>
    );
  }

  return (
    <div className="p-4 text-center text-gray-500">
      No conversations yet. Start a new conversation!
    </div>
  );
};

/**
 * A component that displays a list of conversations with filtering capabilities
 */
const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  filter = {},
  activeConversationId,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { filteredConversations, isLoadingConversations } = useMessages();

  /**
   * Updates the search term and filters conversations
   * @param e React.ChangeEvent<HTMLInputElement>
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  /**
   * Handles selecting a conversation from the list
   * @param conversation Conversation
   */
  const handleSelectConversation = (conversation: Conversation) => {
    onSelectConversation(conversation);
  };

  // Apply filter when props.filter changes
  useEffect(() => {
    // You can add any logic here that needs to run when the filter prop changes
  }, [filter]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-2 py-1.5">
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={handleSearch}
          aria-label="Search conversations"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => handleSelectConversation(conversation)}
              currentUserId={user?.id || ""}
            />
          ))
        ) : (
          <EmptyState isLoading={isLoadingConversations} filtered={!!searchTerm} />
        )}
      </div>
    </div>
  );
};

export default ConversationList;