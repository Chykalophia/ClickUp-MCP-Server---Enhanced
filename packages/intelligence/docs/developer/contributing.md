# Contributing Guide

Welcome to the ClickUp Intelligence MCP Server project! This guide will help you contribute effectively.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git
- ClickUp API token (for testing)

### Development Setup
```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/ClickUp-MCP-Server---Enhanced.git
cd ClickUp-MCP-Server---Enhanced/packages/intelligence

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Add your CLICKUP_API_TOKEN

# 4. Run tests
npm test

# 5. Build project
npm run build
```

## 📋 Contribution Types

### 🐛 Bug Reports
Use the bug report template:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Relevant logs/screenshots

### ✨ Feature Requests
Use the feature request template:
- Problem description
- Proposed solution
- Alternative solutions considered
- Additional context

### 🔧 Code Contributions
- Bug fixes
- New intelligence tools
- Performance improvements
- Documentation updates
- Test coverage improvements

## 🔄 Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/new-analysis-tool
# or
git checkout -b fix/health-analyzer-bug
```

### 2. Development Process
```bash
# Make changes
# Write tests
npm test

# Check code quality
npm run lint
npm run format

# Build and validate
npm run build
```

### 3. Commit Guidelines
Follow conventional commits:
```bash
git commit -m "feat: add burnout risk analysis tool"
git commit -m "fix: resolve health score calculation error"
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests for sprint planner"
```

### 4. Pull Request Process
1. Update documentation
2. Add/update tests
3. Ensure CI passes
4. Request review
5. Address feedback
6. Merge when approved

## 📝 Code Standards

### TypeScript Guidelines
```typescript
// ✅ Good: Explicit types
interface AnalysisResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

// ✅ Good: Proper error handling
try {
  const result = await performAnalysis();
  return formatResult(result);
} catch (error) {
  logger.error('Analysis failed', error);
  throw new AnalysisError('Failed to analyze data');
}

// ❌ Bad: Any types
function analyze(data: any): any {
  return data.something;
}
```

### Naming Conventions
```typescript
// Files: kebab-case
project-health-analyzer.ts
velocity-analysis-service.ts

// Classes: PascalCase
class HealthMetricsService {}
class VelocityAnalyzer {}

// Functions/variables: camelCase
const analyzeProjectHealth = () => {};
const healthScore = 85;

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_CACHE_TTL = 3600;
```

### Documentation Standards
```typescript
/**
 * Analyzes project health and generates recommendations
 * 
 * @param params - Analysis parameters
 * @param params.workspaceId - ClickUp workspace ID
 * @param params.analysisDepth - Depth of analysis to perform
 * @returns Promise resolving to formatted analysis results
 * 
 * @example
 * ```typescript
 * const result = await analyzeProjectHealth({
 *   workspaceId: '12345',
 *   analysisDepth: 'comprehensive'
 * });
 * ```
 */
export async function analyzeProjectHealth(
  params: ProjectHealthParams
): Promise<ToolResponse> {
  // Implementation
}
```

## 🧪 Testing Requirements

### Test Coverage
- Minimum 80% code coverage
- Unit tests for all functions
- Integration tests for API interactions
- End-to-end tests for complete workflows

### Test Structure
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case correctly', () => {
      // Test implementation
    });
    
    it('should handle edge cases', () => {
      // Edge case testing
    });
    
    it('should handle errors gracefully', () => {
      // Error handling testing
    });
  });
});
```

### Mock Guidelines
```typescript
// ✅ Good: Specific mocks
jest.mock('../services/clickup-client', () => ({
  getWorkspace: jest.fn().mockResolvedValue(mockWorkspaceData)
}));

// ❌ Bad: Over-mocking
jest.mock('../services/clickup-client');
```

## 📦 Adding New Tools

### 1. Tool Structure
```
src/tools/
├── my-new-tool.ts           # Tool implementation
├── __tests__/
│   └── my-new-tool.test.ts  # Unit tests
└── schemas/
    └── my-new-tool.schema.ts # Input validation
```

### 2. Implementation Checklist
- [ ] Tool schema with Zod validation
- [ ] Core logic with error handling
- [ ] Response formatting (markdown)
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] Documentation
- [ ] Performance optimization
- [ ] Registration in main server

### 3. Tool Template
```typescript
// src/tools/my-new-tool.ts
import { z } from 'zod';

export const myNewToolSchema = z.object({
  workspaceId: z.string().describe('ClickUp workspace ID'),
  // Add other parameters
});

export type MyNewToolInput = z.infer<typeof myNewToolSchema>;

export async function myNewTool(params: MyNewToolInput): Promise<ToolResponse> {
  try {
    const validated = myNewToolSchema.parse(params);
    const result = await performAnalysis(validated);
    return formatResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
```

## 🔍 Code Review Process

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] Performance is acceptable
- [ ] Security considerations addressed
- [ ] Error handling is robust
- [ ] Breaking changes are documented

### Review Guidelines
- Be constructive and respectful
- Focus on code, not the person
- Explain the "why" behind suggestions
- Approve when ready, request changes when needed
- Test the changes locally when possible

## 🚀 Release Process

### Version Management
We follow semantic versioning (semver):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] Release notes prepared
- [ ] Security scan passed

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Maintain professional communication
- Report inappropriate behavior

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code contributions and reviews
- **Email**: peter@chykalophia.com for sensitive issues

## 📚 Resources

### Documentation
- [Architecture Guide](./architecture.md)
- [Tool Development Guide](./tool-development.md)
- [Testing Guide](./testing-guide.md)
- [API Documentation](../api/README.md)

### External Resources
- [MCP Protocol](https://modelcontextprotocol.io)
- [ClickUp API](https://clickup.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page
- Special mentions for significant contributions

## ❓ Getting Help

### Before Asking
1. Check existing documentation
2. Search GitHub issues
3. Review similar implementations
4. Test with minimal reproduction

### How to Ask
1. Provide clear problem description
2. Include relevant code snippets
3. Share error messages/logs
4. Describe what you've tried
5. Specify your environment

### Response Expectations
- Issues: Response within 48 hours
- Pull requests: Review within 72 hours
- Discussions: Community-driven responses
- Security issues: Response within 24 hours

Thank you for contributing to the ClickUp Intelligence MCP Server! 🎉
