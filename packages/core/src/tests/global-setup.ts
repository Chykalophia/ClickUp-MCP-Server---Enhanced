/* eslint-disable no-console */
export default async function globalSetup() {
  console.log('🧪 Setting up global test environment...');

  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CLICKUP_API_TOKEN = 'pk_test_token_1234567890abcdef';

  // Create test directories if needed
  const fs = require('fs');
  const path = require('path');

  const testDirs = ['test-results', 'coverage', '.jest-cache'];

  testDirs.forEach(dir => {
    // Validate directory path to prevent traversal
    if (dir.includes('..') || dir.includes('~') || path.isAbsolute(dir)) {
      throw new Error(`Invalid directory path: ${dir}`);
    }

    const dirPath = path.join(process.cwd(), dir);
    const resolvedPath = path.resolve(dirPath);
    const basePath = path.resolve(process.cwd());

    // Ensure the resolved path is within the project directory
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error(`Directory path outside project: ${dir}`);
    }

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  console.log('✅ Global test environment setup complete');
}
