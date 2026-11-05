import { computeRateLimitWaitMs } from '../clickup-client/index.js';

describe('computeRateLimitWaitMs', () => {
  const now = 1_800_000_000_000;

  it('waits until ClickUp X-RateLimit-Reset when Retry-After is absent', () => {
    expect(computeRateLimitWaitMs({ 'x-ratelimit-reset': String(now / 1000 + 42) }, now)).toBe(42_000);
  });

  it('caps an X-RateLimit-Reset wait at one minute when clocks disagree', () => {
    expect(computeRateLimitWaitMs({ 'x-ratelimit-reset': String(now / 1000 + 600) }, now)).toBe(60_000);
  });

  it('prefers Retry-After seconds', () => {
    expect(computeRateLimitWaitMs({ 'retry-after': '5', 'x-ratelimit-reset': String(now / 1000 + 42) }, now)).toBe(5_000);
  });

  it('accepts a Retry-After HTTP date', () => {
    expect(computeRateLimitWaitMs({ 'retry-after': new Date(now + 7_000).toUTCString() }, now)).toBe(7_000);
  });

  it('never waits less than a second and defaults to one second', () => {
    expect(computeRateLimitWaitMs({ 'x-ratelimit-reset': String(now / 1000 - 10) }, now)).toBe(1_000);
    expect(computeRateLimitWaitMs({}, now)).toBe(1_000);
    expect(computeRateLimitWaitMs(undefined, now)).toBe(1_000);
  });
});
