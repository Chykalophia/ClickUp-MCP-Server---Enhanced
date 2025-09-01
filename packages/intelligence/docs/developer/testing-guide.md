# Testing Guide

Comprehensive testing strategies and best practices for ClickUp Intelligence tools.

## 🧪 Testing Strategy

### Test Pyramid
```
    /\
   /  \    E2E Tests (Few)
  /____\   
 /      \   Integration Tests (Some)
/__________\ Unit Tests (Many)
```

### Test Types
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Service interactions and API calls
- **End-to-End Tests**: Complete workflows
- **Performance Tests**: Load and stress testing

## 📋 Unit Testing

### Tool Testing Pattern
```typescript
// src/__tests__/tools/project-health-analyzer.test.ts
import { analyzeProjectHealth } from '../../tools/project-health-analyzer';

describe('ProjectHealthAnalyzer', () => {
  it('should analyze project health correctly', async () => {
    const mockParams = {
      workspaceId: 'test-workspace',
      analysisDepth: 'standard' as const
    };
    
    const result = await analyzeProjectHealth(mockParams);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Health Score');
    expect(result.isError).toBeFalsy();
  });
  
  it('should handle validation errors', async () => {
    const invalidParams = { workspaceId: '' };
    
    const result = await analyzeProjectHealth(invalidParams as any);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });
});
```

### Service Testing Pattern
```typescript
// src/__tests__/services/health-metrics-service.test.ts
import { HealthMetricsService } from '../../services/health-metrics-service';

describe('HealthMetricsService', () => {
  let service: HealthMetricsService;
  
  beforeEach(() => {
    service = new HealthMetricsService();
  });
  
  it('should calculate health score correctly', async () => {
    const mockData = {
      tasks: [
        { status: 'completed', dueDate: '2024-09-01' },
        { status: 'in_progress', dueDate: '2024-09-02' }
      ]
    };
    
    const result = await service.calculateHealthScore(mockData);
    
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.grade).toMatch(/[A-F]/);
  });
});
```

## 🔗 Integration Testing

### API Integration Tests
```typescript
// src/__tests__/integration/clickup-api.test.ts
describe('ClickUp API Integration', () => {
  beforeAll(() => {
    if (!process.env.CLICKUP_API_TOKEN) {
      throw new Error('CLICKUP_API_TOKEN required for integration tests');
    }
  });
  
  it('should fetch workspace data', async () => {
    const workspaceId = process.env.TEST_WORKSPACE_ID!;
    
    const result = await analyzeProjectHealth({
      workspaceId,
      analysisDepth: 'quick'
    });
    
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Health Score');
  });
});
```

### Service Integration Tests
```typescript
describe('Service Integration', () => {
  it('should integrate health and velocity services', async () => {
    const healthService = new HealthMetricsService();
    const velocityService = new VelocityAnalysisService();
    
    const mockData = createMockWorkspaceData();
    
    const [health, velocity] = await Promise.all([
      healthService.analyze(mockData),
      velocityService.analyze(mockData)
    ]);
    
    expect(health.score).toBeDefined();
    expect(velocity.predictedVelocity).toBeDefined();
  });
});
```

## 🎯 End-to-End Testing

### Complete Workflow Tests
```typescript
// src/__tests__/e2e/complete-analysis.test.ts
describe('Complete Analysis Workflow', () => {
  it('should perform comprehensive project analysis', async () => {
    // 1. Health Analysis
    const healthResult = await analyzeProjectHealth({
      workspaceId: 'test-workspace',
      analysisDepth: 'comprehensive'
    });
    
    expect(healthResult.isError).toBeFalsy();
    
    // 2. Sprint Planning
    const sprintResult = await planSmartSprint({
      workspaceId: 'test-workspace',
      teamId: 'test-team',
      sprintGoal: 'Test sprint'
    });
    
    expect(sprintResult.isError).toBeFalsy();
    
    // 3. Verify integration
    expect(healthResult.content[0].text).toContain('Health Score');
    expect(sprintResult.content[0].text).toContain('Sprint Plan');
  });
});
```

## ⚡ Performance Testing

### Load Testing
```typescript
// src/__tests__/performance/load.test.ts
describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      analyzeProjectHealth({
        workspaceId: 'test-workspace',
        analysisDepth: 'quick'
      })
    );
    
    const startTime = Date.now();
    const results = await Promise.all(requests);
    const endTime = Date.now();
    
    // All requests should succeed
    results.forEach(result => {
      expect(result.isError).toBeFalsy();
    });
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
  });
  
  it('should meet response time requirements', async () => {
    const startTime = Date.now();
    
    const result = await analyzeProjectHealth({
      workspaceId: 'test-workspace',
      analysisDepth: 'standard'
    });
    
    const responseTime = Date.now() - startTime;
    
    expect(result.isError).toBeFalsy();
    expect(responseTime).toBeLessThan(2000); // < 2 seconds
  });
});
```

## 🛠️ Test Utilities

### Mock Data Factory
```typescript
// src/__tests__/utils/mock-data-factory.ts
export class MockDataFactory {
  static createWorkspaceData(overrides?: Partial<WorkspaceData>): WorkspaceData {
    return {
      id: 'test-workspace',
      name: 'Test Workspace',
      tasks: this.createMockTasks(),
      teams: this.createMockTeams(),
      ...overrides
    };
  }
  
  static createMockTasks(count = 10): Task[] {
    return Array(count).fill(null).map((_, i) => ({
      id: `task-${i}`,
      name: `Test Task ${i}`,
      status: i % 2 === 0 ? 'completed' : 'in_progress',
      assignee: `user-${i % 3}`,
      dueDate: new Date(Date.now() + i * 86400000).toISOString()
    }));
  }
}
```

### Test Helpers
```typescript
// src/__tests__/utils/test-helpers.ts
export class TestHelpers {
  static async waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!condition()) {
      throw new Error('Condition not met within timeout');
    }
  }
  
  static expectMarkdownContent(text: string): void {
    expect(text).toMatch(/^#/m); // Has headers
    expect(text).toMatch(/\*\*/); // Has bold text
    expect(text).toMatch(/^-/m);  // Has lists
  }
}
```

## 📊 Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

### Test Setup
```typescript
// src/__tests__/setup.ts
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};
```

## 🎯 Testing Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
it('should calculate health score correctly', async () => {
  // Arrange
  const mockData = MockDataFactory.createWorkspaceData();
  const service = new HealthMetricsService();
  
  // Act
  const result = await service.calculateHealthScore(mockData);
  
  // Assert
  expect(result.score).toBeGreaterThan(0);
  expect(result.grade).toMatch(/[A-F]/);
});
```

### 2. Descriptive Test Names
```typescript
// ❌ Bad
it('should work', () => {});

// ✅ Good
it('should return health score between 0-100 for valid workspace data', () => {});
```

### 3. Test Independence
```typescript
describe('HealthMetricsService', () => {
  let service: HealthMetricsService;
  
  beforeEach(() => {
    // Fresh instance for each test
    service = new HealthMetricsService();
  });
  
  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
});
```

### 4. Error Testing
```typescript
it('should handle API errors gracefully', async () => {
  // Mock API failure
  jest.spyOn(clickupClient, 'getWorkspace')
    .mockRejectedValue(new Error('API Error'));
  
  const result = await analyzeProjectHealth({ workspaceId: 'test' });
  
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Error');
});
```

## 🚀 Running Tests

### Test Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- health-metrics-service.test.ts

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm test -- --testPathPattern=integration

# Run performance tests
npm test -- --testPathPattern=performance
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage
```

This testing guide ensures comprehensive coverage and quality assurance for all intelligence tools.
