/**
 * Jest teardown module that executes after all tests have completed.
 * It cleans up the test environment, resets mocks, clears storage,
 * and performs any necessary cleanup to ensure test isolation.
 */

import { cleanup } from '@testing-library/react'; // v14.0.0

/**
 * Cleans up the test environment by resetting mocks and clearing storage
 */
function cleanupTestEnvironment(): void {
  // Clean up React Testing Library's environment
  cleanup();

  // Reset all Jest mocks
  jest.resetAllMocks();
  
  // Restore original implementations
  jest.restoreAllMocks();
  
  // Clear localStorage and sessionStorage if in browser environment
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
    
    // Clear any cookies that might have been set during tests
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      }
    }
  }
  
  // Reset any modified environment variables
  // This is particularly important if tests modified process.env values
  process.env = { ...process.env };
  
  // Log completion of test teardown
  console.log('Test environment teardown completed');
}

// Execute cleanup
cleanupTestEnvironment();

// This file is referenced in Jest configuration as a global teardown file
// that runs after all tests have completed to ensure clean state between test runs