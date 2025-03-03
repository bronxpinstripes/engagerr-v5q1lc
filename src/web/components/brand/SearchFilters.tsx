import React, { useState, useEffect, useCallback } from 'react'; // react ^18.0.0
import {
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'; // lucide-react ^0.279.0
import { Slider } from '@radix-ui/react-slider'; // @radix-ui/react-slider ^1.1.2

import { useDiscovery } from '../../hooks/useDiscovery';
import { SearchFilters as SearchFiltersType } from '../../types/brand';
import { Button } from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../lib/utils';

/**
 * Props for the SearchFilters component
 */
interface SearchFiltersProps {
  /** Function that is called when filters change */
  onFilterChange?: (filters: SearchFiltersType) => void;
  /** Function that is called when Apply Filters button is clicked */
  onApplyFilters?: (filters: SearchFiltersType) => void;
  /** Initial filters state (optional) */
  initialFilters?: SearchFiltersType;
  /** Whether the filters panel can be collapsed on mobile (optional) */
  isCollapsible?: boolean;
  /** Loading state for filter actions (optional) */
  isLoading?: boolean;
  /** Additional CSS classes to apply (optional) */
  className?: string;
}

/**
 * Component for managing creator discovery filters
 */
const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  onApplyFilters,
  initialFilters,
  isCollapsible = true,
  isLoading: initialIsLoading,
  className,
}) => {
  // Use the useDiscovery hook to manage filter state
  const { filters, updateFilters, resetFilters } = useDiscovery(initialFilters);

  // State to track which filter sections are expanded/collapsed
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    platforms: true,
    audience: true,
    metrics: true,
    budget: true,
  });

  // Loading state for filter actions
  const [isLoading, setIsLoading] = useState<boolean>(initialIsLoading || false);

  /**
   * Handles changes to category filter selections
   * @param checked Whether the category is checked
   * @param categoryId The ID of the category
   */
  const handleCategoryChange = (checked: boolean, categoryId: string) => {
    const updatedCategories = checked
      ? [...filters.categories, categoryId]
      : filters.categories.filter((id) => id !== categoryId);
    updateFilters({ categories: updatedCategories });
    onFilterChange?.({ ...filters, categories: updatedCategories });
  };

  /**
   * Handles changes to platform filter selections
   * @param checked Whether the platform is checked
   * @param platformId The ID of the platform
   */
  const handlePlatformChange = (checked: boolean, platformId: string) => {
    const updatedPlatforms = checked
      ? [...filters.platforms, platformId]
      : filters.platforms.filter((id) => id !== platformId);
    updateFilters({ platforms: updatedPlatforms });
    onFilterChange?.({ ...filters, platforms: updatedPlatforms });
  };

  /**
   * Handles changes to follower range slider
   * @param range The follower range
   */
  const handleFollowerRangeChange = (range: number[]) => {
    const [min, max] = range;
    updateFilters({ followerRange: { min, max } });
    onFilterChange?.({ ...filters, followerRange: { min, max } });
  };

  /**
   * Handles changes to engagement rate slider
   * @param range The engagement rate range
   */
  const handleEngagementRangeChange = (range: number[]) => {
    const [min, max] = range;
    updateFilters({ engagementRate: { min, max } });
    onFilterChange?.({ ...filters, engagementRate: { min, max } });
  };

  /**
   * Handles changes to audience location filter
   * @param location The selected location
   */
  const handleLocationChange = (location: string) => {
    updateFilters({ audienceLocations: [location] });
    onFilterChange?.({ ...filters, audienceLocations: [location] });
  };

  /**
   * Handles changes to audience gender filter
   * @param gender The selected gender
   */
  const handleGenderChange = (gender: string) => {
    updateFilters({ audienceGender: [gender] });
    onFilterChange?.({ ...filters, audienceGender: [gender] });
  };

  /**
   * Handles changes to audience age range slider
   * @param range The age range
   */
  const handleAgeRangeChange = (range: number[]) => {
    const [min, max] = range;
    updateFilters({ audienceAgeRange: { min, max } });
    onFilterChange?.({ ...filters, audienceAgeRange: { min, max } });
  };

  /**
   * Handles changes to budget range filter
   * @param range The budget range
   */
  const handleBudgetRangeChange = (range: number[]) => {
    const [min, max] = range;
    updateFilters({ budgetRange: { min, max } });
    onFilterChange?.({ ...filters, budgetRange: { min, max } });
  };

  /**
   * Resets all filters to default values
   */
  const handleResetFilters = () => {
    resetFilters();
    onFilterChange?.(filters);
  };

  /**
   * Applies all current filter selections
   */
  const handleApplyFilters = () => {
    setIsLoading(true);
    onApplyFilters?.(filters);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  /**
   * Toggles the expanded/collapsed state of a filter section
   * @param sectionId The ID of the section to toggle
   */
  const toggleFilterSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Search Filters</CardTitle>
        <CardDescription>
          Find creators who match your brand requirements.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Categories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Categories</h4>
            <Button variant="ghost" size="sm" onClick={() => toggleFilterSection("categories")}>
              {expandedSections.categories ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {expandedSections.categories && (
            <div className="grid sm:grid-cols-2 gap-2">
              <Checkbox
                id="tech"
                label="Tech"
                checked={filters.categories.includes('tech')}
                onCheckedChange={(checked) => handleCategoryChange(checked, 'tech')}
              />
              <Checkbox
                id="lifestyle"
                label="Lifestyle"
                checked={filters.categories.includes('lifestyle')}
                onCheckedChange={(checked) => handleCategoryChange(checked, 'lifestyle')}
              />
              <Checkbox
                id="gaming"
                label="Gaming"
                checked={filters.categories.includes('gaming')}
                onCheckedChange={(checked) => handleCategoryChange(checked, 'gaming')}
              />
              <Checkbox
                id="fashion"
                label="Fashion"
                checked={filters.categories.includes('fashion')}
                onCheckedChange={(checked) => handleCategoryChange(checked, 'fashion')}
              />
              {/* Add more categories as needed */}
            </div>
          )}
        </div>

        {/* Platforms */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Platforms</h4>
            <Button variant="ghost" size="sm" onClick={() => toggleFilterSection("platforms")}>
              {expandedSections.platforms ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {expandedSections.platforms && (
            <div className="grid sm:grid-cols-2 gap-2">
              <Checkbox
                id="youtube"
                label="YouTube"
                checked={filters.platforms.includes('youtube')}
                onCheckedChange={(checked) => handlePlatformChange(checked, 'youtube')}
              />
              <Checkbox
                id="instagram"
                label="Instagram"
                checked={filters.platforms.includes('instagram')}
                onCheckedChange={(checked) => handlePlatformChange(checked, 'instagram')}
              />
              <Checkbox
                id="tiktok"
                label="TikTok"
                checked={filters.platforms.includes('tiktok')}
                onCheckedChange={(checked) => handlePlatformChange(checked, 'tiktok')}
              />
              <Checkbox
                id="twitter"
                label="Twitter"
                checked={filters.platforms.includes('twitter')}
                onCheckedChange={(checked) => handlePlatformChange(checked, 'twitter')}
              />
              {/* Add more platforms as needed */}
            </div>
          )}
        </div>

        {/* Audience */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Audience</h4>
            <Button variant="ghost" size="sm" onClick={() => toggleFilterSection("audience")}>
              {expandedSections.audience ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {expandedSections.audience && (
            <div className="space-y-4">
              {/* Age Range */}
              <div>
                <h5 className="text-xs font-medium">Age Range</h5>
                <Slider
                  defaultValue={[filters.audienceAgeRange.min, filters.audienceAgeRange.max]}
                  max={55}
                  step={5}
                  aria-label="Age Range"
                  onValueChange={(range) => handleAgeRangeChange(range.map(Number))}
                />
                <div className="text-xs text-muted-foreground">
                  {filters.audienceAgeRange.min} - {filters.audienceAgeRange.max}+
                </div>
              </div>

              {/* Location */}
              <div>
                <h5 className="text-xs font-medium">Location</h5>
                <Select onValueChange={handleLocationChange}>
                  <Select.Trigger className="w-full">
                    <Select.Value placeholder="Select a location" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="United States">United States</Select.Item>
                    <Select.Item value="Canada">Canada</Select.Item>
                    <Select.Item value="United Kingdom">United Kingdom</Select.Item>
                    {/* Add more locations as needed */}
                  </Select.Content>
                </Select>
              </div>

              {/* Gender */}
              <div>
                <h5 className="text-xs font-medium">Gender</h5>
                <RadioGroup onValueChange={handleGenderChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="gender-all" />
                    <label htmlFor="gender-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">All</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <label htmlFor="gender-male" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Male</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <label htmlFor="gender-female" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Female</label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Metrics</h4>
            <Button variant="ghost" size="sm" onClick={() => toggleFilterSection("metrics")}>
              {expandedSections.metrics ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {expandedSections.metrics && (
            <div className="space-y-4">
              {/* Follower Range */}
              <div>
                <h5 className="text-xs font-medium">Follower Range</h5>
                <Slider
                  defaultValue={[filters.followerRange.min || 0, filters.followerRange.max || 1000000]}
                  max={1000000}
                  step={10000}
                  aria-label="Follower Range"
                  onValueChange={(range) => handleFollowerRangeChange(range.map(Number))}
                />
                <div className="text-xs text-muted-foreground">
                  {filters.followerRange.min || 0} - {filters.followerRange.max || '1M+'}
                </div>
              </div>

              {/* Engagement Rate */}
              <div>
                <h5 className="text-xs font-medium">Engagement Rate</h5>
                <Slider
                  defaultValue={[filters.engagementRate.min || 0, filters.engagementRate.max || 10]}
                  max={10}
                  step={1}
                  aria-label="Engagement Rate"
                  onValueChange={(range) => handleEngagementRangeChange(range.map(Number))}
                />
                <div className="text-xs text-muted-foreground">
                  {filters.engagementRate.min || 0}% - {filters.engagementRate.max || '10'}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Budget</h4>
            <Button variant="ghost" size="sm" onClick={() => toggleFilterSection("budget")}>
              {expandedSections.budget ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {expandedSections.budget && (
            <div>
              <Slider
                defaultValue={[filters.budgetRange.min || 500, filters.budgetRange.max || 10000]}
                max={10000}
                step={500}
                aria-label="Budget Range"
                onValueChange={(range) => handleBudgetRangeChange(range.map(Number))}
              />
              <div className="text-xs text-muted-foreground">
                ${filters.budgetRange.min || 500} - ${filters.budgetRange.max || '10K+'}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={handleResetFilters}>
          Reset
        </Button>
        <Button size="sm" onClick={handleApplyFilters} disabled={isLoading}>
          {isLoading ? 'Applying...' : 'Apply Filters'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SearchFilters;