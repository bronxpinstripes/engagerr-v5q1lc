import { describe, it, expect, beforeEach, afterEach, jest } from 'jest'; // ^29.5.0
import discoveryService from '../src/services/discovery';
import creatorModel from '../src/models/creator';
import brandModel from '../src/models/brand';
import { CreatorTypes } from '../src/types/creator';
import { BrandTypes } from '../src/types/brand';
import { ApiTypes } from '../src/types/api';
import { PlatformTypes } from '../src/types/platform';
import { ValidationError, NotFoundError } from '../src/utils/errors';

// Mock creator data
const mockCreator: CreatorTypes.CreatorProfile = {
  creatorId: 'creator-id',
  fullName: 'Test Creator',
  bio: 'Test bio',
  categories: [CreatorTypes.Category.TECHNOLOGY],
  profileImage: 'http://example.com/image.jpg',
  coverImage: 'http://example.com/cover.jpg',
  verificationStatus: UserTypes.VerificationStatus.VERIFIED,
  platformSummary: [{ platformType: PlatformTypes.PlatformType.YOUTUBE, handle: 'test', url: 'http://youtube.com', followers: 1000, engagement: 0.1, contentCount: 10, verified: true }],
  totalFollowers: 1000,
  engagementRate: 0.1,
  contentCount: 10,
  location: 'Test Location',
  languages: ['English'],
  contactEmail: 'test@example.com',
  website: 'http://example.com',
  featuredContent: [],
  partnership: [],
  isPublic: true,
};

// Mock brand data
const mockBrand = {
  id: 'brand-id',
  userId: 'user-id',
  companyName: 'Test Brand',
  industries: [BrandTypes.Industry.TECHNOLOGY],
  logoImage: 'http://example.com/logo.jpg',
  websiteUrl: 'http://example.com',
  subscriptionTier: UserTypes.SubscriptionTier.PRO,
  subscriptionStatus: UserTypes.SubscriptionStatus.ACTIVE,
  settings: {}
};

// Mock saved search data
const mockSavedSearch: BrandTypes.SavedSearch = {
  id: 'saved-search-id',
  brandId: 'brand-id',
  name: 'Test Search',
  description: 'Test description',
  filters: {},
  savedCreatorIds: [],
  lastRun: new Date(),
  resultCount: 10,
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Generates a mock creator for testing
 * @param options 
 * @returns Mock creator profile with specified options
 */
function generateMockCreator(options: any = {}): CreatorTypes.CreatorProfile {
  // Create a base mock creator with default values
  const baseMockCreator: CreatorTypes.CreatorProfile = {
    creatorId: 'mock-creator-id',
    fullName: 'Mock Creator',
    bio: 'Mock bio',
    categories: [CreatorTypes.Category.TECHNOLOGY],
    profileImage: 'http://example.com/mock-image.jpg',
    coverImage: 'http://example.com/mock-cover.jpg',
    verificationStatus: UserTypes.VerificationStatus.VERIFIED,
    platformSummary: [{ platformType: PlatformTypes.PlatformType.YOUTUBE, handle: 'mock', url: 'http://youtube.com', followers: 500, engagement: 0.05, contentCount: 5, verified: true }],
    totalFollowers: 500,
    engagementRate: 0.05,
    contentCount: 5,
    location: 'Mock Location',
    languages: ['English'],
    contactEmail: 'mock@example.com',
    website: 'http://example.com',
    featuredContent: [],
    partnership: [],
    isPublic: true,
  };

  // Override defaults with any values passed in options
  const mockCreator = { ...baseMockCreator, ...options };

  // Ensure all required fields are populated
  mockCreator.creatorId = mockCreator.creatorId || 'mock-creator-id';
  mockCreator.fullName = mockCreator.fullName || 'Mock Creator';

  // Return the constructed mock creator profile
  return mockCreator;
}

/**
 * Generates an array of mock creators for testing
 * @param count 
 * @param options 
 * @returns Array of mock creator profiles
 */
function generateMockCreators(count: number, options: any = {}): CreatorTypes.CreatorProfile[] {
  // Initialize empty creators array
  const creators: CreatorTypes.CreatorProfile[] = [];

  // Loop count times to generate specified number of creators
  for (let i = 0; i < count; i++) {
    // Call generateMockCreator with incremental variations and options
    const creator = generateMockCreator({ creatorId: `mock-creator-${i}`, totalFollowers: 500 + i * 100, ...options });
    creators.push(creator);
  }

  // Return array of mock creator profiles
  return creators;
}

/**
 * Generates a mock brand for testing
 * @param options 
 * @returns Mock brand object with specified options
 */
function generateMockBrand(options: any = {}) {
  // Create a base mock brand with default values
  const baseMockBrand = {
    id: 'mock-brand-id',
    userId: 'mock-user-id',
    companyName: 'Mock Brand',
    industries: [BrandTypes.Industry.TECHNOLOGY],
    logoImage: 'http://example.com/mock-logo.jpg',
    websiteUrl: 'http://example.com',
    subscriptionTier: UserTypes.SubscriptionTier.PRO,
    subscriptionStatus: UserTypes.SubscriptionStatus.ACTIVE,
    settings: {}
  };

  // Override defaults with any values passed in options
  const mockBrand = { ...baseMockBrand, ...options };

  // Ensure all required fields are populated
  mockBrand.id = mockBrand.id || 'mock-brand-id';
  mockBrand.companyName = mockBrand.companyName || 'Mock Brand';

  // Return the constructed mock brand object
  return mockBrand;
}

/**
 * Sets up mocks for all the necessary dependencies
 * @param mockData 
 */
function setupMocks(mockData: any = {}) {
  // Mock creatorModel.findCreatorById to return mockData.creator
  jest.spyOn(creatorModel, 'findCreatorById').mockResolvedValue(mockData.creator || null);

  // Mock creatorModel.findCreatorsByFilters to return mockData.creators
  jest.spyOn(creatorModel, 'findCreatorsByFilters').mockResolvedValue(mockData.creators || []);

  // Mock brandModel.findBrandById to return mockData.brand
  jest.spyOn(brandModel, 'findBrandById').mockResolvedValue(mockData.brand || null);

  // Mock brandModel.saveBrandSearch to return mockData.savedSearch
  jest.spyOn(brandModel, 'saveBrandSearch').mockResolvedValue(mockData.savedSearch || null);

  // Mock brandModel.getBrandSavedSearch to return mockData.savedSearch
  jest.spyOn(brandModel, 'getBrandSavedSearch').mockResolvedValue(mockData.savedSearch || null);

  // Set up other necessary mocks based on the test requirements
}

describe('Discovery Marketplace', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should search creators based on criteria', async () => {
    // Arrange
    const mockCreators = generateMockCreators(3);
    setupMocks({ creators: mockCreators });
    const criteria: BrandTypes.CreatorCriteria = { categories: [CreatorTypes.Category.TECHNOLOGY] };
    const pagination: ApiTypes.PaginationParams = { page: 1, pageSize: 20 };
    const brandId = 'brand-id';

    // Act
    const result = await discoveryService.searchCreators(criteria, pagination, brandId);

    // Assert
    expect(creatorModel.findCreatorsByFilters).toHaveBeenCalled();
    expect(result.data).toHaveLength(3);
    expect(result.pagination.totalItems).toBe(3);
  });

  it('should get creator details with match score', async () => {
    // Arrange
    setupMocks({ creator: mockCreator, brand: mockBrand });
    const creatorId = 'creator-id';
    const brandId = 'brand-id';

    // Act
    const result = await discoveryService.getCreatorDetails(creatorId, brandId);

    // Assert
    expect(creatorModel.findCreatorById).toHaveBeenCalledWith(creatorId);
    expect(result.creatorId).toBe(creatorId);
  });

  it('should get creators by category', async () => {
    // Arrange
    const mockCreators = generateMockCreators(2);
    setupMocks({ creators: mockCreators });
    const category = CreatorTypes.Category.TECHNOLOGY;
    const pagination: ApiTypes.PaginationParams = { page: 1, pageSize: 20 };
    const filterOptions = {};

    // Act
    const result = await discoveryService.getCreatorsByCategory(category, pagination, filterOptions);

    // Assert
    expect(creatorModel.findCreatorsByFilters).toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
  });

  it('should get creators by follower range', async () => {
    // Arrange
    const mockCreators = generateMockCreators(2);
    setupMocks({ creators: mockCreators });
    const minFollowers = 100;
    const maxFollowers = 1000;
    const pagination: ApiTypes.PaginationParams = { page: 1, pageSize: 20 };
    const filterOptions = {};

    // Act
    const result = await discoveryService.getCreatorsByFollowerRange(minFollowers, maxFollowers, pagination, filterOptions);

    // Assert
    expect(creatorModel.findCreatorsByFilters).toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
  });

  it('should get creators by engagement rate', async () => {
    // Arrange
    const mockCreators = generateMockCreators(2);
    setupMocks({ creators: mockCreators });
    const minEngagementRate = 0.05;
    const pagination: ApiTypes.PaginationParams = { page: 1, pageSize: 20 };
    const filterOptions = {};

    // Act
    const result = await discoveryService.getCreatorsByEngagementRate(minEngagementRate, pagination, filterOptions);

    // Assert
    expect(creatorModel.findCreatorsByFilters).toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
  });

  it('should get recommended creators for brand', async () => {
    // Arrange
    setupMocks();
    const brandId = 'brand-id';
    const limit = 10;
    const includeExplanations = true;

    // Act
    const result = await discoveryService.getRecommendedCreatorsForBrand(brandId, limit, includeExplanations);

    // Assert
    // Add assertions here based on the expected behavior of the recommendation engine
  });

  it('should save a search', async () => {
    // Arrange
    setupMocks({ brand: mockBrand, savedSearch: mockSavedSearch });
    const brandId = 'brand-id';
    const name = 'Test Search';
    const description = 'Test description';
    const criteria: BrandTypes.CreatorCriteria = { categories: [CreatorTypes.Category.TECHNOLOGY] };

    // Act
    const result = await discoveryService.saveSearch(brandId, name, description, criteria);

    // Assert
    expect(brandModel.saveBrandSearch).toHaveBeenCalledWith(brandId, name, description, criteria);
    expect(result.id).toBe('saved-search-id');
  });

  it('should get a saved search', async () => {
    // Arrange
    setupMocks({ brand: mockBrand, savedSearch: mockSavedSearch });
    const searchId = 'saved-search-id';
    const brandId = 'brand-id';

    // Act
    const result = await discoveryService.getSavedSearch(searchId, brandId);

    // Assert
    expect(brandModel.getBrandSavedSearch).toHaveBeenCalledWith(searchId, brandId);
    expect(result.id).toBe(searchId);
  });

  it('should execute a saved search', async () => {
    // Arrange
    const mockCreators = generateMockCreators(2);
    setupMocks({ brand: mockBrand, savedSearch: mockSavedSearch, creators: mockCreators });
    const searchId = 'saved-search-id';
    const brandId = 'brand-id';
    const pagination: ApiTypes.PaginationParams = { page: 1, pageSize: 20 };

    // Act
    const result = await discoveryService.executeSearch(searchId, brandId, pagination);

    // Assert
    expect(brandModel.getBrandSavedSearch).toHaveBeenCalledWith(searchId, brandId);
    expect(creatorModel.findCreatorsByFilters).toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
  });
});