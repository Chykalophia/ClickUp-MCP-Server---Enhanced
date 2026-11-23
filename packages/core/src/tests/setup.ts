import { jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';

// Node 18 has no global Web Crypto, so pkce-challenge falls back to a dynamic
// import, which Jest's VM rejects without --experimental-vm-modules. Plain Node 18 is fine.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.CLICKUP_API_TOKEN = 'pk_test_token_1234567890abcdef';

  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'error').mockImplementation(() => {
    /* mocked */
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {
    /* mocked */
  });
  jest.spyOn(console, 'debug').mockImplementation(() => {
    /* mocked */
  });

  jest.setTimeout(30000);
});

afterAll(() => {
  jest.restoreAllMocks();

  delete process.env.CLICKUP_API_TOKEN;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});
