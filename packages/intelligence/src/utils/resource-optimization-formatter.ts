import {
  WorkloadAnalysis,
  AssignmentPlan,
  BurnoutRisk,
  CapacityForecast,
  MemberWorkloadAnalysis,
  BurnoutRiskLevel,
  RiskLevel,
  TrendDirection
} from '../services/resource-optimization-service.js';

/**
 * Utility class for formatting resource optimization results into readable reports
 */
export class ResourceOptimizationFormatter {
  /**
   * Generate a comprehensive markdown report of workload analysis
   */
  static generateWorkloadReport(analysis: WorkloadAnalysis): string {
    const sections = [
      this.generateWorkloadHeader(analysis),
      this.generateExecutiveSummary(analysis),
      this.generateTeamMetrics(analysis),
      this.generateMemberAnalysis(analysis.memberAnalysis),
      this.generateBottleneckAnalysis(analysis),
      this.generateRecommendations(analysis.recommendations),
      this.generateMetadata(analysis)
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate assignment plan report
   */
  static generateAssignmentReport(plan: AssignmentPlan): string {
    const sections = [
      this.generateAssignmentHeader(plan),
      this.generateAssignmentSummary(plan),
      this.generateAssignmentDetails(plan),
      this.generateAlternativeOptions(plan),
      this.generateAssignmentMetadata(plan)
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate burnout risk report
   */
  static generateBurnoutReport(risk: BurnoutRisk): string {
    const sections = [
      this.generateBurnoutHeader(risk),
      this.generateRiskAssessment(risk),
      this.generateRiskFactors(risk),
      this.generateWarningSignals(risk),
      this.generatePreventionPlan(risk)
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate capacity forecast report
   */
  static generateCapacityReport(forecast: CapacityForecast): string {
    const sections = [
      this.generateCapacityHeader(forecast),
      this.generateCapacityProjections(forecast),
      this.generateBottleneckPredictions(forecast),
      this.generateResourceNeeds(forecast),
      this.generateCapacityRecommendations(forecast)
    ];

    return sections.join('\n\n');
  }

  // Private helper methods

  private static generateWorkloadHeader(analysis: WorkloadAnalysis): string {
    const riskEmoji = this.getRiskEmoji(analysis.riskLevel);
    const balanceGrade = this.getBalanceGrade(analysis.balanceScore);

    return [
      '# ⚖️ Team Workload Analysis',
      '',
      `**Team ID:** ${analysis.teamId}`,
      `**Analysis Date:** ${analysis.analysisDate.toLocaleDateString()}`,
      `**Risk Level:** ${riskEmoji} ${analysis.riskLevel.toUpperCase()}`,
      `**Balance Score:** ${balanceGrade} (${analysis.balanceScore}/100)`
    ].join('\n');
  }

  private static generateExecutiveSummary(analysis: WorkloadAnalysis): string {
    const utilizationPercentage = Math.round(analysis.utilizationRate * 100);
    const overloadedMembers = analysis.memberAnalysis.filter(m => m.utilizationRate > 1.0).length;
    const underutilizedMembers = analysis.memberAnalysis.filter(m => m.utilizationRate < 0.6).length;

    return [
      '## 📊 Executive Summary',
      '',
      '| Metric | Value | Status |',
      '|--------|-------|--------|',
      `| **Team Utilization** | ${utilizationPercentage}% | ${this.getUtilizationStatus(analysis.utilizationRate)} |`,
      `| **Total Capacity** | ${analysis.totalCapacity} hours | ${this.getCapacityStatus(analysis.totalCapacity)} |`,
      `| **Utilized Capacity** | ${analysis.utilizedCapacity} hours | - |`,
      `| **Overloaded Members** | ${overloadedMembers} | ${overloadedMembers > 0 ? '⚠️ Attention Needed' : '✅ Good'} |`,
      `| **Underutilized Members** | ${underutilizedMembers} | ${underutilizedMembers > 0 ? '📈 Opportunity' : '✅ Balanced'} |`,
      `| **Active Bottlenecks** | ${analysis.bottlenecks.length} | ${
        analysis.bottlenecks.length > 0 ? '🚨 Action Required' : '✅ Clear'
      } |`,
      '',
      `**Key Insight:** ${this.generateKeyInsight(analysis)}`
    ].join('\n');
  }

  private static generateTeamMetrics(analysis: WorkloadAnalysis): string {
    const avgUtilization =
      analysis.memberAnalysis.reduce((sum, m) => sum + m.utilizationRate, 0) / analysis.memberAnalysis.length;
    const utilizationBar = this.generateProgressBar(avgUtilization, 1.2);

    return [
      '## 📈 Team Metrics',
      '',
      '### Capacity Distribution',
      '',
      `**Average Utilization:** ${Math.round(avgUtilization * 100)}%`,
      `${utilizationBar}`,
      '',
      '### Utilization Breakdown',
      '',
      ...analysis.memberAnalysis.map(member => {
        const utilization = Math.round(member.utilizationRate * 100);
        const bar = this.generateProgressBar(member.utilizationRate, 1.2);
        const status = this.getUtilizationEmoji(member.utilizationRate);
        return `**${member.memberName}:** ${utilization}% ${status}\n${bar}`;
      })
    ].join('\n');
  }

  private static generateMemberAnalysis(memberAnalysis: MemberWorkloadAnalysis[]): string {
    const sections = ['## 👥 Individual Analysis', ''];

    memberAnalysis.forEach((member, index) => {
      const utilization = Math.round(member.utilizationRate * 100);
      const burnoutEmoji = this.getBurnoutEmoji(member.burnoutRisk);
      const trendEmoji = this.getTrendEmoji(member.workloadTrend.direction);

      sections.push(`### ${index + 1}. ${member.memberName} ${burnoutEmoji}`);
      sections.push('');
      sections.push('| Metric | Value |');
      sections.push('|--------|-------|');
      sections.push(`| **Capacity** | ${member.capacity} hours/week |`);
      sections.push(`| **Current Workload** | ${member.currentWorkload} hours |`);
      sections.push(`| **Utilization** | ${utilization}% |`);
      sections.push(`| **Burnout Risk** | ${member.burnoutRisk.toUpperCase()} ${burnoutEmoji} |`);
      sections.push(`| **Trend** | ${member.workloadTrend.direction.toUpperCase()} ${trendEmoji} |`);
      sections.push(`| **Sustainability** | ${member.workloadTrend.sustainabilityScore}/100 |`);
      sections.push('');

      if (member.recommendations.length > 0) {
        sections.push('**Recommendations:**');
        member.recommendations.forEach(rec => {
          sections.push(`- ${rec}`);
        });
        sections.push('');
      }
    });

    return sections.join('\n');
  }

  private static generateBottleneckAnalysis(analysis: WorkloadAnalysis): string {
    if (analysis.bottlenecks.length === 0) {
      return [
        '## 🚦 Bottleneck Analysis',
        '',
        '✅ **No active bottlenecks detected**',
        '',
        'The team is operating smoothly without significant resource constraints.'
      ].join('\n');
    }

    const sections = ['## 🚨 Bottleneck Analysis', '', `${analysis.bottlenecks.length} active bottlenecks identified:`];

    analysis.bottlenecks.forEach((bottleneck, index) => {
      const severityBar = this.generateProgressBar(bottleneck.severity, 10, '🔴', '⚪');

      sections.push('');
      sections.push(`### ${index + 1}. ${bottleneck.type.replace(/_/g, ' ').toUpperCase()}`);
      sections.push('');
      sections.push(`**Severity:** ${bottleneck.severity}/10`);
      sections.push(`${severityBar}`);
      sections.push(`**Affected Members:** ${bottleneck.affectedMembers.length}`);
      sections.push(`**Estimated Impact:** ${bottleneck.estimatedImpact} hours delayed`);
      sections.push('');
      sections.push('**Suggested Actions:**');
      bottleneck.suggestedActions.forEach(action => {
        sections.push(`- ${action}`);
      });
    });

    return sections.join('\n');
  }

  private static generateRecommendations(recommendations: string[]): string {
    return ['## 💡 Optimization Recommendations', '', ...recommendations.map(rec => `${rec}`), ''].join('\n');
  }

  private static generateMetadata(analysis: WorkloadAnalysis): string {
    return [
      '## 📋 Analysis Metadata',
      '',
      `- **Team Members Analyzed:** ${analysis.memberAnalysis.length}`,
      `- **Analysis Timestamp:** ${analysis.analysisDate.toISOString()}`,
      '- **Balance Algorithm:** Workload Distribution Optimization v2.1',
      '- **Risk Assessment:** Multi-factor Burnout Prediction Model',
      '',
      '---',
      '*Generated by ClickUp Intelligence MCP Server - Resource Optimizer*'
    ].join('\n');
  }

  // Assignment plan formatting methods
  private static generateAssignmentHeader(plan: AssignmentPlan): string {
    return [
      '# 🎯 Task Assignment Plan',
      '',
      `**Plan ID:** ${plan.planId}`,
      `**Created:** ${plan.createdDate.toLocaleDateString()}`,
      `**Assignments:** ${plan.assignments.length} tasks`,
      `**Confidence:** ${Math.round(plan.confidence * 100)}%`
    ].join('\n');
  }

  private static generateAssignmentSummary(plan: AssignmentPlan): string {
    return [
      '## 📊 Assignment Summary',
      '',
      '| Metric | Score | Grade |',
      '|--------|-------|-------|',
      `| **Balance Score** | ${plan.balanceScore}/100 | ${this.getGrade(plan.balanceScore)} |`,
      `| **Skill Match** | ${plan.skillMatchScore}/100 | ${this.getGrade(plan.skillMatchScore)} |`,
      `| **Capacity Utilization** | ${plan.capacityUtilization}% | ${this.getUtilizationGrade(
        plan.capacityUtilization
      )} |`,
      '',
      '**Overall Impact:**',
      `- Team Balance: ${plan.estimatedImpact.teamBalance}/100`,
      `- Skill Development: ${plan.estimatedImpact.skillDevelopment}/100`,
      `- Delivery Risk: ${plan.estimatedImpact.deliveryRisk}/100`,
      `- Member Satisfaction: ${plan.estimatedImpact.memberSatisfaction}/100`
    ].join('\n');
  }

  private static generateAssignmentDetails(plan: AssignmentPlan): string {
    const sections = ['## 📋 Assignment Details', ''];

    plan.assignments.forEach((assignment, index) => {
      sections.push(`### ${index + 1}. ${assignment.taskId} → ${assignment.assigneeName}`);
      sections.push('');
      sections.push(`**Skill Match:** ${assignment.skillMatch.overallMatch}/100`);
      sections.push(`**Workload Impact:** +${assignment.workloadImpact.utilizationChange}% utilization`);
      sections.push(`**Confidence:** ${Math.round(assignment.confidence * 100)}%`);
      sections.push('');
      sections.push('**Reasoning:**');
      assignment.reasoning.forEach(reason => {
        sections.push(`- ${reason}`);
      });
      sections.push('');
    });

    return sections.join('\n');
  }

  private static generateAlternativeOptions(plan: AssignmentPlan): string {
    if (plan.alternativeOptions.length === 0) {
      return '## 🔄 Alternative Options\n\nNo alternative assignment options generated.';
    }

    const sections = ['## 🔄 Alternative Options', '', `${plan.alternativeOptions.length} alternative assignment plans available:`];

    plan.alternativeOptions.forEach((option, index) => {
      sections.push('');
      sections.push(`### Option ${index + 1} (Score: ${option.score}/100)`);
      sections.push(`**Assignments:** ${option.assignments.length}`);
      sections.push('**Trade-offs:**');
      option.tradeoffs.forEach(tradeoff => {
        sections.push(`- ${tradeoff}`);
      });
    });

    return sections.join('\n');
  }

  private static generateAssignmentMetadata(plan: AssignmentPlan): string {
    return [
      '## 📋 Plan Metadata',
      '',
      '- **Optimization Algorithm:** Multi-objective Constraint Satisfaction',
      `- **Generated:** ${plan.createdDate.toISOString()}`,
      `- **Confidence Level:** ${Math.round(plan.confidence * 100)}%`,
      '',
      '---',
      '*Generated by ClickUp Intelligence MCP Server - Resource Optimizer*'
    ].join('\n');
  }

  // Utility methods
  private static generateProgressBar(value: number, max: number, filled = '█', empty = '░'): string {
    const percentage = Math.min(Math.max(value / max, 0), 1);
    const filledLength = Math.round(percentage * 20);
    const emptyLength = 20 - filledLength;
    const filledChars = filled.repeat(filledLength);
    const emptyChars = empty.repeat(emptyLength);
    return `${filledChars}${emptyChars} ${Math.round(percentage * 100)}%`;
  }

  private static getRiskEmoji(risk: RiskLevel): string {
    const emojis = {
      [RiskLevel.LOW]: '🟢',
      [RiskLevel.MEDIUM]: '🟡',
      [RiskLevel.HIGH]: '🟠',
      [RiskLevel.CRITICAL]: '🔴'
    };
    return emojis[risk] || '⚪';
  }

  private static getBurnoutEmoji(risk: BurnoutRiskLevel): string {
    const emojis = {
      [BurnoutRiskLevel.LOW]: '😊',
      [BurnoutRiskLevel.MODERATE]: '😐',
      [BurnoutRiskLevel.HIGH]: '😰',
      [BurnoutRiskLevel.CRITICAL]: '🚨'
    };
    return emojis[risk] || '😐';
  }

  private static getUtilizationEmoji(utilization: number): string {
    if (utilization < 0.6) return '📈';
    if (utilization < 0.8) return '✅';
    if (utilization < 1.0) return '⚠️';
    return '🚨';
  }

  private static getTrendEmoji(trend: TrendDirection): string {
    const emojis = {
      [TrendDirection.INCREASING]: '📈',
      [TrendDirection.DECREASING]: '📉',
      [TrendDirection.STABLE]: '➡️',
      [TrendDirection.VOLATILE]: '📊'
    };
    return emojis[trend] || '➡️';
  }

  private static getBalanceGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private static getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private static getUtilizationStatus(rate: number): string {
    if (rate < 0.6) return '📈 Under-utilized';
    if (rate < 0.8) return '✅ Good';
    if (rate < 1.0) return '⚠️ High';
    return '🚨 Overloaded';
  }

  private static getCapacityStatus(capacity: number): string {
    if (capacity < 40) return '⚠️ Limited';
    if (capacity < 80) return '✅ Adequate';
    return '💪 Strong';
  }

  private static getUtilizationGrade(utilization: number): string {
    if (utilization >= 85 && utilization <= 95) return 'A';
    if (utilization >= 75 && utilization < 100) return 'B';
    if (utilization >= 60 && utilization < 110) return 'C';
    if (utilization >= 50 && utilization < 120) return 'D';
    return 'F';
  }

  private static generateKeyInsight(analysis: WorkloadAnalysis): string {
    const utilizationRate = Math.round(analysis.utilizationRate * 100);
    const overloaded = analysis.memberAnalysis.filter(m => m.utilizationRate > 1.0).length;
    const underutilized = analysis.memberAnalysis.filter(m => m.utilizationRate < 0.6).length;

    if (overloaded > 0) {
      return `Team has ${overloaded} overloaded members requiring immediate workload redistribution.`;
    }
    if (underutilized > 0) {
      return `Team has ${underutilized} underutilized members with capacity for additional work.`;
    }
    if (utilizationRate > 90) {
      return `Team is operating at high capacity (${utilizationRate}%) - monitor for burnout risk.`;
    }
    if (utilizationRate < 70) {
      return `Team has significant available capacity (${100 - utilizationRate}%) for new initiatives.`;
    }
    return `Team workload is well-balanced with ${utilizationRate}% utilization rate.`;
  }

  // Additional formatting methods for burnout and capacity reports would go here...
  private static generateBurnoutHeader(risk: BurnoutRisk): string {
    return `# 🚨 Burnout Risk Analysis\n\n**Member ID:** ${risk.memberId}\n**Risk Level:** ${risk.riskLevel.toUpperCase()}\n**Confidence:** ${Math.round(risk.confidence * 100)}%`;
  }

  private static generateRiskAssessment(risk: BurnoutRisk): string {
    return `## Risk Assessment\n\n**Overall Risk:** ${risk.riskLevel}\n**Time to Action:** ${risk.timeToAction} days`;
  }

  private static generateRiskFactors(risk: BurnoutRisk): string {
    return `## Risk Factors\n\n${risk.riskFactors.map(f => `- ${f.factor} (Severity: ${f.severity.toFixed(1)})`).join('\n')}`;
  }

  private static generateWarningSignals(risk: BurnoutRisk): string {
    return `## Warning Signals\n\n${risk.earlyWarningSignals.map(s => `- ${s.signal} (Severity: ${s.severity.toFixed(1)})`).join('\n')}`;
  }

  private static generatePreventionPlan(risk: BurnoutRisk): string {
    return `## Prevention Plan\n\n${risk.recommendations.map(r => `- ${r.action}`).join('\n')}`;
  }

  private static generateCapacityHeader(forecast: CapacityForecast): string {
    return `# 📈 Capacity Forecast\n\n**Team ID:** ${forecast.teamId}\n**Confidence:** ${Math.round(
      forecast.confidence * 100
    )}%`;
  }

  private static generateCapacityProjections(forecast: CapacityForecast): string {
    return `## Capacity Projections\n\n${forecast.projectedCapacity
      .map(p => `- ${p.period.toLocaleDateString()}: ${p.totalCapacity} hours`)
      .join('\n')}`;
  }

  private static generateBottleneckPredictions(forecast: CapacityForecast): string {
    return `## Bottleneck Predictions\n\n${forecast.bottleneckPredictions
      .map(b => `- ${b.predictedDate.toLocaleDateString()}: ${b.type} (Severity: ${b.severity.toFixed(1)})`)
      .join('\n')}`;
  }

  private static generateResourceNeeds(forecast: CapacityForecast): string {
    return `## Resource Needs\n\n${forecast.resourceNeeds
      .map(n => `- ${n.skillRequired} (Urgency: ${n.urgency.toFixed(1)})`)
      .join('\n')}`;
  }

  private static generateCapacityRecommendations(forecast: CapacityForecast): string {
    return `## Recommendations\n\n${forecast.recommendations.map(r => `- ${r.description}`).join('\n')}`;
  }
}
