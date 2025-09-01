/**
 * Jest Test Setup
 * 
 * Global test configuration and utilities for Phase 2.1 Unit Testing Suite
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    }
    return {
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass: false
    };
  }
});

// Mock Date for consistent testing
const mockDate = new Date('2025-09-01T19:20:43.638Z');
const OriginalDate = Date;

// @ts-ignore
global.Date = class extends OriginalDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(mockDate.getTime());
    } else {
      super(...(args as [string | number | Date]));
    }
  }
  
  static now() {
    return mockDate.getTime();
  }
};
