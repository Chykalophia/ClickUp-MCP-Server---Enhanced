/* eslint-disable max-len */
import { z } from 'zod';
import { 
  TaskAnalysisService, 
  Task, 
  TaskDecomposition, 
  DecomposedTask,
  EstimationSummary,
  TaskType,
  ComplexityAnalysis
} from '../services/task-analysis-service';

// Zod schemas for validation
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  assignees: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  timeEstimate: z.number().optional(),
  timeSpent: z.number().optional(),
  dueDate: z.string().optional(),
  dependencies: z.array(z.string()).optional()
});

const DecompositionOptionsSchema = z.object({
  targetGranularity: z.number().min(1).max(10).default(4).describe('Target granularity level (1=very fine, 10=coarse)'),
  maxSubtasks: z.number().min(2).max(20).default(10).describe('Maximum number of subtasks to generate'),
  includeEstimation: z.boolean().default(true).describe('Include effort estimation for subtasks'),
  includeDependencies: z.boolean().default(true).describe('Identify dependencies between subtasks'),
  templatePreference: z.enum(['auto', 'api-development', 'ui-feature', 'database-change', 'bug-fix', 'research-task', 'generic']).default('auto').describe('Preferred decomposition template'),
  complexityThreshold: z.number().min(1).max(10).default(6).describe('Minimum complexity score to trigger decomposition'),
  effortThreshold: z.number().min(1).max(100).default(8).describe('Minimum effort (hours) to trigger decomposition')
});

/**
 * Task Decomposition Engine - Intelligent task breakdown and sizing
 */
export class TaskDecompositionEngine {
  private taskAnalysisService: TaskAnalysisService;

  constructor() {
    this.taskAnalysisService = new TaskAnalysisService();
  }

  /**
   * Decompose a task into smaller, manageable subtasks with AI analysis
   */
  async decomposeTask(
    task: z.infer<typeof TaskSchema>,
    options: z.infer<typeof DecompositionOptionsSchema> = {
      targetGranularity: 4,
      maxSubtasks: 10,
      includeEstimation: true,
      includeDependencies: true,
      templatePreference: 'auto',
      complexityThreshold: 6,
      effortThreshold: 8
    }
  ): Promise<TaskDecomposition> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      const validatedTask = TaskSchema.parse(task);
      const validatedOptions = DecompositionOptionsSchema.parse(options);

      // Convert to internal Task format
      const internalTask: Task = {
        ...validatedTask,
        timeEstimate: validatedTask.timeEstimate ? validatedTask.timeEstimate * 1000 * 60 * 60 : undefined // Convert hours to milliseconds
      };

      // Analyze task complexity
      const complexityAnalysis = this.taskAnalysisService.analyzeTaskComplexity(internalTask);

      // Check if decomposition is needed
      const shouldDecompose = this.shouldDecomposeTask(internalTask, complexityAnalysis, validatedOptions);
      
      if (!shouldDecompose) {
        return this.createSimpleDecomposition(internalTask, complexityAnalysis, startTime);
      }

      // Perform task decomposition
      const decomposedTasks = this.taskAnalysisService.decomposeTask(
        internalTask, 
        validatedOptions.targetGranularity
      );

      // Limit number of subtasks
      const limitedTasks = decomposedTasks.slice(0, validatedOptions.maxSubtasks);

      // Estimate effort for each subtask
      if (validatedOptions.includeEstimation) {
        limitedTasks.forEach(subtask => {
          subtask.estimatedEffort = this.taskAnalysisService.estimateEffort(subtask);
        });
      }

      // Identify dependencies
      let dependencyMap: Record<string, string[]> = {};
      if (validatedOptions.includeDependencies) {
        dependencyMap = this.taskAnalysisService.identifyDependencies(limitedTasks);
        
        // Apply dependencies to tasks
        limitedTasks.forEach(task => {
          task.dependencies = dependencyMap[task.title] || [];
        });
      }

      // Create estimation summary
      const estimationSummary = this.createEstimationSummary(limitedTasks, internalTask);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        internalTask, 
        limitedTasks, 
        complexityAnalysis,
        validatedOptions
      );

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(
        internalTask,
        limitedTasks,
        complexityAnalysis
      );

      const decomposition: TaskDecomposition = {
        originalTask: internalTask,
        decomposedTasks: limitedTasks,
        complexityAnalysis,
        estimationSummary,
        recommendations,
        confidenceScore,
        templateUsed: this.getTemplateUsed(internalTask, validatedOptions),
        processingTime: Date.now() - startTime
      };

      // Validate decomposition quality
      const validation = this.taskAnalysisService.validateDecomposition(decomposition);
      if (!validation.isValid) {
        decomposition.recommendations.push(
          `⚠️ Quality issues detected (score: ${validation.score}/100):`
        );
        decomposition.recommendations.push(...validation.suggestions);
      }

      return decomposition;

    } catch (error) {
      throw new Error(`Task decomposition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze task complexity without decomposition
   */
  async analyzeComplexity(task: z.infer<typeof TaskSchema>): Promise<{
    complexity: any;
    shouldDecompose: boolean;
    reasoning: string;
    recommendations: string[];
  }> {
    const validatedTask = TaskSchema.parse(task);
    const internalTask: Task = {
      ...validatedTask,
      timeEstimate: validatedTask.timeEstimate ? validatedTask.timeEstimate * 1000 * 60 * 60 : undefined
    };

    const complexityAnalysis = this.taskAnalysisService.analyzeTaskComplexity(internalTask);
    const shouldDecompose = this.shouldDecomposeTask(internalTask, complexityAnalysis, {
      targetGranularity: 4,
      maxSubtasks: 10,
      includeEstimation: true,
      includeDependencies: true,
      templatePreference: 'auto',
      complexityThreshold: 5,
      effortThreshold: 8
    });

    const recommendations = [];
    if (shouldDecompose) {
      recommendations.push('🔄 Task decomposition recommended due to high complexity or size');
      recommendations.push('📋 Consider breaking down into smaller, focused subtasks');
      
      if (complexityAnalysis.uncertainty >= 7) {
        recommendations.push('🔍 Start with research tasks to reduce uncertainty');
      }
      
      if (complexityAnalysis.technical >= 8) {
        recommendations.push('👨‍💻 Assign to senior developer due to high technical complexity');
      }
      
      if (complexityAnalysis.integration >= 7) {
        recommendations.push('🔗 Plan integration points and dependencies carefully');
      }
    } else {
      recommendations.push('✅ Task is appropriately sized and can be worked on as-is');
      recommendations.push('📝 Ensure clear acceptance criteria are defined');
    }

    return {
      complexity: complexityAnalysis,
      shouldDecompose,
      reasoning: complexityAnalysis.reasoning,
      recommendations
    };
  }

  /**
   * Get available decomposition templates
   */
  getAvailableTemplates(): Record<string, any> {
    return {
      'api-development': {
        description: 'Template for API and service development tasks',
        pattern: 'api|endpoint|service|rest|graphql',
        subtaskCount: 7,
        estimatedEffort: '14.5 hours'
      },
      'ui-feature': {
        description: 'Template for user interface and frontend development',
        pattern: 'ui|interface|frontend|component|react|vue|angular',
        subtaskCount: 7,
        estimatedEffort: '13 hours'
      },
      'database-change': {
        description: 'Template for database schema changes and migrations',
        pattern: 'database|schema|migration|sql|table|index',
        subtaskCount: 7,
        estimatedEffort: '12 hours'
      },
      'bug-fix': {
        description: 'Template for bug fixes and issue resolution',
        pattern: 'bug|fix|issue|error|defect',
        subtaskCount: 5,
        estimatedEffort: '6.5 hours'
      },
      'research-task': {
        description: 'Template for research and investigation tasks',
        pattern: 'research|investigate|analyze|study|explore',
        subtaskCount: 5,
        estimatedEffort: '9 hours'
      }
    };
  }

  // Private helper methods

  private shouldDecomposeTask(
    task: Task, 
    complexity: ComplexityAnalysis, 
    options: z.infer<typeof DecompositionOptionsSchema>
  ): boolean {
    const complexityThreshold = options.complexityThreshold || 6;
    const effortThreshold = options.effortThreshold || 8;
    
    // Check complexity threshold
    if (complexity.overall >= complexityThreshold) {
      return true;
    }
    
    // Check effort threshold
    if (task.timeEstimate) {
      const hours = task.timeEstimate / (1000 * 60 * 60);
      if (hours >= effortThreshold) {
        return true;
      }
    }
    
    // Check for uncertainty indicators
    if (complexity.uncertainty >= 7) {
      return true;
    }
    
    return false;
  }

  private createSimpleDecomposition(
    task: Task, 
    complexity: ComplexityAnalysis, 
    startTime: number
  ): TaskDecomposition {
    return {
      originalTask: task,
      decomposedTasks: [], // No decomposition needed
      complexityAnalysis: complexity,
      estimationSummary: {
        totalEstimatedEffort: task.timeEstimate ? task.timeEstimate / (1000 * 60 * 60) : 0,
        effortBreakdown: { [task.name]: task.timeEstimate ? task.timeEstimate / (1000 * 60 * 60) : 0 },
        riskFactors: [],
        confidenceLevel: 'high'
      },
      recommendations: [
        '✅ Task is appropriately sized and does not require decomposition',
        '📝 Ensure clear acceptance criteria are defined before starting work',
        '🎯 Task can be assigned and worked on as a single unit'
      ],
      confidenceScore: 0.9,
      processingTime: Date.now() - startTime
    };
  }

  private createEstimationSummary(tasks: DecomposedTask[], originalTask: Task): EstimationSummary {
    const totalEffort = tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
    
    const effortBreakdown: Record<string, number> = {};
    tasks.forEach(task => {
      effortBreakdown[task.title] = task.estimatedEffort;
    });

    const riskFactors: string[] = [];
    
    // Identify risk factors
    const highComplexityTasks = tasks.filter(t => t.complexity.overall >= 8);
    if (highComplexityTasks.length > 0) {
      riskFactors.push(`${highComplexityTasks.length} high-complexity subtasks identified`);
    }
    
    const uncertainTasks = tasks.filter(t => t.complexity.uncertainty >= 7);
    if (uncertainTasks.length > 0) {
      riskFactors.push(`${uncertainTasks.length} subtasks have high uncertainty`);
    }
    
    if (totalEffort > 40) {
      riskFactors.push('Total effort exceeds 1 week - consider further breakdown');
    }

    // Determine confidence level
    let confidenceLevel: 'low' | 'medium' | 'high' = 'high';
    if (riskFactors.length >= 3) {
      confidenceLevel = 'low';
    } else if (riskFactors.length >= 1) {
      confidenceLevel = 'medium';
    }

    // Compare to original estimate if available
    let comparisonToOriginal: number | undefined;
    if (originalTask.timeEstimate) {
      const originalHours = originalTask.timeEstimate / (1000 * 60 * 60);
      comparisonToOriginal = totalEffort / originalHours;
    }

    return {
      totalEstimatedEffort: Math.round(totalEffort * 2) / 2, // Round to nearest 0.5
      effortBreakdown,
      riskFactors,
      confidenceLevel,
      comparisonToOriginal
    };
  }

  private generateRecommendations(
    originalTask: Task,
    decomposedTasks: DecomposedTask[],
    complexity: ComplexityAnalysis,
    _options: z.infer<typeof DecompositionOptionsSchema>
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations
    recommendations.push(`🎯 Task decomposed into ${decomposedTasks.length} manageable subtasks`);
    
    if (complexity.overall >= 8) {
      recommendations.push('⚠️ High complexity task - assign to experienced team member');
    }
    
    if (complexity.uncertainty >= 7) {
      recommendations.push('🔍 Start with research/investigation tasks to reduce uncertainty');
    }

    // Effort-based recommendations
    const totalEffort = decomposedTasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
    if (totalEffort > 20) {
      recommendations.push('📅 Consider spreading work across multiple sprints');
    }

    // Task type recommendations
    const taskTypes = decomposedTasks.map(t => t.taskType);
    const hasImplementation = taskTypes.includes(TaskType.IMPLEMENTATION);
    const hasTesting = taskTypes.includes(TaskType.TESTING);
    const hasDocumentation = taskTypes.includes(TaskType.DOCUMENTATION);

    if (hasImplementation && !hasTesting) {
      recommendations.push('🧪 Consider adding testing tasks for implementation work');
    }

    if (hasImplementation && !hasDocumentation) {
      recommendations.push('📚 Consider adding documentation tasks for new features');
    }

    // Dependency recommendations
    const tasksWithDependencies = decomposedTasks.filter(t => t.dependencies.length > 0);
    if (tasksWithDependencies.length > 0) {
      recommendations.push(`🔗 ${tasksWithDependencies.length} tasks have dependencies - plan execution order carefully`);
    }

    // Priority recommendations
    const highPriorityTasks = decomposedTasks.filter(t => t.priority <= 2);
    if (highPriorityTasks.length > 0) {
      recommendations.push(`🚨 ${highPriorityTasks.length} high-priority subtasks identified - tackle these first`);
    }

    return recommendations;
  }

  private calculateConfidenceScore(
    originalTask: Task,
    decomposedTasks: DecomposedTask[],
    complexity: ComplexityAnalysis
  ): number {
    let confidence = 1.0;

    // Reduce confidence for high uncertainty
    if (complexity.uncertainty >= 8) {
      confidence -= 0.3;
    } else if (complexity.uncertainty >= 6) {
      confidence -= 0.1;
    }

    // Reduce confidence for very complex tasks
    if (complexity.overall >= 9) {
      confidence -= 0.2;
    }

    // Reduce confidence if no template was used (generic decomposition)
    const hasMatchingTemplate = this.hasMatchingTemplate(originalTask);
    if (!hasMatchingTemplate) {
      confidence -= 0.1;
    }

    // Reduce confidence for very large decompositions
    if (decomposedTasks.length > 10) {
      confidence -= 0.1;
    }

    // Increase confidence for well-structured decompositions
    const hasBalancedTypes = this.hasBalancedTaskTypes(decomposedTasks);
    if (hasBalancedTypes) {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private getTemplateUsed(
    task: Task,
    options: z.infer<typeof DecompositionOptionsSchema>
  ): string | undefined {
    if (options.templatePreference !== 'auto') {
      return options.templatePreference;
    }

    const text = `${task.name} ${task.description || ''}`;
    
    if (/api|endpoint|service|rest|graphql/i.test(text)) return 'api-development';
    if (/ui|interface|frontend|component/i.test(text)) return 'ui-feature';
    if (/database|schema|migration/i.test(text)) return 'database-change';
    if (/bug|fix|issue|error/i.test(text)) return 'bug-fix';
    if (/research|investigate|analyze/i.test(text)) return 'research-task';
    
    return 'generic';
  }

  private hasMatchingTemplate(task: Task): boolean {
    const text = `${task.name} ${task.description || ''}`;
    const patterns = [
      /api|endpoint|service|rest|graphql/i,
      /ui|interface|frontend|component/i,
      /database|schema|migration/i,
      /bug|fix|issue|error/i,
      /research|investigate|analyze/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  private hasBalancedTaskTypes(tasks: DecomposedTask[]): boolean {
    const types = tasks.map(t => t.taskType);
    const uniqueTypes = new Set(types);
    
    // Consider balanced if we have at least 2 different task types
    // and no single type dominates (>70% of tasks)
    if (uniqueTypes.size < 2) return false;
    
    const typeCounts = Array.from(uniqueTypes).map(type => 
      types.filter(t => t === type).length
    );
    
    const maxCount = Math.max(...typeCounts);
    const dominanceRatio = maxCount / tasks.length;
    
    return dominanceRatio <= 0.7;
  }
}

// Export the tool function for MCP integration
export const taskDecompositionTool = {
  name: 'decompose_task',
  description: 'Intelligently decompose a complex task into smaller, manageable subtasks with AI-powered analysis, effort estimation, and dependency identification',
  inputSchema: z.object({
    task: TaskSchema.describe('The task to decompose'),
    options: DecompositionOptionsSchema.optional().describe('Decomposition options and preferences')
  }),
  handler: async (params: { task: z.infer<typeof TaskSchema>, options?: z.infer<typeof DecompositionOptionsSchema> }) => {
    const engine = new TaskDecompositionEngine();
    const result = await engine.decomposeTask(params.task, params.options);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};

export const complexityAnalysisTool = {
  name: 'analyze_task_complexity',
  description: 'Analyze task complexity across multiple dimensions to determine if decomposition is needed',
  inputSchema: z.object({
    task: TaskSchema.describe('The task to analyze')
  }),
  handler: async (params: { task: z.infer<typeof TaskSchema> }) => {
    const engine = new TaskDecompositionEngine();
    const result = await engine.analyzeComplexity(params.task);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};

export const decompositionTemplatesTools = {
  name: 'get_decomposition_templates',
  description: 'Get available task decomposition templates and their descriptions',
  inputSchema: z.object({}),
  handler: async () => {
    const engine = new TaskDecompositionEngine();
    const templates = engine.getAvailableTemplates();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(templates, null, 2)
      }]
    };
  }
};
