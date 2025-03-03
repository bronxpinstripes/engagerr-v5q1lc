// Import jest-dom to extend Jest with custom DOM matchers
import '@testing-library/jest-dom'; // v6.0.0

// Extend the default timeout for all tests to 30 seconds
// This helps prevent timeout issues with complex component tests
jest.setTimeout(30000);

// Mock window.matchMedia which is not implemented in JSDOM
// This prevents errors when components use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver which is not implemented in JSDOM
// This prevents errors when components use ResizeObserver (common in charts and visualizations)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Set up API URL for tests
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';

/**
 * Utility to suppress specific expected console errors during testing
 * Useful for filtering out known warnings that would clutter test output
 */
export function suppressConsoleErrors(): void {
  // Store original console.error
  const originalConsoleError = console.error;
  
  // Mock console.error to filter out expected warning messages
  beforeAll(() => {
    console.error = jest.fn((...args: any[]) => {
      // Filter out expected warning messages
      const errorMessage = args[0]?.toString() || '';
      
      const ignoredMessages = [
        // Add specific error messages to ignore
        'Warning: ReactDOM.render is no longer supported',
        'Warning: React.createFactory() is deprecated',
        'Warning: Using UNSAFE_componentWillMount in strict mode',
        'Warning: Using UNSAFE_componentWillReceiveProps in strict mode',
        'Warning: Using UNSAFE_componentWillUpdate in strict mode',
        'Warning: findDOMNode is deprecated in StrictMode',
        // Add more messages as needed for third-party libraries
      ];
      
      // Only log errors that are not in the ignored list
      if (!ignoredMessages.some(message => errorMessage.includes(message))) {
        originalConsoleError(...args);
      }
    });
  });
  
  // Restore original console.error after tests
  afterAll(() => {
    console.error = originalConsoleError;
  });
}