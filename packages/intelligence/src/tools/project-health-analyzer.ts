import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProjectHealthAnalyzer } from '../analyzers/project-health-analyzer.js';

// Schema for project health analysis parameters
const ProjectHealthAnalysisSchema = z.object({
  workspace_id: z.string().describe('The ClickUp workspace ID to analyze'),
  space_id: z.string().optional().describe('Optional: Specific space ID to analyze'),
  list_id: z.string().optional().describe('Optional: Specific list ID to analyze'),
  include_archived: z.boolean().default(false).describe('Whether to include archived tasks in analysis'),
  analysis_depth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe('Depth of analysis to perform')
});

export function setupProjectHealthAnalyzer(server: McpServer) {
  const analyzer = new ProjectHealthAnalyzer();

  server.tool(
    'clickup_analyze_project_health',
    'Analyze the health of a ClickUp project with AI-powered insights including task completion rates, bottlenecks, team velocity, and risk assessment',
    ProjectHealthAnalysisSchema.shape,
    async (params) => {
      try {
        const analysis = await analyzer.analyzeProjectHealth(params);
        
        return {
          content: [{
            type: 'text',
            text: `# Project Health Analysis Report

## Executive Summary
- **Overall Health Score**: ${analysis.summary.overallScore}/100 (Grade: ${analysis.summary.healthGrade})
- **Project Status**: ${analysis.summary.status.toUpperCase()}
- **Analysis Depth**: ${params.analysis_depth || 'detailed'}

## Key Metrics Dashboard

### 📊 Core Performance Indicators
- **Task Completion Rate**: ${analysis.metrics.taskCompletionRate}%
- **Team Velocity**: ${analysis.metrics.teamVelocity} tasks/week
- **Overdue Tasks**: ${analysis.metrics.overdueTasksCount}
- **Blocked Tasks**: ${analysis.metrics.blockedTasksCount}
- **Average Task Age**: ${analysis.metrics.averageTaskAge} days

### 📈 Advanced Health Metrics

#### Velocity Trend Analysis
- **Current Velocity**: ${analysis.metrics.velocityTrend.current} tasks/week
- **Previous Velocity**: ${analysis.metrics.velocityTrend.previous} tasks/week
- **Trend**: ${analysis.metrics.velocityTrend.trend.toUpperCase()} (${analysis.metrics.velocityTrend.confidence}% confidence)

#### Workload Distribution
- **Balanced**: ${analysis.metrics.workloadDistribution.balanced ? '✅ Yes' : '❌ No'}
- **Distribution Score**: ${analysis.metrics.workloadDistribution.distributionScore}/100
- **Overloaded Members**: ${analysis.metrics.workloadDistribution.overloadedMembers.length > 0 ? analysis.metrics.workloadDistribution.overloadedMembers.join(', ') : 'None'}
- **Underutilized Members**: ${analysis.metrics.workloadDistribution.underutilizedMembers.length > 0 ? analysis.metrics.workloadDistribution.underutilizedMembers.join(', ') : 'None'}

#### Dependency Health
- **Total Dependencies**: ${analysis.metrics.dependencyHealth.totalDependencies}
- **Blocked Tasks**: ${analysis.metrics.dependencyHealth.blockedTasks}
- **Circular Dependencies**: ${analysis.metrics.dependencyHealth.circularDependencies}
- **Health Score**: ${analysis.metrics.dependencyHealth.healthScore}/100

#### Quality Indicators
- **Bug Rate**: ${(analysis.metrics.qualityIndicators.bugRate * 100).toFixed(1)}%
- **Rework Frequency**: ${(analysis.metrics.qualityIndicators.reworkFrequency * 100).toFixed(1)}%
- **Quality Score**: ${Math.round(analysis.metrics.qualityIndicators.qualityScore)}/100

#### Timeline Adherence
- **On-Time Delivery**: ${analysis.metrics.timelineAdherence.onTimeDelivery.toFixed(1)}%
- **Average Delay**: ${analysis.metrics.timelineAdherence.averageDelay.toFixed(1)} days
- **Schedule Variance**: ${analysis.metrics.timelineAdherence.scheduleVariance.toFixed(1)}%
- **Adherence Score**: ${Math.round(analysis.metrics.timelineAdherence.adherenceScore)}/100

## 🚨 Risk Assessment

${analysis.risks.length > 0 ? analysis.risks.map(risk => 
  `### ${risk.level.toUpperCase()} Risk: ${risk.category.toUpperCase()}
- **Issue**: ${risk.description}
- **Impact**: ${risk.impact}
- **Recommendation**: ${risk.recommendation}
- **Confidence**: ${risk.confidence}%`
).join('\n\n') : '✅ No significant risks identified'}

## 💡 Key Insights

### 🎯 Strengths
${analysis.insights.keyStrengths.length > 0 ? 
  analysis.insights.keyStrengths.map(strength => `- ${strength}`).join('\n') : 
  '- No specific strengths identified in current analysis'}

### ⚠️ Critical Issues
${analysis.insights.criticalIssues.length > 0 ? 
  analysis.insights.criticalIssues.map(issue => `- ${issue}`).join('\n') : 
  '- No critical issues identified'}

### 📈 Improvement Areas
${analysis.insights.improvementAreas.length > 0 ? 
  analysis.insights.improvementAreas.map(area => `- ${area}`).join('\n') : 
  '- No specific improvement areas identified'}

## 🎯 Action Plan

### 🚨 Immediate Actions (Next 1-3 days)
${analysis.recommendations.immediate.map(rec => `- ${rec}`).join('\n')}

### 📋 Short-term Actions (Next 1-2 weeks)
${analysis.recommendations.shortTerm.map(rec => `- ${rec}`).join('\n')}

### 🎯 Long-term Initiatives (Next 1-3 months)
${analysis.recommendations.longTerm.map(rec => `- ${rec}`).join('\n')}

## 📊 Trend Analysis

- **Velocity Trend**: ${analysis.trends.velocityTrend.toUpperCase()}
- **Quality Trend**: ${analysis.trends.qualityTrend.toUpperCase()}
- **Timeline Trend**: ${analysis.trends.timelineTrend.toUpperCase()}

## 📋 Summary & Next Steps

Based on this comprehensive analysis, your project has an overall health score of **${analysis.summary.overallScore}/100** with a grade of **${analysis.summary.healthGrade}**, indicating **${analysis.summary.status}** project health.

${analysis.summary.overallScore >= 80 ? 
  '🎉 **Excellent work!** Your project is performing well. Focus on maintaining current standards and implementing long-term improvements.' :
  analysis.summary.overallScore >= 60 ?
  '⚠️ **Action needed.** Address the identified risks and implement the recommended improvements to get your project back on track.' :
  '🚨 **Immediate attention required.** Critical issues have been identified that need urgent resolution to prevent project failure.'
}

---
*Analysis generated on ${new Date().toISOString().split('T')[0]} using AI-powered project health analytics*`
          }]
        };
      } catch (error: any) {
        console.error('Error in project health analysis:', error);
        return {
          content: [{
            type: 'text',
            text: `# Project Health Analysis Error

❌ **Analysis Failed**: ${error.message}

## Troubleshooting Steps:
1. Verify the workspace ID is correct
2. Ensure you have access to the specified workspace/space/list
3. Check that your ClickUp API token has the necessary permissions
4. Try with a smaller scope (specific list instead of entire workspace)

## Error Details:
\`\`\`
${error.stack || error.message}
\`\`\`

Please resolve these issues and try again.`
          }],
          isError: true
        };
      }
    }
  );
}
