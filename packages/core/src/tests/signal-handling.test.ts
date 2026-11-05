import { describe, it, expect, jest } from '@jest/globals';

// Issue #62: a SIGTERM listener replaces Node's default exit, so the rate
// limiter must not add one, and its cleanup timer must not keep the process alive.
describe('RateLimiter outside tests', () => {
  it('adds no signal listeners and unrefs its cleanup timer', async () => {
    const previousEnv = process.env.NODE_ENV;
    const sigterm = process.listenerCount('SIGTERM');
    const sigint = process.listenerCount('SIGINT');
    process.env.NODE_ENV = 'production';
    try {
      await jest.isolateModulesAsync(async () => {
        const { rateLimiter } = await import('../utils/security.js');
        const timer = (rateLimiter as any).cleanupInterval as ReturnType<typeof setInterval>;
        expect(timer).toBeDefined();
        expect(timer.hasRef()).toBe(false);
        rateLimiter.destroy();
      });
    } finally {
      process.env.NODE_ENV = previousEnv;
    }
    expect(process.listenerCount('SIGTERM')).toBe(sigterm);
    expect(process.listenerCount('SIGINT')).toBe(sigint);
  });
});
