/**
 * Velocity Analysis Service
 * 
 * Analyzes historical sprint data to predict team velocity and capacity.
 * Provides intelligent insights for sprint planning optimization.
 * 
 * @version 4.0.0
 * @since Phase 1.2 - Smart Sprint Planner
 */

import { z } from 'zod';

// Input/Output Schemas
export const VelocityAnalysisInputSchema = z.object({
  teamId: z.string().describe('ClickUp team ID for analysis'),
  lookbackPeriod: z.number().min(1).max(52).default(12).describe('Number of weeks to analyze (1-52)'),
  includePartialSprints: z.boolean().default(false).describe('Include incomplete sprints in analysis'),
  adjustForTeamChanges: z.boolean().default(true).describe('Adjust for team composition changes'),
  seasonalAdjustment: z.boolean().default(true).describe('Apply seasonal variation adjustments'),
});

export const VelocityTrendSchema = z.object({
  period: z.string().describe('Time period (YYYY-MM-DD to YYYY-MM-DD)'),
  storyPoints: z.number().describe('Story points completed'),
  tasksCompleted: z.number().describe('Number of tasks completed'),
  teamSize: z.number().describe('Team size during period'),
  velocityPerPerson: z.number().describe('Velocity per team member'),
  confidence: z.number().min(0).max(1).describe('Confidence in data quality'),
});

export const VelocityPredictionSchema = z.object({
  predictedVelocity: z.number().describe('Predicted story points for next sprint'),
  confidenceInterval: z.object({
    lower: z.number().describe('Lower bound (80% confidence)'),
    upper: z.number().describe('Upper bound (80% confidence)'),
  }),
  factors: z.array(
    z.object({
      factor: z.string().describe('Factor affecting velocity'),
      impact: z.number().min(-1).max(1).describe('Impact on velocity (-1 to 1)'),
      description: z.string().describe('Explanation of factor impact'),
    }),
  ),
  seasonalAdjustment: z.number().describe('Seasonal adjustment factor'),
  teamCompositionImpact: z.number().describe('Team change impact factor'),
});

export const VelocityAnalysisResultSchema = z.object({
  teamId: z.string(),
  analysisDate: z.string().describe('ISO date of analysis'),
  historicalTrends: z.array(VelocityTrendSchema),
  currentVelocity: z.object({
    average: z.number().describe('Average velocity over lookback period'),
    median: z.number().describe('Median velocity (more stable metric)'),
    standardDeviation: z.number().describe('Velocity variability'),
    trend: z.enum(['increasing', 'stable', 'decreasing']).describe('Velocity trend direction'),
  }),
  prediction: VelocityPredictionSchema,
  recommendations: z.array(
    z.object({
      type: z.enum(['capacity', 'process', 'team', 'planning']),
      priority: z.enum(['high', 'medium', 'low']),
      title: z.string(),
      description: z.string(),
      expectedImpact: z.string().describe('Expected improvement from recommendation'),
    }),
  ),
  metadata: z.object({
    dataQuality: z.number().min(0).max(1).describe('Overall data quality score'),
    analysisConfidence: z.number().min(0).max(1).describe('Confidence in analysis results'),
    lastUpdated: z.string().describe('ISO timestamp of last data update'),
  }),
});

export type VelocityAnalysisInput = z.infer<typeof VelocityAnalysisInputSchema>;
export type VelocityAnalysisResult = z.infer<typeof VelocityAnalysisResultSchema>;
export type VelocityTrend = z.infer<typeof VelocityTrendSchema>;
export type VelocityPrediction = z.infer<typeof VelocityPredictionSchema>;

/**
 * Advanced velocity analysis service for sprint planning optimization
 */
export class VelocityAnalysisService {
  private readonly MINIMUM_DATA_POINTS = 3;
  private readonly SEASONAL_FACTORS = {
    Q1: 0.95, // January-March (post-holiday slowdown)
    Q2: 1.05, // April-June (peak productivity)
    Q3: 0.9, // July-September (vacation season)
    Q4: 0.85, // October-December (holidays)
  };

  /**
   * Analyzes team velocity patterns and predicts future capacity
   */
  async analyzeVelocity(input: VelocityAnalysisInput): Promise<VelocityAnalysisResult> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedInput = VelocityAnalysisInputSchema.parse(input);

      // Fetch historical sprint data
      const historicalData = await this.fetchHistoricalSprintData(validatedInput);

      // Calculate velocity trends
      const trends = await this.calculateVelocityTrends(historicalData);

      // Analyze current velocity metrics
      const currentVelocity = this.analyzeCurrentVelocity(trends);

      // Generate velocity prediction
      const prediction = await this.generateVelocityPrediction(trends, validatedInput);

      // Generate recommendations
      const recommendations = this.generateRecommendations(currentVelocity, prediction);

      // Calculate metadata
      const metadata = this.calculateAnalysisMetadata(trends, startTime);

      const result: VelocityAnalysisResult = {
        teamId: validatedInput.teamId,
        analysisDate: new Date().toISOString(),
        historicalTrends: trends,
        currentVelocity,
        prediction,
        recommendations,
        metadata,
      };

      return VelocityAnalysisResultSchema.parse(result);
    } catch (error) {
      console.error('[VelocityAnalysisService] Analysis failed:', error);
      throw new Error(`Velocity analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches historical sprint data from ClickUp API
   */
  private async fetchHistoricalSprintData(input: VelocityAnalysisInput): Promise<any[]> {
    // This would integrate with the ClickUp API to fetch:
    // - Sprint data (start/end dates, completed tasks)
    // - Task completion data with story points
    // - Team composition changes
    // - Time tracking data

    // For now, return mock data structure
    const mockData = [];
    const { lookbackPeriod } = input;
    const now = new Date();

    for (let i = lookbackPeriod; i > 0; i--) {
      const sprintStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const sprintEnd = new Date(sprintStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      mockData.push({
        sprintId: `sprint-${i}`,
        startDate: sprintStart.toISOString(),
        endDate: sprintEnd.toISOString(),
        storyPoints: Math.floor(Math.random() * 30) + 20, // 20-50 points
        tasksCompleted: Math.floor(Math.random() * 15) + 10, // 10-25 tasks
        teamSize: 5 + Math.floor(Math.random() * 3), // 5-8 people
        isComplete: i > 1 || input.includePartialSprints,
      });
    }

    return mockData.filter(sprint => sprint.isComplete);
  }

  /**
   * Calculates velocity trends from historical data
   */
  private async calculateVelocityTrends(historicalData: any[]): Promise<VelocityTrend[]> {
    return historicalData.map(sprint => {
      const velocityPerPerson = sprint.storyPoints / sprint.teamSize;
      const confidence = this.calculateDataConfidence(sprint);

      return {
        period: `${sprint.startDate.split('T')[0]} to ${sprint.endDate.split('T')[0]}`,
        storyPoints: sprint.storyPoints,
        tasksCompleted: sprint.tasksCompleted,
        teamSize: sprint.teamSize,
        velocityPerPerson,
        confidence,
      };
    });
  }

  /**
   * Analyzes current velocity metrics
   */
  private analyzeCurrentVelocity(trends: VelocityTrend[]) {
    if (trends.length === 0) {
      throw new Error('Insufficient data for velocity analysis');
    }

    const velocities = trends.map(t => t.storyPoints);
    const average = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const sortedVelocities = [...velocities].sort((a, b) => a - b);
    const median = sortedVelocities[Math.floor(sortedVelocities.length / 2)];

    // Calculate standard deviation
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / velocities.length;
    const standardDeviation = Math.sqrt(variance);

    // Determine trend direction
    const recentTrends = trends.slice(-Math.min(4, trends.length));
    const firstHalf = recentTrends.slice(0, Math.ceil(recentTrends.length / 2));
    const secondHalf = recentTrends.slice(Math.ceil(recentTrends.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.storyPoints, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.storyPoints, 0) / secondHalf.length;

    let trend: 'increasing' | 'stable' | 'decreasing';
    const trendDiff = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

    if (trendDiff > 0.1) trend = 'increasing';
    else if (trendDiff < -0.1) trend = 'decreasing';
    else trend = 'stable';

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      trend,
    };
  }

  /**
   * Generates velocity prediction for next sprint
   */
  private async generateVelocityPrediction(trends: VelocityTrend[], input: VelocityAnalysisInput): Promise<VelocityPrediction> {
    const recentTrends = trends.slice(-6); // Last 6 sprints
    const baseVelocity = recentTrends.reduce((sum, t) => sum + t.storyPoints, 0) / recentTrends.length;

    // Apply seasonal adjustment
    const currentQuarter = this.getCurrentQuarter();
    const seasonalAdjustment = input.seasonalAdjustment ? this.SEASONAL_FACTORS[currentQuarter] : 1.0;

    // Apply team composition adjustment
    const teamCompositionImpact = input.adjustForTeamChanges ? this.calculateTeamCompositionImpact(trends) : 1.0;

    // Calculate predicted velocity
    const predictedVelocity = Math.round(baseVelocity * seasonalAdjustment * teamCompositionImpact);

    // Calculate confidence interval
    const standardDeviation = this.calculateVelocityStandardDeviation(recentTrends);
    const confidenceInterval = {
      lower: Math.max(0, Math.round(predictedVelocity - 1.28 * standardDeviation)), // 80% confidence
      upper: Math.round(predictedVelocity + 1.28 * standardDeviation),
    };

    // Identify factors affecting velocity
    const factors = [
      {
        factor: 'Historical Performance',
        impact: 0.8,
        description: `Based on ${recentTrends.length} recent sprints with average ${Math.round(baseVelocity)} points`,
      },
      {
        factor: 'Seasonal Variation',
        impact: seasonalAdjustment - 1,
        description: `${currentQuarter} seasonal adjustment: ${((seasonalAdjustment - 1) * 100).toFixed(1)}%`,
      },
      {
        factor: 'Team Composition',
        impact: teamCompositionImpact - 1,
        description: `Team stability impact: ${((teamCompositionImpact - 1) * 100).toFixed(1)}%`,
      },
    ];

    return {
      predictedVelocity,
      confidenceInterval,
      factors,
      seasonalAdjustment,
      teamCompositionImpact,
    };
  }

  /**
   * Generates actionable recommendations
   */
  private generateRecommendations(currentVelocity: any, prediction: VelocityPrediction) {
    const recommendations = [];

    // High variability recommendation
    if (currentVelocity.standardDeviation > currentVelocity.average * 0.3) {
      recommendations.push({
        type: 'process' as const,
        priority: 'high' as const,
        title: 'Reduce Velocity Variability',
        description:
          'High velocity variability detected. Consider improving sprint planning consistency and task estimation accuracy.',
        expectedImpact: 'Reduce planning uncertainty by 20-30%',
      });
    }

    // Declining trend recommendation
    if (currentVelocity.trend === 'decreasing') {
      recommendations.push({
        type: 'team' as const,
        priority: 'high' as const,
        title: 'Address Declining Velocity',
        description:
          'Velocity has been declining. Investigate potential blockers, team satisfaction, or technical debt issues.',
        expectedImpact: 'Stabilize or improve velocity by 15-25%',
      });
    }

    // Low confidence recommendation
    if (prediction.confidenceInterval.upper - prediction.confidenceInterval.lower > currentVelocity.average) {
      recommendations.push({
        type: 'planning' as const,
        priority: 'medium' as const,
        title: 'Improve Estimation Accuracy',
        description: 'Wide prediction interval suggests inconsistent estimation. Consider story point calibration sessions.',
        expectedImpact: 'Improve planning accuracy by 10-20%',
      });
    }

    // Capacity optimization recommendation
    recommendations.push({
      type: 'capacity' as const,
      priority: 'medium' as const,
      title: 'Optimize Sprint Capacity',
      description: `Plan for ${prediction.predictedVelocity} story points with buffer for ${prediction.confidenceInterval.lower}-${prediction.confidenceInterval.upper} range.`,
      expectedImpact: 'Improve sprint success rate by 15-30%',
    });

    return recommendations;
  }

  /**
   * Calculates analysis metadata
   */
  private calculateAnalysisMetadata(trends: VelocityTrend[], _startTime: number) {
    const dataQuality =
      trends.length >= this.MINIMUM_DATA_POINTS
        ? Math.min(1.0, trends.length / 8) // Optimal with 8+ data points
        : (trends.length / this.MINIMUM_DATA_POINTS) * 0.6; // Reduced quality with fewer points

    const avgConfidence = trends.reduce((sum, t) => sum + t.confidence, 0) / trends.length;
    const analysisConfidence = Math.min(dataQuality, avgConfidence);

    return {
      dataQuality: Math.round(dataQuality * 100) / 100,
      analysisConfidence: Math.round(analysisConfidence * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Helper methods
   */
  private calculateDataConfidence(sprint: any): number {
    // Factors affecting confidence:
    // - Sprint completion (complete sprints = higher confidence)
    // - Data recency (recent data = higher confidence)
    // - Team stability (stable team = higher confidence)

    let confidence = 0.8; // Base confidence

    if (sprint.isComplete) confidence += 0.1;
    if (sprint.teamSize >= 5) confidence += 0.05; // Larger teams = more stable data
    if (sprint.storyPoints > 0) confidence += 0.05; // Has story point data

    return Math.min(1.0, confidence);
  }

  private getCurrentQuarter(): keyof typeof VelocityAnalysisService.prototype.SEASONAL_FACTORS {
    const month = new Date().getMonth() + 1; // 1-12
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  }

  private calculateTeamCompositionImpact(trends: VelocityTrend[]): number {
    if (trends.length < 2) return 1.0;

    const recentTeamSizes = trends.slice(-3).map(t => t.teamSize);
    const earlierTeamSizes = trends.slice(0, -3).map(t => t.teamSize);

    if (earlierTeamSizes.length === 0) return 1.0;

    const recentAvg = recentTeamSizes.reduce((sum, size) => sum + size, 0) / recentTeamSizes.length;
    const earlierAvg = earlierTeamSizes.reduce((sum, size) => sum + size, 0) / earlierTeamSizes.length;

    // Team size changes impact velocity (new members need ramp-up time)
    const sizeChange = (recentAvg - earlierAvg) / earlierAvg;

    if (sizeChange > 0.2) return 0.85; // Significant team growth = temporary velocity reduction
    if (sizeChange < -0.2) return 1.1; // Team reduction = temporary velocity increase per person

    return 1.0; // Stable team
  }

  private calculateVelocityStandardDeviation(trends: VelocityTrend[]): number {
    const velocities = trends.map(t => t.storyPoints);
    const average = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / velocities.length;
    return Math.sqrt(variance);
  }
}

/**
 * Factory function for creating VelocityAnalysisService instances
 */
export function createVelocityAnalysisService(): VelocityAnalysisService {
  return new VelocityAnalysisService();
}
