import React, { Suspense } from 'react'; // react v18.2.0
import Link from 'next/link'; // ^14.0.0
import { ArrowUpRight, Plus } from 'lucide-react'; // lucide-react v0.279.0

import { PageHeader } from '../../../components/layout/PageHeader';
import PerformanceMetrics from '../../../components/creator/PerformanceMetrics';
import ContentFamilyGraph from '../../../components/creator/ContentFamilyGraph';
import PlatformConnections from '../../../components/creator/PlatformConnections';
import Notifications from '../../../components/shared/Notifications';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import useAuth from '../../../hooks/useAuth';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { useContentRelationships } from '../../../hooks/useContentRelationships';

/**
 * Server component that renders the creator dashboard page
 * @returns {JSX.Element} The rendered creator dashboard page
 */
const CreatorDashboardPage = (): JSX.Element => {
  // Fetch current user data using useAuth hook
  const { user } = useAuth();

  // Fetch analytics data using useAnalytics hook with default period of '30d'
  const { aggregateMetrics } = useAnalytics();

  // Fetch content relationship data for featured content using useContentRelationships hook
  const { getContentFamily } = useContentRelationships();

  return (
    <div>
      {/* Render page header with greeting and date */}
      <PageHeader
        title={`Hello, ${user?.fullName}`}
        description={`Today is ${new Date().toLocaleDateString()}`}
        actions={<Button><Plus className="w-4 h-4 mr-2" /> Create Content</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Render performance metrics section with cross-platform analytics */}
        <Suspense fallback={<div>Loading performance metrics...</div>}>
          <PerformanceMetricsSection />
        </Suspense>

        {/* Render content relationship section with visualization for popular content */}
        <Suspense fallback={<div>Loading content relationships...</div>}>
          <ContentRelationshipsSection />
        </Suspense>

        {/* Render platform connections section showing connection status */}
        <Suspense fallback={<div>Loading platform connections...</div>}>
          <PlatformConnectionsSection />
        </Suspense>

        {/* Render notifications section with recent updates */}
        <Suspense fallback={<div>Loading notifications...</div>}>
          <NotificationsSection />
        </Suspense>
      </div>
    </div>
  );
};

/**
 * Component that renders the performance metrics section
 * @returns {JSX.Element} The rendered performance metrics section
 */
const PerformanceMetricsSection = (): JSX.Element => {
  // Use useAnalytics hook to get analytics data
  const { aggregateMetrics, isLoading } = useAnalytics();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Render PerformanceMetrics component with analytics data */}
        <PerformanceMetrics aggregateMetrics={aggregateMetrics} isLoading={isLoading} />
        {/* Include link to full analytics dashboard */}
        <Link href="/analytics" className="text-blue-500 hover:underline">
          View Full Analytics Dashboard <ArrowUpRight className="w-4 h-4 inline-block ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
};

/**
 * Component that renders the content relationships section
 * @returns {JSX.Element} The rendered content relationships section
 */
const ContentRelationshipsSection = (): JSX.Element => {
  // Use useContentRelationships hook to get content family data
  const { contentFamily, contentFamilyLoading } = useContentRelationships();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Relationships</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Render ContentFamilyGraph with visualization data */}
        {contentFamily ? (
          <ContentFamilyGraph contentFamily={contentFamily} isLoading={contentFamilyLoading} />
        ) : (
          <div>No content relationships found. <Link href="/content/add">Create one now</Link></div>
        )}
        {/* Include link to full content mapping interface */}
        <Link href="/content/mapping" className="text-blue-500 hover:underline">
          View Full Content Map <ArrowUpRight className="w-4 h-4 inline-block ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
};

/**
 * Component that renders the platform connections section
 * @returns {JSX.Element} The rendered platform connections section
 */
const PlatformConnectionsSection = (): JSX.Element => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Connections</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Render PlatformConnections component with compact view */}
        <PlatformConnections compactView />
        {/* Include link to platform settings page */}
        <Link href="/settings/platforms" className="text-blue-500 hover:underline">
          Manage Platform Connections <ArrowUpRight className="w-4 h-4 inline-block ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
};

/**
 * Component that renders the notifications section
 * @returns {JSX.Element} The rendered notifications section
 */
const NotificationsSection = (): JSX.Element => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Show recent notifications with Notifications component */}
        <Notifications />
        {/* Include link to view all notifications */}
        <Link href="/notifications" className="text-blue-500 hover:underline">
          View All Notifications <ArrowUpRight className="w-4 h-4 inline-block ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
};

export default CreatorDashboardPage;