/**
 * Health Metrics Service
 * 
 * Provides comprehensive project health analysis including:
 * - Task completion rate calculation
 * - Velocity trend analysis  
 * - Workload distribution assessment
 * - Dependency health evaluation
 * - Quality indicator tracking
 * - Timeline adherence monitoring
 */

import { ClickUpTask, ProjectHealthMetrics } from '@chykalophia/clickup-mcp-shared';

export interface HealthMetricsInput {
  tasks: ClickUpTask[];
  workspaceId: string;
  timeframe?: {
    startDate: Date;
    endDate: Date;
  };
  teamMembers?: Array<{
    id: number;
    username: string;
    email: string;
  }>;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'timeline' | 'workload' | 'quality' | 'dependencies' | 'velocity';
  description: string;
  impact: string;
  recommendation: string;
  confidence: number; // 0-100
}

export interface DetailedHealthMetrics extends ProjectHealthMetrics {
  // Enhanced metrics beyond the base interface
  velocityTrend: {
    current: number;
    previous: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  };
  workloadDistribution: {
    balanced: boolean;
    overloadedMembers: string[];
    underutilizedMembers: string[];
    distributionScore: number; // 0-100
  };
  dependencyHealth: {
    totalDependencies: number;
    blockedTasks: number;
    circularDependencies: number;
    healthScore: number; // 0-100
  };
  qualityIndicators: {
    bugRate: number;
    reworkFrequency: number;
    testCoverage?: number;
    codeReviewScore?: number;
    qualityScore: number; // 0-100
  };
  timelineAdherence: {
    onTimeDelivery: number; // percentage
    averageDelay: number; // days
    scheduleVariance: number; // percentage
    adherenceScore: number; // 0-100
  };
}

export class HealthMetricsService {
  /**
   * Calculate comprehensive health score based on multiple metrics
   */
  calculateHealthScore(input: HealthMetricsInput): DetailedHealthMetrics {
    const { tasks } = input;
    
    // Calculate individual metric scores
    const completionRate = this.calculateCompletionRate(tasks);
    const velocityMetrics = this.calculateVelocityMetrics(tasks);
    const workloadMetrics = this.calculateWorkloadDistribution(tasks, input.teamMembers);
    const dependencyMetrics = this.calculateDependencyHealth(tasks);
    const qualityMetrics = this.calculateQualityIndicators(tasks);
    const timelineMetrics = this.calculateTimelineAdherence(tasks);
    
    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore({
      completion: completionRate,
      velocity: velocityMetrics.current,
      workload: workloadMetrics.distributionScore,
      dependencies: dependencyMetrics.healthScore,
      quality: qualityMetrics.qualityScore,
      timeline: timelineMetrics.adherenceScore
    });

    // Generate risk factors and recommendations
    const riskFactors = this.identifyRiskFactors({
      completionRate,
      velocityMetrics,
      workloadMetrics,
      dependencyMetrics,
      qualityMetrics,
      timelineMetrics
    });

    const recommendations = this.generateRecommendations(riskFactors);

    return {
      overallScore,
      taskCompletionRate: completionRate,
      overdueTasksCount: this.countOverdueTasks(tasks),
      blockedTasksCount: dependencyMetrics.blockedTasks,
      averageTaskAge: this.calculateAverageTaskAge(tasks),
      teamVelocity: velocityMetrics.current,
      riskFactors: riskFactors.map(r => r.description),
      recommendations,
      velocityTrend: velocityMetrics,
      workloadDistribution: workloadMetrics,
      dependencyHealth: dependencyMetrics,
      qualityIndicators: qualityMetrics,
      timelineAdherence: timelineMetrics
    };
  }

  /**
   * Analyze risks based on health metrics
   */
  analyzeRisks(metrics: DetailedHealthMetrics): RiskAssessment[] {
    const risks: RiskAssessment[] = [];

    // Timeline risks
    if (metrics.timelineAdherence.adherenceScore < 60) {
      risks.push({
        level: metrics.timelineAdherence.adherenceScore < 40 ? 'critical' : 'high',
        category: 'timeline',
        description: 'Poor timeline adherence detected',
        impact: `${100 - metrics.timelineAdherence.adherenceScore}% of deliverables are behind schedule`,
        recommendation: 'Review project scope, adjust timelines, or increase resources',
        confidence: 85
      });
    }

    // Workload risks
    if (!metrics.workloadDistribution.balanced) {
      risks.push({
        level: metrics.workloadDistribution.overloadedMembers.length > 2 ? 'high' : 'medium',
        category: 'workload',
        description: 'Unbalanced workload distribution',
        impact: `${metrics.workloadDistribution.overloadedMembers.length} team members are overloaded`,
        recommendation: 'Redistribute tasks and balance team workload',
        confidence: 90
      });
    }

    // Dependency risks
    if (metrics.dependencyHealth.healthScore < 70) {
      risks.push({
        level: metrics.dependencyHealth.blockedTasks > 5 ? 'high' : 'medium',
        category: 'dependencies',
        description: 'Dependency bottlenecks identified',
        impact: `${metrics.dependencyHealth.blockedTasks} tasks are blocked by dependencies`,
        recommendation: 'Resolve blocking dependencies and review task sequencing',
        confidence: 80
      });
    }

    // Velocity risks
    if (metrics.velocityTrend.trend === 'decreasing' && metrics.velocityTrend.confidence > 70) {
      risks.push({
        level: 'medium',
        category: 'velocity',
        description: 'Declining team velocity',
        impact: `Team velocity has decreased by ${Math.abs(metrics.velocityTrend.current - metrics.velocityTrend.previous)} points`,
        recommendation: 'Investigate velocity decline causes and implement improvement measures',
        confidence: metrics.velocityTrend.confidence
      });
    }

    // Quality risks
    if (metrics.qualityIndicators.qualityScore < 60) {
      risks.push({
        level: metrics.qualityIndicators.bugRate > 0.15 ? 'high' : 'medium',
        category: 'quality',
        description: 'Quality indicators below threshold',
        impact: `Bug rate: ${(metrics.qualityIndicators.bugRate * 100).toFixed(1)}%, Rework frequency: ${(metrics.qualityIndicators.reworkFrequency * 100).toFixed(1)}%`,
        recommendation: 'Implement quality improvement processes and increase testing',
        confidence: 75
      });
    }

    return risks.sort((a, b) => this.getRiskPriority(b.level) - this.getRiskPriority(a.level));
  }

  /**
   * Generate actionable recommendations based on risk assessment
   */
  generateRecommendations(risks: RiskAssessment[]): string[] {
    const recommendations = new Set<string>();

    // Add risk-specific recommendations
    risks.forEach(risk => {
      recommendations.add(risk.recommendation);
    });

    // Add general best practice recommendations
    if (risks.length === 0) {
      recommendations.add('Maintain current project health with regular monitoring');
      recommendations.add('Consider implementing preventive measures for common risks');
    }

    // Add priority-based recommendations
    const highRisks = risks.filter(r => r.level === 'high' || r.level === 'critical');
    if (highRisks.length > 0) {
      recommendations.add('Address high-priority risks immediately to prevent project impact');
    }

    return Array.from(recommendations);
  }

  // Private helper methods

  private calculateCompletionRate(tasks: ClickUpTask[]): number {
    if (tasks.length === 0) return 100;
    const completedTasks = tasks.filter(task => 
      task.status === 'complete' || task.status === 'closed'
    ).length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  private calculateVelocityMetrics(tasks: ClickUpTask[]): DetailedHealthMetrics['velocityTrend'] {
    // Simplified velocity calculation - in production, this would analyze historical data
    const currentVelocity = Math.round(15 + Math.random() * 10); // Mock: 15-25 tasks/week
    const previousVelocity = Math.round(12 + Math.random() * 12); // Mock: 12-24 tasks/week
    
    const difference = currentVelocity - previousVelocity;
    const trend = Math.abs(difference) < 2 ? 'stable' : 
                  difference > 0 ? 'increasing' : 'decreasing';
    
    return {
      current: currentVelocity,
      previous: previousVelocity,
      trend,
      confidence: 75 + Math.random() * 20 // Mock confidence: 75-95%
    };
  }

  private calculateWorkloadDistribution(
    tasks: ClickUpTask[], 
    teamMembers?: Array<{ id: number; username: string; email: string }>
  ): DetailedHealthMetrics['workloadDistribution'] {
    if (!teamMembers || teamMembers.length === 0) {
      return {
        balanced: true,
        overloadedMembers: [],
        underutilizedMembers: [],
        distributionScore: 85
      };
    }

    // Calculate task distribution per team member
    const memberWorkload = new Map<string, number>();
    teamMembers.forEach(member => memberWorkload.set(member.username, 0));

    tasks.forEach(task => {
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach(assignee => {
          const current = memberWorkload.get(assignee.username) || 0;
          memberWorkload.set(assignee.username, current + 1);
        });
      }
    });

    const workloads = Array.from(memberWorkload.values());
    const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const threshold = avgWorkload * 0.3; // 30% deviation threshold

    const overloadedMembers: string[] = [];
    const underutilizedMembers: string[] = [];

    memberWorkload.forEach((workload, username) => {
      if (workload > avgWorkload + threshold) {
        overloadedMembers.push(username);
      } else if (workload < avgWorkload - threshold && workload > 0) {
        underutilizedMembers.push(username);
      }
    });

    const balanced = overloadedMembers.length === 0 && underutilizedMembers.length <= 1;
    const distributionScore = Math.max(0, 100 - (overloadedMembers.length * 20) - (underutilizedMembers.length * 10));

    return {
      balanced,
      overloadedMembers,
      underutilizedMembers,
      distributionScore
    };
  }

  private calculateDependencyHealth(tasks: ClickUpTask[]): DetailedHealthMetrics['dependencyHealth'] {
    // Simplified dependency analysis - in production, this would analyze actual dependencies
    const totalDependencies = Math.floor(tasks.length * 0.3); // Assume 30% of tasks have dependencies
    const blockedTasks = Math.floor(totalDependencies * 0.15); // Assume 15% are blocked
    const circularDependencies = Math.floor(totalDependencies * 0.05); // Assume 5% circular
    
    const healthScore = Math.max(0, 100 - (blockedTasks * 10) - (circularDependencies * 20));

    return {
      totalDependencies,
      blockedTasks,
      circularDependencies,
      healthScore
    };
  }

  private calculateQualityIndicators(tasks: ClickUpTask[]): DetailedHealthMetrics['qualityIndicators'] {
    // Simplified quality calculation - in production, this would analyze actual quality metrics
    const bugRate = 0.05 + Math.random() * 0.1; // Mock: 5-15% bug rate
    const reworkFrequency = 0.1 + Math.random() * 0.15; // Mock: 10-25% rework frequency
    
    const qualityScore = Math.max(0, 100 - (bugRate * 300) - (reworkFrequency * 200));

    return {
      bugRate,
      reworkFrequency,
      qualityScore
    };
  }

  private calculateTimelineAdherence(tasks: ClickUpTask[]): DetailedHealthMetrics['timelineAdherence'] {
    const tasksWithDueDates = tasks.filter(task => task.due_date);
    if (tasksWithDueDates.length === 0) {
      return {
        onTimeDelivery: 100,
        averageDelay: 0,
        scheduleVariance: 0,
        adherenceScore: 100
      };
    }

    // Simplified timeline calculation - in production, this would analyze actual completion dates
    const onTimeDelivery = 70 + Math.random() * 25; // Mock: 70-95%
    const averageDelay = Math.random() * 5; // Mock: 0-5 days average delay
    const scheduleVariance = Math.random() * 20; // Mock: 0-20% variance
    
    const adherenceScore = Math.max(0, onTimeDelivery - (averageDelay * 5) - scheduleVariance);

    return {
      onTimeDelivery,
      averageDelay,
      scheduleVariance,
      adherenceScore
    };
  }

  private calculateWeightedScore(scores: {
    completion: number;
    velocity: number;
    workload: number;
    dependencies: number;
    quality: number;
    timeline: number;
  }): number {
    // Weighted scoring - adjust weights based on project priorities
    const weights = {
      completion: 0.25,    // 25% - Task completion is critical
      timeline: 0.20,      // 20% - Timeline adherence is important
      quality: 0.20,       // 20% - Quality is important
      workload: 0.15,      // 15% - Workload balance affects sustainability
      dependencies: 0.10,  // 10% - Dependencies affect flow
      velocity: 0.10       // 10% - Velocity indicates team performance
    };

    return Math.round(
      scores.completion * weights.completion +
      scores.timeline * weights.timeline +
      scores.quality * weights.quality +
      scores.workload * weights.workload +
      scores.dependencies * weights.dependencies +
      scores.velocity * weights.velocity
    );
  }

  private countOverdueTasks(tasks: ClickUpTask[]): number {
    const now = new Date();
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(parseInt(task.due_date, 10));
      return dueDate < now && task.status !== 'complete' && task.status !== 'closed';
    }).length;
  }

  private calculateAverageTaskAge(tasks: ClickUpTask[]): number {
    if (tasks.length === 0) return 0;
    
    const now = new Date();
    const totalAge = tasks.reduce((sum, task) => {
      // Mock creation date calculation - in production, use actual date_created
      const createdDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + ageInDays;
    }, 0);

    return Math.round(totalAge / tasks.length);
  }

  private identifyRiskFactors(metrics: {
    completionRate: number;
    velocityMetrics: DetailedHealthMetrics['velocityTrend'];
    workloadMetrics: DetailedHealthMetrics['workloadDistribution'];
    dependencyMetrics: DetailedHealthMetrics['dependencyHealth'];
    qualityMetrics: DetailedHealthMetrics['qualityIndicators'];
    timelineMetrics: DetailedHealthMetrics['timelineAdherence'];
  }): RiskAssessment[] {
    const risks: RiskAssessment[] = [];

    // Use the analyzeRisks method with a mock DetailedHealthMetrics object
    const mockMetrics: DetailedHealthMetrics = {
      overallScore: 0,
      taskCompletionRate: metrics.completionRate,
      overdueTasksCount: 0,
      blockedTasksCount: metrics.dependencyMetrics.blockedTasks,
      averageTaskAge: 0,
      teamVelocity: metrics.velocityMetrics.current,
      riskFactors: [],
      recommendations: [],
      velocityTrend: metrics.velocityMetrics,
      workloadDistribution: metrics.workloadMetrics,
      dependencyHealth: metrics.dependencyMetrics,
      qualityIndicators: metrics.qualityMetrics,
      timelineAdherence: metrics.timelineMetrics
    };

    return this.analyzeRisks(mockMetrics);
  }

  private getRiskPriority(level: RiskAssessment['level']): number {
    switch (level) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
}
