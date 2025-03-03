import Link from 'next/link';
import { User, Users, CreditCard } from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

/**
 * Brand Settings Dashboard Page
 * 
 * A central hub for brand users to navigate to various settings categories
 * including profile management, team access control, and subscription settings.
 */
export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Settings" 
        description="Manage your brand account settings, team members, and subscription details."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Profile Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center mb-2">
              <User className="h-6 w-6 text-blue-600 mr-2" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardDescription>
              Manage your brand profile information, logo, and public details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Update your brand name, description, industry, contact information, and visual assets.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/brand/settings/profile">
                Manage Profile
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Team Management Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center mb-2">
              <Users className="h-6 w-6 text-blue-600 mr-2" />
              <CardTitle>Team Management</CardTitle>
            </div>
            <CardDescription>
              Manage team members, roles, and access permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Add team members, assign roles, and control who has access to your brand account features.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/brand/settings/team">
                Manage Team
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Subscription Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center mb-2">
              <CreditCard className="h-6 w-6 text-blue-600 mr-2" />
              <CardTitle>Subscription Settings</CardTitle>
            </div>
            <CardDescription>
              Manage your subscription plan, billing details, and payment methods.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Update your subscription tier, view billing history, and manage payment information.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/brand/settings/subscription">
                Manage Subscription
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}