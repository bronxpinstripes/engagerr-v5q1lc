import React, { useState, useEffect, useCallback } from 'react'; // react ^18.0.0
import {
  Search,
  Grid,
  List,
  SlidersHorizontal,
  Star,
  ArrowUpDown,
  Save,
} from 'lucide-react'; // lucide-react ^0.279.0
import {
  Button, // Button component for actions
} from '../ui/Button';
import {
  Input, // Search input field component
} from '../ui/Input';
import {
  Select, // Select dropdown component for sort options
} from '../ui/Select';
import {
  Tab,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../ui/Tabs';
import { cn } from '../../lib/utils';
import {
  formatFollowerCount,
  formatEngagementRate,
} from '../../lib/formatters';
import { useDiscovery } from '../../hooks/useDiscovery';
import SearchFilters from './SearchFilters';
import CreatorCard from './CreatorCard';
import DataTable from '../shared/DataTable';

// Define the type for the component's props
interface CreatorSearchProps {
  className?: string;
  initialFilters?: any;
  initialView?: 'grid' | 'table';
  onCreatorSelect?: (creatorId: string) => void;
}

/**
 * Main component for brands to search and discover creators with comprehensive filtering and display options
 */
const CreatorSearch: React.FC<CreatorSearchProps> = (props) => {
  // Local state for UI elements
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<'grid' | 'table'>(props.initialView || 'grid');
  const [showFilters, setShowFilters] = useState(true);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [selectedSortOption, setSelectedSortOption] = useState('relevance');

  // Access all discovery state and functions from the useDiscovery hook
  const {
    creators,
    searchQuery,
    setSearchQuery,
    filters,
    updateFilters,
    resetFilters,
    searchCreators,
    totalResults,
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    getCreatorDetails,
    saveSearch,
    loadSavedSearch,
    savedSearches,
    favoriteCreator,
    unfavoriteCreator,
    isFavorite,
    sortResults,
    sortOptions,
  } = useDiscovery(props.initialFilters);

  /**
   * Handles the submission of the search form
   * @param e React.FormEvent - The form event
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchCreators();
  };

  /**
   * Handles changes to the search filters
   * @param updatedFilters object - The updated filter values
   */
  const handleFilterChange = (updatedFilters: object) => {
    setLoading(true);
    updateFilters(updatedFilters);
  };

  /**
   * Handles changes to the result sorting option
   * @param sortOption string - The selected sort option
   */
  const handleSortChange = (sortOption: string) => {
    setLoading(true);
    sortResults(sortOption);
    setLoading(false);
  };

  /**
   * Handles request to view a creator's detailed profile
   * @param creatorId string - The ID of the creator to view
   */
  const handleViewCreator = (creatorId: string) => {
    // Navigate to the creator's detailed profile page route
    // Pass creator ID as a parameter in the URL
    console.log(`Viewing creator with ID: ${creatorId}`);
  };

  /**
   * Handles toggling a creator as favorite/unfavorite
   * @param creatorId string - The ID of the creator to toggle
   * @param isFavorite boolean - Whether the creator is currently a favorite
   */
  const handleToggleFavorite = (creatorId: string, isFavorite: boolean) => {
    if (isFavorite) {
      unfavoriteCreator(creatorId);
    } else {
      favoriteCreator(creatorId);
    }
  };

  /**
   * Handles adding a creator to a custom list
   * @param creatorId string - The ID of the creator to add
   */
  const handleAddToList = (creatorId: string) => {
    // Open modal for selecting or creating a list
    // Add creator to the selected list
    // Show confirmation notification
    console.log(`Adding creator with ID: ${creatorId} to list`);
  };

  /**
   * Toggles the visibility of the filter panel on mobile view
   */
  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  /**
   * Saves the current search parameters for future use
   */
  const handleSaveSearch = () => {
    // Open modal to name the search
    // Call saveSearch from useDiscovery with current filters and name
    // Show confirmation notification
    console.log('Saving search parameters');
  };

  useEffect(() => {
    searchCreators();
  }, []);

  const tableColumns = React.useMemo(
    () => [
      {
        key: 'name',
        header: 'Creator',
        cell: row => (
          <div className="flex items-center gap-2">
            <Avatar src={row.profileImage} name={row.displayName} />
            <div>
              <p className="font-medium">{row.displayName}</p>
              <p className="text-sm text-gray-500">{row.categories.join(', ')}</p>
            </div>
          </div>
        ),
        sortable: true,
      },
      {
        key: 'followers',
        header: 'Followers',
        cell: row => formatFollowerCount(row.metrics?.totalFollowers || 0),
        sortable: true,
      },
      {
        key: 'engagement',
        header: 'Engagement',
        cell: row => formatEngagementRate(row.metrics?.averageEngagementRate || 0),
        sortable: true,
      },
      {
        key: 'platforms',
        header: 'Platforms',
        cell: row => <></>,
        sortable: false,
      },
      {
        key: 'matchScore',
        header: 'Match Score',
        cell: row => row.matchScore ? `${Math.round(row.matchScore)}%` : 'N/A',
        sortable: true,
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: row => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(row.id, isFavorite(row.id));
            }}>
              {isFavorite(row.id) ? <Star className="fill-yellow-400 text-yellow-400" /> : <Star />}
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              handleAddToList(row.id);
            }}>
              <Plus />
            </Button>
          </div>
        ),
        sortable: false,
      },
    ],
    [handleToggleFavorite, handleAddToList, isFavorite]
  )

  return (
    <div className={cn("flex flex-col gap-4", props.className)}>
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Search creators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" variant="default">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        <Button variant="outline" size="sm" onClick={handleToggleFilters}>
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveSearch}>
          <Save className="w-4 h-4 mr-2" />
          Save Search
        </Button>
        <Select value={selectedSortOption} onValueChange={handleSortChange}>
          <Select.Trigger className="w-[180px]">
            <Select.Value placeholder="Sort by" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="relevance">Most Relevant</Select.Item>
            <Select.Item value="followers_desc">Most Followers</Select.Item>
            <Select.Item value="engagement_desc">Highest Engagement</Select.Item>
            <Select.Item value="match_desc">Best Match</Select.Item>
          </Select.Content>
        </Select>
      </form>

      <div className="flex flex-col md:flex-row gap-4">
        {showFilters && (
          <div className="w-full md:w-1/4">
            <SearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              isLoading={loading}
            />
          </div>
        )}
        <div className="w-full md:w-3/4">
          <Tabs value={viewType} onValueChange={value => setViewType(value)}>
            <TabsList>
              <TabsTrigger value="grid">
                <Grid className="w-4 h-4 mr-2" />
                Grid View
              </TabsTrigger>
              <TabsTrigger value="table">
                <List className="w-4 h-4 mr-2" />
                Table View
              </TabsTrigger>
            </TabsList>
            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators.map((creator) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    isFavorite={isFavorite(creator.id)}
                    onFavorite={handleToggleFavorite}
                    onView={handleViewCreator}
                    onAddToList={handleAddToList}
                    showMatchScore={true}
                  />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="table">
              <DataTable
                data={creators}
                columns={tableColumns}
                loading={loading}
                searchable={false}
                onRowClick={row => handleViewCreator(row.id)}
                pageSize={pageSize}
                emptyMessage="No creators found matching your criteria"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{totalResults} creators found</p>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreatorSearch;