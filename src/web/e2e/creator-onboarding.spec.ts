import { test, expect } from '@playwright/test'; // v1.37.0
import { loginAs, registerCreator } from '@playwright/test-helpers'; // v1.2.0

/**
 * End-to-end tests for the creator onboarding flow.
 * These tests cover the complete journey from registration to platform connection
 * and initial dashboard experience.
 */

// Test selectors for UI elements
const selectors = {
  registration_form: {
    email_input: '[data-testid="email-input"]',
    password_input: '[data-testid="password-input"]',
    name_input: '[data-testid="name-input"]',
    register_button: '[data-testid="register-button"]',
    email_error: '[data-testid="email-error"]',
    password_error: '[data-testid="password-error"]',
    name_error: '[data-testid="name-error"]'
  },
  subscription: {
    free_plan: '[data-testid="subscription-plan-free"]',
    paid_plan: '[data-testid="subscription-plan-pro"]',
    continue_button: '[data-testid="continue-button"]'
  },
  platforms: {
    connect_youtube: '[data-testid="connect-youtube-button"]',
    connect_instagram: '[data-testid="connect-instagram-button"]',
    platform_connected_youtube: '[data-testid="platform-connected-youtube"]',
    platform_connected_instagram: '[data-testid="platform-connected-instagram"]',
    skip_button: '[data-testid="skip-button"]',
    confirm_skip_button: '[data-testid="confirm-skip-button"]',
    skip_confirmation_dialog: '[data-testid="skip-confirmation-dialog"]',
    connection_error_message: '[data-testid="connection-error-message"]',
    retry_connection_button: '[data-testid="retry-connection-button"]'
  },
  content: {
    content_item: '[data-testid="content-item-{index}"]',
    no_platforms_message: '[data-testid="no-platforms-message"]'
  },
  dashboard: {
    go_to_dashboard_button: '[data-testid="go-to-dashboard-button"]',
    performance_metrics: '[data-testid="performance-metrics"]',
    content_relationships: '[data-testid="content-relationships"]'
  }
};

// Helper function to generate unique test emails
const generateUniqueEmail = () => `test-creator-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

test.describe('Creator Onboarding Flow', () => {
  test('should complete full onboarding process successfully', async ({ page, context }) => {
    // Generate unique test data
    const testEmail = generateUniqueEmail();
    const testPassword = 'SecurePassword123!';
    const testName = 'Test Creator';
    
    // Step 1: Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register/);
    
    // Step 2: Register a new creator account with test data
    await page.fill(selectors.registration_form.email_input, testEmail);
    await page.fill(selectors.registration_form.password_input, testPassword);
    await page.fill(selectors.registration_form.name_input, testName);
    await page.click(selectors.registration_form.register_button);
    
    // Verify redirect to subscription selection page
    await expect(page).toHaveURL(/.*\/subscription/, { timeout: 10000 });
    
    // Step 3: Select free subscription plan
    await page.click(selectors.subscription.free_plan);
    await expect(page.locator(selectors.subscription.free_plan)).toHaveClass(/selected/);
    await page.click(selectors.subscription.continue_button);
    
    // Verify redirect to platform connection page
    await expect(page).toHaveURL(/.*\/connect-platforms/, { timeout: 10000 });
    
    // Step 4: Connect YouTube platform and verify success
    // Handle OAuth popup by setting up a listener
    const youtubePopupPromise = context.waitForEvent('page');
    await page.click(selectors.platforms.connect_youtube);
    
    const youtubePopup = await youtubePopupPromise;
    // Mock successful authentication in the popup
    await youtubePopup.close();
    
    // Verify YouTube connection success with appropriate timeout
    await expect(page.locator(selectors.platforms.platform_connected_youtube)).toBeVisible({ timeout: 15000 });
    
    // Step 5: Connect Instagram platform and verify success
    const instagramPopupPromise = context.waitForEvent('page');
    await page.click(selectors.platforms.connect_instagram);
    
    const instagramPopup = await instagramPopupPromise;
    // Mock successful authentication in the popup
    await instagramPopup.close();
    
    // Verify Instagram connection success
    await expect(page.locator(selectors.platforms.platform_connected_instagram)).toBeVisible({ timeout: 15000 });
    
    // Continue to next step
    await page.click(selectors.subscription.continue_button);
    
    // Step 6: Continue to content mapping step
    await expect(page).toHaveURL(/.*\/content-mapping/, { timeout: 10000 });
    
    // Step 7: Select content items for initial mapping
    // Wait for content items to load
    await page.waitForSelector(selectors.content.content_item.replace('{index}', '0'), { timeout: 15000 });
    await page.click(selectors.content.content_item.replace('{index}', '0'));
    await page.click(selectors.content.content_item.replace('{index}', '1'));
    
    // Step 8: Complete onboarding and go to dashboard
    await page.click(selectors.dashboard.go_to_dashboard_button);
    
    // Step 9: Verify dashboard loads with initial analytics and content relationships
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    await expect(page.locator(selectors.dashboard.performance_metrics)).toBeVisible({ timeout: 15000 });
    await expect(page.locator(selectors.dashboard.content_relationships)).toBeVisible();
    
    // Final verification of successful onboarding
    await expect(page.locator(`text=Hello, ${testName}`)).toBeVisible();
  });

  test('should handle platform connection failures', async ({ page, context }) => {
    // Login with existing creator account
    await loginAs(page, 'creator');
    
    // Navigate to platform settings
    await page.goto('/settings/platforms');
    await expect(page).toHaveTitle(/Platform Settings/);
    
    // Configure platform OAuth to fail (mock implementation)
    // This would be handled by the test environment configuration
    
    // Attempt to connect platform with a failing popup
    const popupPromise = context.waitForEvent('page');
    await page.click(selectors.platforms.connect_youtube);
    
    const popup = await popupPromise;
    // Simulate authentication failure in the popup
    await popup.goto('/auth/error?reason=connection_failed');
    await popup.close();
    
    // Verify error message is displayed
    await expect(page.locator(selectors.platforms.connection_error_message)).toBeVisible({ timeout: 10000 });
    
    // Verify retry option is available
    await expect(page.locator(selectors.platforms.retry_connection_button)).toBeVisible();
    
    // Test retry functionality
    const retryPopupPromise = context.waitForEvent('page');
    await page.click(selectors.platforms.retry_connection_button);
    
    const retryPopup = await retryPopupPromise;
    // For this test, simulate success on retry
    await retryPopup.close();
    
    // Verify connection successful after retry
    await expect(page.locator(selectors.platforms.platform_connected_youtube)).toBeVisible({ timeout: 15000 });
  });

  test('should validate registration form fields', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register/);
    
    // Submit form without filling required fields
    await page.click(selectors.registration_form.register_button);
    
    // Verify validation error messages appear
    await expect(page.locator(selectors.registration_form.email_error)).toBeVisible();
    await expect(page.locator(selectors.registration_form.password_error)).toBeVisible();
    await expect(page.locator(selectors.registration_form.name_error)).toBeVisible();
    
    // Fill form with invalid email
    await page.fill(selectors.registration_form.email_input, 'invalid-email');
    await page.fill(selectors.registration_form.password_input, 'SecurePassword123!');
    await page.fill(selectors.registration_form.name_input, 'Test Creator');
    await page.click(selectors.registration_form.register_button);
    
    // Verify email-specific error message
    await expect(page.locator(selectors.registration_form.email_error)).toContainText(/valid email/i);
    
    // Test with short password
    await page.fill(selectors.registration_form.email_input, generateUniqueEmail());
    await page.fill(selectors.registration_form.password_input, 'short');
    await page.click(selectors.registration_form.register_button);
    
    // Verify password-specific error message
    await expect(page.locator(selectors.registration_form.password_error)).toContainText(/at least 8 characters/i);
    
    // Test password without special characters
    await page.fill(selectors.registration_form.password_input, 'password123');
    await page.click(selectors.registration_form.register_button);
    
    // Verify password complexity error
    await expect(page.locator(selectors.registration_form.password_error)).toContainText(/special character/i);
  });

  test('should allow skipping platform connection', async ({ page }) => {
    // Register new creator and navigate to platform connection step
    const testEmail = generateUniqueEmail();
    const testPassword = 'SecurePassword123!';
    const testName = 'Skip Test Creator';
    
    // Use helper to register and navigate to platform connection page
    await registerCreator(page, testEmail, testPassword, testName);
    
    // Verify we're on the platform connection page
    await expect(page).toHaveURL(/.*\/connect-platforms/);
    
    // Click skip button
    await page.click(selectors.platforms.skip_button);
    
    // Confirm skip action in dialog
    await expect(page.locator(selectors.platforms.skip_confirmation_dialog)).toBeVisible();
    await page.click(selectors.platforms.confirm_skip_button);
    
    // Verify redirect to content step
    await expect(page).toHaveURL(/.*\/content-mapping/, { timeout: 10000 });
    
    // Verify empty state message is displayed for no connected platforms
    await expect(page.locator(selectors.content.no_platforms_message)).toBeVisible();
    
    // Continue to dashboard
    await page.click(selectors.dashboard.go_to_dashboard_button);
    
    // Verify dashboard shows empty state for no connected platforms
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Connect your first platform')).toBeVisible();
  });
});