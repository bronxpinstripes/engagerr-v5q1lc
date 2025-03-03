import React from 'react';
import PageHeader from '../../../../components/layout/PageHeader';
import PlatformConnections from '../../../../components/creator/PlatformConnections';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../../../components/ui/Alert';

/**
 * Server component that renders the platform settings page for creators.
 * Allows creators to view, connect, and manage their social media platform integrations.
 */
export default function PlatformsSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Platform Connections" 
        description="Connect your social media accounts to track content and analytics across platforms." 
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Connected Platforms</CardTitle>
          <CardDescription>
            Connect your social media accounts to enable content mapping and unified analytics across platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Connecting your platforms allows Engagerr to analyze your content across different social networks,
            track relationships between content pieces, and provide holistic analytics to help maximize your reach and engagement.
          </p>
          
          <Alert className="mb-4">
            <AlertTitle>About platform permissions</AlertTitle>
            <AlertDescription>
              Engagerr only requests read permissions to access your content and metrics. 
              We will never post content or interact with your followers without your explicit consent.
            </AlertDescription>
          </Alert>
          
          <PlatformConnections />
        </CardContent>
      </Card>
    </div>
  );
}