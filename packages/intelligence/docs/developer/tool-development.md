# Tool Development Guide

This guide provides step-by-step instructions for creating new intelligence tools in the ClickUp Intelligence MCP Server.

## 🚀 Quick Start

### 1. Tool Template
```typescript
// src/tools/my-new-tool.ts
import { z } from 'zod';

export const myNewToolSchema = z.object({
  workspaceId: z.string().describe('ClickUp workspace ID'),
  analysisType: z.enum(['quick', 'detailed']).default('quick'),
  includeRecommendations: z.boolean().default(true)
});

export type MyNewToolInput = z.infer<typeof myNewToolSchema>;

export async function myNewTool(params: MyNewToolInput): Promise<ToolResponse> {
  try {
    // 1. Validate input
    const validatedParams = myNewToolSchema.parse(params);
    
    // 2. Perform analysis
    const result = await performAnalysis(validatedParams);
    
    // 3. Format response
    return {
      content: [{
        type: 'text',
        text: formatAnalysisResult(result)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **Error**: ${error.message}`
      }],
      isError: true
    };
  }
}
```

### 2. Register Tool
```typescript
// src/index.ts - Add to setupToolHandlers()
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'clickup_my_new_tool':
      return await myNewTool(args as MyNewToolInput);
    // ... other tools
  }
});
```

## 📋 Development Process

### Step 1: Define Tool Requirements
```typescript
interface ToolRequirements {
  name: string;           // Tool identifier
  category: string;       // Tool category
  description: string;    // User-facing description
  inputSchema: object;    // Parameter validation
  outputFormat: string;   // Response format
  performance: {
    responseTime: string; // Expected response time
    rateLimit: number;    // Requests per minute
    cacheStrategy: string;// Caching approach
  };
}
```

### Step 2: Create Tool Schema
```typescript
// Define input validation schema
export const toolInputSchema = z.object({
  // Required parameters
  workspaceId: z.string()
    .min(1)
    .describe('ClickUp workspace ID to analyze'),
  
  // Optional parameters with defaults
  analysisDepth: z.enum(['quick', 'standard', 'comprehensive'])
    .default('standard')
    .describe('Analysis depth level'),
  
  // Complex nested objects
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    taskStatuses: z.array(z.string()).optional()
  }).optional()
});
```

### Step 3: Implement Core Logic
```typescript
async function performAnalysis(params: ToolInput): Promise<AnalysisResult> {
  // 1. Data fetching
  const clickupData = await fetchClickUpData(params.workspaceId);
  
  // 2. Data processing
  const processedData = await processData(clickupData, params.filters);
  
  // 3. Analysis execution
  const analysisResult = await executeAnalysis(processedData, params.analysisDepth);
  
  // 4. Result validation
  validateAnalysisResult(analysisResult);
  
  return analysisResult;
}
```

### Step 4: Format Response
```typescript
function formatAnalysisResult(result: AnalysisResult): string {
  return `# Analysis Results

## Summary
${result.summary}

## Key Metrics
${formatMetrics(result.metrics)}

## Recommendations
${formatRecommendations(result.recommendations)}

---
*Analysis completed at ${new Date().toISOString()}*`;
}
```

## 🏗️ Tool Architecture Patterns

### Service Integration Pattern
```typescript
class MyAnalysisService {
  constructor(
    private clickupClient: ClickUpClient,
    private cacheService: CacheService
  ) {}
  
  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(params);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    
    // Perform analysis
    const result = await this.performAnalysis(params);
    
    // Cache result
    await this.cacheService.set(cacheKey, result, 3600); // 1 hour
    
    return result;
  }
}
```

### Error Handling Pattern
```typescript
class ToolErrorHandler {
  static handleError(error: unknown, context: ToolContext): ToolResponse {
    if (error instanceof ValidationError) {
      return {
        content: [{
          type: 'text',
          text: `❌ **Validation Error**: ${error.message}\n\nPlease check your input parameters.`
        }],
        isError: true
      };
    }
    
    if (error instanceof ClickUpAPIError) {
      return {
        content: [{
          type: 'text',
          text: `❌ **API Error**: ${error.message}\n\nPlease check your ClickUp API token and permissions.`
        }],
        isError: true
      };
    }
    
    // Generic error
    return {
      content: [{
        type: 'text',
        text: `❌ **Error**: An unexpected error occurred. Please try again.`
      }],
      isError: true
    };
  }
}
```

## 📊 Tool Categories

### 1. Analysis Tools
**Purpose**: Data analysis and insights generation

```typescript
interface AnalysisTool {
  analyze(data: InputData): Promise<AnalysisResult>;
  generateInsights(result: AnalysisResult): Insight[];
  formatReport(insights: Insight[]): string;
}
```

**Examples**:
- Project Health Analyzer
- Task Complexity Analyzer
- Workflow Pattern Analyzer

### 2. Planning Tools
**Purpose**: Planning and optimization

```typescript
interface PlanningTool {
  plan(requirements: PlanningRequirements): Promise<Plan>;
  optimize(plan: Plan, constraints: Constraint[]): Promise<OptimizedPlan>;
  validate(plan: Plan): ValidationResult;
}
```

**Examples**:
- Smart Sprint Planner
- Capacity Forecaster
- Resource Optimizer

### 3. Real-time Tools
**Purpose**: Live data processing

```typescript
interface RealTimeTool {
  startProcessing(config: ProcessingConfig): Promise<void>;
  processEvent(event: Event): Promise<ProcessingResult>;
  stopProcessing(): Promise<ProcessingStats>;
}
```

**Examples**:
- Real-time Engine
- Webhook Processor
- Live Metrics Collector

## 🧪 Testing Your Tool

### Unit Tests
```typescript
// src/__tests__/tools/my-new-tool.test.ts
describe('MyNewTool', () => {
  it('should analyze workspace data correctly', async () => {
    const mockParams = {
      workspaceId: 'test-workspace',
      analysisType: 'quick' as const
    };
    
    const result = await myNewTool(mockParams);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Analysis Results');
    expect(result.isError).toBeFalsy();
  });
  
  it('should handle invalid workspace ID', async () => {
    const mockParams = {
      workspaceId: '',
      analysisType: 'quick' as const
    };
    
    const result = await myNewTool(mockParams);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });
});
```

### Integration Tests
```typescript
describe('MyNewTool Integration', () => {
  it('should integrate with ClickUp API', async () => {
    const realParams = {
      workspaceId: process.env.TEST_WORKSPACE_ID!,
      analysisType: 'quick' as const
    };
    
    const result = await myNewTool(realParams);
    
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toMatch(/Analysis Results/);
  });
});
```

## 🚀 Performance Optimization

### Caching Strategy
```typescript
class ToolCache {
  private cache = new Map<string, CacheEntry>();
  
  generateKey(toolName: string, params: any): string {
    return `${toolName}:${JSON.stringify(params)}`;
  }
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }
}
```

### Rate Limiting
```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  checkLimit(toolName: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const key = toolName;
    const requests = this.requests.get(key) || [];
    
    // Remove old requests
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}
```

## 📝 Documentation Standards

### Tool Documentation Template
```typescript
/**
 * Tool Name: My New Analysis Tool
 * 
 * Description: Provides comprehensive analysis of workspace data
 * with actionable insights and recommendations.
 * 
 * Category: Analysis Tools
 * 
 * Performance:
 * - Response Time: < 2 seconds
 * - Rate Limit: 30 requests/minute
 * - Cache Duration: 1 hour
 * 
 * @param params - Tool input parameters
 * @returns Formatted analysis results
 * 
 * @example
 * ```typescript
 * const result = await myNewTool({
 *   workspaceId: '12345',
 *   analysisType: 'detailed'
 * });
 * ```
 */
export async function myNewTool(params: MyNewToolInput): Promise<ToolResponse> {
  // Implementation
}
```

### API Documentation
```markdown
## Tool: My New Analysis Tool

**Description**: Comprehensive workspace analysis with insights

**Parameters**:
- `workspaceId` (string, required): ClickUp workspace ID
- `analysisType` (enum, optional): Analysis depth level

**Response**: Formatted analysis report with metrics and recommendations

**Performance**: < 2s response time, 30 req/min limit
```

## 🔧 Advanced Patterns

### Composite Tool Pattern
```typescript
class CompositeAnalysisTool {
  constructor(
    private healthTool: ProjectHealthTool,
    private velocityTool: VelocityTool,
    private capacityTool: CapacityTool
  ) {}
  
  async performComprehensiveAnalysis(params: AnalysisParams): Promise<ToolResponse> {
    const [health, velocity, capacity] = await Promise.all([
      this.healthTool.analyze(params),
      this.velocityTool.analyze(params),
      this.capacityTool.analyze(params)
    ]);
    
    const combinedResult = this.combineResults(health, velocity, capacity);
    return this.formatCombinedResponse(combinedResult);
  }
}
```

### Plugin Architecture
```typescript
interface ToolPlugin {
  name: string;
  version: string;
  tools: ToolDefinition[];
  
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

class ToolPluginManager {
  private plugins = new Map<string, ToolPlugin>();
  
  async loadPlugin(plugin: ToolPlugin): Promise<void> {
    await plugin.initialize();
    this.plugins.set(plugin.name, plugin);
    this.registerTools(plugin.tools);
  }
}
```

## 📋 Checklist for New Tools

### Development Checklist
- [ ] Tool schema defined with Zod validation
- [ ] Core logic implemented with error handling
- [ ] Response formatting with markdown support
- [ ] Unit tests with >80% coverage
- [ ] Integration tests with real API
- [ ] Performance optimization (caching, rate limiting)
- [ ] Documentation with examples
- [ ] Tool registered in main server

### Quality Checklist
- [ ] TypeScript strict mode compliance
- [ ] ESLint validation passes
- [ ] Error messages are user-friendly
- [ ] Response format is consistent
- [ ] Performance meets requirements (<2s response)
- [ ] Rate limiting implemented
- [ ] Caching strategy defined
- [ ] Security validation included

### Documentation Checklist
- [ ] Tool purpose clearly described
- [ ] All parameters documented
- [ ] Response format specified
- [ ] Usage examples provided
- [ ] Performance characteristics listed
- [ ] Error scenarios covered
- [ ] Integration notes included

This guide provides everything needed to create high-quality intelligence tools that integrate seamlessly with the existing architecture.
