"use client";

import { Metadata } from 'next';
import Link from 'next/link';
import { Settings, User, Link as LinkIcon, CreditCard } from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import { Card, CardContent } from '../../../components/ui/Card';
import { Tabs } from '../../../components/ui/Tabs';
import useCreator from '../../../hooks/useCreator';
import { Button } from '../../../components/ui/Button';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your profile, connected platforms, team, and subscription settings',
};

/**
 * Settings page for creators to manage all aspects of their account
 * Provides navigation to specific settings sections
 */
export default function SettingsPage() {
  const { creator, isLoading } = useCreator();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container py-8">
        <PageHeader 
          title="Settings"
          description="Loading settings..."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-48">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <PageHeader 
        title="Settings"
        description="Manage your profile, connected platforms, team, and subscription settings"
      />

      <Tabs.Root defaultValue="all" className="mt-6">
        <Tabs.List className="mb-4">
          <Tabs.Trigger value="all">All Settings</Tabs.Trigger>
          <Tabs.Trigger value="account">Account</Tabs.Trigger>
          <Tabs.Trigger value="preferences">Preferences</Tabs.Trigger>
          <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="all" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsCard 
              title="Profile Settings"
              description="Update your profile information, bio, categories, and display preferences"
              icon={<User className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/profile"
            />
            
            <SettingsCard 
              title="Platform Connections"
              description="Manage your connected social platforms and synchronization settings"
              icon={<LinkIcon className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/platforms"
            />
            
            <SettingsCard 
              title="Team Management"
              description="Add team members, assign roles, and manage permissions"
              icon={<User className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/team"
            />
            
            <SettingsCard 
              title="Subscription & Billing"
              description="Manage your subscription plan, payment methods, and billing history"
              icon={<CreditCard className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/subscription"
            />
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="account" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsCard 
              title="Profile Settings"
              description="Update your profile information, bio, categories, and display preferences"
              icon={<User className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/profile"
            />
            
            <SettingsCard 
              title="Team Management"
              description="Add team members, assign roles, and manage permissions"
              icon={<User className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/team"
            />
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="preferences" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsCard 
              title="Platform Connections"
              description="Manage your connected social platforms and synchronization settings"
              icon={<LinkIcon className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/platforms"
            />
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="billing" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsCard 
              title="Subscription & Billing"
              description="Manage your subscription plan, payment methods, and billing history"
              icon={<CreditCard className="h-6 w-6 text-blue-600" />}
              href="/creator/settings/subscription"
            />
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

/**
 * Card component for a settings category with icon, title, description and navigation
 */
function SettingsCard({ 
  title, 
  description, 
  icon, 
  href 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  href: string;
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col h-full">
          <div className="mb-4">{icon}</div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-6">{description}</p>
          <div className="mt-auto">
            <Link href={href} passHref>
              <Button variant="outline" className="w-full">
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}