import { test, expect, Page } from '@playwright/test';
import { loginAsBrand } from '../tests/helpers';

// Test credentials for login
const testBrandEmail = 'test.brand@example.com';
const testBrandPassword = 'TestPassword123!';

/**
 * Navigate to the creator discovery page
 */
async function navigateToDiscovery(page: Page): Promise<void> {
  await page.click('[data-testid="discovery-nav-link"]');
  await page.waitForSelector('[data-testid="creator-card"]');
  await expect(page.locator('[data-testid="creator-search-input"]')).toBeVisible();
}

/**
 * Apply search filters to the creator discovery page
 */
async function applyFilters(page: Page, filters: any): Promise<void> {
  // Check if on mobile view and open filter panel if needed
  const filtersButton = page.locator('[data-testid="filters-button"]');
  if (await filtersButton.isVisible()) {
    await filtersButton.click();
    await page.waitForSelector('[data-testid="filter-panel"]');
  }
  
  // Apply category filters
  if (filters.categories) {
    for (const category of filters.categories) {
      await page.locator(`[data-testid="category-${category}"]`).check();
    }
  }
  
  // Apply platform filters
  if (filters.platforms) {
    for (const platform of filters.platforms) {
      await page.locator(`[data-testid="platform-${platform}"]`).check();
    }
  }
  
  // Adjust follower range if specified
  if (filters.followerRange) {
    // This is a simplification - actual slider implementation would be more complex
    await page.locator('[data-testid="follower-range-slider"]').evaluate((el: any, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, filters.followerRange);
  }
  
  // Adjust engagement rate if specified
  if (filters.engagementRate) {
    await page.locator('[data-testid="engagement-rate-slider"]').evaluate((el: any, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, filters.engagementRate);
  }
  
  // Select location if specified
  if (filters.audienceLocations) {
    await page.locator('[data-testid="location-select"]').selectOption(filters.audienceLocations);
  }
  
  // Select gender if specified
  if (filters.audienceGender) {
    await page.locator(`[data-testid="gender-${filters.audienceGender}"]`).check();
  }
  
  // Adjust age range if specified
  if (filters.audienceAgeRange) {
    await page.locator('[data-testid="age-range-slider"]').evaluate((el: any, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, filters.audienceAgeRange);
  }
  
  // Adjust budget range if specified
  if (filters.budgetRange) {
    await page.locator('[data-testid="budget-range-slider"]').evaluate((el: any, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, filters.budgetRange);
  }
  
  // Apply the filters
  await page.click('[data-testid="apply-filters-button"]');
  
  // Wait for results to update
  await page.waitForResponse(response => 
    response.url().includes('/api/discovery/search') && response.status() === 200
  );
}

/**
 * Search for creators by keyword
 */
async function searchCreators(page: Page, keyword: string): Promise<void> {
  await page.fill('[data-testid="creator-search-input"]', keyword);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForResponse(response => 
    response.url().includes('/api/discovery/search') && response.status() === 200
  );
}

/**
 * Toggle the favorite status of a creator
 */
async function toggleFavoriteCreator(page: Page, creatorIndex: number): Promise<void> {
  const favoriteButton = page.locator(`[data-testid="favorite-button-${creatorIndex}"]`);
  const initialState = await favoriteButton.getAttribute('aria-pressed');
  
  await favoriteButton.click();
  
  // Wait for the button state to change
  await expect(favoriteButton).toHaveAttribute('aria-pressed', initialState === 'true' ? 'false' : 'true');
  
  // Wait for the favorite API call to complete
  await page.waitForResponse(response => 
    response.url().includes('/api/brands/saved') && response.status() === 200
  );
}

/**
 * View a creator's detailed profile
 */
async function viewCreatorProfile(page: Page, creatorIndex: number): Promise<void> {
  await page.click(`[data-testid="creator-card-${creatorIndex}"]`);
  
  // Wait for profile page to load
  await page.waitForSelector('[data-testid="creator-profile-header"]');
  await expect(page.locator('[data-testid="profile-metrics"]')).toBeVisible();
}

/**
 * Initiate contact with a creator
 */
async function initiateContact(page: Page): Promise<void> {
  await page.click('[data-testid="contact-creator-button"]');
  
  // Wait for message interface to appear
  await page.waitForSelector('[data-testid="message-input"]');
  
  // Type a test message
  const testMessage = 'Hi, I\'m interested in working with you on a campaign!';
  await page.fill('[data-testid="message-input"]', testMessage);
  
  // Send the message
  await page.click('[data-testid="send-message-button"]');
  
  // Verify message appears in conversation
  await expect(page.locator('[data-testid="message-thread"]')).toContainText(testMessage);
}

/**
 * Save the current search configuration
 */
async function saveSearch(page: Page, searchName: string): Promise<void> {
  await page.click('[data-testid="save-search-button"]');
  
  // Wait for save search modal
  await page.waitForSelector('[data-testid="search-name-input"]');
  
  // Enter search name
  await page.fill('[data-testid="search-name-input"]', searchName);
  
  // Save the search
  await page.click('[data-testid="save-search-confirm"]');
  
  // Wait for confirmation
  await page.waitForResponse(response => 
    response.url().includes('/api/brands/searches') && response.status() === 200
  );
}

/**
 * Sort search results using different criteria
 */
async function sortResults(page: Page, sortOption: string): Promise<void> {
  await page.click('[data-testid="sort-select"]');
  await page.click(`[data-testid="sort-option-${sortOption}"]`);
  
  // Wait for results to update
  await page.waitForResponse(response => 
    response.url().includes('/api/discovery/search') && response.status() === 200
  );
}

// Mock filter configurations for testing
const mockFilters = {
  categoryFilter: {
    categories: ['tech', 'lifestyle']
  },
  platformFilter: {
    platforms: ['youtube', 'instagram']
  },
  followerFilter: {
    followerRange: { min: 50000, max: 500000 }
  },
  engagementFilter: {
    engagementRate: { min: 3, max: 8 }
  },
  combinedFilter: {
    categories: ['tech'],
    platforms: ['youtube'],
    followerRange: { min: 50000, max: 500000 },
    engagementRate: { min: 3, max: 8 }
  }
};

test.describe('Brand Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as brand before each test
    await loginAsBrand(page, testBrandEmail, testBrandPassword);
  });

  test('should load creator discovery page with initial results', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // Verify search interface elements
    await expect(page.locator('[data-testid="creator-search-input"]')).toBeVisible();
    
    // Verify creator results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Verify filter panel
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
  });

  test('should filter creators by category', async ({ page }) => {
    await navigateToDiscovery(page);
    await applyFilters(page, mockFilters.categoryFilter);
    
    // Verify filtered results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Check if results contain only creators with the selected categories
    const categories = page.locator('[data-testid="creator-category"]');
    for (let i = 0; i < await categories.count(); i++) {
      const categoryText = await categories.nth(i).textContent();
      const hasMatchingCategory = mockFilters.categoryFilter.categories.some(
        category => categoryText?.toLowerCase().includes(category)
      );
      expect(hasMatchingCategory).toBeTruthy();
    }
  });

  test('should filter creators by platform', async ({ page }) => {
    await navigateToDiscovery(page);
    await applyFilters(page, mockFilters.platformFilter);
    
    // Verify filtered results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Check if results contain only creators with the selected platforms
    const platforms = page.locator('[data-testid="creator-platforms"]');
    for (let i = 0; i < await platforms.count(); i++) {
      const platformText = await platforms.nth(i).textContent();
      const hasMatchingPlatform = mockFilters.platformFilter.platforms.some(
        platform => platformText?.toLowerCase().includes(platform)
      );
      expect(hasMatchingPlatform).toBeTruthy();
    }
  });

  test('should filter creators by follower range', async ({ page }) => {
    await navigateToDiscovery(page);
    await applyFilters(page, mockFilters.followerFilter);
    
    // Verify filtered results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Check if results contain only creators within follower range
    const followerCounts = page.locator('[data-testid="creator-followers"]');
    for (let i = 0; i < await followerCounts.count(); i++) {
      const followerText = await followerCounts.nth(i).textContent();
      const followerCount = parseInt(followerText?.replace(/[^0-9]/g, '') || '0');
      
      expect(followerCount).toBeGreaterThanOrEqual(mockFilters.followerFilter.followerRange.min);
      expect(followerCount).toBeLessThanOrEqual(mockFilters.followerFilter.followerRange.max);
    }
  });

  test('should filter creators by engagement rate', async ({ page }) => {
    await navigateToDiscovery(page);
    await applyFilters(page, mockFilters.engagementFilter);
    
    // Verify filtered results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Check if results contain only creators within engagement rate range
    const engagementRates = page.locator('[data-testid="creator-engagement"]');
    for (let i = 0; i < await engagementRates.count(); i++) {
      const engagementText = await engagementRates.nth(i).textContent();
      const engagementRate = parseFloat(engagementText?.replace(/[^0-9.]/g, '') || '0');
      
      expect(engagementRate).toBeGreaterThanOrEqual(mockFilters.engagementFilter.engagementRate.min);
      expect(engagementRate).toBeLessThanOrEqual(mockFilters.engagementFilter.engagementRate.max);
    }
  });

  test('should search creators by keyword', async ({ page }) => {
    await navigateToDiscovery(page);
    await searchCreators(page, 'tech');
    
    // Verify search results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Check if results relate to the search keyword
    // This is a simple check - in reality, the relevance would be more complex
    const creatorContent = page.locator('[data-testid="creator-card"]');
    for (let i = 0; i < await creatorContent.count(); i++) {
      const cardText = await creatorContent.nth(i).textContent();
      expect(cardText?.toLowerCase()).toContain('tech');
    }
  });

  test('should toggle creator favorite status', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // First make sure we have at least one creator
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Toggle favorite on the first creator
    await toggleFavoriteCreator(page, 0);
    
    // Get the current state
    const favoriteButton = page.locator('[data-testid="favorite-button-0"]');
    const isFavorited = await favoriteButton.getAttribute('aria-pressed') === 'true';
    
    // Toggle again
    await toggleFavoriteCreator(page, 0);
    
    // Verify the state has flipped back
    await expect(favoriteButton).toHaveAttribute('aria-pressed', isFavorited ? 'false' : 'true');
  });

  test('should view creator profile details', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // First make sure we have at least one creator
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
    
    // Get creator name from search results for later verification
    const creatorName = await page.locator('[data-testid="creator-name"]').first().textContent();
    
    // View the first creator's profile
    await viewCreatorProfile(page, 0);
    
    // Verify profile details
    await expect(page.locator('[data-testid="creator-profile-header"]')).toContainText(creatorName || '');
    await expect(page.locator('[data-testid="profile-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-creator-button"]')).toBeVisible();
  });

  test('should send initial message to creator', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // View the first creator's profile
    await viewCreatorProfile(page, 0);
    
    // Initiate contact
    await initiateContact(page);
    
    // Verification of message sending is handled in the initiateContact function
  });

  test('should save search configuration', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // Apply combined filters
    await applyFilters(page, mockFilters.combinedFilter);
    
    // Save the search
    const searchName = 'Test Search Configuration';
    await saveSearch(page, searchName);
    
    // Verification: navigate away and back to test loading saved search
    // This is a simplified test - in reality, we would load the saved search and verify
    // that all filters are restored correctly
    await page.click('[data-testid="discovery-nav-link"]');
    await page.waitForSelector('[data-testid="creator-card"]');
    
    // We would need a UI element to load saved searches, which would be tested here
    // For now, we just verify the save operation completed successfully
  });

  test('should sort creator results with different criteria', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // Sort by followers (high to low)
    await sortResults(page, 'followers-desc');
    
    // Get follower counts and verify they're in descending order
    const followerCounts = page.locator('[data-testid="creator-followers"]');
    
    let prevCount = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < Math.min(5, await followerCounts.count()); i++) {
      const followerText = await followerCounts.nth(i).textContent();
      const followerCount = parseInt(followerText?.replace(/[^0-9]/g, '') || '0');
      
      expect(followerCount).toBeLessThanOrEqual(prevCount);
      prevCount = followerCount;
    }
    
    // Sort by engagement rate (high to low)
    await sortResults(page, 'engagement-desc');
    
    // Get engagement rates and verify they're in descending order
    const engagementRates = page.locator('[data-testid="creator-engagement"]');
    
    let prevRate = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < Math.min(5, await engagementRates.count()); i++) {
      const engagementText = await engagementRates.nth(i).textContent();
      const engagementRate = parseFloat(engagementText?.replace(/[^0-9.]/g, '') || '0');
      
      expect(engagementRate).toBeLessThanOrEqual(prevRate);
      prevRate = engagementRate;
    }
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    await navigateToDiscovery(page);
    
    // Apply overly restrictive filters to ensure no results
    await applyFilters(page, {
      categories: ['nonexistent-category'],
      platforms: ['youtube'],
      followerRange: { min: 10000000, max: 50000000 }, // Unrealistic follower range
      engagementRate: { min: 50, max: 100 } // Unrealistic engagement rate
    });
    
    // Verify empty state message
    await expect(page.locator('[data-testid="empty-results"]')).toBeVisible();
    
    // Verify reset filters button is available
    await expect(page.locator('[data-testid="reset-filters-button"]')).toBeVisible();
    
    // Test reset functionality
    await page.click('[data-testid="reset-filters-button"]');
    
    // Wait for results to reload
    await page.waitForResponse(response => 
      response.url().includes('/api/discovery/search') && response.status() === 200
    );
    
    // Verify we now have results
    const creatorCards = page.locator('[data-testid="creator-card"]');
    await expect(creatorCards).toHaveCount({ min: 1 });
  });
});