import { jest } from '@jest/globals';

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
