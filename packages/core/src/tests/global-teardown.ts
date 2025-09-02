/* eslint-disable no-console */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  // Clean up environment variables
  delete process.env.CLICKUP_API_TOKEN;

  // Clean up rate limiter interval
  try {
    const { rateLimiter } = await import('../utils/security.js');
    rateLimiter.destroy();
  } catch (error) {
    // Ignore if module not loaded
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Global test environment cleanup complete');
}
