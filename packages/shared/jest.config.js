/**
 * Jest configuration for @chykalophia/clickup-mcp-shared.
 *
 * Mirrors the ts-jest ESM setup of the core and intelligence packages. Without
 * it jest falls back to babel-jest, which cannot parse the TypeScript tests.
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

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      // Transpile-only: keep jest independent of the whole-program type graph;
      // type safety is enforced by the package's separate `tsc` build.
      diagnostics: false
    }]
  },

  // Module resolution: strip the .js extension ESM imports use so ts-jest can
  // resolve the .ts sources.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,

  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ]
};
