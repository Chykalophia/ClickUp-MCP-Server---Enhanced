/* eslint-disable no-console */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  // Clean up environment variables
  delete process.env.CLICKUP_API_TOKEN;

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Global test environment cleanup complete');
}
