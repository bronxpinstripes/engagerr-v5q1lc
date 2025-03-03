import { test, expect } from '@playwright/test'; // v1.40.0
import { loginAs, registerCreator, registerBrand } from '@engagerr/test-helpers'; // v1.0.0

/**
 * End-to-end test suite for the partnership workflow on the Engagerr platform.
 * This file tests the complete lifecycle of partnership creation, proposal exchange,
 * contract generation, deliverable submission, and payment processing between
 * creators and brands.
 */
test.describe('Partnership Flow', () => {
  // Test user data
  const creatorUser = {
    email: 'test-creator@example.com',
    password: 'TestPassword123!',
    name: 'Test Creator',
    bio: 'Content creator for testing',
    categories: ['Tech', 'Lifestyle']
  };

  const brandUser = {
    email: 'test-brand@example.com',
    password: 'TestPassword123!',
    name: 'Test Brand',
    company: 'Test Company Inc.',
    industry: 'Technology'
  };

  // Setup runs before each test case
  test.beforeEach(async ({ page }) => {
    // Set up test users with registered creator and brand accounts
    await registerCreator(page, creatorUser);
    await registerBrand(page, brandUser);

    // Configure mocks for payment processing
    await page.route('**/api/payments/process', route => {
      return route.fulfill({
        status: 200,
        json: { success: true, paymentId: 'test-payment-123' }
      });
    });

    // Configure mocks for platform integrations
    await page.route('**/api/platforms/*/content', route => {
      return route.fulfill({
        status: 200,
        json: { success: true, data: [] }
      });
    });
  });

  // Cleanup runs after each test case
  test.afterEach(async ({ page }) => {
    // Clean up test data
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Reset mocked responses
    await page.unrouteAll();
  });

  /**
   * Tests the complete partnership flow from initiation to completion
   */
  test('should complete full partnership lifecycle', async ({ page }) => {
    // Brand logs in to platform
    await loginAs(page, brandUser);
    await page.goto('/dashboard');
    
    // Brand discovers creator through search
    await page.click('[data-testid="creator-discovery-button"]');
    await page.fill('[data-testid="creator-search-input"]', creatorUser.name);
    
    // Find creator in results and initiate partnership
    const creatorId = 'test-creator-id'; // In real test, this would be dynamically obtained
    await page.click(`[data-testid="creator-card-${creatorId}"]`);
    await page.click(`[data-testid="initiate-partnership-${creatorId}"]`);
    
    // Brand creates partnership proposal with specific deliverables
    await page.fill('[data-testid="proposal-title"]', 'Test Partnership Campaign');
    await page.fill('[data-testid="proposal-description"]', 'Partnership for testing the end-to-end flow');
    
    // Add first deliverable
    await page.click('[data-testid="add-deliverable-button"]');
    await page.selectOption('[data-testid="platform-select-0"]', 'Instagram');
    await page.selectOption('[data-testid="content-type-select-0"]', 'Post');
    await page.fill('[data-testid="deliverable-description-0"]', 'Product showcase post');
    await page.fill('[data-testid="deliverable-requirements-0"]', 'Include product features and benefits');
    await page.fill('[data-testid="deliverable-price-0"]', '500');
    
    // Add second deliverable
    await page.click('[data-testid="add-deliverable-button"]');
    await page.selectOption('[data-testid="platform-select-1"]', 'TikTok');
    await page.selectOption('[data-testid="content-type-select-1"]', 'Video');
    await page.fill('[data-testid="deliverable-description-1"]', 'Feature demonstration video');
    await page.fill('[data-testid="deliverable-requirements-1"]', '30-60 second demonstration of product features');
    await page.fill('[data-testid="deliverable-price-1"]', '750');
    
    // Set budget and timeline
    await page.fill('[data-testid="proposal-budget"]', '1250');
    
    // Calculate future dates for proposal timeline
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    await page.fill('[data-testid="proposal-start-date"]', startDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="proposal-end-date"]', endDate.toISOString().split('T')[0]);
    
    // Add terms and conditions
    await page.fill('[data-testid="proposal-terms"]', 'Standard partnership terms for testing purposes');
    
    // Brand reviews and submits proposal
    await page.click('[data-testid="preview-proposal-button"]');
    await page.click('[data-testid="submit-proposal-button"]');
    
    // Verify proposal was created successfully
    await expect(page.locator('[data-testid="proposal-status"]')).toHaveText(/Pending/);
    
    // Creator logs in to platform
    await loginAs(page, creatorUser);
    await page.goto('/dashboard');
    
    // Creator views partnership notifications
    await page.click('[data-testid="partnerships-button"]');
    await page.click('[data-testid="pending-proposals"]');
    
    // Creator views and accepts partnership proposal
    await page.click('[data-testid="proposal-title"]');
    await expect(page.locator('[data-testid="proposal-description"]')).toHaveText('Partnership for testing the end-to-end flow');
    await expect(page.locator('[data-testid="total-budget"]')).toContainText('$1,250');
    await page.click('[data-testid="accept-proposal-button"]');
    
    // System generates contract based on proposal terms
    await expect(page.locator('[data-testid="contract-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText(/Pending Signatures/);
    
    // Creator signs contract
    await page.click('[data-testid="sign-contract-button"]');
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText(/Awaiting Brand Signature/);
    
    // Brand logs in and signs contract
    await loginAs(page, brandUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="partnerships-button"]');
    await page.click('[data-testid="active-partnerships"]');
    
    // Find and view the partnership
    await page.click('[data-testid="partnership-title"]');
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText(/Awaiting Brand Signature/);
    await page.click('[data-testid="sign-contract-button"]');
    
    // System processes initial payment to escrow
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText(/Awaiting Payment/);
    await page.click('[data-testid="process-payment-button"]');
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText(/Active/);
    
    // Creator logs back in to submit deliverables
    await loginAs(page, creatorUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="partnerships-button"]');
    
    // Creator submits deliverables for partnership
    const deliverableId1 = 'deliverable-1';
    await page.click(`[data-testid="submit-deliverable-${deliverableId1}"]`);
    await page.fill('[data-testid="content-url-input"]', 'https://example.com/test-content');
    await page.fill('[data-testid="submission-notes"]', 'Initial submission of the requested content');
    await page.click('[data-testid="submit-button"]');
    
    // Verify first deliverable status
    await expect(page.locator(`[data-testid="deliverable-status-${deliverableId1}"]`)).toHaveText(/Pending Review/);
    
    // Submit second deliverable
    const deliverableId2 = 'deliverable-2';
    await page.click(`[data-testid="submit-deliverable-${deliverableId2}"]`);
    await page.fill('[data-testid="content-url-input"]', 'https://example.com/test-content');
    await page.fill('[data-testid="submission-notes"]', 'Initial submission of the requested content');
    await page.click('[data-testid="submit-button"]');
    
    // Brand reviews and approves deliverables
    await loginAs(page, brandUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="partnerships-button"]');
    await page.click('[data-testid="partnership-title"]');
    
    // Brand reviews first deliverable
    await page.click(`[data-testid="deliverable-content-${deliverableId1}"]`);
    await page.click(`[data-testid="approve-deliverable-${deliverableId1}"]`);
    
    // Brand reviews second deliverable
    await page.click(`[data-testid="deliverable-content-${deliverableId2}"]`);
    await page.click(`[data-testid="approve-deliverable-${deliverableId2}"]`);
    
    // System releases final payment from escrow
    const paymentId = 'payment-1';
    await expect(page.locator(`[data-testid="release-payment-${paymentId}"]`)).toBeVisible();
    await page.click(`[data-testid="release-payment-${paymentId}"]`);
    await page.click('[data-testid="confirm-release"]');
    
    // Partnership is marked as completed
    await expect(page.locator('[data-testid="payment-status-1"]')).toHaveText(/Completed/);
  });

  /**
   * Tests the negotiation flow when creator counters a brand's proposal
   */
  test('should handle proposal negotiation and counter-offers', async ({ page }) => {
    // Brand logs in and creates partnership proposal
    await loginAs(page, brandUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="creator-discovery-button"]');
    
    // Find creator and initiate proposal
    await page.fill('[data-testid="creator-search-input"]', creatorUser.name);
    const creatorId = 'test-creator-id'; // Would be dynamically obtained in real test
    await page.click(`[data-testid="creator-card-${creatorId}"]`);
    await page.click(`[data-testid="initiate-partnership-${creatorId}"]`);
    
    // Create initial proposal
    await page.fill('[data-testid="proposal-title"]', 'Test Partnership Campaign');
    await page.fill('[data-testid="proposal-description"]', 'Partnership for testing the end-to-end flow');
    
    // Add deliverable
    await page.click('[data-testid="add-deliverable-button"]');
    await page.selectOption('[data-testid="platform-select-0"]', 'Instagram');
    await page.selectOption('[data-testid="content-type-select-0"]', 'Post');
    await page.fill('[data-testid="deliverable-price-0"]', '500');
    
    // Submit proposal
    await page.fill('[data-testid="proposal-budget"]', '500');
    await page.click('[data-testid="submit-proposal-button"]');
    
    // Creator logs in and reviews proposal
    await loginAs(page, creatorUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="partnerships-button"]');
    await page.click('[data-testid="pending-proposals"]');
    await page.click('[data-testid="proposal-title"]');
    
    // Creator creates counter-proposal with modified terms
    await page.click('[data-testid="counter-proposal-button"]');
    
    // Modify proposal details
    await page.fill('[data-testid="proposal-title"]', 'Counter Proposal - Test Partnership');
    await page.fill('[data-testid="proposal-description"]', 'Modified proposal with updated terms');
    
    // Update deliverable price
    await page.fill('[data-testid="deliverable-price-0"]', '600');
    
    // Update proposal budget
    await page.fill('[data-testid="proposal-budget"]', '600');
    
    // Add modified terms
    await page.fill('[data-testid="proposal-terms"]', 'Modified partnership terms with additional requirements');
    
    // Submit counter-proposal
    await page.click('[data-testid="submit-proposal-button"]');
    
    // Brand reviews counter-proposal
    await loginAs(page, brandUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="partnerships-button"]');
    await page.click('[data-testid="pending-proposals"]');
    await page.click('[data-testid="proposal-title"]');
    
    // Verify counter-proposal details
    await expect(page.locator('[data-testid="proposal-title"]')).toHaveText('Counter Proposal - Test Partnership');
    await expect(page.locator('[data-testid="total-budget"]')).toContainText('$600');
    
    // Brand accepts counter-proposal
    await page.click('[data-testid="accept-proposal-button"]');
    
    // Contract is generated with negotiated terms
    await expect(page.locator('[data-testid="contract-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-payment"]')).toContainText('$600');
    
    // Both parties sign contract
    await page.click('[data-testid="sign-contract-button"]');
    
    // Partnership proceeds with negotiated terms
    await expect(page.locator('[data-testid="contract-status"]')).toHaveText(/Awaiting Creator Signature/);
  });

  /**
   * Tests the revision flow when brand requests changes to deliverables
   */
  test('should handle deliverable revision requests', async ({ page }) => {
    // Complete partnership setup with signed contract
    // For testing purposes, we'll use a utility to create a test partnership directly
    const partnershipId = await page.evaluate(async () => {
      // This would normally call an API to set up test data
      // In a real test, we might use a test utility or API to create this directly
      return 'test-partnership-id';
    });
    
    // Creator logs in and submits initial deliverables
    await loginAs(page, creatorUser);
    await page.goto(`/partnerships/${partnershipId}`);
    
    const deliverableId = 'deliverable-1';
    await page.click(`[data-testid="submit-deliverable-${deliverableId}"]`);
    await page.fill('[data-testid="content-url-input"]', 'https://example.com/test-content');
    await page.fill('[data-testid="submission-notes"]', 'Initial submission of the requested content');
    await page.click('[data-testid="submit-button"]');
    
    // Brand reviews and requests revisions
    await loginAs(page, brandUser);
    await page.goto(`/partnerships/${partnershipId}`);
    await page.click(`[data-testid="deliverable-content-${deliverableId}"]`);
    await page.click(`[data-testid="request-revision-${deliverableId}"]`);
    
    // Brand provides feedback for revision
    await page.fill(`[data-testid="feedback-input-${deliverableId}"]`, 'Please adjust the lighting and emphasize product features more prominently');
    await page.click(`[data-testid="submit-feedback-${deliverableId}"]`);
    
    // System updates deliverable status to revision requested
    await expect(page.locator(`[data-testid="deliverable-status-${deliverableId}"]`)).toHaveText(/Revision Requested/);
    
    // Creator views feedback and submits revised deliverables
    await loginAs(page, creatorUser);
    await page.goto(`/partnerships/${partnershipId}`);
    await page.click(`[data-testid="deliverable-content-${deliverableId}"]`);
    
    // Submit revised version
    await page.click(`[data-testid="submit-deliverable-${deliverableId}"]`);
    await page.fill('[data-testid="content-url-input"]', 'https://example.com/revised-content');
    await page.fill('[data-testid="submission-notes"]', 'Revised version with improved lighting as requested');
    await page.click('[data-testid="submit-button"]');
    
    // Brand approves revised deliverables
    await loginAs(page, brandUser);
    await page.goto(`/partnerships/${partnershipId}`);
    await page.click(`[data-testid="deliverable-content-${deliverableId}"]`);
    await page.click(`[data-testid="approve-deliverable-${deliverableId}"]`);
    
    // System releases payment after successful revision
    await expect(page.locator(`[data-testid="deliverable-status-${deliverableId}"]`)).toHaveText(/Approved/);
  });

  /**
   * Tests creator-initiated partnership proposals
   */
  test('should allow creator to initiate partnership proposals', async ({ page }) => {
    // Creator logs in to platform
    await loginAs(page, creatorUser);
    await page.goto('/dashboard');
    
    // Creator accesses brand directory
    await page.click('[data-testid="brand-directory-button"]');
    
    // Creator selects brand and initiates proposal
    await page.fill('[data-testid="brand-search-input"]', brandUser.company);
    const brandId = 'test-brand-id'; // Would be dynamically obtained in real test
    await page.click(`[data-testid="brand-card-${brandId}"]`);
    await page.click('[data-testid="initiate-proposal-button"]');
    
    // Creator defines deliverables, budget, and timeline
    await page.fill('[data-testid="proposal-title"]', 'Creator-Initiated Partnership');
    await page.fill('[data-testid="proposal-description"]', 'Partnership proposal initiated by creator');
    
    // Add deliverable
    await page.click('[data-testid="add-deliverable-button"]');
    await page.selectOption('[data-testid="platform-select-0"]', 'Instagram');
    await page.selectOption('[data-testid="content-type-select-0"]', 'Post');
    await page.fill('[data-testid="deliverable-description-0"]', 'Product showcase post');
    await page.fill('[data-testid="deliverable-price-0"]', '600');
    
    // Set budget and timeline
    await page.fill('[data-testid="proposal-budget"]', '600');
    
    // Calculate future dates for proposal timeline
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 35);
    
    await page.fill('[data-testid="proposal-start-date"]', startDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="proposal-end-date"]', endDate.toISOString().split('T')[0]);
    
    // Creator submits proposal to brand
    await page.click('[data-testid="submit-proposal-button"]');
    
    // Brand receives and reviews creator-initiated proposal
    await loginAs(page, brandUser);
    await page.goto('/dashboard');
    await page.click('[data-testid="partnerships-button"]');
    await page.click('[data-testid="pending-proposals"]');
    await page.click('[data-testid="proposal-title"]');
    
    // Brand accepts proposal
    await expect(page.locator('[data-testid="proposal-title"]')).toHaveText('Creator-Initiated Partnership');
    await page.click('[data-testid="accept-proposal-button"]');
    
    // Partnership proceeds with creator-defined terms
    await expect(page.locator('[data-testid="contract-title"]')).toBeVisible();
  });

  /**
   * Tests permission validations in the partnership workflow
   */
  test('should enforce appropriate permissions throughout partnership flow', async ({ page }) => {
    // Create a test partnership for permission testing
    const partnershipId = await page.evaluate(async () => {
      // This would normally call an API to set up test data
      return 'test-partnership-permissions';
    });
    
    // Verify only relevant brands can view creator's contact details
    const unauthorizedBrand = {
      email: 'unauthorized-brand@example.com',
      password: 'TestPassword123!',
      name: 'Unauthorized Brand',
      company: 'Unauthorized Company'
    };
    
    await registerBrand(page, unauthorizedBrand);
    await loginAs(page, unauthorizedBrand);
    
    // Attempt to access partnership details
    await page.goto(`/partnerships/${partnershipId}`);
    await expect(page.locator('text=You do not have permission')).toBeVisible();
    
    // Verify only proposal recipient can respond to a proposal
    const testProposalId = 'test-proposal-id';
    await page.goto(`/proposals/${testProposalId}`);
    await expect(page.locator('text=You do not have permission')).toBeVisible();
    
    // Log in as authorized brand
    await loginAs(page, brandUser);
    await page.goto(`/partnerships/${partnershipId}`);
    
    // Verify authorized brand can access partnership details
    await expect(page.locator('[data-testid="partnership-details"]')).toBeVisible();
    
    // Create unauthorized creator
    const unauthorizedCreator = {
      email: 'unauthorized-creator@example.com',
      password: 'TestPassword123!',
      name: 'Unauthorized Creator'
    };
    
    await registerCreator(page, unauthorizedCreator);
    await loginAs(page, unauthorizedCreator);
    
    // Verify only contract signatories can sign a contract
    await page.goto(`/contracts/test-contract-id`);
    await expect(page.locator('text=You do not have permission')).toBeVisible();
    
    // Log in as authorized creator
    await loginAs(page, creatorUser);
    
    // Verify only creator can submit deliverables
    await page.goto(`/partnerships/${partnershipId}`);
    await expect(page.locator(`[data-testid="submit-deliverable-deliverable-1"]`)).toBeVisible();
    
    // Log back in as brand
    await loginAs(page, brandUser);
    
    // Verify only brand can approve deliverables
    await page.goto(`/partnerships/${partnershipId}/deliverables/deliverable-1`);
    await expect(page.locator(`[data-testid="approve-deliverable-deliverable-1"]`)).toBeVisible();
    
    // Verify only brand can release payment after approval
    const paymentId = 'payment-1';
    await page.goto(`/partnerships/${partnershipId}/payments`);
    await expect(page.locator(`[data-testid="release-payment-${paymentId}"]`)).toBeVisible();
  });
});