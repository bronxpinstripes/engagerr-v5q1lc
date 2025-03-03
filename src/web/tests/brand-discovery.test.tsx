# src/web/tests/brand-discovery.test.tsx
 ```typescript
 import React from 'react'; // react ^18.0.0
 import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
 import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.0.0
 import '@testing-library/jest-dom'; // @testing-library/jest-dom ^6.0.0
 import jest from 'jest'; // jest ^29.5.0
 
 import CreatorSearch from '../components/brand/CreatorSearch';
 import SearchFilters from '../components/brand/SearchFilters';
 import CreatorCard from '../components/brand/CreatorCard';
 import AuthProvider from '../context/AuthContext';
 import useDiscovery from '../hooks/useDiscovery';
 
 // Mock implementation of the useDiscovery hook for testing
 const mockUseDiscovery = (overrides: any = {}) => {
  // Create default mock state
  const defaultMock = {
  creators: [],
  loading: false,
  error: null,
  searchQuery: '',
  setSearchQuery: jest.fn(),
  filters: {
  categories: [],
  platforms: [],
  audienceAgeRange: { min: 0, max: 100 },
  audienceGender: [],
  audienceLocations: [],
  followerRange: { min: 0, max: undefined },
  engagementRate: { min: 0, max: undefined },
  contentTypes: [],
  budgetRange: { min: 0, max: undefined },
  keywords: []
  },
  updateFilters: jest.fn(),
  resetFilters: jest.fn(),
  searchCreators: jest.fn(),
  totalResults: 0,
  currentPage: 1,
  pageSize: 20,
  totalPages: 1,
  handlePageChange: jest.fn(),
  getCreatorDetails: jest.fn(),
  saveSearch: jest.fn(),
  loadSavedSearch: jest.fn(),
  savedSearches: [],
  favoriteCreator: jest.fn(),
  unfavoriteCreator: jest.fn(),
  isFavorite: jest.fn(),
  sortResults: jest.fn(),
  sortOptions: {},
  categoryStats: {},
  platformStats: {}
  };
 
  // Override default mock with any custom values provided
  const mock = { ...defaultMock, ...overrides };
 
  // Mock the hook implementation
  jest.mock('../hooks/useDiscovery', () => ({
  __esModule: true,
  default: jest.fn(() => mock)
  }));
 
  return mock;
 };
 
 describe('CreatorSearch component', () => {
  test('should render with default state', () => {
  mockUseDiscovery({ creators: [] });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  expect(screen.getByPlaceholderText('Search creators...')).toBeInTheDocument();
  expect(screen.getByText('Categories')).toBeInTheDocument();
  expect(screen.getByText('Platforms')).toBeInTheDocument();
  expect(screen.getByText('No creators found')).toBeInTheDocument();
  });
 
  test('should display loading state', () => {
  mockUseDiscovery({ loading: true });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  expect(screen.getByText('Loading data...')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Search creators...')).toBeDisabled();
  });
 
  test('should display creator cards when data is loaded', () => {
  const mockCreators = [
  { id: '1', name: 'Creator One', categories: ['Tech'], metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 } },
  { id: '2', name: 'Creator Two', categories: ['Lifestyle'], metrics: { totalFollowers: 2000, averageEngagementRate: 0.10 } },
  ];
  mockUseDiscovery({ creators: mockCreators });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  expect(screen.getByText('Creator One')).toBeInTheDocument();
  expect(screen.getByText('1K Followers')).toBeInTheDocument();
  expect(screen.getByText('5% Engagement')).toBeInTheDocument();
  });
 
  test('should handle search query input and submission', async () => {
  const mockSearchCreators = jest.fn();
  mockUseDiscovery({ searchCreators: mockSearchCreators });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  const searchInput = screen.getByPlaceholderText('Search creators...');
  await userEvent.type(searchInput, 'test query');
  const searchButton = screen.getByText('Search');
  await userEvent.click(searchButton);
 
  expect(mockSearchCreators).toHaveBeenCalled();
  });
 
  test('should toggle between grid and table views', async () => {
  mockUseDiscovery({ creators: [{ id: '1', name: 'Creator One', categories: ['Tech'], metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 } }] });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  const gridViewButton = screen.getByText('Grid View');
  expect(screen.getByText('Creator One')).toBeVisible();
 
  const tableViewButton = screen.getByText('Table View');
  await userEvent.click(tableViewButton);
  expect(screen.getByText('Creator One')).toBeVisible();
 
  await userEvent.click(gridViewButton);
  expect(screen.getByText('Creator One')).toBeVisible();
  });
 });
 
 describe('SearchFilters component', () => {
  test('should render all filter sections', () => {
  mockUseDiscovery();
 
  render(
  <AuthProvider>
  <SearchFilters />
  </AuthProvider>
  );
 
  expect(screen.getByText('Categories')).toBeInTheDocument();
  expect(screen.getByText('Platforms')).toBeInTheDocument();
  expect(screen.getByText('Audience')).toBeInTheDocument();
  expect(screen.getByText('Metrics')).toBeInTheDocument();
  expect(screen.getByText('Budget')).toBeInTheDocument();
  });
 
  test('should update filters when selections change', async () => {
  const mockUpdateFilters = jest.fn();
  mockUseDiscovery({ updateFilters: mockUpdateFilters });
 
  render(
  <AuthProvider>
  <SearchFilters />
  </AuthProvider>
  );
 
  const techCheckbox = screen.getByLabelText('Tech');
  await userEvent.click(techCheckbox);
  expect(mockUpdateFilters).toHaveBeenCalled();
  });
 
  test('should apply filters when Apply button is clicked', async () => {
  const mockSearchCreators = jest.fn();
  mockUseDiscovery({ searchCreators: mockSearchCreators });
 
  render(
  <AuthProvider>
  <SearchFilters onApplyFilters={mockSearchCreators} />
  </AuthProvider>
  );
 
  const applyButton = screen.getByText('Apply Filters');
  await userEvent.click(applyButton);
  expect(mockSearchCreators).toHaveBeenCalled();
  });
 
  test('should reset filters when Reset button is clicked', async () => {
  const mockResetFilters = jest.fn();
  mockUseDiscovery({ resetFilters: mockResetFilters });
 
  render(
  <AuthProvider>
  <SearchFilters />
  </AuthProvider>
  );
 
  const resetButton = screen.getByText('Reset');
  await userEvent.click(resetButton);
  expect(mockResetFilters).toHaveBeenCalled();
  });
 
  test('should collapse and expand filter sections on mobile', async () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
  window.dispatchEvent(new Event('resize'));
 
  mockUseDiscovery();
 
  render(
  <AuthProvider>
  <SearchFilters isCollapsible={true} />
  </AuthProvider>
  );
 
  const categoriesButton = screen.getByText('Categories');
  await userEvent.click(categoriesButton);
  });
 });
 
 describe('CreatorCard component', () => {
  test('should render creator profile information', () => {
  const mockCreator = {
  id: '1',
  name: 'Creator One',
  categories: ['Tech', 'Lifestyle'],
  metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 },
  profileImage: 'test-image.jpg'
  } as any;
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={false} onFavorite={() => {}} onView={() => {}} onAddToList={() => {}} />
  </AuthProvider>
  );
 
  expect(screen.getByText('Creator One')).toBeInTheDocument();
  expect(screen.getByText('Tech')).toBeInTheDocument();
  expect(screen.getByText('Lifestyle')).toBeInTheDocument();
  expect(screen.getByText('1K Followers')).toBeInTheDocument();
  expect(screen.getByText('5% Engagement')).toBeInTheDocument();
  });
 
  test('should display match score when enabled', () => {
  const mockCreator = {
  id: '1',
  name: 'Creator One',
  categories: ['Tech', 'Lifestyle'],
  metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 },
  profileImage: 'test-image.jpg',
  matchScore: 85
  } as any;
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={false} onFavorite={() => {}} onView={() => {}} onAddToList={() => {}} showMatchScore={true} />
  </AuthProvider>
  );
 
  expect(screen.getByText('85% Match')).toBeInTheDocument();
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={false} onFavorite={() => {}} onView={() => {}} onAddToList={() => {}} showMatchScore={false} />
  </AuthProvider>
  );
 
  expect(screen.queryByText('85% Match')).not.toBeInTheDocument();
  });
 
  test('should handle favorite toggling', async () => {
  const mockCreator = {
  id: '1',
  name: 'Creator One',
  categories: ['Tech', 'Lifestyle'],
  metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 },
  profileImage: 'test-image.jpg'
  } as any;
  const mockOnFavorite = jest.fn();
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={false} onFavorite={mockOnFavorite} onView={() => {}} onAddToList={() => {}} />
  </AuthProvider>
  );
 
  const favoriteButton = screen.getByText('Favorite');
  await userEvent.click(favoriteButton);
  expect(mockOnFavorite).toHaveBeenCalledWith('1', true);
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={true} onFavorite={mockOnFavorite} onView={() => {}} onAddToList={() => {}} />
  </AuthProvider>
  );
 
  const favoritedButton = screen.getByText('Favorited');
  await userEvent.click(favoritedButton);
  expect(mockOnFavorite).toHaveBeenCalledWith('1', false);
  });
 
  test('should call onView when card or view button is clicked', async () => {
  const mockCreator = {
  id: '1',
  name: 'Creator One',
  categories: ['Tech', 'Lifestyle'],
  metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 },
  profileImage: 'test-image.jpg'
  } as any;
  const mockOnView = jest.fn();
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={false} onFavorite={() => {}} onView={mockOnView} onAddToList={() => {}} />
  </AuthProvider>
  );
 
  const viewButton = screen.getByText('View');
  await userEvent.click(viewButton);
  expect(mockOnView).toHaveBeenCalledWith('1');
  });
 
  test('should handle add to list functionality', async () => {
  const mockCreator = {
  id: '1',
  name: 'Creator One',
  categories: ['Tech', 'Lifestyle'],
  metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 },
  profileImage: 'test-image.jpg'
  } as any;
  const mockOnAddToList = jest.fn();
 
  render(
  <AuthProvider>
  <CreatorCard creator={mockCreator} isFavorite={false} onFavorite={() => {}} onView={() => {}} onAddToList={mockOnAddToList} />
  </AuthProvider>
  );
 
  const addToListButton = screen.getByText('Add');
  await userEvent.click(addToListButton);
  expect(mockOnAddToList).toHaveBeenCalledWith('1');
  });
 });
 
 describe('Integration tests for discovery workflow', () => {
  test('should search, filter and view creator profiles', async () => {
  const mockSearchCreators = jest.fn();
  const mockUpdateFilters = jest.fn();
  const mockGetCreatorDetails = jest.fn();
  mockUseDiscovery({
  creators: [{ id: '1', name: 'Creator One', categories: ['Tech'], metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 } }],
  searchCreators: mockSearchCreators,
  updateFilters: mockUpdateFilters,
  getCreatorDetails: mockGetCreatorDetails
  });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  const searchInput = screen.getByPlaceholderText('Search creators...');
  await userEvent.type(searchInput, 'test query');
 
  const techCheckbox = screen.getByLabelText('Tech');
  await userEvent.click(techCheckbox);
 
  const viewButton = screen.getByText('View');
  await userEvent.click(viewButton);
 
  expect(mockSearchCreators).toHaveBeenCalled();
  expect(mockUpdateFilters).toHaveBeenCalled();
  expect(mockGetCreatorDetails).toHaveBeenCalled();
  });
 
  test('should save and load searches', async () => {
  const mockSaveSearch = jest.fn();
  const mockLoadSavedSearch = jest.fn();
  mockUseDiscovery({
  saveSearch: mockSaveSearch,
  loadSavedSearch,
  savedSearches: [{ id: '1', name: 'Test Search', filters: { categories: ['Tech'], platforms: [] } }]
  });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  const saveSearchButton = screen.getByText('Save Search');
  await userEvent.click(saveSearchButton);
 
  expect(mockSaveSearch).toHaveBeenCalled();
  });
 
  test('should handle pagination of search results', async () => {
  const mockHandlePageChange = jest.fn();
  mockUseDiscovery({
  creators: [{ id: '1', name: 'Creator One', categories: ['Tech'], metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 } }],
  handlePageChange: mockHandlePageChange,
  totalPages: 2,
  currentPage: 1
  });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  const nextButton = screen.getByText('Next');
  await userEvent.click(nextButton);
  expect(mockHandlePageChange).toHaveBeenCalledWith(2);
  });
 
  test('should handle sorting of search results', async () => {
  const mockSortResults = jest.fn();
  mockUseDiscovery({
  creators: [{ id: '1', name: 'Creator One', categories: ['Tech'], metrics: { totalFollowers: 1000, averageEngagementRate: 0.05 } }],
  sortResults: mockSortResults,
  });
 
  render(
  <AuthProvider>
  <CreatorSearch />
  </AuthProvider>
  );
 
  const sortButton = screen.getByText('Sort by');
  await userEvent.click(sortButton);
  });
 });