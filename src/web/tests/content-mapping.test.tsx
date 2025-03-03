import React from 'react'; // react v18.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event v14.0.0
import { QueryClient, QueryClientProvider } from 'react-query'; // react-query v5.0.0

import ContentRelationshipMap from '../components/shared/ContentRelationshipMap';
import ContentFamilyGraph from '../components/creator/ContentFamilyGraph';
import { useContentRelationships } from '../hooks/useContentRelationships';
import {
  ContentFamilyVisualizationData,
  ContentNode,
  RelationshipEdge,
  RelationshipType,
  ContentFamily,
} from '../types/content';
import { PlatformType } from '../types/platform';

// Mock the useContentRelationships hook for testing component in isolation
jest.mock('../hooks/useContentRelationships');

// Mock the API module to prevent actual API calls during tests
jest.mock('../lib/api');

/**
 * Creates mock content family data for testing
 * @returns {ContentFamily} Mock content family data
 */
const createMockContentFamily = (): ContentFamily => {
  // Create a mock ContentFamily object with realistic test data
  // Include root content item and several child content items across different platforms
  // Add relationships between content items with various relationship types
  // Include realistic metrics data for visualization purposes
  return {
    id: 'test-family-id',
    rootContentId: 'test-content-id',
    name: 'Test Content Family',
    rootContent: {
      id: 'test-content-id',
      externalId: '123',
      platformType: PlatformType.YOUTUBE,
      contentType: 'video',
      title: 'Test Video',
      url: 'https://youtube.com/watch?v=123',
      publishedAt: new Date(),
      creator: { id: 'test-creator', name: 'Test Creator', verified: true },
    },
    childContent: [
      {
        id: 'child-1',
        title: 'Child 1',
        platformType: PlatformType.INSTAGRAM,
        contentType: 'post',
        url: 'https://instagram.com/p/abc',
        publishedAt: new Date(),
        creator: { id: 'test-creator', name: 'Test Creator', verified: true },
        metrics: { views: 1000, engagements: 100, engagementRate: 0.1 },
      },
      {
        id: 'child-2',
        title: 'Child 2',
        platformType: PlatformType.TIKTOK,
        contentType: 'video',
        url: 'https://tiktok.com/@user/video/def',
        publishedAt: new Date(),
        creator: { id: 'test-creator', name: 'Test Creator', verified: true },
        metrics: { views: 5000, engagements: 500, engagementRate: 0.1 },
      },
      {
        id: 'child-3',
        title: 'Child 3',
        platformType: PlatformType.TWITTER,
        contentType: 'tweet',
        url: 'https://twitter.com/user/status/ghi',
        publishedAt: new Date(),
        creator: { id: 'test-creator', name: 'Test Creator', verified: true },
        metrics: { views: 2000, engagements: 200, engagementRate: 0.1 },
      },
    ],
    relationships: [
      {
        id: 'rel-1',
        sourceContentId: 'test-content-id',
        targetContentId: 'child-1',
        relationshipType: RelationshipType.CHILD,
        confidence: 0.9,
        creationMethod: 'ai_suggested',
        createdAt: new Date(),
      },
      {
        id: 'rel-2',
        sourceContentId: 'test-content-id',
        targetContentId: 'child-2',
        relationshipType: RelationshipType.CHILD,
        confidence: 0.8,
        creationMethod: 'ai_suggested',
        createdAt: new Date(),
      },
      {
        id: 'rel-3',
        sourceContentId: 'test-content-id',
        targetContentId: 'child-3',
        relationshipType: RelationshipType.CHILD,
        confidence: 0.7,
        creationMethod: 'ai_suggested',
        createdAt: new Date(),
      },
    ],
    aggregateMetrics: {
      totalViews: 8000,
      totalEngagements: 800,
      totalShares: 80,
      totalComments: 80,
      totalLikes: 800,
      totalWatchTime: 800,
      overallEngagementRate: 0.1,
      estimatedTotalValue: 800,
      platformBreakdown: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Creates mock visualization data for testing the graph components
 * @returns {ContentFamilyVisualizationData} Mock visualization data
 */
const createMockVisualizationData = (): ContentFamilyVisualizationData => {
  // Create a mock ContentFamilyVisualizationData object with nodes and edges
  // Include nodes for different platforms with realistic content data
  // Connect nodes with edges representing various relationship types
  // Include metrics and styling information used by the visualization
  const mockContentFamily = createMockContentFamily();
  return {
    graph: {
      nodes: mockContentFamily.childContent.map((content) => ({
        id: content.id,
        content: content,
        label: content.title,
        platformType: content.platformType,
        contentType: content.contentType,
        isRoot: false,
      })),
      edges: mockContentFamily.relationships.map((rel) => ({
        id: rel.id,
        source: rel.sourceContentId,
        target: rel.targetContentId,
        relationshipType: rel.relationshipType,
        confidence: rel.confidence,
        isAutoDetected: true,
      })),
    },
    rootContent: mockContentFamily.rootContent,
    aggregateMetrics: mockContentFamily.aggregateMetrics,
    statistics: {
      totalContent: mockContentFamily.childContent.length,
      platformCount: 3,
      contentByPlatform: {
        [PlatformType.INSTAGRAM]: 1,
        [PlatformType.TIKTOK]: 1,
        [PlatformType.TWITTER]: 1,
      },
      contentByType: {
        video: 1,
        post: 1,
        tweet: 1,
      },
    },
  } as ContentFamilyVisualizationData;
};

/**
 * Helper function to render components with required providers
 * @param {JSX.Element} ui - The UI element to render
 * @returns {RenderResult} Result of rendering with all necessary providers
 */
const renderWithProviders = (ui: React.ReactElement) => {
  // Create a new QueryClient instance
  // Wrap the provided UI in QueryClientProvider
  // Call render() with the wrapped component
  // Return the render result with all testing utilities
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

/**
 * Sets up the mock implementation for useContentRelationships
 * @param {object} mockImplementation - Mock implementation
 * @returns {void} No return value
 */
const setupContentRelationshipsMock = (mockImplementation: any) => {
  // Create default mock implementations for all hook methods
  // Override default implementations with provided mock implementation
  // Setup mock to return the combined implementation
  const defaultMockImplementation = {
    relationships: [],
    relationshipsLoading: false,
    relationshipsError: null,
    contentFamily: null,
    contentFamilyLoading: false,
    contentFamilyError: null,
    suggestions: [],
    suggestionsLoading: false,
    suggestionsError: null,
    getRelationships: jest.fn(),
    getContentFamily: jest.fn(),
    getVisualizationData: jest.fn(),
    getRelationshipSuggestions: jest.fn(),
    createRelationship: jest.fn(),
    updateRelationship: jest.fn(),
    deleteRelationship: jest.fn(),
    approveRelationshipSuggestion: jest.fn(),
    rejectRelationshipSuggestion: jest.fn(),
    getRelationshipTypeLabel: jest.fn(),
    refreshRelationshipData: jest.fn(),
  };

  const combinedMockImplementation = {
    ...defaultMockImplementation,
    ...mockImplementation,
  };

  (useContentRelationships as jest.Mock).mockImplementation(() => combinedMockImplementation);
};

describe('ContentFamilyGraph', () => {
  test('should render parent-child relationships correctly', () => {
    // Arrange
    const mockRelationshipData = createMockVisualizationData();
    setupContentRelationshipsMock({
      contentFamily: {
        graph: {
          nodes: mockRelationshipData.graph.nodes,
          edges: mockRelationshipData.graph.edges,
        },
      },
    });
    
    // Act
    renderWithProviders(<ContentFamilyGraph contentId="test-content-id" />);
    
    // Assert
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });
});