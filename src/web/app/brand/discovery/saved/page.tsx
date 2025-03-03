import React from 'react';
import { formatDate } from '../../../lib/formatters';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '../../../components/ui/Alert';
import { CreatorCard } from '../../../components/brand/CreatorCard';
import { DataTable } from '../../../components/shared/DataTable';
import { useDiscovery } from '../../../hooks/useDiscovery';
import { SavedSearch, SavedCreator, Creator } from '../../../types/brand';

/**
 * Next.js server component that displays saved creator searches and saved creator lists for brand users.
 */
const SavedDiscoveryPage: React.FC = () => {
  // Fetch saved searches and saved creators using the useDiscovery hook with getSavedSearches() and getSavedCreators() methods
  const { savedSearches, savedSearchesLoading, creators, loading, handleApplySearch, handleDeleteSearch, handleRemoveSavedCreator } = useDiscovery();

  // Set up tabs to switch between 'Saved Searches' and 'Saved Creators'
  return (
    <div>
      {/* Render PageHeader with title 'Saved Discovery Items' and appropriate description */}
      <PageHeader
        title="Saved Discovery Items"
        description="Manage your saved creator searches and favorite creators for easier access and partnership opportunities."
      />

      <Tabs defaultValue="searches" className="w-full">
        <TabsList>
          <TabsTrigger value="searches">Saved Searches</TabsTrigger>
          <TabsTrigger value="creators">Saved Creators</TabsTrigger>
        </TabsList>
        
        {/* Saved Searches Tab */}
        <TabsContent value="searches" className="space-y-4">
          {savedSearchesLoading ? (
            <Alert>
              <AlertTitle>Loading saved searches...</AlertTitle>
              <AlertDescription>Fetching your saved searches. Please wait.</AlertDescription>
            </Alert>
          ) : savedSearches && savedSearches.length > 0 ? (
            <DataTable
              data={savedSearches}
              columns={getSearchColumns(handleApplySearch, handleDeleteSearch)}
              emptyMessage="No saved searches found."
            />
          ) : (
            <Alert>
              <AlertTitle>No saved searches</AlertTitle>
              <AlertDescription>Save your favorite searches to quickly find creators.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Saved Creators Tab */}
        <TabsContent value="creators" className="space-y-4">
          {loading ? (
            <Alert>
              <AlertTitle>Loading saved creators...</AlertTitle>
              <AlertDescription>Fetching your saved creators. Please wait.</AlertDescription>
            </Alert>
          ) : creators && creators.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {creators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  isFavorite={true} // Assuming all creators here are favorited
                  onFavorite={() => {}} // Placeholder, as removing from favorites is handled separately
                  onView={() => {}} // Placeholder, implement view profile action
                  onAddToList={() => {}} // Placeholder, implement add to list action
                  showMatchScore={false}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTitle>No saved creators</AlertTitle>
              <AlertDescription>Save your favorite creators for quick access.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * Defines the columns for the saved searches DataTable component.
 * @param handleApplySearch Function to handle applying a saved search
 * @param handleDeleteSearch Function to handle deleting a saved search
 * @returns Array of column definitions for the DataTable
 */
const getSearchColumns = (handleApplySearch: (search: SavedSearch) => void, handleDeleteSearch: (searchId: string) => Promise<void>) => {
  // Define 'Name' column with search name and styling
  // Define 'Date Saved' column with formatted date using formatDate function
  // Define 'Filters' column showing summarized filters using getFilterSummary function
  // Define 'Actions' column with 'Apply' and 'Delete' buttons that call the provided handler functions
  return [
    {
      key: 'name',
      header: 'Name',
      cell: (search: SavedSearch) => (
        <div className="font-medium">{search.name}</div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date Saved',
      cell: (search: SavedSearch) => formatDate(search.createdAt),
    },
    {
      key: 'filters',
      header: 'Filters',
      cell: (search: SavedSearch) => getFilterSummary(search),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (search: SavedSearch) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleApplySearch(search)}>
            Apply
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteSearch(search.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
};

/**
 * Creates a readable summary of filters used in a saved search.
 * @param filters SavedSearch filters
 * @returns Human-readable summary of filters
 */
const getFilterSummary = (search: SavedSearch): string => {
  // Extract key filter values from saved search object (categories, platforms, metrics)
  const { filters } = search;
  const categories = filters.categories && filters.categories.length > 0 ? filters.categories.join(', ') : null;
  const platforms = filters.platforms && filters.platforms.length > 0 ? filters.platforms.join(', ') : null;
  const followerRange = filters.followerRange && (filters.followerRange.min || filters.followerRange.max) ? `Followers: ${filters.followerRange.min || 0} - ${filters.followerRange.max || 'Any'}` : null;
  const engagementRate = filters.engagementRate && (filters.engagementRate.min || filters.engagementRate.max) ? `Engagement: ${filters.engagementRate.min || 0}% - ${filters.engagementRate.max || 'Any'}%` : null;

  // Format categories as comma-separated list if present
  // Format platforms as comma-separated list if present
  // Format follower range and engagement rate if present
  // Combine formatted elements into a readable summary string
  const filterStrings = [categories, platforms, followerRange, engagementRate].filter(Boolean);
  
  // Handle empty filters with appropriate messaging
  if (filterStrings.length === 0) {
    return 'No filters applied';
  }

  // Return the formatted summary string for display
  return filterStrings.join('; ');
};

/**
 * Handles applying a saved search by redirecting to the discovery page with saved filters.
 * @param search SavedSearch object
 */
const handleApplySearch = (search: SavedSearch): void => {
  // Extract filter parameters from the saved search
  const { filters } = search;

  // Construct a URL with query parameters representing the filters
  // Navigate to the main discovery page with the constructed URL
  // This applies the saved search filters to the discovery view
  console.log('Applying search:', filters);
  // Implement navigation logic here (e.g., using useRouter from Next.js)
};

/**
 * Handles deleting a saved search.
 * @param searchId ID of the saved search to delete
 */
const handleDeleteSearch = async (searchId: string): Promise<void> => {
  // Call the deleteSavedSearch method from the useDiscovery hook
  // Show confirmation before deletion
  // Handle success with appropriate notification
  // Handle errors with error notification
  // Refresh the saved searches list after successful deletion
  console.log('Deleting search:', searchId);
  // Implement deletion logic here
};

/**
 * Handles removing a creator from the saved creators list.
 * @param creatorId ID of the creator to remove
 */
const handleRemoveSavedCreator = async (creatorId: string): Promise<void> => {
  // Call the removeSavedCreator method from the useDiscovery hook
  // Show confirmation before removal
  // Handle success with appropriate notification
  // Handle errors with error notification
  // Refresh the saved creators list after successful removal
  console.log('Removing creator:', creatorId);
  // Implement removal logic here
};

export default SavedDiscoveryPage;