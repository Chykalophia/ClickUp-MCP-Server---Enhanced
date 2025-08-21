export default async function globalSetup() {
  console.log('🧪 Setting up global test environment...');
  
  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CLICKUP_API_TOKEN = 'pk_test_token_1234567890abcdef';
  
  // Create test directories if needed
  const fs = require('fs');
  const path = require('path');
  
  const testDirs = [
    'test-results',
    'coverage',
    '.jest-cache'
  ];
  
  testDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  console.log('✅ Global test environment setup complete');
}
