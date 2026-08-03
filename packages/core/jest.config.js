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
  // Coverage stays enabled for the codebase, but the MCP tool-registration
  // modules under src/tools/ are excluded from collectCoverageFrom (below).
  // Instrumenting those files combines the SDK's tool() generics with zod
  // across dozens of registrations and exhausts the jest worker's memory
  // (OOM/SIGTERM) — the same type-graph explosion that forces the esbuild
  // transpile-only build. They are untested registration glue (0% coverage),
  // so excluding them keeps coverage visible for the rest of the code without
  // the blow-up. (isolatedModules in the transform also keeps transpilation
  // per-file; type safety is enforced separately by `npm run typecheck`.)
  collectCoverage: true,
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
    '!src/**/index.ts',
    // Exclude the MCP tool-registration modules: instrumenting them OOM-kills
    // the jest worker (SDK tool() x zod type-graph explosion). They are
    // untested registration glue, so this keeps coverage bounded and stable.
    '!src/tools/**'
  ],
  // Belt-and-suspenders: also skip instrumenting the tool modules if any test
  // imports them directly, so coverage collection never touches those files.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/tools/'
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
