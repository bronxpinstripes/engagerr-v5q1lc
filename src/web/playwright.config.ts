import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration for Playwright E2E tests for Engagerr
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directory where tests are located
  testDir: './e2e',
  
  // Maximum time one test can run for
  timeout: 30000,
  
  // Retry failed tests to handle flakiness
  // 0 in local dev, 1 in CI for non-visual tests, 2 for visual tests
  retries: process.env.CI ? 1 : 0,
  
  // Limit the number of workers to avoid overwhelming test environments
  // Default is 50% of CPU cores
  workers: process.env.CI ? '2' : '50%',
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/test-results.json' }],
  ],
  
  // Global setup for all tests
  globalSetup: './e2e/global-setup',
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in navigation
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Capture trace in 'retries' mode
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video when retrying failed tests
    video: 'on-first-retry',
    
    // Enable API request/response logging
    contextOptions: {
      logger: {
        isEnabled: (name) => name === 'api',
        log: (name, severity, message) => console.log(`${name} ${severity}: ${message}`),
      },
    },
    
    // Browser storage state for authenticated tests
    storageState: {
      cookies: [],
      origins: []
    },
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Viewport size typical for desktop users
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Viewport size typical for desktop users
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Viewport size typical for desktop users
        viewport: { width: 1280, height: 720 },
      },
    },
    
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },
    
    // Test users with different roles
    {
      name: 'creator-user',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './e2e/fixtures/storage-states/creator-user.json',
      },
    },
    {
      name: 'brand-user',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './e2e/fixtures/storage-states/brand-user.json',
      },
    },
    
    // Visual testing project with stricter settings
    {
      name: 'visual-testing',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        screenshot: 'on',
        video: 'on',
        trace: 'on',
      },
    },
  ],

  // Use webServer to set up a testing web server
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  // Folder for test artifacts such as screenshots, videos, etc.
  outputDir: 'test-results/',
  
  // Opt out of parallel tests on CI
  fullyParallel: !process.env.CI,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
});