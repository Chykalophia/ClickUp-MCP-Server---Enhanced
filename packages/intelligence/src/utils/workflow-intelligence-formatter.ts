/* eslint-disable max-len */
/**
 * Workflow Intelligence Formatter
 * 
 * Formats workflow analysis results, automation recommendations,
 * and integration optimization reports for human-readable output.
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

import { 
  WorkflowAnalysisResult, 
  AutomationOpportunity, 
  IntegrationRecommendation,
  WorkflowPattern 
} from '../services/workflow-intelligence-service.js';

export class WorkflowIntelligenceFormatter {
  /**
   * Generate comprehensive workflow analysis report
   */
  static generateWorkflowReport(analysis: WorkflowAnalysisResult): string {
    const { patterns, automationOpportunities, integrationRecommendations, overallEfficiencyScore } = analysis;
    
    return `# 🔄 Workflow Intelligence Analysis Report

## 📊 Executive Summary

**Workspace**: ${analysis.workspaceId}  
**Analysis Period**: ${analysis.timeframe}  
**Overall Efficiency Score**: ${overallEfficiencyScore}/100 ${this.getEfficiencyEmoji(overallEfficiencyScore)}  
**Analysis Date**: ${new Date(analysis.analysisDate).toLocaleDateString()}

---

## 🔍 Workflow Patterns Identified

${patterns.map(pattern => this.formatWorkflowPattern(pattern)).join('\n\n')}

---

## 🤖 Automation Opportunities

${automationOpportunities.slice(0, 3).map(opportunity => this.formatAutomationOpportunity(opportunity)).join('\n\n')}

---

## 🔗 Integration Recommendations

${integrationRecommendations.slice(0, 3).map(integration => this.formatIntegrationRecommendation(integration)).join('\n\n')}

---

## 💡 Key Recommendations

${analysis.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

---

## 📈 Next Steps

1. **Immediate Actions** (0-2 weeks)
   - Implement highest-impact, low-complexity automations
   - Set up priority integrations (Slack, GitHub)
   - Create workflow templates for common patterns

2. **Short-term Goals** (2-8 weeks)
   - Deploy medium-complexity automation solutions
   - Optimize identified workflow bottlenecks
   - Train team on new automated processes

3. **Long-term Strategy** (2-6 months)
   - Implement advanced automation workflows
   - Measure and optimize efficiency gains
   - Expand integration ecosystem

---

*Analysis powered by ClickUp Intelligence v${analysis.metadata.version} | Data points: ${analysis.metadata.dataPoints}*`;
  }

  /**
   * Generate automation recommendations report
   */
  static generateAutomationReport(automations: AutomationOpportunity[]): string {
    const totalTimeSavings = automations.reduce((sum, auto) => sum + auto.estimatedTimeSavings, 0);
    
    return `# 🤖 Automation Recommendations Report

## 📊 Summary

Total Opportunities: ${automations.length}  
**Estimated Time Savings**: ${totalTimeSavings} minutes/week  
**Potential ROI**: ${Math.round(totalTimeSavings * 4.33 * 0.5)} hours/month saved

---

## 🎯 Recommended Automations

${automations.map((automation, index) => `
### ${index + 1}. ${automation.title}

**Impact**: ${this.getImpactEmoji(automation.impact)} ${automation.impact.toUpperCase()}  
**Complexity**: ${this.getComplexityEmoji(automation.complexity)} ${automation.complexity.toUpperCase()}  
**Time Savings**: ${automation.estimatedTimeSavings} minutes/week

${automation.description}

**Implementation Steps:**
${automation.implementationSteps.map(step => `- ${step}`).join('\n')}

**Required Tools:**
${automation.requiredTools.map(tool => `- \`${tool}\``).join('\n')}

---`).join('\n')}

## 🚀 Implementation Priority

${this.prioritizeAutomations(automations).map((automation, index) => 
    `${index + 1}. **${automation.title}** - ${automation.impact} impact, ${automation.complexity} complexity`
  ).join('\n')}

*Prioritized by impact-to-complexity ratio*`;
  }

  /**
   * Generate integration optimization report
   */
  static generateIntegrationReport(integrations: IntegrationRecommendation[]): string {
    const categories = [...new Set(integrations.map(i => i.category))];
    
    return `# 🔗 Integration Optimization Report

## 📊 Overview

Recommended Integrations: ${integrations.length}  
**Categories**: ${categories.join(', ')}  
**Priority Focus**: ${integrations[0]?.category || 'Communication'}

---

## 🎯 Top Integration Recommendations

${integrations.slice(0, 5).map((integration, index) => `
### ${index + 1}. ${integration.tool}

**Category**: ${integration.category}  
**Cost**: ${this.getCostEmoji(integration.cost)} ${integration.cost.toUpperCase()}  
**Priority**: ${integration.priority}/10

**Benefits:**
${integration.benefits.map(benefit => `- ${benefit}`).join('\n')}

**Implementation:** ${integration.implementation}

---`).join('\n')}

## 📋 Integration Roadmap

### Phase 1: Essential Integrations (0-4 weeks)
${integrations.filter(i => i.priority >= 8).map(i => `- **${i.tool}** (${i.category})`).join('\n')}

### Phase 2: Enhancement Integrations (1-3 months)
${integrations.filter(i => i.priority >= 6 && i.priority < 8).map(i => `- **${i.tool}** (${i.category})`).join('\n')}

### Phase 3: Advanced Integrations (3-6 months)
${integrations.filter(i => i.priority < 6).map(i => `- **${i.tool}** (${i.category})`).join('\n')}

---

*Recommendations based on team size, current workflow patterns, and industry best practices*`;
  }

  private static formatWorkflowPattern(pattern: WorkflowPattern): string {
    return `### ${pattern.name}

**Frequency**: ${pattern.frequency} times/week  
**Efficiency**: ${this.getEfficiencyEmoji(pattern.efficiency)} ${pattern.efficiency.toUpperCase()}  
**Optimization Potential**: ${Math.round(pattern.optimizationPotential * 100)}%

**Workflow Steps:**
${pattern.steps.map(step => `- ${step.action} (${step.averageTime}s avg, ${Math.round(step.automationPotential * 100)}% automatable)`).join('\n')}

**Identified Bottlenecks:**
${pattern.bottlenecks.map(bottleneck => `- ${bottleneck}`).join('\n')}`;
  }

  private static formatAutomationOpportunity(opportunity: AutomationOpportunity): string {
    return `### ${opportunity.title}

**Impact**: ${this.getImpactEmoji(opportunity.impact)} ${opportunity.impact.toUpperCase()}  
**Complexity**: ${this.getComplexityEmoji(opportunity.complexity)} ${opportunity.complexity.toUpperCase()}  
**Time Savings**: ${opportunity.estimatedTimeSavings} minutes/week

${opportunity.description}`;
  }

  private static formatIntegrationRecommendation(integration: IntegrationRecommendation): string {
    return `### ${integration.tool}

**Category**: ${integration.category}  
**Cost**: ${this.getCostEmoji(integration.cost)} ${integration.cost.toUpperCase()}  
**Priority**: ${integration.priority}/10

**Key Benefits**: ${integration.benefits.slice(0, 2).join(', ')}`;
  }

  private static prioritizeAutomations(automations: AutomationOpportunity[]): AutomationOpportunity[] {
    const impactScore = { low: 1, medium: 2, high: 3 };
    const complexityScore = { low: 3, medium: 2, high: 1 };
    
    return automations.sort((a, b) => {
      const scoreA = impactScore[a.impact] * complexityScore[a.complexity];
      const scoreB = impactScore[b.impact] * complexityScore[b.complexity];
      return scoreB - scoreA;
    });
  }

  private static getEfficiencyEmoji(score: number | string): string {
    if (typeof score === 'string') {
      return score === 'high' ? '🟢' : score === 'medium' ? '🟡' : '🔴';
    }
    return score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  }

  private static getImpactEmoji(impact: string): string {
    return impact === 'high' ? '🚀' : impact === 'medium' ? '📈' : '📊';
  }

  private static getComplexityEmoji(complexity: string): string {
    return complexity === 'low' ? '🟢' : complexity === 'medium' ? '🟡' : '🔴';
  }

  private static getCostEmoji(cost: string): string {
    return cost === 'free' ? '🆓' : cost === 'low' ? '💰' : cost === 'medium' ? '💰💰' : '💰💰💰';
  }
}
