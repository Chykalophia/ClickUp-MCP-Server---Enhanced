/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      // Transpile-only: type-checking the MCP tool files trips a TypeScript
      // instantiation-depth limit in the SDK+zod generics (same pre-existing
      // issue as the full tsc build). Types are enforced separately via tsc
      // over the client/schema/util layers.
      diagnostics: false,
      // isolatedModules (set in tsconfig below; ts-jest deprecated its own
      // top-level option) transpiles per file like esbuild. Without it, the
      // tool-setup suites build the SDK tool() x zod type graph and OOM the
      // 4 GB jest worker.
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
  
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
  ],
  
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 3,
      lines: 5,
      statements: 5
    }
  },
  
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
  // Also skip instrumenting src/tools/ when a test imports it directly.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/tools/'
  ],
  
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.ts'
  ],
  
  testTimeout: 30000,
  
  verbose: true,
  
  clearMocks: true,
  
  restoreMocks: true,
  
  errorOnDeprecated: true,
  
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],
  
  globalSetup: '<rootDir>/src/tests/global-setup.ts',
  globalTeardown: '<rootDir>/src/tests/global-teardown.ts',
  
  testResultsProcessor: '<rootDir>/src/tests/results-processor.cjs',
  
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],
  
  transformIgnorePatterns: [
    'node_modules/(?!(marked|turndown|@modelcontextprotocol)/)'
  ],
  
  maxWorkers: '50%',
  
  cacheDirectory: '<rootDir>/.jest-cache',
  
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
