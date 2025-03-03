import { Suspense } from 'react';
import PageHeader from 'components/layout/PageHeader';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from 'components/ui/Card';
import { CreatorProfile } from 'types/creator';

// Server function to fetch the creator's profile data
async function fetchProfileData(): Promise<CreatorProfile> {
  try {
    // In a real implementation, this would use the server session to get the current user's ID
    const response = await fetch('/api/creator/profile', {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile data');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching profile data:', error);
    throw error;
  }
}

// Skeleton loader component displayed while profile data is loading
function ProfilePageSkeleton() {
  return (
    <>
      <PageHeader title="Profile Settings" />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="animate-pulse bg-gray-200 h-7 w-1/3 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-5 w-2/3 rounded mt-1"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-5 w-32 rounded"></div>
              <div className="animate-pulse bg-gray-200 h-10 w-full rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-5 w-24 rounded"></div>
              <div className="animate-pulse bg-gray-200 h-32 w-full rounded"></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="animate-pulse bg-gray-200 h-7 w-1/4 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-5 w-1/2 rounded mt-1"></div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-pulse bg-gray-200 h-32 w-32 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// The main profile settings page component
async function ProfilePage() {
  // Fetch the creator's profile data
  const profile = await fetchProfileData();
  
  return (
    <>
      <PageHeader
        title="Profile Settings"
        description="Manage your public profile information and settings"
        breadcrumbs={[
          { label: 'Settings', href: '/creator/settings' },
          { label: 'Profile', href: '/creator/settings/profile', active: true }
        ]}
      />
      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal information and profile details visible to others.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 
              Note: In a complete implementation, this would be a client component 
              that handles form state and submission.
            */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display Name
                </label>
                <input
                  id="displayName"
                  className="w-full p-2 border rounded-md"
                  defaultValue={profile.displayName}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="bio" className="text-sm font-medium">
                  Bio
                </label>
                <textarea
                  id="bio"
                  className="w-full p-2 border rounded-md min-h-[120px]"
                  defaultValue={profile.bio}
                />
                <p className="text-sm text-gray-500">
                  Tell brands and your audience about yourself.
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="shortBio" className="text-sm font-medium">
                  Short Bio
                </label>
                <input
                  id="shortBio"
                  className="w-full p-2 border rounded-md"
                  defaultValue={profile.shortBio || ''}
                  maxLength={160}
                />
                <p className="text-sm text-gray-500">
                  A brief summary that appears in search results (max 160 characters).
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Location
                </label>
                <input
                  id="location"
                  className="w-full p-2 border rounded-md"
                  defaultValue={profile.location || ''}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="websiteUrl" className="text-sm font-medium">
                  Website
                </label>
                <input
                  id="websiteUrl"
                  type="url"
                  className="w-full p-2 border rounded-md"
                  defaultValue={profile.websiteUrl || ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Profile Image */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
            <CardDescription>
              Upload a professional profile picture to make your profile stand out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border">
                {profile.profileImage ? (
                  <img 
                    src={profile.profileImage} 
                    alt={`${profile.displayName}'s profile`}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
                  Change Image
                </button>
              </div>
              {profile.profileImage && (
                <button className="text-sm text-red-600">
                  Remove Image
                </button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Content Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Content Categories</CardTitle>
            <CardDescription>
              Select the categories that best describe your content. This helps brands find you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {profile.categories.map((category) => (
                  <div 
                    key={category} 
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {category}
                  </div>
                ))}
                {profile.categories.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No categories selected. Add some categories to help brands find you.
                  </p>
                )}
              </div>
              <button className="px-4 py-2 border border-gray-300 rounded-md text-sm">
                Edit Categories
              </button>
            </div>
          </CardContent>
        </Card>
        
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Update your business contact information for partnership inquiries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label htmlFor="contactEmail" className="text-sm font-medium">
                Business Email
              </label>
              <input
                id="contactEmail"
                type="email"
                className="w-full p-2 border rounded-md"
                defaultValue={profile.contactEmail || ''}
              />
              <p className="text-sm text-gray-500">
                This email will be visible to brands who view your profile.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm">
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}

// Export the page component with Suspense for loading state
export default function Page() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePage />
    </Suspense>
  );
}