/* eslint-disable max-len */
import { TaskDecomposition, DecomposedTask, ComplexityAnalysis, TaskType } from '../services/task-analysis-service.js';

/**
 * Utility class for formatting task decomposition results into readable reports
 */
export class TaskDecompositionFormatter {
  
  /**
   * Generate a comprehensive markdown report of the task decomposition
   */
  static generateReport(decomposition: TaskDecomposition): string {
    const sections = [
      this.generateHeader(decomposition),
      this.generateExecutiveSummary(decomposition),
      this.generateComplexityAnalysis(decomposition.complexityAnalysis),
      this.generateDecomposedTasks(decomposition.decomposedTasks),
      this.generateEstimationSummary(decomposition),
      this.generateRecommendations(decomposition.recommendations),
      this.generateMetadata(decomposition)
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate a concise summary for quick review
   */
  static generateSummary(decomposition: TaskDecomposition): string {
    const { decomposedTasks, complexityAnalysis, estimationSummary } = decomposition;
    
    const summary = [
      '# Task Decomposition Summary',
      '',
      `**Original Task:** ${decomposition.originalTask.name}`,
      `**Decomposed into:** ${decomposedTasks.length} subtasks`,
      `**Total Effort:** ${estimationSummary.totalEstimatedEffort} hours`,
      `**Complexity Score:** ${complexityAnalysis.overall}/10`,
      `**Confidence:** ${Math.round(decomposition.confidenceScore * 100)}%`,
      '',
      '## Quick Actions',
      ...decomposition.recommendations.slice(0, 3).map(rec => `- ${rec}`)
    ];

    return summary.join('\n');
  }

  /**
   * Generate task list in ClickUp-compatible format
   */
  static generateClickUpTasks(decomposition: TaskDecomposition): string {
    const tasks = decomposition.decomposedTasks.map((task, index) => {
      const priority = this.getPriorityEmoji(task.priority);
      const type = this.getTaskTypeEmoji(task.taskType);
      const effort = `${task.estimatedEffort}h`;
      
      return [
        `## ${index + 1}. ${task.title} ${priority} ${type}`,
        '',
        `**Description:** ${task.description}`,
        `**Estimated Effort:** ${effort}`,
        `**Complexity:** ${task.complexity.overall}/10`,
        `**Type:** ${task.taskType}`,
        '',
        '**Acceptance Criteria:**',
        ...task.acceptanceCriteria.map(criteria => `- [ ] ${criteria}`),
        '',
        task.dependencies.length > 0 ? `**Dependencies:** ${task.dependencies.join(', ')}` : '',
        task.tags.length > 0 ? `**Tags:** ${task.tags.join(', ')}` : '',
        ''
      ].filter(line => line !== '').join('\n');
    });

    return [
      `# Decomposed Tasks for: ${decomposition.originalTask.name}`,
      '',
      `> Generated on ${new Date().toLocaleDateString()} | Total: ${decomposition.estimationSummary.totalEstimatedEffort} hours`,
      '',
      ...tasks
    ].join('\n');
  }

  // Private helper methods

  private static generateHeader(decomposition: TaskDecomposition): string {
    const confidence = Math.round(decomposition.confidenceScore * 100);
    const template = decomposition.templateUsed ? ` (${decomposition.templateUsed})` : '';
    
    return [
      '# 🔄 Task Decomposition Analysis',
      '',
      `**Original Task:** ${decomposition.originalTask.name}`,
      `**Analysis Date:** ${new Date().toLocaleDateString()}`,
      `**Confidence Score:** ${confidence}%${template}`,
      `**Processing Time:** ${decomposition.processingTime}ms`
    ].join('\n');
  }

  private static generateExecutiveSummary(decomposition: TaskDecomposition): string {
    const { decomposedTasks, complexityAnalysis, estimationSummary } = decomposition;
    const avgEffort = estimationSummary.totalEstimatedEffort / decomposedTasks.length;
    
    return [
      '## 📊 Executive Summary',
      '',
      '| Metric | Value |',
      '|--------|-------|',
      `| **Subtasks Created** | ${decomposedTasks.length} |`,
      `| **Total Effort** | ${estimationSummary.totalEstimatedEffort} hours |`,
      `| **Average per Task** | ${Math.round(avgEffort * 10) / 10} hours |`,
      `| **Overall Complexity** | ${complexityAnalysis.overall}/10 |`,
      `| **Risk Level** | ${this.getRiskLevel(complexityAnalysis.overall)} |`,
      `| **Confidence Level** | ${estimationSummary.confidenceLevel.toUpperCase()} |`,
      '',
      `**Key Insight:** ${complexityAnalysis.reasoning}`
    ].join('\n');
  }

  private static generateComplexityAnalysis(complexity: ComplexityAnalysis): string {
    const bars = {
      technical: this.generateProgressBar(complexity.technical, 10),
      business: this.generateProgressBar(complexity.business, 10),
      integration: this.generateProgressBar(complexity.integration, 10),
      uncertainty: this.generateProgressBar(complexity.uncertainty, 10)
    };

    return [
      '## 🧠 Complexity Analysis',
      '',
      '| Dimension | Score | Visualization |',
      '|-----------|-------|---------------|',
      `| **Technical** | ${complexity.technical}/10 | ${bars.technical} |`,
      `| **Business** | ${complexity.business}/10 | ${bars.business} |`,
      `| **Integration** | ${complexity.integration}/10 | ${bars.integration} |`,
      `| **Uncertainty** | ${complexity.uncertainty}/10 | ${bars.uncertainty} |`,
      `| **Overall** | **${complexity.overall}/10** | ${this.generateProgressBar(complexity.overall, 10)} |`,
      '',
      '**Complexity Factors:**',
      ...complexity.factors.map(factor => `- ${factor}`)
    ].join('\n');
  }

  private static generateDecomposedTasks(tasks: DecomposedTask[]): string {
    const tasksByType = this.groupTasksByType(tasks);
    const sections = [];

    sections.push(`## 📋 Decomposed Tasks (${tasks.length} total)`);
    sections.push('');

    // Summary by type
    sections.push('### Task Distribution');
    sections.push('');
    Object.entries(tasksByType).forEach(([type, typeTasks]) => {
      const totalEffort = typeTasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
      const emoji = this.getTaskTypeEmoji(type as TaskType);
      sections.push(`- **${type}** ${emoji}: ${typeTasks.length} tasks (${totalEffort}h)`);
    });
    sections.push('');

    // Detailed task list
    sections.push('### Detailed Breakdown');
    sections.push('');

    tasks.forEach((task, index) => {
      const priority = this.getPriorityEmoji(task.priority);
      const type = this.getTaskTypeEmoji(task.taskType);
      const complexity = this.getComplexityEmoji(task.complexity.overall);
      
      sections.push(`#### ${index + 1}. ${task.title} ${priority} ${type} ${complexity}`);
      sections.push('');
      sections.push(`**Description:** ${task.description}`);
      sections.push(`**Effort:** ${task.estimatedEffort} hours | **Complexity:** ${task.complexity.overall}/10`);
      
      if (task.acceptanceCriteria.length > 0) {
        sections.push('');
        sections.push('**Acceptance Criteria:**');
        task.acceptanceCriteria.forEach(criteria => {
          sections.push(`- [ ] ${criteria}`);
        });
      }
      
      if (task.dependencies.length > 0) {
        sections.push('');
        sections.push(`**Dependencies:** ${task.dependencies.join(', ')}`);
      }
      
      sections.push('');
    });

    return sections.join('\n');
  }

  private static generateEstimationSummary(decomposition: TaskDecomposition): string {
    const { estimationSummary } = decomposition;
    const sections = [];

    sections.push('## ⏱️ Effort Estimation');
    sections.push('');

    // Effort breakdown chart
    sections.push('### Effort Distribution');
    sections.push('');
    Object.entries(estimationSummary.effortBreakdown).forEach(([task, effort]) => {
      const percentage = Math.round((effort / estimationSummary.totalEstimatedEffort) * 100);
      const bar = this.generateProgressBar(percentage, 100, '█', '░');
      sections.push(`**${task}:** ${effort}h (${percentage}%)`);
      sections.push(`${bar}`);
      sections.push('');
    });

    // Risk factors
    if (estimationSummary.riskFactors.length > 0) {
      sections.push('### ⚠️ Risk Factors');
      sections.push('');
      estimationSummary.riskFactors.forEach(risk => {
        sections.push(`- ${risk}`);
      });
      sections.push('');
    }

    // Comparison to original
    if (estimationSummary.comparisonToOriginal) {
      const ratio = estimationSummary.comparisonToOriginal;
      const change = ratio > 1 ? 'increase' : 'decrease';
      const percentage = Math.abs(Math.round((ratio - 1) * 100));
      
      sections.push('### 📊 Comparison to Original Estimate');
      sections.push('');
      sections.push(`Decomposed tasks show a **${percentage}% ${change}** compared to original estimate.`);
      
      if (ratio > 1.2) {
        sections.push('> ⚠️ Significant increase suggests the original estimate was too optimistic.');
      } else if (ratio < 0.8) {
        sections.push('> ✅ Decrease suggests good original estimation or task simplification.');
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  private static generateRecommendations(recommendations: string[]): string {
    return [
      '## 💡 Recommendations',
      '',
      ...recommendations.map(rec => `${rec}`),
      ''
    ].join('\n');
  }

  private static generateMetadata(decomposition: TaskDecomposition): string {
    return [
      '## 📋 Metadata',
      '',
      `- **Template Used:** ${decomposition.templateUsed || 'Generic'}`,
      `- **Processing Time:** ${decomposition.processingTime}ms`,
      `- **Confidence Score:** ${Math.round(decomposition.confidenceScore * 100)}%`,
      `- **Generated:** ${new Date().toISOString()}`,
      '',
      '---',
      '*Generated by ClickUp Intelligence MCP Server - Task Decomposition Engine*'
    ].join('\n');
  }

  // Utility methods

  private static generateProgressBar(value: number, max: number, filled: string = '█', empty: string = '░'): string {
    const percentage = Math.round((value / max) * 20); // 20 character bar
    const filledChars = filled.repeat(percentage);
    const emptyChars = empty.repeat(20 - percentage);
    return `${filledChars}${emptyChars} ${Math.round((value / max) * 100)}%`;
  }

  private static getRiskLevel(complexity: number): string {
    if (complexity >= 8) return '🔴 HIGH';
    if (complexity >= 6) return '🟡 MEDIUM';
    return '🟢 LOW';
  }

  private static getPriorityEmoji(priority: number): string {
    switch (priority) {
    case 1: return '🚨'; // Urgent
    case 2: return '🔥'; // High
    case 3: return '📋'; // Normal
    case 4: return '📝'; // Low
    default: return '📋';
    }
  }

  private static getTaskTypeEmoji(type: TaskType): string {
    const emojis: Record<TaskType, string> = {
      [TaskType.RESEARCH]: '🔍',
      [TaskType.DESIGN]: '🎨',
      [TaskType.IMPLEMENTATION]: '💻',
      [TaskType.TESTING]: '🧪',
      [TaskType.DOCUMENTATION]: '📚',
      [TaskType.DEPLOYMENT]: '🚀',
      [TaskType.REVIEW]: '👀',
      [TaskType.PLANNING]: '📅',
      [TaskType.BUG_FIX]: '🐛',
      [TaskType.MAINTENANCE]: '🔧'
    };
    return emojis[type] || '📋';
  }

  private static getComplexityEmoji(complexity: number): string {
    if (complexity >= 8) return '🔴';
    if (complexity >= 6) return '🟡';
    if (complexity >= 4) return '🟠';
    return '🟢';
  }

  private static groupTasksByType(tasks: DecomposedTask[]): Record<string, DecomposedTask[]> {
    return tasks.reduce((groups, task) => {
      const type = task.taskType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(task);
      return groups;
    }, {} as Record<string, DecomposedTask[]>);
  }
}
