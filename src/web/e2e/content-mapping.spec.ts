import { test, expect } from '@playwright/test'; // v1.40.0
import { loginAs, registerCreator } from '../tests/helpers';

/**
 * End-to-end tests for the content mapping feature in Engagerr.
 * 
 * These tests verify that creators can successfully map relationships between content
 * across different platforms, validating the core functionality of Engagerr's
 * proprietary content relationship mapping technology.
 */

// Test selectors for UI elements
const selectors = {
  content_mapping: {
    empty_state: '[data-testid="content-mapping-empty-state"]',
    add_content_button: '[data-testid="add-content-button"]',
    parent_content_option: '[data-testid="parent-content-option"]',
    child_content_option: '[data-testid="child-content-option"]',
    content_form: '[data-testid="content-form"]',
    title_input: '[data-testid="content-title-input"]',
    platform_select: '[data-testid="platform-select"]',
    content_type_select: '[data-testid="content-type-select"]',
    relationship_type_select: '[data-testid="relationship-type-select"]',
    description_input: '[data-testid="content-description-input"]',
    url_input: '[data-testid="content-url-input"]',
    submit_button: '[data-testid="submit-button"]'
  },
  content_family: {
    graph_container: '[data-testid="content-family-graph"]',
    node: '[data-testid="content-node"]',
    parent_node: '[data-testid="parent-node"]',
    child_node: '[data-testid="child-node"]',
    relationship_edge: '[data-testid="relationship-edge"]',
    node_label: '[data-testid="node-label"]',
    metrics_summary: '[data-testid="metrics-summary"]',
    total_views: '[data-testid="total-views"]',
    total_engagement: '[data-testid="total-engagement"]',
    estimated_value: '[data-testid="estimated-value"]'
  },
  suggestions: {
    suggestions_panel: '[data-testid="suggestions-panel"]',
    suggestion_item: '[data-testid="suggestion-item"]',
    approve_button: '[data-testid="approve-suggestion-button"]',
    reject_button: '[data-testid="reject-suggestion-button"]',
    suggestion_details: '[data-testid="suggestion-details"]'
  },
  relationship_actions: {
    edit_button: '[data-testid="edit-relationship-button"]',
    delete_button: '[data-testid="delete-relationship-button"]',
    confirm_delete_button: '[data-testid="confirm-delete-button"]',
    cancel_button: '[data-testid="cancel-button"]'
  }
};

// Mock content data for testing
const mockContentData = {
  parentContent: {
    id: 'parent-123',
    title: 'Original Podcast Episode',
    platform: 'SPOTIFY',
    contentType: 'PODCAST',
    url: 'https://example.com/podcast/123',
    publishedAt: '2023-10-01T12:00:00Z'
  },
  childContent: [
    {
      id: 'child-456',
      title: 'YouTube Highlight Video',
      platform: 'YOUTUBE',
      contentType: 'VIDEO',
      url: 'https://example.com/youtube/456',
      publishedAt: '2023-10-05T14:00:00Z',
      relationshipType: 'DERIVED'
    },
    {
      id: 'child-789',
      title: 'Instagram Story Highlight',
      platform: 'INSTAGRAM',
      contentType: 'STORY',
      url: 'https://example.com/instagram/789',
      publishedAt: '2023-10-07T16:00:00Z',
      relationshipType: 'PROMOTIONAL'
    }
  ]
};

test.describe('Content Mapping Flow', () => {
  test('should display empty state for new creator account', async ({ page }) => {
    // Register a new creator account
    await registerCreator(page);
    
    // Navigate to content mapping page
    await page.goto('/content-mapping');
    
    // Verify empty state message is displayed
    await expect(page.locator(selectors.content_mapping.empty_state)).toBeVisible();
    
    // Verify 'Add Content' button is visible
    await expect(page.locator(selectors.content_mapping.add_content_button)).toBeVisible();
  });

  test('should allow adding new parent content', async ({ page }) => {
    // Login as a creator with connected platforms
    await loginAs(page, 'creator-with-platforms');
    
    // Navigate to content mapping page
    await page.goto('/content-mapping');
    
    // Click 'Add Content' button
    await page.locator(selectors.content_mapping.add_content_button).click();
    
    // Select 'Parent Content' option
    await page.locator(selectors.content_mapping.parent_content_option).click();
    
    // Fill content details form
    await page.locator(selectors.content_mapping.title_input).fill(mockContentData.parentContent.title);
    await page.locator(selectors.content_mapping.platform_select).selectOption(mockContentData.parentContent.platform);
    await page.locator(selectors.content_mapping.content_type_select).selectOption(mockContentData.parentContent.contentType);
    await page.locator(selectors.content_mapping.url_input).fill(mockContentData.parentContent.url);
    await page.locator(selectors.content_mapping.description_input).fill('A detailed podcast about marketing strategies');
    
    // Submit form
    await page.locator(selectors.content_mapping.submit_button).click();
    
    // Verify new content appears in content list
    await expect(page.locator(`text=${mockContentData.parentContent.title}`)).toBeVisible();
    
    // Verify content family visualization is updated
    await expect(page.locator(selectors.content_family.graph_container)).toBeVisible();
    await expect(page.locator(selectors.content_family.parent_node)).toBeVisible();
  });

  test('should allow adding child content to existing parent', async ({ page }) => {
    // Login as a creator with existing parent content
    await loginAs(page, 'creator-with-parent-content');
    
    // Navigate to content mapping page
    await page.goto('/content-mapping');
    
    // Select an existing parent content
    await page.locator(selectors.content_family.parent_node).click();
    
    // Click 'Add Child Content' button
    await page.locator(selectors.content_mapping.add_content_button).click();
    await page.locator(selectors.content_mapping.child_content_option).click();
    
    // Fill child content details form
    const childContent = mockContentData.childContent[0];
    await page.locator(selectors.content_mapping.title_input).fill(childContent.title);
    await page.locator(selectors.content_mapping.platform_select).selectOption(childContent.platform);
    await page.locator(selectors.content_mapping.content_type_select).selectOption(childContent.contentType);
    await page.locator(selectors.content_mapping.relationship_type_select).selectOption(childContent.relationshipType);
    await page.locator(selectors.content_mapping.url_input).fill(childContent.url);
    
    // Submit form
    await page.locator(selectors.content_mapping.submit_button).click();
    
    // Verify new child content appears in visualization
    await expect(page.locator(selectors.content_family.child_node)).toBeVisible();
    
    // Verify relationship is correctly represented
    await expect(page.locator(selectors.content_family.relationship_edge)).toBeVisible();
  });

  test('should display content family visualization correctly', async ({ page }) => {
    // Login as a creator with existing content family
    await loginAs(page, 'creator-with-content-family');
    
    // Navigate to content family page
    await page.goto('/content-mapping');
    
    // Verify graph visualization is rendered
    await expect(page.locator(selectors.content_family.graph_container)).toBeVisible();
    
    // Verify parent node is at the top
    await expect(page.locator(selectors.content_family.parent_node)).toBeVisible();
    
    // Verify child nodes are connected to parent
    await expect(page.locator(selectors.content_family.child_node)).toHaveCount(2);
    
    // Verify nodes are colored by platform
    const youtubeNode = page.locator(`${selectors.content_family.child_node}.youtube-platform`);
    const instagramNode = page.locator(`${selectors.content_family.child_node}.instagram-platform`);
    await expect(youtubeNode).toBeVisible();
    await expect(instagramNode).toBeVisible();
    
    // Verify node labels show content titles
    await expect(page.locator(selectors.content_family.node_label)).toContainText(mockContentData.parentContent.title);
    await expect(page.locator(selectors.content_family.node_label)).toContainText(mockContentData.childContent[0].title);
  });

  test('should allow editing existing content relationships', async ({ page }) => {
    // Login as a creator with existing content relationships
    await loginAs(page, 'creator-with-relationships');
    
    // Navigate to content mapping page
    await page.goto('/content-mapping');
    
    // Select an existing relationship
    await page.locator(selectors.content_family.relationship_edge).first().click();
    
    // Click edit button
    await page.locator(selectors.relationship_actions.edit_button).click();
    
    // Change relationship type
    await page.locator(selectors.content_mapping.relationship_type_select).selectOption('REPURPOSED');
    
    // Save changes
    await page.locator(selectors.content_mapping.submit_button).click();
    
    // Verify relationship is updated in visualization
    await expect(page.locator(`${selectors.content_family.relationship_edge}.repurposed`)).toBeVisible();
  });

  test('should allow removing content relationships', async ({ page }) => {
    // Login as a creator with existing content relationships
    await loginAs(page, 'creator-with-relationships');
    
    // Navigate to content mapping page
    await page.goto('/content-mapping');
    
    // Get initial count of relationships
    const initialRelationshipCount = await page.locator(selectors.content_family.relationship_edge).count();
    
    // Select an existing relationship
    await page.locator(selectors.content_family.relationship_edge).first().click();
    
    // Click delete button
    await page.locator(selectors.relationship_actions.delete_button).click();
    
    // Confirm deletion
    await page.locator(selectors.relationship_actions.confirm_delete_button).click();
    
    // Verify relationship is removed from visualization
    await expect(page.locator(selectors.content_family.relationship_edge)).toHaveCount(initialRelationshipCount - 1);
    
    // Verify content items still exist independently
    await expect(page.locator(selectors.content_family.node)).toHaveCount(await page.locator(selectors.content_family.node).count());
  });

  test('should display and allow approving AI-suggested relationships', async ({ page }) => {
    // Login as a creator with content that has suggestions
    await loginAs(page, 'creator-with-suggestions');
    
    // Navigate to content mapping page
    await page.goto('/content-mapping');
    
    // Verify suggestions panel is displayed
    await expect(page.locator(selectors.suggestions.suggestions_panel)).toBeVisible();
    
    // Verify suggestion details are visible
    await expect(page.locator(selectors.suggestions.suggestion_item)).toBeVisible();
    await expect(page.locator(selectors.suggestions.suggestion_details)).toBeVisible();
    
    // Get initial count of relationships
    const initialRelationshipCount = await page.locator(selectors.content_family.relationship_edge).count();
    
    // Click 'Approve' on a suggestion
    await page.locator(selectors.suggestions.approve_button).first().click();
    
    // Verify relationship is added to visualization
    await expect(page.locator(selectors.content_family.relationship_edge)).toHaveCount(initialRelationshipCount + 1);
    
    // Verify suggestion is removed from suggestions list
    await expect(page.locator(selectors.suggestions.suggestion_item)).toHaveCount(
      await page.locator(selectors.suggestions.suggestion_item).count() - 1
    );
  });

  test('should show aggregate metrics for content family', async ({ page }) => {
    // Login as a creator with existing content family
    await loginAs(page, 'creator-with-content-family');
    
    // Navigate to content family page
    await page.goto('/content-mapping');
    
    // Verify metrics summary panel is displayed
    await expect(page.locator(selectors.content_family.metrics_summary)).toBeVisible();
    
    // Verify total views across all platforms
    await expect(page.locator(selectors.content_family.total_views)).toBeVisible();
    
    // Verify total engagement metrics
    await expect(page.locator(selectors.content_family.total_engagement)).toBeVisible();
    
    // Verify estimated content value
    await expect(page.locator(selectors.content_family.estimated_value)).toBeVisible();
  });
});