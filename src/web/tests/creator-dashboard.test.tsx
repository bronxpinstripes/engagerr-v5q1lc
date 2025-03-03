import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { useRouter } from 'next/router';
import { AuthContext } from 'react-auth-context';
import { useAnalytics } from '@app/analytics';
import { useContentRelationships } from '@app/content-relationships';
import { usePlatforms } from '@app/platforms';

// Mock the Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock custom hooks
jest.mock('@app/analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@app/content-relationships', () => ({
  useContentRelationships: jest.fn(),
}));

jest.mock('@app/platforms', () => ({
  usePlatforms: jest.fn(),
}));

// Import the component to test (assuming it would be imported like this)
import CreatorDashboard from '../../components/dashboard/CreatorDashboard';

/**
 * Creates mock creator data for testing the dashboard
 */
function mockCreatorData() {
  return {
    id: 'creator-123',
    name: 'Test Creator',
    bio: 'Content creator for testing purposes',
    profileImage: '/images/test-creator.jpg',
    categories: ['Tech', 'Lifestyle'],
    verificationStatus: 'verified',
    subscriptionTier: 'professional',
    createdAt: '2023-01-01T00:00:00Z',
    stats: {
      totalFollowers: 250000,
      engagementRate: 3.8,
      averageViews: 125432,
    }
  };
}

/**
 * Creates mock analytics data for testing dashboard metrics
 */
function mockAnalyticsData() {
  return {
    timeRanges: {
      'last-7-days': {
        views: 50432,
        engagements: 8541,
        estimatedValue: 940,
        viewsChange: 15,
        engagementsChange: 8,
        valueChange: 12,
      },
      'last-30-days': {
        views: 125432,
        engagements: 23541,
        estimatedValue: 2340,
        viewsChange: 25,
        engagementsChange: 12,
        valueChange: 18,
      },
      'last-90-days': {
        views: 350432,
        engagements: 65541,
        estimatedValue: 6240,
        viewsChange: 32,
        engagementsChange: 28,
        valueChange: 30,
      },
    },
    platformBreakdown: {
      youtube: 45,
      instagram: 30,
      tiktok: 20,
      twitter: 5,
    },
    timeSeriesData: {
      'last-7-days': Array(7).fill().map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
        views: 5000 + Math.floor(Math.random() * 3000),
        engagements: 800 + Math.floor(Math.random() * 500),
      })),
      'last-30-days': Array(30).fill().map((_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        views: 3000 + Math.floor(Math.random() * 5000),
        engagements: 500 + Math.floor(Math.random() * 800),
      })),
      'last-90-days': Array(90).fill().map((_, i) => ({
        date: new Date(Date.now() - (89 - i) * 86400000).toISOString().split('T')[0],
        views: 2000 + Math.floor(Math.random() * 6000),
        engagements: 300 + Math.floor(Math.random() * 1000),
      })),
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
}

/**
 * Creates mock content relationship data for testing the relationship graph
 */
function mockContentRelationships() {
  return {
    parentContent: {
      id: 'content-123',
      title: 'Podcast Episode #42',
      type: 'podcast',
      platform: 'spotify',
      publishedAt: '2023-10-10T00:00:00Z',
      metrics: {
        views: 12500,
        engagements: 1650,
      },
    },
    childContent: [
      {
        id: 'content-124',
        title: 'Marketing Tips Video',
        type: 'video',
        platform: 'youtube',
        publishedAt: '2023-10-12T00:00:00Z',
        parentId: 'content-123',
        relationshipType: 'derived',
        metrics: {
          views: 85000,
          engagements: 22500,
        },
      },
      {
        id: 'content-125',
        title: '5 Strategies Blog Post',
        type: 'article',
        platform: 'medium',
        publishedAt: '2023-10-13T00:00:00Z',
        parentId: 'content-123',
        relationshipType: 'derived',
        metrics: {
          views: 3200,
          engagements: 450,
        },
      },
      {
        id: 'content-126',
        title: 'Key Takeaways Carousel',
        type: 'carousel',
        platform: 'instagram',
        publishedAt: '2023-10-14T00:00:00Z',
        parentId: 'content-123',
        relationshipType: 'derived',
        metrics: {
          views: 24000,
          engagements: 39000,
        },
      },
    ],
    secondaryContent: [
      {
        id: 'content-127',
        title: 'YouTube Short',
        type: 'short',
        platform: 'youtube',
        publishedAt: '2023-10-15T00:00:00Z',
        parentId: 'content-124',
        relationshipType: 'derived',
        metrics: {
          views: 45000,
          engagements: 8500,
        },
      },
      {
        id: 'content-128',
        title: 'TikTok Clip',
        type: 'clip',
        platform: 'tiktok',
        publishedAt: '2023-10-16T00:00:00Z',
        parentId: 'content-124',
        relationshipType: 'derived',
        metrics: {
          views: 120000,
          engagements: 18500,
        },
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
}

/**
 * Creates mock platform connection data for testing the platform connections display
 */
function mockPlatformConnections() {
  return {
    platforms: [
      {
        id: 'platform-1',
        type: 'youtube',
        handle: '@testcreator',
        url: 'https://youtube.com/testcreator',
        followers: 85000,
        isConnected: true,
        lastSyncAt: '2023-10-15T12:00:00Z',
      },
      {
        id: 'platform-2',
        type: 'instagram',
        handle: '@testcreator',
        url: 'https://instagram.com/testcreator',
        followers: 105000,
        isConnected: true,
        lastSyncAt: '2023-10-15T12:30:00Z',
      },
      {
        id: 'platform-3',
        type: 'tiktok',
        handle: '@testcreator',
        url: 'https://tiktok.com/@testcreator',
        followers: 130000,
        isConnected: true,
        lastSyncAt: '2023-10-15T13:00:00Z',
      },
      {
        id: 'platform-4',
        type: 'twitter',
        handle: '@testcreator',
        url: 'https://twitter.com/testcreator',
        followers: 25000,
        isConnected: false,
        lastSyncAt: null,
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    connectPlatform: jest.fn(),
  };
}

/**
 * Mock notifications data for testing the notifications section
 */
function mockNotifications() {
  return {
    notifications: [
      {
        id: 'notif-1',
        type: 'partnership_request',
        title: 'New partnership request',
        content: 'Brand XYZ has sent you a partnership request',
        createdAt: '2023-10-16T10:30:00Z',
        isRead: false,
      },
      {
        id: 'notif-2',
        type: 'content_analysis',
        title: 'Content analysis complete',
        content: 'Analysis of your latest YouTube video is complete',
        createdAt: '2023-10-16T09:15:00Z',
        isRead: false,
      },
      {
        id: 'notif-3',
        type: 'platform_metrics',
        title: 'Platform metrics updated',
        content: 'Your Instagram metrics have been updated',
        createdAt: '2023-10-15T14:45:00Z',
        isRead: true,
      },
    ],
    unreadCount: 2,
    isLoading: false,
    error: null,
    markAsRead: jest.fn(),
    fetchMore: jest.fn(),
  };
}

/**
 * Helper function to render components with necessary context providers
 */
function renderWithProviders(ui) {
  const mockRouter = {
    push: jest.fn(),
    pathname: '/',
    query: {},
  };
  
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  
  const mockAuthContext = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      userType: 'creator',
      creatorId: 'creator-123',
    },
    isAuthenticated: true,
    loading: false,
  };
  
  return {
    ...render(
      <AuthContext.Provider value={mockAuthContext}>
        {ui}
      </AuthContext.Provider>
    ),
    mockRouter,
  };
}

describe('Creator Dashboard', () => {
  beforeEach(() => {
    // Set up default mock implementations
    (useAnalytics as jest.Mock).mockReturnValue(mockAnalyticsData());
    (useContentRelationships as jest.Mock).mockReturnValue(mockContentRelationships());
    (usePlatforms as jest.Mock).mockReturnValue(mockPlatformConnections());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard with all expected sections', async () => {
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check header
    expect(screen.getByText('Test Creator')).toBeInTheDocument();
    expect(screen.getByText(/Today is/)).toBeInTheDocument();
    
    // Check metrics section
    expect(screen.getByText('PERFORMANCE METRICS')).toBeInTheDocument();
    
    // Check content relationships
    expect(screen.getByText('CONTENT RELATIONSHIPS')).toBeInTheDocument();
    
    // Check platform connections
    expect(screen.getByText('CONNECTED PLATFORMS')).toBeInTheDocument();
    
    // Check notifications
    expect(screen.getByText('RECENT NOTIFICATIONS')).toBeInTheDocument();
  });

  it('displays correct performance metrics', async () => {
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check metrics values
    expect(screen.getByText('125,432')).toBeInTheDocument(); // Views
    expect(screen.getByText('23,541')).toBeInTheDocument(); // Engagements
    expect(screen.getByText('$2,340')).toBeInTheDocument(); // Est. Value
    
    // Check percentage changes
    expect(screen.getByText('↑25%')).toBeInTheDocument();
    expect(screen.getByText('↑12%')).toBeInTheDocument();
    expect(screen.getByText('↑18%')).toBeInTheDocument();
  });

  it('content relationship map displays correct connections', async () => {
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check parent content
    expect(screen.getByText('Podcast Episode #42')).toBeInTheDocument();
    
    // Check child content platforms
    expect(screen.getByText(/YouTube/)).toBeInTheDocument();
    expect(screen.getByText(/Instagram/)).toBeInTheDocument();
    expect(screen.getByText(/TikTok/)).toBeInTheDocument();
    
    // Check "View Full Content Map" button
    expect(screen.getByText('View Full Content Map')).toBeInTheDocument();
  });

  it('platform connections show correct status', async () => {
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check connected platforms
    const youtubeCheckbox = screen.getByRole('checkbox', { name: /YouTube/i });
    expect(youtubeCheckbox).toBeChecked();
    
    const instagramCheckbox = screen.getByRole('checkbox', { name: /Instagram/i });
    expect(instagramCheckbox).toBeChecked();
    
    const tiktokCheckbox = screen.getByRole('checkbox', { name: /TikTok/i });
    expect(tiktokCheckbox).toBeChecked();
    
    // Check disconnected platform
    const twitterCheckbox = screen.getByRole('checkbox', { name: /Twitter/i });
    expect(twitterCheckbox).not.toBeChecked();
    
    // Check "Add Platform" button
    expect(screen.getByText('Add Platform')).toBeInTheDocument();
  });

  it('time period filter changes displayed metrics', async () => {
    const user = userEvent.setup();
    
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check initial metrics (30 days)
    expect(screen.getByText('125,432')).toBeInTheDocument(); // Views for 30 days
    
    // Change time period to 7 days
    const timePeriodSelect = screen.getByRole('combobox', { name: /Last 30 days/i });
    await user.click(timePeriodSelect);
    await user.click(screen.getByRole('option', { name: /Last 7 days/i }));
    
    // Check updated metrics
    expect(screen.getByText('50,432')).toBeInTheDocument(); // Views for 7 days
    expect(screen.getByText('8,541')).toBeInTheDocument(); // Engagements for 7 days
    expect(screen.getByText('$940')).toBeInTheDocument(); // Est. Value for 7 days
  });

  it("'View Full Content Map' button navigates correctly", async () => {
    const user = userEvent.setup();
    
    // Render dashboard with mocked router
    const { mockRouter } = renderWithProviders(
      <CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />
    );
    
    // Find and click the button
    const viewMapButton = screen.getByText('View Full Content Map');
    await user.click(viewMapButton);
    
    // Verify navigation was called with correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/content-mapping');
  });

  it('notifications display correctly and can be interacted with', async () => {
    const user = userEvent.setup();
    const notificationsData = mockNotifications();
    
    // Render dashboard
    renderWithProviders(
      <CreatorDashboard 
        creatorData={mockCreatorData()} 
        notifications={notificationsData}
      />
    );
    
    // Check notification content
    expect(screen.getByText('New partnership request')).toBeInTheDocument();
    expect(screen.getByText('Content analysis complete')).toBeInTheDocument();
    
    // Click a notification
    await user.click(screen.getByText('New partnership request'));
    
    // Verify notification was marked as read
    expect(notificationsData.markAsRead).toHaveBeenCalledWith('notif-1');
    
    // Find and click "See All" button
    const { mockRouter } = renderWithProviders(
      <CreatorDashboard creatorData={mockCreatorData()} notifications={notificationsData} />
    );
    
    const seeAllButton = screen.getByText('See All');
    await user.click(seeAllButton);
    
    // Verify navigation to notifications page
    expect(mockRouter.push).toHaveBeenCalledWith('/notifications');
  });

  it('handles loading states correctly', async () => {
    // Mock loading states
    (useAnalytics as jest.Mock).mockReturnValue({
      ...mockAnalyticsData(),
      isLoading: true,
    });
    
    (useContentRelationships as jest.Mock).mockReturnValue({
      ...mockContentRelationships(),
      isLoading: true,
    });
    
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check for loading indicators
    expect(screen.getByTestId('metrics-loading-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('content-map-loading-skeleton')).toBeInTheDocument();
    
    // Now let's test transition from loading to loaded state
    // Mock data loaded
    (useAnalytics as jest.Mock).mockReturnValue({
      ...mockAnalyticsData(),
      isLoading: false
    });
    
    (useContentRelationships as jest.Mock).mockReturnValue({
      ...mockContentRelationships(),
      isLoading: false
    });
    
    // Re-render to simulate data loading completion
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check loading indicators are gone and content is displayed
    expect(screen.queryByTestId('metrics-loading-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('content-map-loading-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('125,432')).toBeInTheDocument(); // Views
  });

  it('handles error states correctly', async () => {
    const user = userEvent.setup();
    const analyticsData = {
      ...mockAnalyticsData(),
      error: 'Failed to load analytics data',
      refetch: jest.fn()
    };
    
    // Mock error states
    (useAnalytics as jest.Mock).mockReturnValue(analyticsData);
    
    // Render dashboard
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check for error message
    expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    
    // Check for retry button
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    
    // Click retry button
    await user.click(retryButton);
    
    // Verify retry function was called
    expect(analyticsData.refetch).toHaveBeenCalled();
    
    // Mock successful retry
    (useAnalytics as jest.Mock).mockReturnValue({
      ...mockAnalyticsData(),
      error: null
    });
    
    // Re-render to simulate successful retry
    renderWithProviders(<CreatorDashboard creatorData={mockCreatorData()} notifications={mockNotifications()} />);
    
    // Check error message is gone and content is displayed
    expect(screen.queryByText('Failed to load analytics data')).not.toBeInTheDocument();
    expect(screen.getByText('125,432')).toBeInTheDocument(); // Views
  });
});