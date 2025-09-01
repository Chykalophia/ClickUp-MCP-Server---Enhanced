/* eslint-disable max-len */
export interface Task {
  id: string;
  name: string;
  description?: string;
  status?: string;
  priority?: number;
  assignees?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
  timeEstimate?: number;
  timeSpent?: number;
  dueDate?: string;
  dependencies?: string[];
}

export interface DecomposedTask {
  title: string;
  description: string;
  estimatedEffort: number; // in hours
  complexity: ComplexityScore;
  dependencies: string[];
  acceptanceCriteria: string[];
  taskType: TaskType;
  priority: number;
  suggestedAssignee?: string;
  tags: string[];
}

export interface ComplexityAnalysis {
  technical: number; // Technical complexity (1-10)
  business: number; // Business logic complexity (1-10)
  integration: number; // Integration complexity (1-10)
  uncertainty: number; // Uncertainty level (1-10)
  overall: number; // Overall complexity score (1-10)
  factors: string[]; // Complexity factors identified
  reasoning: string; // Explanation of complexity assessment
}

export interface TaskDecomposition {
  originalTask: Task;
  decomposedTasks: DecomposedTask[];
  complexityAnalysis: ComplexityAnalysis;
  estimationSummary: EstimationSummary;
  recommendations: string[];
  confidenceScore: number; // 0-1 confidence in decomposition quality
  templateUsed?: string;
  processingTime: number; // milliseconds
}

export interface EstimationSummary {
  totalEstimatedEffort: number;
  effortBreakdown: Record<string, number>;
  riskFactors: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  comparisonToOriginal?: number; // ratio to original estimate if available
}

export interface ComplexityScore {
  overall: number;
  technical: number;
  business: number;
  integration: number;
  uncertainty: number;
}

export interface DependencyMap {
  [taskTitle: string]: string[];
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100 quality score
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  taskIndex?: number;
  field?: string;
}

/* eslint-disable no-unused-vars */
export enum TaskType {
  RESEARCH = 'research',
  DESIGN = 'design',
  IMPLEMENTATION = 'implementation',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment',
  REVIEW = 'review',
  PLANNING = 'planning',
  BUG_FIX = 'bug_fix',
  MAINTENANCE = 'maintenance',
}
/* eslint-enable no-unused-vars */

// Decomposition templates for common task patterns
export const DecompositionTemplates = {
  'api-development': {
    pattern: /api|endpoint|service|rest|graphql/i,
    subtasks: [
      {
        title: 'Design API specification',
        description: 'Define API endpoints, request/response schemas, and documentation',
        type: TaskType.DESIGN,
        estimatedEffort: 2,
        acceptanceCriteria: ['API specification documented', 'Schema validation defined']
      },
      {
        title: 'Implement core logic',
        description: 'Develop the main business logic and data processing',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 4,
        acceptanceCriteria: ['Core functionality implemented', 'Business rules applied']
      },
      {
        title: 'Add input validation',
        description: 'Implement request validation and sanitization',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 1.5,
        acceptanceCriteria: ['Input validation implemented', 'Error messages defined']
      },
      {
        title: 'Implement error handling',
        description: 'Add comprehensive error handling and logging',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 1,
        acceptanceCriteria: ['Error handling implemented', 'Logging configured']
      },
      {
        title: 'Write unit tests',
        description: 'Create comprehensive unit tests for all functionality',
        type: TaskType.TESTING,
        estimatedEffort: 3,
        acceptanceCriteria: ['Unit tests written', 'Code coverage >80%']
      },
      {
        title: 'Create integration tests',
        description: 'Develop integration tests for API endpoints',
        type: TaskType.TESTING,
        estimatedEffort: 2,
        acceptanceCriteria: ['Integration tests created', 'API endpoints tested']
      },
      {
        title: 'Update documentation',
        description: 'Update API documentation and usage examples',
        type: TaskType.DOCUMENTATION,
        estimatedEffort: 1,
        acceptanceCriteria: ['Documentation updated', 'Examples provided']
      }
    ]
  },
  'ui-feature': {
    pattern: /ui|interface|frontend|component|react|vue|angular/i,
    subtasks: [
      {
        title: 'Create wireframes/mockups',
        description: 'Design user interface wireframes and visual mockups',
        type: TaskType.DESIGN,
        estimatedEffort: 2,
        acceptanceCriteria: ['Wireframes created', 'Design approved']
      },
      {
        title: 'Implement component structure',
        description: 'Create the basic component structure and props interface',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 2,
        acceptanceCriteria: ['Component structure implemented', 'Props defined']
      },
      {
        title: 'Add styling and layout',
        description: 'Implement CSS styling and responsive layout',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 3,
        acceptanceCriteria: ['Styling implemented', 'Responsive design working']
      },
      {
        title: 'Implement user interactions',
        description: 'Add event handlers and user interaction logic',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 2.5,
        acceptanceCriteria: ['Interactions implemented', 'User feedback provided']
      },
      {
        title: 'Add form validation',
        description: 'Implement client-side form validation and error display',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 1.5,
        acceptanceCriteria: ['Validation implemented', 'Error messages displayed']
      },
      {
        title: 'Write component tests',
        description: 'Create unit and integration tests for the component',
        type: TaskType.TESTING,
        estimatedEffort: 2,
        acceptanceCriteria: ['Component tests written', 'User interactions tested']
      },
      {
        title: 'Update style guide',
        description: 'Update component library and style guide documentation',
        type: TaskType.DOCUMENTATION,
        estimatedEffort: 0.5,
        acceptanceCriteria: ['Style guide updated', 'Component documented']
      }
    ]
  },
  'database-change': {
    pattern: /database|schema|migration|sql|table|index/i,
    subtasks: [
      {
        title: 'Design schema changes',
        description: 'Plan database schema modifications and impact analysis',
        type: TaskType.DESIGN,
        estimatedEffort: 2,
        acceptanceCriteria: ['Schema design completed', 'Impact analysis done']
      },
      {
        title: 'Create migration scripts',
        description: 'Write database migration scripts for schema changes',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 2,
        acceptanceCriteria: ['Migration scripts created', 'Rollback scripts prepared']
      },
      {
        title: 'Update data models',
        description: 'Modify application data models to match new schema',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 1.5,
        acceptanceCriteria: ['Data models updated', 'Type definitions updated']
      },
      {
        title: 'Modify queries/procedures',
        description: 'Update database queries and stored procedures',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 2.5,
        acceptanceCriteria: ['Queries updated', 'Performance maintained']
      },
      {
        title: 'Test data migration',
        description: 'Test migration scripts with production-like data',
        type: TaskType.TESTING,
        estimatedEffort: 2,
        acceptanceCriteria: ['Migration tested', 'Data integrity verified']
      },
      {
        title: 'Update documentation',
        description: 'Update database documentation and schema diagrams',
        type: TaskType.DOCUMENTATION,
        estimatedEffort: 1,
        acceptanceCriteria: ['Documentation updated', 'Schema diagrams current']
      },
      {
        title: 'Plan rollback strategy',
        description: 'Prepare rollback procedures and contingency plans',
        type: TaskType.PLANNING,
        estimatedEffort: 1,
        acceptanceCriteria: ['Rollback plan created', 'Contingency procedures documented']
      }
    ]
  },
  'bug-fix': {
    pattern: /bug|fix|issue|error|defect/i,
    subtasks: [
      {
        title: 'Reproduce and analyze bug',
        description: 'Reproduce the bug and analyze root cause',
        type: TaskType.RESEARCH,
        estimatedEffort: 1.5,
        acceptanceCriteria: ['Bug reproduced', 'Root cause identified']
      },
      {
        title: 'Design fix solution',
        description: 'Design the solution approach and impact assessment',
        type: TaskType.DESIGN,
        estimatedEffort: 1,
        acceptanceCriteria: ['Solution designed', 'Impact assessed']
      },
      {
        title: 'Implement fix',
        description: 'Implement the bug fix with minimal side effects',
        type: TaskType.IMPLEMENTATION,
        estimatedEffort: 2,
        acceptanceCriteria: ['Fix implemented', 'No regression introduced']
      },
      {
        title: 'Add regression tests',
        description: 'Create tests to prevent the bug from recurring',
        type: TaskType.TESTING,
        estimatedEffort: 1,
        acceptanceCriteria: ['Regression tests added', 'Bug scenario covered']
      },
      {
        title: 'Verify fix',
        description: 'Test the fix in various scenarios and environments',
        type: TaskType.TESTING,
        estimatedEffort: 1,
        acceptanceCriteria: ['Fix verified', 'All scenarios tested']
      }
    ]
  },
  'research-task': {
    pattern: /research|investigate|analyze|study|explore/i,
    subtasks: [
      {
        title: 'Define research scope',
        description: 'Clearly define what needs to be researched and success criteria',
        type: TaskType.PLANNING,
        estimatedEffort: 0.5,
        acceptanceCriteria: ['Scope defined', 'Success criteria established']
      },
      {
        title: 'Gather information',
        description: 'Collect relevant information from various sources',
        type: TaskType.RESEARCH,
        estimatedEffort: 3,
        acceptanceCriteria: ['Information gathered', 'Sources documented']
      },
      {
        title: 'Analyze findings',
        description: 'Analyze collected information and identify patterns',
        type: TaskType.RESEARCH,
        estimatedEffort: 2,
        acceptanceCriteria: ['Analysis completed', 'Key insights identified']
      },
      {
        title: 'Create recommendations',
        description: 'Develop actionable recommendations based on research',
        type: TaskType.PLANNING,
        estimatedEffort: 1.5,
        acceptanceCriteria: ['Recommendations created', 'Action items defined']
      },
      {
        title: 'Document findings',
        description: 'Create comprehensive documentation of research results',
        type: TaskType.DOCUMENTATION,
        estimatedEffort: 2,
        acceptanceCriteria: ['Findings documented', 'Report completed']
      }
    ]
  }
};

/**
 * TaskAnalysisService provides intelligent task analysis and decomposition capabilities
 */
export class TaskAnalysisService {
  private readonly complexityKeywords = {
    technical: ['algorithm', 'architecture', 'performance', 'scalability', 'security', 'integration', 'api', 'database', 'framework', 'machine', 'learning', 'neural', 'network', 'complex', 'advanced', 'optimization', 'concurrent', 'distributed', 'microservice', 'implement', 'recognition', 'image', 'ai'],
    business: ['workflow', 'process', 'stakeholder', 'requirement', 'compliance', 'regulation', 'policy', 'approval', 'multi-step', 'coordination', 'approval'],
    integration: ['external', 'third-party', 'service', 'dependency', 'sync', 'migration', 'import', 'export', 'webhook', 'connector', 'bridge'],
    uncertainty: ['unclear', 'unknown', 'investigate', 'research', 'explore', 'might', 'possibly', 'potentially', 'uncertainty', 'experimental', 'prototype', 'handling']
  };

  /**
   * Analyze task complexity across multiple dimensions
   */
  analyzeTaskComplexity(task: Task): ComplexityAnalysis {
    const text = `${task.name} ${task.description || ''}`.toLowerCase();
    const factors: string[] = [];

    // Technical complexity analysis
    const technicalScore = this.calculateDimensionScore(text, this.complexityKeywords.technical, factors, 'Technical');

    // Business complexity analysis
    const businessScore = this.calculateDimensionScore(text, this.complexityKeywords.business, factors, 'Business');

    // Integration complexity analysis
    const integrationScore = this.calculateDimensionScore(
      text,
      this.complexityKeywords.integration,
      factors,
      'Integration'
    );

    // Uncertainty level analysis
    const uncertaintyScore = this.calculateDimensionScore(text, this.complexityKeywords.uncertainty, factors, 'Uncertainty');

    // Additional complexity factors
    if (task.dependencies && task.dependencies.length > 0) {
      factors.push(`Has ${task.dependencies.length} dependencies`);
    }

    if (task.timeEstimate && task.timeEstimate > 40) {
      // More than 1 week
      factors.push('Large time estimate indicates high complexity');
    }

    if (task.assignees && task.assignees.length > 3) {
      factors.push('Multiple assignees suggest coordination complexity');
    }

    // Calculate overall complexity (weighted average)
    const overall = Math.round(technicalScore * 0.3 + businessScore * 0.25 + integrationScore * 0.25 + uncertaintyScore * 0.2);

    const reasoning = this.generateComplexityReasoning({
      technical: technicalScore,
      business: businessScore,
      integration: integrationScore,
      uncertainty: uncertaintyScore,
      overall,
      factors,
      reasoning: '' // Will be set by generateComplexityReasoning
    });

    return {
      technical: technicalScore,
      business: businessScore,
      integration: integrationScore,
      uncertainty: uncertaintyScore,
      overall,
      factors,
      reasoning
    };
  }

  /**
   * Decompose a task into smaller, manageable subtasks
   */
  decomposeTask(task: Task, targetGranularity = 4): DecomposedTask[] {
    // Find matching template
    const template = this.findMatchingTemplate(task);

    if (template) {
      return this.applyTemplate(task, template, targetGranularity);
    }

    // Fallback to generic decomposition
    return this.genericDecomposition(task, targetGranularity);
  }

  /**
   * Estimate effort for a decomposed task
   */
  estimateEffort(task: DecomposedTask): number {
    let baseEffort = task.estimatedEffort;

    // Adjust based on complexity
    const complexityMultiplier = 1 + (task.complexity.overall - 5) * 0.1;
    baseEffort *= complexityMultiplier;

    // Adjust based on task type
    const typeMultipliers: Record<TaskType, number> = {
      [TaskType.RESEARCH]: 1.2,
      [TaskType.DESIGN]: 1.1,
      [TaskType.IMPLEMENTATION]: 1.0,
      [TaskType.TESTING]: 0.8,
      [TaskType.DOCUMENTATION]: 0.7,
      [TaskType.DEPLOYMENT]: 0.9,
      [TaskType.REVIEW]: 0.6,
      [TaskType.PLANNING]: 0.8,
      [TaskType.BUG_FIX]: 1.3,
      [TaskType.MAINTENANCE]: 0.9
    };

    baseEffort *= typeMultipliers[task.taskType] || 1.0;

    // Round to nearest 0.5 hours
    return Math.round(baseEffort * 2) / 2;
  }

  /**
   * Identify dependencies between decomposed tasks
   */
  identifyDependencies(tasks: DecomposedTask[]): DependencyMap {
    const dependencies: DependencyMap = {};

    // Common dependency patterns
    const dependencyRules = [
      { from: TaskType.DESIGN, to: TaskType.IMPLEMENTATION },
      { from: TaskType.IMPLEMENTATION, to: TaskType.TESTING },
      { from: TaskType.TESTING, to: TaskType.DEPLOYMENT },
      { from: TaskType.PLANNING, to: TaskType.IMPLEMENTATION },
      { from: TaskType.RESEARCH, to: TaskType.DESIGN }
    ];

    tasks.forEach(task => {
      dependencies[task.title] = [];

      // Apply dependency rules
      dependencyRules.forEach(rule => {
        const dependentTasks = tasks.filter(t => t.taskType === rule.from && t.title !== task.title);

        if (task.taskType === rule.to) {
          dependentTasks.forEach(depTask => {
            if (!dependencies[task.title].includes(depTask.title)) {
              dependencies[task.title].push(depTask.title);
            }
          });
        }
      });

      // Add explicit dependencies from task
      task.dependencies.forEach(dep => {
        if (!dependencies[task.title].includes(dep)) {
          dependencies[task.title].push(dep);
        }
      });
    });

    return dependencies;
  }

  /**
   * Validate the quality of a task decomposition
   */
  validateDecomposition(decomposition: TaskDecomposition): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;
    const suggestions: string[] = [];

    // Check task sizing (should be 1-8 hours)
    decomposition.decomposedTasks.forEach((task, index) => {
      if (task.estimatedEffort < 0.5) {
        issues.push({
          type: 'warning',
          message: `Task '${task.title}' may be too small (${task.estimatedEffort}h)`,
          taskIndex: index
        });
        score -= 5;
      } else if (task.estimatedEffort > 8) {
        issues.push({
          type: 'error',
          message: `Task '${task.title}' is too large (${task.estimatedEffort}h) - should be broken down further`,
          taskIndex: index
        });
        score -= 15;
      }
    });

    // Check for missing acceptance criteria
    decomposition.decomposedTasks.forEach((task, index) => {
      if (task.acceptanceCriteria.length === 0) {
        issues.push({
          type: 'warning',
          message: `Task '${task.title}' lacks acceptance criteria`,
          taskIndex: index
        });
        score -= 10;
        suggestions.push(`Add specific acceptance criteria for '${task.title}'.`);
      }
    });

    // Check for circular dependencies
    const dependencyMap = this.identifyDependencies(decomposition.decomposedTasks);
    const circularDeps = this.detectCircularDependencies(dependencyMap);
    if (circularDeps.length > 0) {
      issues.push({
        type: 'error',
        message: `Circular dependencies detected: ${circularDeps.join(', ')}`
      });
      score -= 25;
    }

    // Check total effort vs original estimate
    const totalEffort = decomposition.estimationSummary.totalEstimatedEffort;
    if (decomposition.originalTask.timeEstimate) {
      const originalHours = decomposition.originalTask.timeEstimate / (1000 * 60 * 60);
      const ratio = totalEffort / originalHours;
      if (ratio > 1.5) {
        issues.push({
          type: 'warning',
          message: `Decomposed tasks total ${totalEffort}h vs original ${originalHours}h - significant increase`
        });
        suggestions.push('Review if all decomposed tasks are necessary.');
      }
    }

    // Check for balanced task types
    const taskTypes = decomposition.decomposedTasks.map(t => t.taskType);
    const hasImplementation = taskTypes.includes(TaskType.IMPLEMENTATION);
    const hasTesting = taskTypes.includes(TaskType.TESTING);

    if (hasImplementation && !hasTesting) {
      issues.push({
        type: 'suggestion',
        message: 'Consider adding testing tasks for implementation work.'
      });
      suggestions.push('Add unit tests and integration tests.');
    }

    return {
      isValid: score >= 70,
      issues,
      score: Math.max(0, score),
      suggestions
    };
  }

  // Private helper methods

  private calculateDimensionScore(text: string, keywords: string[], factors: string[], dimension: string): number {
    let score = 1; // Base score
    let matchCount = 0;

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        matchCount++;
        factors.push(`${dimension}: Contains '${keyword}'.`);
      }
    });

    // Score based on keyword matches (1-10 scale)
    score = Math.min(10, 1 + matchCount * 1.5);

    return Math.round(score);
  }

  private generateComplexityReasoning(analysis: ComplexityAnalysis): string {
    const { technical, business, integration, uncertainty, overall } = analysis;

    let reasoning = `Overall complexity score: ${overall}/10. `;

    if (technical >= 7) reasoning += 'High technical complexity due to advanced technical requirements. ';
    if (business >= 7) reasoning += 'Significant business complexity with multiple stakeholders or processes. ';
    if (integration >= 7) reasoning += 'Complex integration requirements with external systems. ';
    if (uncertainty >= 7) reasoning += 'High uncertainty requiring research and investigation. ';

    if (overall <= 3) reasoning += 'This is a straightforward task with minimal complexity.';
    else if (overall <= 6) reasoning += 'Moderate complexity requiring careful planning.';
    else reasoning += 'High complexity task requiring expert attention and thorough planning.';

    return reasoning;
  }

  private findMatchingTemplate(task: Task): any {
    const text = `${task.name} ${task.description || ''}`;

    for (const [templateName, template] of Object.entries(DecompositionTemplates)) {
      if (template.pattern.test(text)) {
        return { name: templateName, ...template };
      }
    }

    return null;
  }

  private applyTemplate(task: Task, template: any, _targetGranularity: number): DecomposedTask[] {
    const complexity = this.analyzeTaskComplexity(task);

    return template.subtasks.map((subtask: any) => ({
      title: subtask.title,
      description: subtask.description,
      estimatedEffort: this.adjustEffortForComplexity(subtask.estimatedEffort, complexity),
      complexity: {
        overall: Math.max(1, complexity.overall - 2), // Subtasks are typically less complex
        technical: Math.max(1, complexity.technical - 1),
        business: Math.max(1, complexity.business - 1),
        integration: Math.max(1, complexity.integration - 1),
        uncertainty: Math.max(1, complexity.uncertainty - 2)
      },
      dependencies: [],
      acceptanceCriteria: subtask.acceptanceCriteria || [],
      taskType: subtask.type,
      priority: task.priority || 3,
      tags: task.tags || []
    }));
  }

  private genericDecomposition(task: Task, _targetGranularity: number): DecomposedTask[] {
    const complexity = this.analyzeTaskComplexity(task);
    const baseEffort = task.timeEstimate ? task.timeEstimate / (1000 * 60 * 60) : 8;

    // Generic breakdown based on common software development phases
    const genericTasks: Partial<DecomposedTask>[] = [
      {
        title: `Plan and design ${task.name}`,
        description: 'Plan the approach and create design specifications',
        taskType: TaskType.PLANNING,
        estimatedEffort: baseEffort * 0.2
      },
      {
        title: `Implement ${task.name}`,
        description: 'Develop the main functionality',
        taskType: TaskType.IMPLEMENTATION,
        estimatedEffort: baseEffort * 0.5
      },
      {
        title: `Test ${task.name}`,
        description: 'Create and execute tests',
        taskType: TaskType.TESTING,
        estimatedEffort: baseEffort * 0.2
      },
      {
        title: `Document ${task.name}`,
        description: 'Update documentation and create usage examples',
        taskType: TaskType.DOCUMENTATION,
        estimatedEffort: baseEffort * 0.1
      }
    ];

    return genericTasks.map(subtask => ({
      title: subtask.title!,
      description: subtask.description!,
      estimatedEffort: this.adjustEffortForComplexity(subtask.estimatedEffort!, complexity),
      complexity: {
        overall: Math.max(1, complexity.overall - 2),
        technical: Math.max(1, complexity.technical - 1),
        business: Math.max(1, complexity.business - 1),
        integration: Math.max(1, complexity.integration - 1),
        uncertainty: Math.max(1, complexity.uncertainty - 2)
      },
      dependencies: [],
      acceptanceCriteria: [`${subtask.title} completed successfully`],
      taskType: subtask.taskType!,
      priority: task.priority || 3,
      tags: task.tags || []
    }));
  }

  private adjustEffortForComplexity(baseEffort: number, complexity: ComplexityAnalysis): number {
    const complexityMultiplier = 1 + (complexity.overall - 5) * 0.1;
    return Math.round(baseEffort * complexityMultiplier * 2) / 2; // Round to nearest 0.5
  }

  private detectCircularDependencies(dependencyMap: DependencyMap): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const dfs = (task: string, path: string[]): void => {
      if (recursionStack.has(task)) {
        const cycleStart = path.indexOf(task);
        cycles.push(path.slice(cycleStart).concat(task).join(' -> '));
        return;
      }

      if (visited.has(task)) return;

      visited.add(task);
      recursionStack.add(task);

      const dependencies = dependencyMap[task] || [];
      dependencies.forEach(dep => {
        dfs(dep, [...path, task]);
      });

      recursionStack.delete(task);
    };

    Object.keys(dependencyMap).forEach(task => {
      if (!visited.has(task)) {
        dfs(task, []);
      }
    });

    return cycles;
  }
}
