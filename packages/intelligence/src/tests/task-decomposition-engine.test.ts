import { TaskDecompositionEngine } from '../tools/task-decomposition-engine';
import { Task } from '../services/task-analysis-service';

describe('TaskDecompositionEngine', () => {
  let engine: TaskDecompositionEngine;

  beforeEach(() => {
    engine = new TaskDecompositionEngine();
  });

  test('should decompose a simple API development task', async () => {
    const task: Task = {
      id: 'test-1',
      name: 'Create user authentication API',
      description: 'Implement REST API endpoints for user authentication including login, logout, and token refresh',
      timeEstimate: 32 * 60 * 60 * 1000, // 32 hours in milliseconds
      priority: 2
    };

    const result = await engine.decomposeTask(task);

    expect(result).toBeDefined();
    expect(result.decomposedTasks.length).toBeGreaterThan(0);
    expect(result.complexityAnalysis).toBeDefined();
    expect(result.estimationSummary).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.templateUsed).toBe('api-development');
  });

  test('should analyze task complexity correctly', async () => {
    const task: Task = {
      id: 'test-2',
      name: 'Implement complex machine learning algorithm',
      description: 'Research and implement a neural network for image recognition with uncertainty handling',
      priority: 1
    };

    const result = await engine.analyzeComplexity(task);

    expect(result).toBeDefined();
    expect(result.complexity).toBeDefined();
    expect(result.complexity.overall).toBeGreaterThanOrEqual(5); // Should be complex
    expect(result.shouldDecompose).toBe(true);
    expect(result.reasoning).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('should return available templates', () => {
    const templates = engine.getAvailableTemplates();

    expect(templates).toBeDefined();
    expect(templates['api-development']).toBeDefined();
    expect(templates['ui-feature']).toBeDefined();
    expect(templates['database-change']).toBeDefined();
    expect(templates['bug-fix']).toBeDefined();
    expect(templates['research-task']).toBeDefined();
  });

  test('should not decompose simple tasks', async () => {
    const task: Task = {
      id: 'test-3',
      name: 'Fix typo in documentation',
      description: 'Correct spelling mistake in README file',
      timeEstimate: 0.5, // 30 minutes in hours
      priority: 4
    };

    const result = await engine.decomposeTask(task);

    expect(result).toBeDefined();
    expect(result.decomposedTasks.length).toBe(0); // Should not decompose
    expect(result.recommendations).toContain('✅ Task is appropriately sized and does not require decomposition');
  });

  test('should handle tasks with custom options', async () => {
    const task: Task = {
      id: 'test-4',
      name: 'Build React component library',
      description: 'Create reusable UI components for the design system',
      timeEstimate: 40 * 60 * 60 * 1000, // 40 hours
      priority: 2
    };

    const options = {
      targetGranularity: 6,
      maxSubtasks: 5,
      includeEstimation: true,
      includeDependencies: true,
      templatePreference: 'ui-feature' as const,
      complexityThreshold: 4,
      effortThreshold: 6
    };

    const result = await engine.decomposeTask(task, options);

    expect(result).toBeDefined();
    expect(result.decomposedTasks.length).toBeLessThanOrEqual(5); // Respects maxSubtasks
    expect(result.templateUsed).toBe('ui-feature');
    expect(result.decomposedTasks.every(t => t.estimatedEffort > 0)).toBe(true); // All have estimates
  });
});
