import React, { Suspense, useMemo } from 'react'; // react v18.0+
import { ArrowLeft, Star, MessageSquare, PlusCircle } from 'lucide-react'; // lucide-react v0.279.0
import { useParams, useRouter } from 'next/navigation'; // next/navigation v14.0.0

import PageHeader from '../../../../components/layout/PageHeader';
import CreatorProfile from '../../../../components/brand/CreatorProfile';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import useDiscovery from '../../../../hooks/useDiscovery';
import usePartnerships from '../../../../hooks/usePartnerships';
import { formatNumber } from '../../../../lib/formatters';

/**
 * Server component that generates metadata for the creator profile page for SEO and page title
 * @param object - { params }
 * @returns Page metadata including title and description
 */
export async function generateMetadata({ params }: { params: { creatorId: string } }) {
  // LD1: Extract creatorId from params
  const creatorId = params.creatorId;

  // LD1: Fetch basic creator info for metadata
  // LD1: Replace with actual data fetching logic
  const creatorName = `Creator ${creatorId}`; // Placeholder
  const creatorCategory = 'Tech & Lifestyle'; // Placeholder

  // LD1: Return metadata object with dynamic title and description
  return {
    title: `${creatorName} - ${creatorCategory} | Engagerr`,
    description: `Detailed profile of ${creatorName} on Engagerr. Discover metrics, content, and more.`
  };
}

/**
 * Server component that renders a detailed creator profile page for brand discovery
 * @returns Rendered creator profile page
 */
const CreatorProfilePage = () => {
  // LD1: Get creatorId from URL parameters using useParams
  const { creatorId } = useParams<{ creatorId: string }>();

  // LD1: Use useRouter for navigation functions
  const router = useRouter();

  // LD1: Use useDiscovery hook to fetch creator details and manage favorite status
  const {
    getCreatorDetails,
    isFavorite,
    favoriteCreator,
    unfavoriteCreator
  } = useDiscovery();

  // LD1: Use usePartnerships hook to initiate partnerships
  const { initiatePartnership } = usePartnerships();

  // LD1: Fetch creator details using getCreatorDetails function from useDiscovery hook
  const creatorDetailsPromise = useMemo(() => {
    return getCreatorDetails(creatorId);
  }, [creatorId, getCreatorDetails]);

  // LD1: Check if creator is in brand's favorites using isFavorite function
  const isCurrentlyFavorite = isFavorite(creatorId);

  // LD1: Implement favorite/unfavorite toggle functionality
  const handleToggleFavorite = async () => {
    if (isCurrentlyFavorite) {
      await unfavoriteCreator(creatorId);
    } else {
      await favoriteCreator(creatorId);
    }
    router.refresh(); // Refresh the route to update the favorite status
  };

  // LD1: Implement partnership initiation flow
  const handleInitiatePartnership = async () => {
    // LD1: Replace with actual partnership initiation logic
    console.log('Initiate partnership with creator:', creatorId);
    // LD1: Call initiatePartnership function from usePartnerships hook
    // LD1: Redirect to partnership management page
  };

  // LD1: Implement navigation back to discovery page
  const handleGoBack = () => {
    router.back();
  };

  // LD1: Render PageHeader with back button, creator name, and match score
  // LD1: Render action buttons (Contact, Message, Save, Create Proposal)
  // LD1: Render CreatorProfile component with creator data
  // LD1: Handle loading state with Suspense boundary
  return (
    <div>
      <PageHeader
        title="Creator Profile"
        breadcrumbs={[
          { label: 'Discovery', href: '/brand/discovery' },
          { label: 'Creator Profile', href: `/brand/discovery/${creatorId}`, active: true }
        ]}
        actions={
          <ActionButtons
            creator={creatorDetailsPromise}
            isFavorite={isCurrentlyFavorite}
            onToggleFavorite={handleToggleFavorite}
            onInitiatePartnership={handleInitiatePartnership}
          />
        }
      />
      <Suspense fallback={<Card>Loading creator profile...</Card>}>
        <CreatorProfile creatorId={creatorId} />
      </Suspense>
    </div>
  );
};

/**
 * Component that renders action buttons for interacting with the creator
 * @param object - { creator, isFavorite, onToggleFavorite, onInitiatePartnership }
 * @returns Rendered action buttons
 */
const ActionButtons = ({ creator, isFavorite, onToggleFavorite, onInitiatePartnership }: { creator: any; isFavorite: boolean; onToggleFavorite: () => Promise<void>; onInitiatePartnership: () => Promise<void> }) => {
  // LD1: Render Message button to start conversation
  // LD1: Render Save/Unsave button to toggle favorite status
  // LD1: Render Create Proposal button to initiate partnership
  // LD1: Implement handlers for button actions
  // LD1: Apply appropriate styling and icons
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary">
        <MessageSquare className="h-4 w-4 mr-2" />
        Message
      </Button>
      <Button variant="outline" onClick={onToggleFavorite}>
        {isFavorite ? (
          <>
            <Star className="h-4 w-4 mr-2" />
            Unsave
          </>
        ) : (
          <>
            <PlusCircle className="h-4 w-4 mr-2" />
            Save
          </>
        )}
      </Button>
      <Button onClick={onInitiatePartnership}>Create Proposal</Button>
    </div>
  );
};

export default CreatorProfilePage;