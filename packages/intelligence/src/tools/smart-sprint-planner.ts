/**
 * Smart Sprint Planner MCP Tool
 * 
 * AI-powered sprint planning tool that combines velocity analysis,
 * capacity modeling, and optimization algorithms for optimal sprint planning.
 * 
 * @version 4.0.0
 * @since Phase 1.2 - Smart Sprint Planner
 */

import { z } from 'zod';
import { VelocityAnalysisService } from '../services/velocity-analysis-service.js';
import { CapacityModelingService } from '../services/capacity-modeling-service.js';
import { SprintOptimizationService } from '../services/sprint-optimization-service.js';

// Main tool input schema
export const SmartSprintPlannerInputSchema = z.object({
  teamId: z.string().describe('ClickUp team ID for sprint planning'),
  sprintStartDate: z.string().describe('Sprint start date (ISO format)'),
  sprintEndDate: z.string().describe('Sprint end date (ISO format)'),

  // Velocity analysis options
  velocityLookback: z.number().min(4).max(26).default(8).describe('Weeks of historical data to analyze'),
  includePartialSprints: z.boolean().default(false).describe('Include incomplete sprints in velocity analysis'),

  // Capacity modeling options
  teamMembers: z
    .array(
      z.object({
        userId: z.string(),
        name: z.string(),
        role: z.string(),
        skills: z.array(z.string()),
        experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead']),
        availabilityHours: z.number().min(0).max(40),
        focusFactor: z.number().min(0).max(1).default(0.75),
      }),
    )
    .optional()
    .describe('Team member details (auto-fetched if not provided)'),

  capacityConstraints: z
    .array(
      z.object({
        type: z.enum(['pto', 'meeting', 'training', 'support', 'other']),
        userId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        hoursImpact: z.number().min(0),
        description: z.string(),
      }),
    )
    .default([])
    .describe('Known capacity constraints'),

  // Sprint optimization options
  candidateTasks: z
    .array(
      z.object({
        taskId: z.string(),
        name: z.string(),
        storyPoints: z.number().min(0),
        priority: z.enum(['critical', 'high', 'medium', 'low']),
        skillRequirements: z.array(z.string()),
        dependencies: z.array(z.string()).default([]),
        estimatedHours: z.number().min(0),
        businessValue: z.number().min(0).max(100),
        riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
      }),
    )
    .optional()
    .describe('Candidate tasks for sprint (auto-fetched if not provided)'),

  planningPreferences: z
    .object({
      riskTolerance: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
      prioritizeBusinessValue: z.boolean().default(true),
      includeBufferTime: z.boolean().default(true),
      bufferPercentage: z.number().min(0).max(0.3).default(0.15),
    })
    .default({}),
});

export const SmartSprintPlanResultSchema = z.object({
  sprintPlan: z.object({
    teamId: z.string(),
    sprintPeriod: z.object({
      startDate: z.string(),
      endDate: z.string(),
      workingDays: z.number(),
    }),

    // Velocity insights
    velocityAnalysis: z.object({
      predictedVelocity: z.number(),
      confidenceInterval: z.object({
        lower: z.number(),
        upper: z.number(),
      }),
      trend: z.enum(['increasing', 'stable', 'decreasing']),
      seasonalAdjustment: z.number(),
      recommendations: z.array(z.string()),
    }),

    // Capacity insights
    capacityAnalysis: z.object({
      totalCapacity: z.object({
        storyPointCapacity: z.number(),
        effectiveHours: z.number(),
        confidenceLevel: z.number(),
      }),
      teamUtilization: z.number(),
      skillCapacityGaps: z.array(z.string()),
      riskFactors: z.array(
        z.object({
          factor: z.string(),
          severity: z.enum(['low', 'medium', 'high']),
          mitigation: z.string(),
        }),
      ),
    }),

    // Optimized sprint
    recommendedTasks: z.array(
      z.object({
        taskId: z.string(),
        name: z.string(),
        storyPoints: z.number(),
        priority: z.enum(['critical', 'high', 'medium', 'low']),
        businessValue: z.number(),
        riskLevel: z.enum(['low', 'medium', 'high']),
        assignmentSuggestion: z.string().optional(),
      }),
    ),

    sprintMetrics: z.object({
      totalStoryPoints: z.number(),
      totalBusinessValue: z.number(),
      capacityUtilization: z.number(),
      riskScore: z.number(),
      optimizationScore: z.number(),
    }),

    alternativeOptions: z.array(
      z.object({
        name: z.string(),
        taskCount: z.number(),
        storyPoints: z.number(),
        tradeoffs: z.string(),
        score: z.number(),
      }),
    ),
  }),

  // Executive summary
  executiveSummary: z.object({
    sprintHealthGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
    keyInsights: z.array(z.string()),
    criticalRecommendations: z.array(z.string()),
    successProbability: z.number().min(0).max(100),
    confidenceLevel: z.enum(['high', 'medium', 'low']),
  }),

  metadata: z.object({
    analysisTimestamp: z.string(),
    processingTimeMs: z.number(),
    dataQuality: z.number().min(0).max(1),
    version: z.string(),
  }),
});

export type SmartSprintPlannerInput = z.infer<typeof SmartSprintPlannerInputSchema>;
export type SmartSprintPlanResult = z.infer<typeof SmartSprintPlanResultSchema>;

/**
 * Smart Sprint Planner - AI-powered sprint planning optimization
 */
export class SmartSprintPlanner {
  private velocityService: VelocityAnalysisService;
  private capacityService: CapacityModelingService;
  private optimizationService: SprintOptimizationService;

  constructor() {
    this.velocityService = new VelocityAnalysisService();
    this.capacityService = new CapacityModelingService();
    this.optimizationService = new SprintOptimizationService();
  }

  /**
   * Generates comprehensive AI-powered sprint plan
   */
  async planSprint(input: SmartSprintPlannerInput): Promise<SmartSprintPlanResult> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedInput = SmartSprintPlannerInputSchema.parse(input);

      // Step 1: Analyze historical velocity
      const velocityAnalysis = await this.velocityService.analyzeVelocity({
        teamId: validatedInput.teamId,
        lookbackPeriod: validatedInput.velocityLookback,
        includePartialSprints: validatedInput.includePartialSprints,
        adjustForTeamChanges: true,
        seasonalAdjustment: true,
      });

      // Step 2: Model team capacity
      const teamMembers = validatedInput.teamMembers || (await this.fetchTeamMembers(validatedInput.teamId));
      const capacityAnalysis = await this.capacityService.modelCapacity({
        teamId: validatedInput.teamId,
        sprintStartDate: validatedInput.sprintStartDate,
        sprintEndDate: validatedInput.sprintEndDate,
        teamMembers,
        constraints: validatedInput.capacityConstraints,
        skillRequirements: [],
        includeBufferTime: validatedInput.planningPreferences.includeBufferTime,
        bufferPercentage: validatedInput.planningPreferences.bufferPercentage,
      });

      // Step 3: Optimize task selection
      const candidateTasks = validatedInput.candidateTasks || (await this.fetchCandidateTasks(validatedInput.teamId));
      const sprintCapacity = Math.min(
        velocityAnalysis.prediction.predictedVelocity,
        capacityAnalysis.teamCapacity.totalCapacity.storyPointCapacity,
      );

      const optimizedSprint = await this.optimizationService.optimizeSprint({
        teamId: validatedInput.teamId,
        sprintCapacity,
        availableTasks: candidateTasks,
        constraints: [],
        objectives: {
          maximize: ['business_value'],
          minimize: ['risk'],
          weights: {},
        },
        riskTolerance: validatedInput.planningPreferences.riskTolerance,
      });

      // Step 4: Generate comprehensive plan
      const sprintPlan = this.generateSprintPlan(validatedInput, velocityAnalysis, capacityAnalysis, optimizedSprint);

      // Step 5: Create executive summary
      const executiveSummary = this.generateExecutiveSummary(sprintPlan, velocityAnalysis, capacityAnalysis);

      const processingTime = Date.now() - startTime;

      const result: SmartSprintPlanResult = {
        sprintPlan,
        executiveSummary,
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          processingTimeMs: processingTime,
          dataQuality: Math.min(velocityAnalysis.metadata.dataQuality, capacityAnalysis.metadata.dataQuality),
          version: '4.0.0',
        },
      };

      return SmartSprintPlanResultSchema.parse(result);
    } catch (error) {
      console.error('[SmartSprintPlanner] Sprint planning failed:', error);
      throw new Error(`Sprint planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates comprehensive sprint plan from analysis results
   */
  private generateSprintPlan(input: SmartSprintPlannerInput, velocityAnalysis: any, capacityAnalysis: any, optimizedSprint: any) {
    return {
      teamId: input.teamId,
      sprintPeriod: {
        startDate: input.sprintStartDate,
        endDate: input.sprintEndDate,
        workingDays: capacityAnalysis.sprintPeriod.workingDays,
      },

      velocityAnalysis: {
        predictedVelocity: velocityAnalysis.prediction.predictedVelocity,
        confidenceInterval: velocityAnalysis.prediction.confidenceInterval,
        trend: velocityAnalysis.currentVelocity.trend,
        seasonalAdjustment: velocityAnalysis.prediction.seasonalAdjustment,
        recommendations: velocityAnalysis.recommendations.map((r: any) => r.description),
      },

      capacityAnalysis: {
        totalCapacity: capacityAnalysis.teamCapacity.totalCapacity,
        teamUtilization: capacityAnalysis.capacityUtilization.planned,
        skillCapacityGaps: capacityAnalysis.teamCapacity.skillCapacity
          .filter((sc: any) => sc.availableHours < 10)
          .map((sc: any) => sc.skill),
        riskFactors: capacityAnalysis.teamCapacity.riskFactors,
      },

      recommendedTasks: optimizedSprint.selectedTasks.map((task: any) => ({
        taskId: task.taskId,
        name: task.name,
        storyPoints: task.storyPoints,
        priority: task.priority,
        businessValue: task.businessValue,
        riskLevel: task.riskLevel,
        assignmentSuggestion: this.generateAssignmentSuggestion(task, capacityAnalysis),
      })),

      sprintMetrics: {
        totalStoryPoints: optimizedSprint.totalStoryPoints,
        totalBusinessValue: optimizedSprint.totalBusinessValue,
        capacityUtilization: optimizedSprint.capacityUtilization,
        riskScore: optimizedSprint.riskScore,
        optimizationScore: optimizedSprint.optimizationScore,
      },

      alternativeOptions: optimizedSprint.alternativeOptions.map((alt: any) => ({
        name: alt.name,
        taskCount: alt.tasks.length,
        storyPoints: alt.tasks.reduce((sum: number, taskId: string) => {
          const task = optimizedSprint.selectedTasks.find((t: any) => t.taskId === taskId);
          return sum + (task?.storyPoints || 0);
        }, 0),
        tradeoffs: alt.tradeoffs,
        score: alt.score,
      })),
    };
  }

  /**
   * Generates executive summary with key insights
   */
  private generateExecutiveSummary(sprintPlan: any, velocityAnalysis: any, capacityAnalysis: any) {
    const sprintHealthGrade = this.calculateSprintHealthGrade(sprintPlan, capacityAnalysis);
    const keyInsights = this.generateKeyInsights(sprintPlan, velocityAnalysis, capacityAnalysis);
    const criticalRecommendations = this.generateCriticalRecommendations(sprintPlan, capacityAnalysis);
    const successProbability = this.calculateSuccessProbability(sprintPlan, velocityAnalysis, capacityAnalysis);
    const confidenceLevel = this.determineConfidenceLevel(velocityAnalysis, capacityAnalysis);

    return {
      sprintHealthGrade,
      keyInsights,
      criticalRecommendations,
      successProbability,
      confidenceLevel,
    };
  }

  /**
   * Helper methods for data fetching and analysis
   */
  private async fetchTeamMembers(_teamId: string) {
    // In a real implementation, this would fetch from ClickUp API
    // For now, return mock data
    return [
      {
        userId: 'user1',
        name: 'Alice Developer',
        role: 'Frontend Developer',
        skills: ['React', 'TypeScript', 'CSS'],
        experienceLevel: 'senior' as const,
        availabilityHours: 35,
        focusFactor: 0.8,
      },
      {
        userId: 'user2',
        name: 'Bob Engineer',
        role: 'Backend Developer',
        skills: ['Node.js', 'PostgreSQL', 'API Design'],
        experienceLevel: 'mid' as const,
        availabilityHours: 40,
        focusFactor: 0.75,
      },
    ];
  }

  private async fetchCandidateTasks(_teamId: string) {
    // In a real implementation, this would fetch from ClickUp API
    // For now, return mock data
    return [
      {
        taskId: 'task1',
        name: 'Implement user authentication',
        storyPoints: 8,
        priority: 'high' as const,
        skillRequirements: ['React', 'Node.js'],
        dependencies: [],
        estimatedHours: 16,
        businessValue: 85,
        riskLevel: 'medium' as const,
      },
      {
        taskId: 'task2',
        name: 'Design dashboard UI',
        storyPoints: 5,
        priority: 'medium' as const,
        skillRequirements: ['React', 'CSS'],
        dependencies: [],
        estimatedHours: 10,
        businessValue: 70,
        riskLevel: 'low' as const,
      },
    ];
  }

  private generateAssignmentSuggestion(task: any, capacityAnalysis: any): string {
    // Find team members with matching skills
    const matchingMembers = capacityAnalysis.individualCapacities.filter((ic: any) =>
      task.skillRequirements.some((skill: string) => ic.skillMatch.primarySkills.includes(skill)),
    );

    if (matchingMembers.length > 0) {
      const bestMatch = matchingMembers.reduce((best: any, current: any) =>
        current.skillMatch.skillUtilization > best.skillMatch.skillUtilization ? current : best,
      );
      return `Best fit: ${bestMatch.name} (${(bestMatch.skillMatch.skillUtilization * 100).toFixed(0)}% skill match)`;
    }

    return 'Consider cross-training or external resources';
  }

  private calculateSprintHealthGrade(sprintPlan: any, capacityAnalysis: any): 'A' | 'B' | 'C' | 'D' | 'F' {
    let score = 100;

    // Penalize high utilization
    if (sprintPlan.sprintMetrics.capacityUtilization > 0.9) score -= 20;
    else if (sprintPlan.sprintMetrics.capacityUtilization > 0.85) score -= 10;

    // Penalize high risk
    if (sprintPlan.sprintMetrics.riskScore > 70) score -= 15;
    else if (sprintPlan.sprintMetrics.riskScore > 50) score -= 8;

    // Penalize skill gaps
    score -= sprintPlan.capacityAnalysis.skillCapacityGaps.length * 5;

    // Penalize high-severity risk factors
    const highRiskFactors = capacityAnalysis.teamCapacity.riskFactors.filter((rf: any) => rf.severity === 'high');
    score -= highRiskFactors.length * 10;

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateKeyInsights(sprintPlan: any, velocityAnalysis: any, _capacityAnalysis: any): string[] {
    const insights = [];

    // Velocity insights
    if (velocityAnalysis.currentVelocity.trend === 'increasing') {
      insights.push(
        `Team velocity is trending upward (+${((
          velocityAnalysis.prediction.predictedVelocity /
          velocityAnalysis.currentVelocity.average -
          1
        )
          * 100).toFixed(0)}%)`,
      );
    } else if (velocityAnalysis.currentVelocity.trend === 'decreasing') {
      insights.push('Team velocity is declining - investigate potential blockers');
    }

    // Capacity insights
    if (sprintPlan.sprintMetrics.capacityUtilization > 0.85) {
      insights.push(
        `High capacity utilization (${(sprintPlan.sprintMetrics.capacityUtilization * 100).toFixed(
          0,
        )}%) - consider reducing scope`,
      );
    }

    // Risk insights
    if (sprintPlan.sprintMetrics.riskScore > 60) {
      insights.push(`Elevated sprint risk score (${sprintPlan.sprintMetrics.riskScore}/100) - review task complexity`);
    }

    // Business value insights
    insights.push(
      `Sprint delivers ${sprintPlan.sprintMetrics.totalBusinessValue} business value points across ${sprintPlan.recommendedTasks.length} tasks`,
    );

    return insights;
  }

  private generateCriticalRecommendations(sprintPlan: any, capacityAnalysis: any): string[] {
    const recommendations = [];

    // High-priority recommendations based on risk factors
    const highRiskFactors = capacityAnalysis.teamCapacity.riskFactors.filter((rf: any) => rf.severity === 'high');
    highRiskFactors.forEach((rf: any) => {
      recommendations.push(`CRITICAL: ${rf.factor} - ${rf.mitigation}`);
    });

    // Capacity recommendations
    if (sprintPlan.sprintMetrics.capacityUtilization > 0.9) {
      recommendations.push('Reduce sprint scope - current utilization exceeds safe limits');
    }

    // Skill gap recommendations
    if (sprintPlan.capacityAnalysis.skillCapacityGaps.length > 0) {
      recommendations.push(`Address skill gaps: ${sprintPlan.capacityAnalysis.skillCapacityGaps.join(', ')}`);
    }

    return recommendations;
  }

  private calculateSuccessProbability(sprintPlan: any, velocityAnalysis: any, capacityAnalysis: any): number {
    let probability = 85; // Base probability

    // Adjust based on capacity utilization
    if (sprintPlan.sprintMetrics.capacityUtilization > 0.9) probability -= 25;
    else if (sprintPlan.sprintMetrics.capacityUtilization > 0.85) probability -= 15;
    else if (sprintPlan.sprintMetrics.capacityUtilization < 0.7) probability -= 10;

    // Adjust based on risk score
    probability -= sprintPlan.sprintMetrics.riskScore * 0.3;

    // Adjust based on velocity confidence
    probability *= velocityAnalysis.metadata.analysisConfidence;

    // Adjust based on capacity confidence
    probability *= capacityAnalysis.teamCapacity.totalCapacity.confidenceLevel;

    return Math.max(10, Math.min(95, Math.round(probability)));
  }

  private determineConfidenceLevel(velocityAnalysis: any, capacityAnalysis: any): 'high' | 'medium' | 'low' {
    const avgConfidence = (velocityAnalysis.metadata.analysisConfidence + capacityAnalysis.metadata.dataQuality) / 2;

    if (avgConfidence >= 0.8) return 'high';
    if (avgConfidence >= 0.6) return 'medium';
    return 'low';
  }
}

/**
 * Factory function for creating SmartSprintPlanner instances
 */
export function createSmartSprintPlanner(): SmartSprintPlanner {
  return new SmartSprintPlanner();
}
