import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // latest
import userEvent from '@testing-library/user-event'; // latest
import { vi } from 'vitest'; // latest
import { ToastProvider } from '@/components/ui/Toast'; // latest
import { MockAuthProvider } from '../tests/setup';
import CampaignsList from '../components/brand/CampaignsList';
import CampaignForm from '../components/brand/CampaignForm';
import CampaignOverview from '../components/brand/CampaignOverview';
import CreatorParticipants from '../components/brand/CreatorParticipants';
import DeliverableReview from '../components/brand/DeliverableReview';
import BudgetTracker from '../components/brand/BudgetTracker';
import { useCampaigns } from '../hooks/useCampaigns';
import { Campaign, CampaignStatus, Deliverable } from '../types/campaign';
import { api } from '../lib/api';

// Mock the useCampaigns hook
vi.mock('../hooks/useCampaigns');

// Setup function that runs before each test to mock API calls and reset state
const setup = () => {
  // Mock the API calls to return predefined test data
  vi.mocked(useCampaigns).mockReturnValue({
    campaigns: mockCampaignsList(3),
    totalCount: 3,
    currentPage: 1,
    pageSize: 10,
    hasMorePages: false,
    isLoading: false,
    error: null,
    dashboardData: null,
    dashboardLoading: false,
    campaignDetail: mockCampaign(),
    campaignDetailLoading: false,
    campaignDetailError: null,
    campaignAnalytics: null,
    campaignAnalyticsLoading: false,
    getCampaigns: vi.fn(),
    getCampaignDashboardData: vi.fn(),
    getCampaignById: vi.fn(),
    getCampaignAnalytics: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    changeCampaignStatus: vi.fn(),
    addCreatorToCampaign: vi.fn(),
    removeCreatorFromCampaign: vi.fn(),
    updateParticipantStatus: vi.fn(),
    calculateCampaignProgress: vi.fn(),
    getCampaignStatusLabel: vi.fn(),
    getParticipantStatusLabel: vi.fn(),
    refreshCampaignData: vi.fn(),
  } as any);

  // Reset any test state or mocks from previous tests
  vi.clearAllMocks();

  // Create a user event instance for simulating user interactions
  const user = userEvent.setup();

  return { user };
};

// Cleanup function that runs after each test to reset mocks and state
const cleanup = () => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset any global state modified during tests
  // (e.g., by resetting mock implementations)
};

// Decorate setup and cleanup with beforeEach and afterEach
beforeEach(setup);
afterEach(cleanup);

// Helper function to render components with necessary providers
const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <MockAuthProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </MockAuthProvider>
  );
};

// Function to create a mock campaign object for testing
const mockCampaign = (overrides: Partial<Campaign> = {}): Campaign => {
  const baseCampaign: Campaign = {
    id: 'test-campaign-id',
    brandId: 'test-brand-id',
    name: 'Test Campaign',
    description: 'A test campaign for testing purposes',
    status: CampaignStatus.PLANNING,
    startDate: new Date(),
    endDate: new Date(),
    totalBudget: 10000,
    spentBudget: 2500,
    targetCreatorCount: 10,
    coverImage: 'http://example.com/cover.jpg',
    briefMaterials: [],
    milestones: [],
    keyMessages: [],
    tags: [],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...baseCampaign, ...overrides };
};

// Function to create a list of mock campaigns for testing
const mockCampaignsList = (count: number): Campaign[] => {
  return Array.from({ length: count }, (_, i) => mockCampaign({ id: `campaign-${i + 1}` }));
};

// Function to create mock deliverables for testing
const mockDeliverables = (count: number, campaignId: string): Deliverable[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `deliverable-${i + 1}`,
    partnershipId: 'test-partnership-id',
    platformType: 'instagram',
    contentType: 'post',
    description: 'Test deliverable',
    requirements: 'Test requirements',
    dueDate: new Date(),
    status: 'not_started',
    contentUrl: null,
    contentId: null,
    submissionNotes: null,
    feedbackNotes: null,
    submittedAt: null,
    approvedAt: null,
    publishedAt: null,
  }));
};

// Test suite for campaign management functionality
describe('Campaign Management', () => {
  // Test case: CampaignsList component renders without errors
  it('CampaignsList component renders without errors', () => {
    renderWithProviders(<CampaignsList />);
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
  });

  // Test case: CampaignForm component renders without errors
  it('CampaignForm component renders without errors', () => {
    renderWithProviders(<CampaignForm />);
    expect(screen.getByLabelText('Campaign Name')).toBeInTheDocument();
  });

  // Test case: CampaignOverview component renders without errors
  it('CampaignOverview component renders without errors', () => {
    renderWithProviders(<CampaignOverview campaignId="test-campaign-id" />);
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
  });

  // Test case: CreatorParticipants component renders without errors
  it('CreatorParticipants component renders without errors', () => {
    renderWithProviders(<CreatorParticipants campaignId="test-campaign-id" />);
    expect(screen.getByText('Creator Participants')).toBeInTheDocument();
  });

  // Test case: DeliverableReview component renders without errors
  it('DeliverableReview component renders without errors', () => {
    const mockDeliverable: Deliverable = {
      id: 'test-deliverable-id',
      partnershipId: 'test-partnership-id',
      platformType: 'instagram',
      contentType: 'post',
      description: 'Test deliverable',
      requirements: 'Test requirements',
      dueDate: new Date(),
      status: 'submitted',
      contentUrl: 'http://example.com/content',
      contentId: null,
      submissionNotes: null,
      feedbackNotes: null,
      submittedAt: new Date(),
      approvedAt: null,
      publishedAt: null,
    };
    renderWithProviders(<DeliverableReview deliverable={mockDeliverable} partnershipId="test-partnership-id" onReviewComplete={() => { }} />);
    expect(screen.getByText('Test deliverable')).toBeInTheDocument();
  });

  // Test case: BudgetTracker component renders without errors
  it('BudgetTracker component renders without errors', () => {
    renderWithProviders(<BudgetTracker campaignId="test-campaign-id" totalBudget={10000} spentBudget={2500} />);
    expect(screen.getByText('Budget')).toBeInTheDocument();
  });
});