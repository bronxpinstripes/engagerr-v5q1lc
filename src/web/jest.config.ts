import type { Config } from 'jest'; // jest version ^29.5.0

const config: Config = {
  // Use jsdom environment for testing React components that simulate browser DOM
  testEnvironment: 'jsdom',
  
  // Setup files to run after the test environment is set up
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Transform files with appropriate transformers
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module name mappers for path aliases and non-JS assets
  moduleNameMapper: {
    // Path aliases that match tsconfig paths
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/api/(.*)$': '<rootDir>/api/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    
    // Handle non-JS assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.ts',
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!tests/**/*',
    '!**/__tests__/**/*',
    '!**/__mocks__/**/*',
    '!pages/_app.tsx',
    '!pages/_document.tsx',
    '!**/node_modules/**',
    '!coverage/**',
    '!jest.config.ts',
    '!jest.setup.ts',
    '!next.config.js',
  ],
  
  // Coverage thresholds with higher requirements for core business logic
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // Core business logic requires higher coverage
    'lib/analytics/**/*.{ts,tsx}': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    'lib/content-mapping/**/*.{ts,tsx}': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    'lib/discovery/**/*.{ts,tsx}': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    'lib/partnerships/**/*.{ts,tsx}': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  
  // Configure reporters for test results in CI
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '../../coverage/junit',
      outputName: 'junit.xml',
    }],
  ],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  
  // Time in milliseconds for which test is allowed to run before terminating
  testTimeout: 10000,
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
};

export default config;