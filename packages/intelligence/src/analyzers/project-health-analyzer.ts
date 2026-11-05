/* eslint-disable no-console, max-len */
/**
 * Project Health Analyzer
 * 
 * Analyzes the overall health of ClickUp projects by examining:
 * - Task completion rates and velocity trends
 * - Workload distribution and team balance
 * - Dependency health and bottlenecks
 * - Quality indicators and timeline adherence
 * - Risk assessment and actionable recommendations
 */

import axios from 'axios';
import { ProjectHealthMetrics, ClickUpTask } from '@chykalophia/clickup-mcp-shared';
import { HealthMetricsService, DetailedHealthMetrics, RiskAssessment } from '../services/health-metrics-service.js';

export interface ProjectHealthAnalysisParams {
  workspace_id: string;
  space_id?: string;
  list_id?: string;
  include_archived?: boolean;
  analysis_depth?: 'basic' | 'detailed' | 'comprehensive';
}

export interface ProjectHealthAnalysisResult {
  summary: {
    overallScore: number;
    healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
  metrics: DetailedHealthMetrics;
  risks: RiskAssessment[];
  insights: {
    keyStrengths: string[];
    criticalIssues: string[];
    improvementAreas: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  trends: {
    velocityTrend: 'improving' | 'stable' | 'declining';
    qualityTrend: 'improving' | 'stable' | 'declining';
    timelineTrend: 'improving' | 'stable' | 'declining';
  };
}

export class ProjectHealthAnalyzer {
  private apiToken: string;
  private baseURL = 'https://api.clickup.com/api/v2';
  private healthMetricsService: HealthMetricsService;

  constructor() {
    this.apiToken = process.env.CLICKUP_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('CLICKUP_API_TOKEN environment variable is required');
    }
    this.healthMetricsService = new HealthMetricsService();
  }

  /**
   * Analyze project health with comprehensive metrics and insights
   */
  async analyzeProjectHealth(params: ProjectHealthAnalysisParams): Promise<ProjectHealthAnalysisResult> {
    try {
      console.error(`[ProjectHealthAnalyzer] Starting analysis for workspace: ${params.workspace_id}`);
      
      const tasks = await this.fetchTasks(params);
      const teamMembers = await this.fetchTeamMembers(params.workspace_id);
      
      console.error(`[ProjectHealthAnalyzer] Analyzing ${tasks.length} tasks with ${teamMembers.length} team members`);
      
      const metrics = this.healthMetricsService.calculateHealthScore({
        tasks,
        workspaceId: params.workspace_id,
        teamMembers,
        timeframe: this.getAnalysisTimeframe(params.analysis_depth),
      });

      const risks = this.healthMetricsService.analyzeRisks(metrics);

      const insights = this.generateInsights(metrics, risks);

      const recommendations = this.categorizeRecommendations(metrics.recommendations, risks);

      const trends = this.analyzeTrends(metrics);

      const summary = this.createSummary(metrics);

      console.error(`[ProjectHealthAnalyzer] Analysis complete. Overall score: ${summary.overallScore}`);

      return {
        summary,
        metrics,
        risks,
        insights,
        recommendations,
        trends,
      };

    } catch (error) {
      console.error('[ProjectHealthAnalyzer] Analysis failed:', error);
      throw new Error(`Project health analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async analyzeProjectHealthLegacy(params: ProjectHealthAnalysisParams): Promise<ProjectHealthMetrics> {
    const result = await this.analyzeProjectHealth(params);
    return {
      overallScore: result.summary.overallScore,
      taskCompletionRate: result.metrics.taskCompletionRate,
      overdueTasksCount: result.metrics.overdueTasksCount,
      blockedTasksCount: result.metrics.blockedTasksCount,
      averageTaskAge: result.metrics.averageTaskAge,
      teamVelocity: result.metrics.teamVelocity,
      riskFactors: result.metrics.riskFactors,
      recommendations: result.metrics.recommendations,
    };
  }

  private async fetchTasks(params: ProjectHealthAnalysisParams): Promise<ClickUpTask[]> {
    const headers = {
      'Authorization': this.apiToken,
      'Content-Type': 'application/json',
    };

    // `statuses` is omitted on purpose: the API rejects a scalar (400 PUBAPITASK_014
    // "statuses must be an array"), and omitting it already returns every status.
    const queryParams = new URLSearchParams({
      archived: params.include_archived ? 'true' : 'false',
      page: '0',
      order_by: 'created',
      reverse: 'true',
      subtasks: 'true',
      include_closed: 'true',
    });

    let endpoint = '';

    if (params.list_id) {
      endpoint = `${this.baseURL}/list/${params.list_id}/task`;
    } else {
      // Space scoping uses the team-tasks endpoint with space_ids[]: ClickUp v2 has
      // no GET /space/{space_id}/task (it returns 404).
      endpoint = `${this.baseURL}/team/${params.workspace_id}/task`;
      if (params.space_id) {
        queryParams.append('space_ids[]', params.space_id);
      }
    }

    const response = await axios.get(`${endpoint}?${queryParams}`, { headers });
    return response.data.tasks || [];
  }

  private async fetchTeamMembers(workspaceId: string): Promise<Array<{ id: number; username: string; email: string }>> {
    try {
      const headers = {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
      };

      const response = await axios.get(`${this.baseURL}/team/${workspaceId}/member`, { headers });
      return response.data.members?.map((member: any) => ({
        id: member.user.id,
        username: member.user.username,
        email: member.user.email,
      })) || [];
    } catch (error) {
      console.warn('[ProjectHealthAnalyzer] Failed to fetch team members:', error);
      return [];
    }
  }

  private getAnalysisTimeframe(depth?: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (depth) {
    case 'basic':
      startDate.setDate(endDate.getDate() - 7); // Last week
      break;
    case 'comprehensive':
      startDate.setDate(endDate.getDate() - 90); // Last 3 months
      break;
    case 'detailed':
    default:
      startDate.setDate(endDate.getDate() - 30); // Last month
      break;
    }

    return { startDate, endDate };
  }

  private generateInsights(metrics: DetailedHealthMetrics, risks: RiskAssessment[]): ProjectHealthAnalysisResult['insights'] {
    const keyStrengths: string[] = [];
    const criticalIssues: string[] = [];
    const improvementAreas: string[] = [];

    if (metrics.taskCompletionRate >= 80) {
      keyStrengths.push(`High task completion rate (${metrics.taskCompletionRate}%)`);
    }
    if (metrics.velocityTrend.trend === 'increasing') {
      keyStrengths.push(`Improving team velocity (+${metrics.velocityTrend.current - metrics.velocityTrend.previous} points)`);
    }
    if (metrics.workloadDistribution.balanced) {
      keyStrengths.push('Well-balanced team workload distribution');
    }
    if (metrics.qualityIndicators.qualityScore >= 80) {
      keyStrengths.push(`High quality standards (${Math.round(metrics.qualityIndicators.qualityScore)}% quality score)`);
    }

    const criticalRisks = risks.filter(r => r.level === 'critical');
    criticalRisks.forEach(risk => {
      criticalIssues.push(risk.description);
    });

    if (metrics.overdueTasksCount > 10) {
      criticalIssues.push(`High number of overdue tasks (${metrics.overdueTasksCount})`);
    }

    if (metrics.timelineAdherence.adherenceScore < 70) {
      improvementAreas.push('Timeline adherence needs improvement');
    }
    if (metrics.dependencyHealth.healthScore < 70) {
      improvementAreas.push('Dependency management requires attention');
    }
    if (!metrics.workloadDistribution.balanced) {
      improvementAreas.push('Workload distribution optimization needed');
    }

    return {
      keyStrengths,
      criticalIssues,
      improvementAreas,
    };
  }

  private categorizeRecommendations(
    recommendations: string[], 
    risks: RiskAssessment[]
  ): ProjectHealthAnalysisResult['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    const criticalRisks = risks.filter(r => r.level === 'critical');
    const highRisks = risks.filter(r => r.level === 'high');

    criticalRisks.forEach(risk => {
      immediate.push(risk.recommendation);
    });

    highRisks.forEach(risk => {
      shortTerm.push(risk.recommendation);
    });

    recommendations.forEach(rec => {
      if (rec.includes('immediately') || rec.includes('urgent')) {
        immediate.push(rec);
      } else if (rec.includes('review') || rec.includes('implement')) {
        shortTerm.push(rec);
      } else {
        longTerm.push(rec);
      }
    });

    if (immediate.length === 0 && criticalRisks.length === 0) {
      immediate.push('Continue monitoring project health metrics');
    }
    if (shortTerm.length === 0) {
      shortTerm.push('Review and optimize current processes');
    }
    if (longTerm.length === 0) {
      longTerm.push('Establish continuous improvement practices');
    }

    return {
      immediate: [...new Set(immediate)],
      shortTerm: [...new Set(shortTerm)],
      longTerm: [...new Set(longTerm)],
    };
  }

  private analyzeTrends(metrics: DetailedHealthMetrics): ProjectHealthAnalysisResult['trends'] {
    return {
      velocityTrend: metrics.velocityTrend.trend === 'increasing' ? 'improving' :
        metrics.velocityTrend.trend === 'decreasing' ? 'declining' : 'stable',
      qualityTrend: metrics.qualityIndicators.qualityScore >= 75 ? 'improving' :
        metrics.qualityIndicators.qualityScore <= 60 ? 'declining' : 'stable',
      timelineTrend: metrics.timelineAdherence.adherenceScore >= 80 ? 'improving' :
        metrics.timelineAdherence.adherenceScore <= 60 ? 'declining' : 'stable',
    };
  }

  private createSummary(metrics: DetailedHealthMetrics): ProjectHealthAnalysisResult['summary'] {
    const score = metrics.overallScore;
    
    let healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

    if (score >= 90) {
      healthGrade = 'A';
      status = 'excellent';
    } else if (score >= 80) {
      healthGrade = 'B';
      status = 'good';
    } else if (score >= 70) {
      healthGrade = 'C';
      status = 'fair';
    } else if (score >= 60) {
      healthGrade = 'D';
      status = 'poor';
    } else {
      healthGrade = 'F';
      status = 'critical';
    }

    return {
      overallScore: score,
      healthGrade,
      status,
    };
  }
}
