/* eslint-disable max-len */
import { z } from 'zod';
import { ResourceOptimizationService } from '../services/resource-optimization-service-impl.js';
import {
  TeamMember,
  Task,
  WorkloadAnalysis,
  AssignmentPlan,
  BurnoutRisk,
  CapacityForecast,
  ResourceRecommendations,
  SkillCategory,
  SkillImportance,
  BurnoutRiskLevel,
  WorkingStyle,
  CollaborationPreference,
  TrendDirection
} from '../services/resource-optimization-service.js';

// Zod schemas for validation
const SkillSchema = z.object({
  name: z.string(),
  proficiency: z.number().min(1).max(10),
  category: z.nativeEnum(SkillCategory),
  yearsExperience: z.number().min(0),
  lastUsed: z.string().transform(str => new Date(str)),
  certifications: z.array(z.string()).default([])
});

const RequiredSkillSchema = z.object({
  name: z.string(),
  minimumProficiency: z.number().min(1).max(10),
  importance: z.nativeEnum(SkillImportance),
  isRequired: z.boolean()
});

const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  skills: z.array(SkillSchema),
  capacity: z.number().min(0).max(80), // hours per week
  currentWorkload: z.number().min(0),
  availability: z.object({
    hoursPerWeek: z.number().min(0).max(80),
    workingDays: z.array(z.number().min(0).max(6)),
    timeZone: z.string(),
    vacationDays: z.array(z.string().transform(str => new Date(str))).default([]),
    unavailablePeriods: z.array(z.object({
      startDate: z.string().transform(str => new Date(str)),
      endDate: z.string().transform(str => new Date(str)),
      reason: z.string()
    })).default([])
  }),
  preferences: z.object({
    preferredTaskTypes: z.array(z.string()).default([]),
    learningGoals: z.array(z.string()).default([]),
    avoidTaskTypes: z.array(z.string()).default([]),
    workingStyle: z.nativeEnum(WorkingStyle),
    collaborationPreference: z.nativeEnum(CollaborationPreference)
  }),
  performanceMetrics: z.object({
    taskCompletionRate: z.number().min(0).max(1),
    averageTaskTime: z.number().min(0),
    qualityScore: z.number().min(0).max(100),
    collaborationScore: z.number().min(0).max(100),
    learningVelocity: z.number().min(0),
    burnoutIndicators: z.array(z.object({
      indicator: z.string(),
      value: z.number(),
      threshold: z.number(),
      trend: z.nativeEnum(TrendDirection)
    })).default([])
  }),
  burnoutRisk: z.nativeEnum(BurnoutRiskLevel)
});

const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  estimatedEffort: z.number().min(0),
  requiredSkills: z.array(RequiredSkillSchema),
  priority: z.number().min(1).max(4),
  complexity: z.number().min(1).max(10),
  deadline: z.string().transform(str => new Date(str)).optional(),
  dependencies: z.array(z.string()).default([]),
  currentAssignee: z.string().optional()
});

const WorkloadAnalysisInputSchema = z.object({
  teamId: z.string().describe('The ID of the team to analyze'),
  teamMembers: z.array(TeamMemberSchema).describe('Array of team members to analyze'),
  includeRecommendations: z.boolean().default(true).describe('Include optimization recommendations'),
  analysisDepth: z.enum(['basic', 'standard', 'comprehensive']).default('standard').describe('Depth of analysis to perform')
});

const TaskAssignmentInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('Array of tasks to assign'),
  teamMembers: z.array(TeamMemberSchema).describe('Array of available team members'),
  optimizationGoals: z.object({
    balanceWorkload: z.number().min(0).max(1).default(0.4).describe('Weight for workload balance (0-1)'),
    maximizeSkillMatch: z.number().min(0).max(1).default(0.4).describe('Weight for skill matching (0-1)'),
    developSkills: z.number().min(0).max(1).default(0.2).describe('Weight for skill development (0-1)')
  }).default({}),
  constraints: z.object({
    maxUtilization: z.number().min(0).max(2).default(1.0).describe('Maximum utilization rate per member'),
    respectPreferences: z.boolean().default(true).describe('Consider member preferences'),
    allowOverallocation: z.boolean().default(false).describe('Allow temporary overallocation')
  }).default({})
});

const BurnoutAnalysisInputSchema = z.object({
  teamMember: TeamMemberSchema.describe('Team member to analyze for burnout risk'),
  historicalData: z.object({
    workloadHistory: z.array(z.object({
      date: z.string().transform(str => new Date(str)),
      workload: z.number(),
      stress: z.number().min(1).max(10).optional()
    })).default([]),
    performanceHistory: z.array(z.object({
      date: z.string().transform(str => new Date(str)),
      completionRate: z.number().min(0).max(1),
      qualityScore: z.number().min(0).max(100)
    })).default([])
  }).optional(),
  includePreventionPlan: z.boolean().default(true).describe('Include burnout prevention recommendations')
});

const CapacityForecastInputSchema = z.object({
  teamMembers: z.array(TeamMemberSchema).describe('Array of team members to forecast'),
  timeframe: z.string().describe('Forecast timeframe (e.g., "3 months", "1 quarter", "6 weeks")'),
  scenarios: z.array(z.object({
    name: z.string(),
    assumptions: z.record(z.any())
  })).default([]).describe('Different scenarios to forecast'),
  includeHiringRecommendations: z.boolean().default(true).describe('Include hiring recommendations')
});

/**
 * Resource Optimizer - Intelligent team workload balancing and optimization
 */
export class ResourceOptimizer {
  private resourceOptimizationService: ResourceOptimizationService;

  constructor() {
    this.resourceOptimizationService = new ResourceOptimizationService();
  }

  /**
   * Analyze team workload distribution and identify optimization opportunities
   */
  async analyzeTeamWorkload(
    input: z.infer<typeof WorkloadAnalysisInputSchema>
  ): Promise<WorkloadAnalysis> {
    const validatedInput = WorkloadAnalysisInputSchema.parse(input);
    
    try {
      const analysis = await this.resourceOptimizationService.analyzeTeamWorkload(
        validatedInput.teamId,
        validatedInput.teamMembers as TeamMember[]
      );

      // Enhance analysis based on depth setting
      if (validatedInput.analysisDepth === 'comprehensive') {
        // Add detailed skill utilization analysis
        // Add predictive burnout modeling
        // Add cross-team comparison metrics
      }

      return analysis;
    } catch (error) {
      throw new Error(`Workload analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize task assignment across team members
   */
  async optimizeTaskAssignment(
    input: z.infer<typeof TaskAssignmentInputSchema>
  ): Promise<AssignmentPlan> {
    const validatedInput = TaskAssignmentInputSchema.parse(input);
    
    try {
      const assignmentPlan = await this.resourceOptimizationService.optimizeTaskAssignment(
        validatedInput.tasks as Task[],
        validatedInput.teamMembers as TeamMember[]
      );

      return assignmentPlan;
    } catch (error) {
      throw new Error(`Task assignment optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze burnout risk for a team member
   */
  async analyzeBurnoutRisk(
    input: z.infer<typeof BurnoutAnalysisInputSchema>
  ): Promise<BurnoutRisk> {
    const validatedInput = BurnoutAnalysisInputSchema.parse(input);
    
    try {
      const burnoutRisk = await this.resourceOptimizationService.detectBurnoutRisk(
        validatedInput.teamMember as TeamMember
      );

      return burnoutRisk;
    } catch (error) {
      throw new Error(`Burnout risk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Forecast team capacity for future periods
   */
  async forecastCapacity(
    input: z.infer<typeof CapacityForecastInputSchema>
  ): Promise<CapacityForecast> {
    const validatedInput = CapacityForecastInputSchema.parse(input);
    
    try {
      const forecast = await this.resourceOptimizationService.forecastCapacity(
        validatedInput.teamMembers as TeamMember[],
        validatedInput.timeframe
      );

      return forecast;
    } catch (error) {
      throw new Error(`Capacity forecasting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive resource optimization recommendations
   */
  async generateResourceRecommendations(
    workloadAnalysis: WorkloadAnalysis,
    assignmentPlan?: AssignmentPlan
  ): Promise<ResourceRecommendations> {
    try {
      const recommendations = await this.resourceOptimizationService.recommendResourceActions(
        workloadAnalysis,
        assignmentPlan
      );

      return recommendations;
    } catch (error) {
      throw new Error(`Resource recommendations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export MCP tools for integration
export const workloadAnalysisTool = {
  name: 'analyze_team_workload',
  description: '⚖️ **TEAM WORKLOAD ANALYZER** - Comprehensive analysis of team workload distribution, capacity utilization, and resource bottlenecks. Identifies optimization opportunities and provides actionable recommendations for balanced team productivity.',
  inputSchema: WorkloadAnalysisInputSchema,
  handler: async (params: z.infer<typeof WorkloadAnalysisInputSchema>) => {
    const optimizer = new ResourceOptimizer();
    const result = await optimizer.analyzeTeamWorkload(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};

export const taskAssignmentTool = {
  name: 'optimize_task_assignment',
  description: '🎯 **TASK ASSIGNMENT OPTIMIZER** - AI-powered task assignment optimization that balances workload, maximizes skill matching, and promotes team development. Uses constraint satisfaction algorithms for optimal resource allocation.',
  inputSchema: TaskAssignmentInputSchema,
  handler: async (params: z.infer<typeof TaskAssignmentInputSchema>) => {
    const optimizer = new ResourceOptimizer();
    const result = await optimizer.optimizeTaskAssignment(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};

export const burnoutAnalysisTool = {
  name: 'analyze_burnout_risk',
  description: '🚨 **BURNOUT RISK ANALYZER** - Advanced burnout risk assessment using workload patterns, performance metrics, and early warning indicators. Provides personalized prevention strategies and intervention recommendations.',
  inputSchema: BurnoutAnalysisInputSchema,
  handler: async (params: z.infer<typeof BurnoutAnalysisInputSchema>) => {
    const optimizer = new ResourceOptimizer();
    const result = await optimizer.analyzeBurnoutRisk(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};

export const capacityForecastTool = {
  name: 'forecast_team_capacity',
  description: '📈 **CAPACITY FORECASTING** - Predictive capacity analysis for future resource planning. Identifies potential bottlenecks, resource needs, and hiring recommendations based on historical trends and growth projections.',
  inputSchema: CapacityForecastInputSchema,
  handler: async (params: z.infer<typeof CapacityForecastInputSchema>) => {
    const optimizer = new ResourceOptimizer();
    const result = await optimizer.forecastCapacity(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
};
