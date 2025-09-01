/**
 * Report Formatter Utilities
 * 
 * Formats analysis results into professional markdown reports
 * and executive dashboards for AI intelligence tools.
 * 
 * @version 4.0.0
 * @since Phase 1.2 - Smart Sprint Planner
 */

/**
 * Formats analysis results into a professional markdown report
 */
export function formatMarkdownReport(result: any, title: string): string {
  const timestamp = new Date().toISOString();
  
  let report = `# ${title}\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Version:** ${result.metadata?.version || '4.0.0'}\n\n`;
  
  // Add JSON data for now - can be enhanced with specific formatting later
  report += '## Analysis Results\n\n';
  report += '```json\n';
  report += JSON.stringify(result, null, 2);
  report += '\n```\n';
  
  return report;
}

/**
 * Generates an executive dashboard for sprint planning results
 */
export function generateExecutiveDashboard(result: any, title: string): string {
  const timestamp = new Date().toISOString();
  
  let dashboard = `# 🚀 ${title}\n\n`;
  dashboard += `**Generated:** ${timestamp}\n`;
  dashboard += `**Team:** ${result.sprintPlan?.teamId || 'Unknown'}\n\n`;
  
  // Executive Summary
  if (result.executiveSummary) {
    dashboard += '## 📊 Executive Summary\n\n';
    dashboard += `**Sprint Health Grade:** ${result.executiveSummary.sprintHealthGrade}\n`;
    dashboard += `**Success Probability:** ${result.executiveSummary.successProbability}%\n`;
    dashboard += `**Confidence Level:** ${result.executiveSummary.confidenceLevel}\n\n`;
    
    if (result.executiveSummary.keyInsights?.length > 0) {
      dashboard += '### Key Insights\n';
      result.executiveSummary.keyInsights.forEach((insight: string) => {
        dashboard += `- ${insight}\n`;
      });
      dashboard += '\n';
    }
    
    if (result.executiveSummary.criticalRecommendations?.length > 0) {
      dashboard += '### Critical Recommendations\n';
      result.executiveSummary.criticalRecommendations.forEach((rec: string) => {
        dashboard += `- ⚠️ ${rec}\n`;
      });
      dashboard += '\n';
    }
  }
  
  // Sprint Metrics
  if (result.sprintPlan?.sprintMetrics) {
    const metrics = result.sprintPlan.sprintMetrics;
    dashboard += '## 📈 Sprint Metrics\n\n';
    dashboard += `- **Story Points:** ${metrics.totalStoryPoints}\n`;
    dashboard += `- **Business Value:** ${metrics.totalBusinessValue}\n`;
    dashboard += `- **Capacity Utilization:** ${(metrics.capacityUtilization * 100).toFixed(1)}%\n`;
    dashboard += `- **Risk Score:** ${metrics.riskScore}/100\n`;
    dashboard += `- **Optimization Score:** ${metrics.optimizationScore}/100\n\n`;
  }
  
  // Recommended Tasks
  if (result.sprintPlan?.recommendedTasks?.length > 0) {
    dashboard += '## 🎯 Recommended Tasks\n\n';
    result.sprintPlan.recommendedTasks.forEach((task: any, index: number) => {
      dashboard += `${index + 1}. **${task.name}** (${task.storyPoints} pts)\n`;
      dashboard += `   - Priority: ${task.priority}\n`;
      dashboard += `   - Business Value: ${task.businessValue}\n`;
      dashboard += `   - Risk: ${task.riskLevel}\n`;
      if (task.assignmentSuggestion) {
        dashboard += `   - Assignment: ${task.assignmentSuggestion}\n`;
      }
      dashboard += '\n';
    });
  }
  
  // Add full JSON data for detailed analysis
  dashboard += '## 📋 Detailed Analysis\n\n';
  dashboard += '```json\n';
  dashboard += JSON.stringify(result, null, 2);
  dashboard += '\n```\n';
  
  return dashboard;
}
