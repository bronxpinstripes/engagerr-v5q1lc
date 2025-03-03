import React, { useState, useEffect } from 'react'; // react v18.0.0
import { useRouter } from 'next/navigation'; // next/navigation v14.0.0
import { FiMail, FiExternalLink, FiMessageSquare } from 'react-icons/fi'; // react-icons/fi v4.10.0
import { PieChart } from 'recharts'; // recharts v2.7.0

import { useCreator } from '../../hooks/useCreator';
import { useAnalytics } from '../../hooks/useAnalytics';
import CreatorMetrics from './CreatorMetrics';
import ContentFamilyVisualization from '../shared/ContentFamilyVisualization';
import { PlatformType } from '../../types/platform';
import { Category } from '../../types/creator';
import { formatNumber, formatPercentage } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { PLATFORM_DISPLAY_INFO } from '../../lib/constants';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Skeleton from '../ui/Skeleton';

/**
 * Interface defining the props for the CreatorProfile component
 */
export interface CreatorProfileProps {
  /**
   * The ID of the creator to display
   */
  creatorId: string;
  /**
   * Optional class name for styling
   */
  className?: string;
}

/**
 * Main component that displays a detailed creator profile for brands to evaluate potential partnerships
 * @param props - CreatorProfileProps
 * @returns Rendered component with creator profile information
 */
const CreatorProfile: React.FC<CreatorProfileProps> = (props) => {
  // LD1: Destructure creatorId and optional className from props
  const { creatorId, className } = props;

  // LD1: Use useCreator hook to fetch creator data with the provided creatorId
  const { 
    creator, 
    profile, 
    metrics, 
    audience, 
    isLoading, 
    error 
  } = useCreator();

  // LD1: Initialize analytics with useAnalytics hook
  const { 
    getPlatformBreakdown 
  } = useAnalytics({});

  // LD1: Implement loading state during data fetching
  if (isLoading) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <Skeleton className="h-10 w-40 mb-4" />
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  // LD1: Implement error handling if creator data can't be retrieved
  if (error) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <div>Error loading creator profile: {error}</div>
        </CardContent>
      </Card>
    );
  }

  // LD1: Set up tabs for different sections of the profile (Overview, Content, Audience, Platforms)
  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Content', value: 'content' },
    { label: 'Audience', value: 'audience' },
    { label: 'Platforms', value: 'platforms' },
  ];

  // LD1: Render creator header with profile image, name, bio and metrics
  // LD1: Render action buttons for contacting and viewing external profiles
  // LD1: Render tabbed sections for detailed information
  return (
    <Card className={cn("col-span-2", className)}>
      <CardContent className="flex flex-col gap-4">
        <CreatorHeader creator={creator} profile={profile} isLoading={isLoading} />
        <ActionButtons creator={creator} profile={profile} />
        <Tabs.Root defaultValue="overview" className="w-full">
          <Tabs.List className="w-full">
            {tabs.map((tab) => (
              <Tabs.Trigger key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {/* LD1: Display creator metrics in the Overview tab */}
          <Tabs.Content value="overview">
            <OverviewTab creatorId={creatorId} metrics={metrics} isLoading={isLoading} />
          </Tabs.Content>
          {/* LD1: Show content samples and relationship visualization in the Content tab */}
          <Tabs.Content value="content">
            <ContentTab creator={creator} isLoading={isLoading} />
          </Tabs.Content>
          {/* LD1: Display audience demographics in the Audience tab */}
          <Tabs.Content value="audience">
            <AudienceTab audience={audience} isLoading={isLoading} />
          </Tabs.Content>
          {/* LD1: Show platform-specific metrics in the Platforms tab */}
          <Tabs.Content value="platforms">
            <PlatformsTab creator={creator} metrics={metrics} isLoading={isLoading} />
          </Tabs.Content>
        </Tabs.Root>
      </CardContent>
    </Card>
  );
};

/**
 * Component that displays the creator's header information with profile image, name, and key details
 * @param object - { creator, profile, isLoading }
 * @returns Rendered header component
 */
const CreatorHeader: React.FC<{ creator: any; profile: any; isLoading: boolean }> = ({ creator, profile, isLoading }) => {
  // LD1: Display profile image with Avatar component
  // LD1: Show creator name and verification badge if verified
  // LD1: Display creator bio/description
  // LD1: Render category badges for creator specialties
  // LD1: Show creator location if available
  // LD1: Apply loading skeleton states when isLoading is true
  return (
    <div className="flex items-start gap-4">
      {isLoading ? (
        <Skeleton className="h-24 w-24 rounded-full" />
      ) : (
        <Avatar src={profile?.profileImage} alt={creator?.fullName || 'Creator'} name={creator?.fullName} size="xl" />
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">{creator?.fullName || 'Creator Name'}</h2>
          {creator?.isVerified && <Badge variant="success">Verified</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{profile?.bio || 'Creator bio'}</p>
        <div className="flex items-center gap-2 mt-2">
          {profile?.categories?.map((category: Category) => (
            <Badge key={category}>{category}</Badge>
          ))}
        </div>
        {profile?.location && <p className="text-sm text-muted-foreground mt-1">Location: {profile.location}</p>}
      </div>
    </div>
  );
};

/**
 * Component that renders action buttons for interacting with the creator
 * @param object - { creator, profile }
 * @returns Rendered buttons component
 */
const ActionButtons: React.FC<{ creator: any; profile: any }> = ({ creator, profile }) => {
  // LD1: Render Contact button with email icon
  // LD1: Render Message button for direct platform messaging
  // LD1: Implement handlers for button click events
  // LD1: Conditionally show buttons based on creator contact preferences
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" asChild>
        <a href={`mailto:${profile?.contactEmail}`} className="flex items-center gap-2">
          <FiMail className="h-4 w-4" />
          Contact
        </a>
      </Button>
      <Button variant="secondary" asChild>
        <a href="#" className="flex items-center gap-2">
          <FiMessageSquare className="h-4 w-4" />
          Message
        </a>
      </Button>
      {profile?.websiteUrl && (
        <Button variant="ghost" asChild>
          <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <FiExternalLink className="h-4 w-4" />
            Website
          </a>
        </Button>
      )}
    </div>
  );
};

/**
 * Component that displays the overview tab with general creator information and metrics
 * @param object - { creatorId, metrics, isLoading }
 * @returns Rendered overview tab content
 */
const OverviewTab: React.FC<{ creatorId: string; metrics: any; isLoading: boolean }> = ({ creatorId, metrics, isLoading }) => {
  // LD1: Render CreatorMetrics component with performance metrics
  // LD1: Display key information about the creator
  // LD1: Show summary of creator's content and platforms
  // LD1: Display estimated partnership value range
  // LD1: Apply loading states when data is being fetched
  return (
    <div className="flex flex-col gap-4">
      <CreatorMetrics creatorId={creatorId} />
      <Card>
        <CardContent>
          <h4 className="text-lg font-semibold">About the Creator</h4>
          <p className="text-sm text-muted-foreground">
            This creator specializes in technology and lifestyle content, with a strong focus on product reviews and travel vlogs.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h4 className="text-lg font-semibold">Partnership Value</h4>
          <p className="text-sm text-muted-foreground">
            Estimated partnership value: $5,000 - $10,000 per campaign.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Component that displays the content tab with content samples and relationship visualization
 * @param object - { creator, isLoading }
 * @returns Rendered content tab content
 */
const ContentTab: React.FC<{ creator: any; isLoading: boolean }> = ({ creator, isLoading }) => {
  // LD1: Display featured content samples from the creator
  // LD1: Show ContentFamilyVisualization for content relationships
  // LD1: Render content metrics and performance data
  // LD1: Include content previews with platform indicators
  // LD1: Apply loading states during data fetching
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <h4 className="text-lg font-semibold">Featured Content</h4>
          <p className="text-sm text-muted-foreground">
            Check out some of the creator's most popular content.
          </p>
        </CardContent>
      </Card>
      {creator?.id && <ContentFamilyVisualization contentId={creator.id} />}
    </div>
  );
};

/**
 * Component that displays the audience tab with demographic information
 * @param object - { audience, isLoading }
 * @returns Rendered audience tab content
 */
const AudienceTab: React.FC<{ audience: any; isLoading: boolean }> = ({ audience, isLoading }) => {
  // LD1: Display age distribution chart
  // LD1: Show gender breakdown with pie chart
  // LD1: Render top geographic locations of audience
  // LD1: Display audience interests and categories
  // LD1: Apply loading states during data fetching
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <h4 className="text-lg font-semibold">Audience Demographics</h4>
          <p className="text-sm text-muted-foreground">
            Understand the creator's audience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Component that displays the platforms tab with platform-specific metrics
 * @param object - { creator, metrics, isLoading }
 * @returns Rendered platforms tab content
 */
const PlatformsTab: React.FC<{ creator: any; metrics: any; isLoading: boolean }> = ({ creator, metrics, isLoading }) => {
  // LD1: Map through connected platforms
  // LD1: Display platform-specific metrics for each platform
  // LD1: Show platform icons and links
  // LD1: Render platform-specific engagement and audience data
  // LD1: Apply loading states during data fetching
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <h4 className="text-lg font-semibold">Platform Performance</h4>
          <p className="text-sm text-muted-foreground">
            See how the creator performs on each platform.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {creator?.platforms?.map((platform: any) => (
          <PlatformCard key={platform.id} platform={platform} metrics={metrics} />
        ))}
      </div>
    </div>
  );
};

/**
 * Component that displays metrics for a specific platform
 * @param object - { platform, metrics }
 * @returns Rendered platform card component
 */
const PlatformCard: React.FC<{ platform: any; metrics: any }> = ({ platform, metrics }) => {
  // LD1: Apply platform-specific styling and icons
  // LD1: Display platform name and handle
  // LD1: Show follower count and engagement metrics
  // LD1: Render platform-specific performance indicators
  // LD1: Include link to external platform profile
  const platformInfo = PLATFORM_DISPLAY_INFO[platform.platformType];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          {platformInfo?.icon && <platformInfo.icon className="h-5 w-5 text-gray-500" />}
          <h5 className="text-sm font-medium">{platform.handle}</h5>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatNumber(platform.followers)} Followers
        </p>
        <p className="text-sm text-muted-foreground">
          Engagement Rate: {formatPercentage(metrics?.platformMetrics?.[platform.platformType]?.engagement || 0)}
        </p>
      </CardContent>
    </Card>
  );
};

export default CreatorProfile;