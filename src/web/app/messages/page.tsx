import React from 'react'; // react ^18.2.0
import { useSearchParams } from 'next/navigation'; // next/navigation ^14.0.0
import { Metadata } from 'next'; // next ^14.0.0

import { MessagingInterface } from '../../components/shared/MessagingInterface'; // src/web/components/shared/MessagingInterface.tsx
import DashboardLayout from '../../components/layout/DashboardLayout'; // src/web/components/layout/DashboardLayout.tsx
import PageHeader from '../../components/layout/PageHeader'; // src/web/components/layout/PageHeader.tsx
import useAuth from '../../hooks/useAuth'; // src/web/hooks/useAuth.ts
import { ConversationFilter } from '../../types/message'; // src/web/types/message.ts

/**
 * Generates metadata for the messages page
 * @returns Page metadata including title and description
 */
export const generateMetadata = (): Metadata => {
  return {
    title: 'Messages | Engagerr',
    description: 'Communicate with creators and brands, manage partnership proposals, and share content.',
  };
};

/**
 * The main page component for messages functionality
 * @returns Rendered messages page with conversation list and chat interface
 */
export default function MessagesPage(): JSX.Element {
  // LD1: Use useAuth hook to get current user information
  const { user, isAuthenticated } = useAuth();

  // LD1: Use useSearchParams to extract any conversation filters or active conversation ID
  const searchParams = useSearchParams();

  // LD1: Parse the conversation query parameter if present
  const conversation = searchParams.get('conversation');

  // LD1: Determine initial filter based on URL parameters and user type
  const initialFilter: ConversationFilter = React.useMemo(() => {
    const filter: ConversationFilter = {};

    if (conversation) {
      filter.participantId = conversation;
    }

    if (user?.userType === 'creator') {
      filter.participantType = 'brand';
    } else if (user?.userType === 'brand') {
      filter.participantType = 'creator';
    }

    return filter;
  }, [searchParams, user]);

  // LD1: Render DashboardLayout with PageHeader and MessagingInterface
  return (
    <DashboardLayout>
      {/* LD1: PageHeader with title and description */}
      <PageHeader
        title="Messages"
        description="Communicate with creators and brands, manage partnership proposals, and share content."
      />
      {/* LD1: Configure MessagingInterface with initial filter and realtime updates enabled */}
      {isAuthenticated && (
        <MessagingInterface
          initialFilter={initialFilter}
          enableRealtime={true}
          className="h-full"
        />
      )}
    </DashboardLayout>
  );
}