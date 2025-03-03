import React from 'react'; // version: ^18.0.0
import { Metadata } from 'next'; // version: ^14.0.0
import { useRouter } from 'next/navigation'; // version: ^14.0.0
import { Plus } from 'lucide-react'; // version: ^0.279.0

import DashboardLayout from '../../../components/layout/DashboardLayout'; // path: src/web/components/layout/DashboardLayout.tsx
import PageHeader from '../../../components/layout/PageHeader'; // path: src/web/components/layout/PageHeader.tsx
import PartnershipsList from '../../../components/creator/PartnershipsList'; // path: src/web/components/creator/PartnershipsList.tsx
import { Button } from '../../../components/ui/Button'; // path: src/web/components/ui/Button.tsx
import { usePartnerships } from '../../../hooks/usePartnerships'; // path: src/web/hooks/usePartnerships.ts

// Define metadata for the page
export const metadata: Metadata = {
  title: 'Partnerships | Engagerr',
  description: 'Manage your brand partnerships and collaborations',
};

/**
 * Generates metadata for the partnerships page
 * @returns {Metadata} Page metadata including title and description
 */
const generateMetadata = (): Metadata => {
  // LD1: Return title and description for the page
  return {
    title: 'Partnerships | Engagerr',
    description: 'Manage your brand partnerships and collaborations',
  };
};

/**
 * Server component that renders the partnerships page for creators
 * @returns {JSX.Element} The rendered partnerships page
 */
const PartnershipsPage: React.FC = () => {
  // LD1: Initialize router for navigation
  const router = useRouter();

  // LD1: Create actions component with 'Create Partnership' button
  const actions = (
    <Button onClick={() => router.push('/creator/partnerships/create')} aria-label="Create new partnership">
      <Plus className="mr-2 h-4 w-4" />
      Create Partnership
    </Button>
  );

  // LD1: Return a DashboardLayout containing the page content
  return (
    <DashboardLayout>
      {/* LD1: Include PageHeader with title 'Partnerships' and the actions component */}
      <PageHeader title="Partnerships" actions={actions} />

      {/* LD1: Render the PartnershipsList component to display partnerships */}
      <PartnershipsList />

      {/* LD1: Use container and spacing classes for proper layout */}
    </DashboardLayout>
  );
};

// Export the component
export default PartnershipsPage;
export { generateMetadata };