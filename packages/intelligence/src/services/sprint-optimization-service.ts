/**
 * Sprint Optimization Service
 * 
 * Advanced sprint optimization engine using constraint satisfaction
 * and multi-objective optimization for optimal task allocation.
 * 
 * @version 4.0.0
 * @since Phase 1.2 - Smart Sprint Planner
 */

import { z } from 'zod';

// Core optimization schemas
export const TaskSchema = z.object({
  taskId: z.string(),
  name: z.string(),
  storyPoints: z.number().min(0),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  skillRequirements: z.array(z.string()),
  dependencies: z.array(z.string()).default([]),
  estimatedHours: z.number().min(0),
  businessValue: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium')
});

export const OptimizationConstraintSchema = z.object({
  type: z.enum(['capacity', 'dependency', 'skill', 'priority', 'risk']),
  weight: z.number().min(0).max(1).default(1),
  description: z.string()
});

export const OptimizationObjectiveSchema = z.object({
  maximize: z.array(z.enum(['business_value', 'story_points', 'task_count'])).default(['business_value']),
  minimize: z.array(z.enum(['risk', 'complexity', 'dependencies'])).default(['risk']),
  weights: z.record(z.string(), z.number().min(0).max(1)).default({})
});

export const SprintOptimizationInputSchema = z.object({
  teamId: z.string(),
  sprintCapacity: z.number().min(0).describe('Available story point capacity'),
  availableTasks: z.array(TaskSchema),
  constraints: z.array(OptimizationConstraintSchema).default([]),
  objectives: OptimizationObjectiveSchema.default({}),
  riskTolerance: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced')
});

export const OptimizedSprintSchema = z.object({
  selectedTasks: z.array(TaskSchema),
  totalStoryPoints: z.number(),
  totalBusinessValue: z.number(),
  capacityUtilization: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(100),
  optimizationScore: z.number().min(0).max(100),
  alternativeOptions: z.array(z.object({
    name: z.string(),
    tasks: z.array(z.string()),
    score: z.number(),
    tradeoffs: z.string()
  }))
});

export type SprintOptimizationInput = z.infer<typeof SprintOptimizationInputSchema>;
export type OptimizedSprint = z.infer<typeof OptimizedSprintSchema>;
export type Task = z.infer<typeof TaskSchema>;

/**
 * Advanced sprint optimization using constraint satisfaction algorithms
 */
export class SprintOptimizationService {
  private readonly PRIORITY_WEIGHTS = {
    'critical': 1.0,
    'high': 0.8,
    'medium': 0.6,
    'low': 0.4
  };

  private readonly RISK_WEIGHTS = {
    'low': 0.2,
    'medium': 0.5,
    'high': 0.8
  };

  /**
   * Optimizes sprint task selection using multi-objective optimization
   */
  async optimizeSprint(input: SprintOptimizationInput): Promise<OptimizedSprint> {
    try {
      const validatedInput = SprintOptimizationInputSchema.parse(input);
      
      // Sort tasks by priority and business value
      const sortedTasks = this.prioritizeTasks(validatedInput.availableTasks);
      
      // Generate feasible task combinations
      const feasibleCombinations = this.generateFeasibleCombinations(
        sortedTasks,
        validatedInput.sprintCapacity
      );
      
      // Score each combination
      const scoredCombinations = feasibleCombinations.map(combination => ({
        tasks: combination,
        score: this.calculateCombinationScore(combination, validatedInput.objectives),
        storyPoints: combination.reduce((sum, task) => sum + task.storyPoints, 0),
        businessValue: combination.reduce((sum, task) => sum + task.businessValue, 0),
        riskScore: this.calculateRiskScore(combination)
      }));
      
      // Select optimal combination
      const optimal = scoredCombinations.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      // Generate alternatives
      const alternatives = this.generateAlternatives(scoredCombinations, optimal);
      
      return {
        selectedTasks: optimal.tasks,
        totalStoryPoints: optimal.storyPoints,
        totalBusinessValue: optimal.businessValue,
        capacityUtilization: optimal.storyPoints / validatedInput.sprintCapacity,
        riskScore: optimal.riskScore,
        optimizationScore: optimal.score,
        alternativeOptions: alternatives
      };
      
    } catch (error) {
      console.error('[SprintOptimizationService] Optimization failed:', error);
      throw new Error(`Sprint optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prioritizes tasks based on multiple factors
   */
  private prioritizeTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const aScore = this.calculateTaskPriorityScore(a);
      const bScore = this.calculateTaskPriorityScore(b);
      return bScore - aScore; // Descending order
    });
  }

  /**
   * Calculates priority score for a task
   */
  private calculateTaskPriorityScore(task: Task): number {
    const priorityWeight = this.PRIORITY_WEIGHTS[task.priority];
    const riskPenalty = this.RISK_WEIGHTS[task.riskLevel];
    const valuePerPoint = task.storyPoints > 0 ? task.businessValue / task.storyPoints : 0;
    
    return (priorityWeight * 0.4) + (valuePerPoint * 0.4) + ((1 - riskPenalty) * 0.2);
  }

  /**
   * Generates feasible task combinations within capacity constraints
   */
  private generateFeasibleCombinations(tasks: Task[], capacity: number): Task[][] {
    const combinations: Task[][] = [];
    
    // Use dynamic programming approach for knapsack-like optimization
    const dp: { tasks: Task[]; points: number; value: number }[][] = 
      Array(tasks.length + 1).fill(null).map(() => 
        Array(Math.floor(capacity) + 1).fill(null).map(() => ({ tasks: [], points: 0, value: 0 }))
      );
    
    for (let i = 1; i <= tasks.length; i++) {
      const task = tasks[i - 1];
      const taskPoints = Math.floor(task.storyPoints);
      
      for (let w = 0; w <= capacity; w++) {
        // Don't include current task
        dp[i][w] = { ...dp[i - 1][w] };
        
        // Include current task if it fits
        if (taskPoints <= w) {
          const withTask = {
            tasks: [...dp[i - 1][w - taskPoints].tasks, task],
            points: dp[i - 1][w - taskPoints].points + task.storyPoints,
            value: dp[i - 1][w - taskPoints].value + task.businessValue
          };
          
          if (withTask.value > dp[i][w].value) {
            dp[i][w] = withTask;
          }
        }
      }
    }
    
    // Extract top combinations
    const capacityInt = Math.floor(capacity);
    combinations.push(dp[tasks.length][capacityInt].tasks);
    
    // Generate additional combinations by varying capacity utilization
    for (let util = 0.7; util <= 0.95; util += 0.1) {
      const targetCapacity = Math.floor(capacity * util);
      if (targetCapacity > 0 && targetCapacity < capacityInt) {
        combinations.push(dp[tasks.length][targetCapacity].tasks);
      }
    }
    
    return combinations.filter(combo => combo.length > 0);
  }

  /**
   * Calculates optimization score for a task combination
   */
  private calculateCombinationScore(tasks: Task[], objectives: any): number {
    const totalValue = tasks.reduce((sum, task) => sum + task.businessValue, 0);
    const totalPoints = tasks.reduce((sum, task) => sum + task.storyPoints, 0);
    const avgRisk = tasks.reduce((sum, task) => sum + this.RISK_WEIGHTS[task.riskLevel], 0) / tasks.length;
    
    // Normalize scores
    const valueScore = Math.min(100, totalValue);
    const pointsScore = Math.min(100, totalPoints * 2); // Assuming max ~50 points per sprint
    const riskScore = (1 - avgRisk) * 100;
    
    // Apply objective weights
    const valueWeight = objectives.weights?.business_value || 0.5;
    const pointsWeight = objectives.weights?.story_points || 0.3;
    const riskWeight = objectives.weights?.risk || 0.2;
    
    return (valueScore * valueWeight) + (pointsScore * pointsWeight) + (riskScore * riskWeight);
  }

  /**
   * Calculates risk score for a task combination
   */
  private calculateRiskScore(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    
    const riskSum = tasks.reduce((sum, task) => sum + this.RISK_WEIGHTS[task.riskLevel], 0);
    return Math.round((riskSum / tasks.length) * 100);
  }

  /**
   * Generates alternative sprint options
   */
  private generateAlternatives(scoredCombinations: any[], optimal: any) {
    const alternatives = scoredCombinations
      .filter(combo => combo.score !== optimal.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((combo, index) => {
        let tradeoffs = '';
        
        if (combo.businessValue > optimal.businessValue) {
          tradeoffs = 'Higher business value, ';
        } else if (combo.businessValue < optimal.businessValue) {
          tradeoffs = 'Lower business value, ';
        }
        
        if (combo.riskScore > optimal.riskScore) {
          tradeoffs += 'higher risk';
        } else if (combo.riskScore < optimal.riskScore) {
          tradeoffs += 'lower risk';
        }
        
        return {
          name: `Alternative ${index + 1}`,
          tasks: combo.tasks.map((task: Task) => task.taskId),
          score: Math.round(combo.score),
          tradeoffs: tradeoffs || 'Similar risk profile'
        };
      });
    
    return alternatives;
  }
}

/**
 * Factory function for creating SprintOptimizationService instances
 */
export function createSprintOptimizationService(): SprintOptimizationService {
  return new SprintOptimizationService();
}
