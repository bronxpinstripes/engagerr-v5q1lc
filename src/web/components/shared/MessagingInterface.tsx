import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'; // react ^18.2.0
import { useMediaQuery } from 'react-responsive'; // react-responsive ^9.0.0
import { MessageSquare, X } from 'lucide-react'; // lucide-react ^0.279.0

import ConversationList from './ConversationList'; // src/web/components/shared/ConversationList.tsx
import ChatWindow from './ChatWindow'; // src/web/components/shared/ChatWindow.tsx
import useMessages from '../../hooks/useMessages'; // src/web/hooks/useMessages.ts
import useAuth from '../../hooks/useAuth'; // src/web/hooks/useAuth.ts
import { cn } from '../../lib/utils'; // src/web/lib/utils.ts
import {
  Conversation,
  ConversationFilter,
  ParticipantType,
  MessageType,
} from '../../types/message'; // src/web/types/message.ts

/**
 * Interface defining the props for the MessagingInterface component
 */
export interface MessagingInterfaceProps {
  /** Initial filter to apply to the conversation list */
  initialFilter?: ConversationFilter;
  /** Whether to enable real-time updates for messages */
  enableRealtime?: boolean;
  /** Additional CSS classes to apply to the component */
  className?: string;
}

/**
 * A comprehensive messaging interface component that combines conversation listing and chat functionality
 */
export const MessagingInterface: React.FC<MessagingInterfaceProps> = ({
  initialFilter = {},
  enableRealtime = true,
  className = '',
}) => {
  // State to manage the current filter applied to the conversation list
  const [filter, setFilter] = useState<ConversationFilter>(initialFilter);

  // State to manage whether to show the chat window on mobile devices
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // Access messaging functionality and state from the useMessages hook
  const {
    conversations,
    filteredConversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    sendMessage,
    setActiveConversation,
    filterConversations,
    markAsRead,
    initiateProposal,
  } = useMessages();

  // Access authenticated user information
  const { user } = useAuth();

  // Detect screen size for responsive layout
  const isMobile = useMediaQuery({ maxWidth: 768 });

  /**
   * Handles sending a new message
   * @param message The message content
   * @param attachments The attachments
   * @returns void
   */
  const handleSendMessage = useCallback(
    (message: string, attachments?: File[]) => {
      if (!activeConversation) return;

      sendMessage(activeConversation.id, message)
        .then(() => {
          // Mark conversation as read after sending message
          markAsRead(activeConversation.id);
        })
        .catch((error) => {
          console.error('Failed to send message:', error);
        });
    },
    [sendMessage, activeConversation, markAsRead]
  );

  /**
   * Handles selecting a conversation from the list
   * @param conversation The selected conversation
   * @returns void
   */
  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      setActiveConversation(conversation.id);
      markAsRead(conversation.id);

      // On mobile, toggle the mobile view to show chat instead of conversation list
      if (isMobile) {
        toggleMobileView();
      }
    },
    [setActiveConversation, markAsRead, isMobile]
  );

  /**
   * Handles initiating a partnership proposal from the current conversation
   * @returns void
   */
  const handleCreateProposal = useCallback(async () => {
    if (!activeConversation) return;

    try {
      await initiateProposal(activeConversation.id, {
        // TODO: Add proposal details
      });
    } catch (error) {
      console.error('Failed to create proposal:', error);
    }
  }, [activeConversation, initiateProposal]);

  /**
   * Toggles between conversation list and chat view on mobile devices
   * @returns void
   */
  const toggleMobileView = useCallback(() => {
    setShowChatOnMobile((prev) => !prev);
  }, []);

  // Apply initial filter when initialFilter prop changes
  useEffect(() => {
    setFilter(initialFilter);
    filterConversations(initialFilter);
  }, [initialFilter, filterConversations]);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Conversation List (Sidebar) */}
      {(!isMobile || !showChatOnMobile) && (
        <div className="w-80 border-r flex-shrink-0">
          <ConversationList
            onSelectConversation={handleSelectConversation}
            filter={filter}
            activeConversationId={activeConversation?.id}
            className="h-full"
          />
        </div>
      )}

      {/* Chat Window (Main Area) */}
      {(activeConversation || !filteredConversations?.length) && (
        <div className="flex-1">
          {isMobile && showChatOnMobile && (
            <div className="border-b p-4">
              <Button variant="ghost" size="sm" onClick={toggleMobileView}>
                <X className="h-4 w-4 mr-2" />
                Back to Conversations
              </Button>
            </div>
          )}
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            isLoading={isLoadingMessages}
            isSending={isSending}
            onSendMessage={handleSendMessage}
            onCreateProposal={handleCreateProposal}
            showHeader={!isMobile}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
};