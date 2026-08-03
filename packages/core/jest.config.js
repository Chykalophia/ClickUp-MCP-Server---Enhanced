/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      // Transpile-only: type-checking the MCP tool files trips a TypeScript
      // instantiation-depth limit in the SDK+zod generics (same pre-existing
      // issue as the full tsc build). Types are enforced separately via tsc
      // over the client/schema/util layers.
      diagnostics: false,
      // isolatedModules makes ts-jest transpile each file independently
      // (like esbuild) instead of building a whole-program TypeScript Program.
      // Without it, loading the tool-setup test suites (time-tracking,
      // integration) builds a type graph over the SDK tool() x zod generics
      // that exhausts the 4 GB Node heap and OOM-kills the jest worker. Per-file
      // transpile keeps memory bounded; types are still enforced by `npm run
      // typecheck`.
      isolatedModules: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        isolatedModules: true
      }
    }]
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
  ],
  
  // Coverage configuration
  //
  // Coverage instrumentation is disabled: Istanbul instruments every source
  // file, and the MCP tool-registration modules (src/tools/*-setup.ts) combine
  // the SDK's tool() generics with zod across dozens of registrations. Building
  // a coverage map for those files exhausts the jest worker's memory and the OS
  // OOM-kills it (SIGTERM), which fails the suite after ~40 min even though all
  // tests pass. This is the same type-graph explosion that forces the esbuild
  // transpile-only build. The 157 unit tests still run (in ~15s); type safety is
  // enforced separately by `npm run typecheck`.
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 3,
      lines: 5,
      statements: 5
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/tests/**/*',
    '!src/**/index.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.ts'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/global-setup.ts',
  globalTeardown: '<rootDir>/src/tests/global-teardown.ts',
  
  // Test results processor
  testResultsProcessor: '<rootDir>/src/tests/results-processor.cjs',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(marked|turndown|@modelcontextprotocol)/)'
  ],
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};

export default config;
