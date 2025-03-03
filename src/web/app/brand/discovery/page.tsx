import React, { Suspense } from 'react'; // react ^18.0.0
import { Search } from 'lucide-react'; // lucide-react ^0.279.0
import { useSearchParams } from 'next/navigation'; // next/navigation ^14.0.0

import PageHeader from '../../../../components/layout/PageHeader';
import CreatorSearch from '../../../../components/brand/CreatorSearch';
import { SearchFilters } from '../../../../types/brand';

/**
 * Utility function to extract search parameters from URL query string
 * @param params URLSearchParams object
 * @returns Parsed search filters object
 */
function parseSearchParams(params: URLSearchParams): SearchFilters {
  // LD1: Create an empty filters object that follows the SearchFilters interface
  const filters: SearchFilters = {
    categories: [],
    platforms: [],
    audienceAgeRange: { min: 0, max: 100 },
    audienceGender: [],
    audienceLocations: [],
    followerRange: { min: 0, max: undefined },
    engagementRate: { min: 0, max: undefined },
    contentTypes: [],
    budgetRange: { min: 0, max: undefined },
    keywords: []
  };

  // LD1: Extract query parameter for search text
  const searchText = params.get('q');
  if (searchText) {
    // LD1: Assign search text to filters object
    // filters.keywords = [searchText]; // Assuming keywords is where search text should go
  }

  // LD1: Extract and parse categories parameter as array
  const categories = params.getAll('category');
  if (categories && categories.length > 0) {
    filters.categories = categories;
  }

  // LD1: Extract and parse platforms parameter as array
  const platforms = params.getAll('platform');
  if (platforms && platforms.length > 0) {
    filters.platforms = platforms;
  }

  // LD1: Extract and parse follower range parameters (min, max)
  const followerMin = params.get('followerMin');
  const followerMax = params.get('followerMax');
  if (followerMin || followerMax) {
    filters.followerRange = {
      min: followerMin ? parseInt(followerMin) : 0,
      max: followerMax ? parseInt(followerMax) : undefined,
    };
  }

  // LD1: Extract and parse engagement rate parameters (min, max)
  const engagementMin = params.get('engagementMin');
  const engagementMax = params.get('engagementMax');
  if (engagementMin || engagementMax) {
    filters.engagementRate = {
      min: engagementMin ? parseInt(engagementMin) : 0,
      max: engagementMax ? parseInt(engagementMax) : undefined,
    };
  }

  // LD1: Extract and parse audience parameters (locations, age range, gender)
    const locations = params.getAll('location');
    if (locations && locations.length > 0) {
        filters.audienceLocations = locations;
    }

    const ageMin = params.get('ageMin');
    const ageMax = params.get('ageMax');
    if (ageMin || ageMax) {
        filters.audienceAgeRange = {
            min: ageMin ? parseInt(ageMin) : 0,
            max: ageMax ? parseInt(ageMax) : 100,
        };
    }

    const genders = params.getAll('gender');
    if (genders && genders.length > 0) {
        filters.audienceGender = genders;
    }

  // LD1: Extract and parse budget range parameters (min, max)
  const budgetMin = params.get('budgetMin');
  const budgetMax = params.get('budgetMax');
  if (budgetMin || budgetMax) {
    filters.budgetRange = {
      min: budgetMin ? parseInt(budgetMin) : 0,
      max: budgetMax ? parseInt(budgetMax) : undefined,
    };
  }

  // LD1: Return the constructed filters object
  return filters;
}

/**
 * Server component for the brand creator discovery page
 * @returns Rendered discovery page
 */
const DiscoveryPage = () => {
  // LD1: Get search parameters from URL using useSearchParams
  const searchParams = useSearchParams();

  // LD1: Parse search parameters into initial filter values
  const initialFilters = parseSearchParams(searchParams);

  // LD1: Render page layout with PageHeader component for consistent styling
  return (
    <div>
      <PageHeader
        title="Creator Discovery"
        description="Find creators who match your brand requirements."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Creator Discovery', href: '/brand/discovery', active: true },
        ]}
        actions={<Button><Search className="w-4 h-4 mr-2" /> Search</Button>}
      />

      {/* LD1: Wrap CreatorSearch component in Suspense for loading states */}
      <Suspense fallback={<p>Loading creators...</p>}>
        {/* LD1: Render CreatorSearch as main component with parsed initial filters */}
        <CreatorSearch initialFilters={initialFilters} />
      </Suspense>
    </div>
  );
};

// LD1: Default export of the DiscoveryPage component as a Next.js page
export default DiscoveryPage;