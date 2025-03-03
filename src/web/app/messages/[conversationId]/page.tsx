import React, { useEffect } from 'react'; // React v18.2.0
import { notFound, redirect } from 'next/navigation'; // next/navigation ^14.0.0
import { Metadata } from 'next'; // next ^14.0.0

import { MessagingInterface } from '../../../components/shared/MessagingInterface'; // src/web/components/shared/MessagingInterface.tsx
import { ChatWindow } from '../../../components/shared/ChatWindow'; // src/web/components/shared/ChatWindow.tsx
import DashboardLayout from '../../../components/layout/DashboardLayout'; // src/web/components/layout/DashboardLayout.tsx
import PageHeader from '../../../components/layout/PageHeader'; // src/web/components/layout/PageHeader.tsx
import useAuth from '../../../hooks/useAuth'; // src/web/hooks/useAuth.ts
import useMessages from '../../../hooks/useMessages'; // src/web/hooks/useMessages.ts
import { ConversationFilter, Conversation } from '../../../types/message'; // src/web/types/message.ts

/**
 * Generates metadata for the conversation page including the title with the conversation partner's name
 * @param {object} { params }: { params: { conversationId: string } } - Object containing route parameters
 * @returns {Promise<Metadata>} Page metadata including dynamic title based on conversation
 */
export async function generateMetadata({ params }: { params: { conversationId: string } }): Promise<Metadata> {
  // LD1: Extract conversationId from params
  const conversationId = params.conversationId;

  // LD1: Generate a default title for the page
  const title = `Conversation with ${conversationId} | Engagerr`;

  // LD1: Return Metadata object with title and description
  return {
    title,
    description: 'Chat with your partnership connections, exchange files, and create proposals.',
  };
}

/**
 * The main page component for a specific conversation identified by conversationId
 * @param {object} { params }: { params: { conversationId: string } } - Object containing route parameters
 * @returns {JSX.Element} Rendered conversation page with chat interface
 */
export default function ConversationPage({ params }: { params: { conversationId: string } }): JSX.Element {
  // LD1: Extract conversationId from params
  const conversationId = params.conversationId;

  // LD1: Use useAuth hook to check if user is authenticated
  const { isAuthenticated } = useAuth();

  // LD1: Redirect to login page if user is not authenticated
  if (!isAuthenticated) {
    redirect('/auth/login');
  }

  // LD1: Use useMessages hook to get messaging functionality
  const {
    setActiveConversation,
    activeConversation,
    messages,
    isLoadingMessages,
    isSending,
    sendMessage,
    markAsRead,
    initiateProposal,
  } = useMessages();

  // LD1: Create a useEffect hook to set the active conversation when the page loads
  useEffect(() => {
    setActiveConversation(conversationId);
  }, [conversationId, setActiveConversation]);

  // LD1: Create a useEffect hook to mark messages as read when conversation changes
  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id);
    }
  }, [activeConversation, markAsRead]);

  // LD1: Return 404 not found if conversation doesn't exist
  if (!activeConversation && !isLoadingMessages) {
    notFound();
  }

  // LD1: Render DashboardLayout with PageHeader
  return (
    <DashboardLayout>
      <PageHeader
        title={`Conversation with ${activeConversation?.title || 'Loading...'}`}
        description="Chat with your partnership connections, exchange files, and create proposals."
      />
      {/* LD1: Render MessagingInterface with proper filter for the current conversation */}
      {/* LD1: Pass enableRealtime prop to enable real-time updates for active conversation */}
      <MessagingInterface
        initialFilter={{ participantId: null, participantType: null, partnershipId: null, hasUnread: null, isArchived: false, searchTerm: null }}
        enableRealtime={true}
      />
    </DashboardLayout>
  );
}