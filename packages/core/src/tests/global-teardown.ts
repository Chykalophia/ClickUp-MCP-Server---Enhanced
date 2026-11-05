/* eslint-disable no-console */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  delete process.env.CLICKUP_API_TOKEN;

  try {
    const { rateLimiter } = await import('../utils/security.js');
    rateLimiter.destroy();
  } catch {
    // Ignore if module not loaded
  }

  if (global.gc) {
    global.gc();
  }

  console.log('✅ Global test environment cleanup complete');
}
