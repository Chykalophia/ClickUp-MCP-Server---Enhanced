/* eslint-disable max-len */
/**
 * Workflow Intelligence Tools
 * 
 * MCP tools for workflow pattern analysis, automation recommendations,
 * and integration optimization.
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

import { z } from 'zod';
import { 
  WorkflowIntelligenceService,
  WorkflowPatternAnalysisInputSchema,
  AutomationRecommendationInputSchema,
  IntegrationOptimizationInputSchema,
  createWorkflowIntelligenceService
} from '../services/workflow-intelligence-service.js';

/**
 * Workflow Intelligence Engine
 * 
 * Main class for workflow analysis and optimization
 */
export class WorkflowIntelligence {
  private service: WorkflowIntelligenceService;

  constructor() {
    this.service = createWorkflowIntelligenceService();
  }

  /**
   * Analyze workflow patterns in a workspace
   */
  async analyzeWorkflowPatterns(input: z.infer<typeof WorkflowPatternAnalysisInputSchema>) {
    return await this.service.analyzeWorkflowPatterns(input);
  }

  /**
   * Generate automation recommendations
   */
  async recommendAutomations(input: z.infer<typeof AutomationRecommendationInputSchema>) {
    return await this.service.recommendAutomations(input);
  }

  /**
   * Optimize integration recommendations
   */
  async optimizeIntegrations(input: z.infer<typeof IntegrationOptimizationInputSchema>) {
    return await this.service.optimizeIntegrations(input);
  }
}

// Tool definitions for MCP integration
export const workflowPatternAnalysisTool = {
  name: 'clickup_analyze_workflow_patterns',
  description: '🔄 **WORKFLOW PATTERN ANALYZER** - Identify recurring workflow patterns, bottlenecks, and optimization opportunities. Analyzes team workflows to discover inefficiencies and automation potential.',
  inputSchema: WorkflowPatternAnalysisInputSchema
};

export const automationRecommendationTool = {
  name: 'clickup_recommend_automations',
  description: '🤖 **AUTOMATION RECOMMENDER** - Generate AI-powered automation recommendations based on workflow analysis. Identifies repetitive tasks and suggests automation solutions with implementation guidance.',
  inputSchema: AutomationRecommendationInputSchema
};

export const integrationOptimizationTool = {
  name: 'clickup_optimize_integrations',
  description: '🔗 **INTEGRATION OPTIMIZER** - Recommend optimal third-party integrations and workflow connections. Analyzes current setup and suggests integrations to maximize productivity and reduce manual work.',
  inputSchema: IntegrationOptimizationInputSchema
};

// Export tool configurations for main server
export const workflowIntelligenceTools = [
  workflowPatternAnalysisTool,
  automationRecommendationTool,
  integrationOptimizationTool
];

// Factory function
export function createWorkflowIntelligence(): WorkflowIntelligence {
  return new WorkflowIntelligence();
}
