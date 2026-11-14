/**
 * Jest Configuration for ClickUp Intelligence MCP Server
 * 
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  
  // Force exit to prevent hanging
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1,
  
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts'
  ],

  // QUARANTINED: stale suite for an outdated service contract (never ran in CI).
  // TODO: rewrite against the current ResourceOptimizationService shape, then drop this entry.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/services/resource-optimization-service.test.ts'
  ],
  
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  
  // Thresholds are deliberately low for now; raise them as coverage grows.
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 25,
      statements: 25
    }
  },
  
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      // Transpile-only: the SDK's zod generics exceed TypeScript's instantiation-depth
      // limit (as in the core jest config); `tsc --build` type-checks.
      diagnostics: false
    }]
  },
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // version.ts reads package.json through import.meta, which the CommonJS test
    // runtime cannot load; tests get a fixed version instead.
    '^(\\.{1,2}/)+version(\\.js)?$': '<rootDir>/src/__tests__/version-stub.ts',
    // Map relative `.js` imports to the `.ts` sources: emitted ESM needs the extension,
    // but the files on disk are .ts. Mirrors the core package's jest config.
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  testTimeout: 5000,
  
  verbose: false,
  
  clearMocks: true,
  
  restoreMocks: true
};
