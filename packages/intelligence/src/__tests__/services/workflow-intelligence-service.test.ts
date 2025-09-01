/**
 * Workflow Intelligence Service Unit Tests
 * 
 * Phase 2.1: Comprehensive unit testing for workflow intelligence functionality
 * Target Coverage: >95%
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

import { WorkflowIntelligenceService } from '../../services/workflow-intelligence-service';

describe('WorkflowIntelligenceService', () => {
  let service: WorkflowIntelligenceService;

  beforeEach(() => {
    service = new WorkflowIntelligenceService();
  });

  describe('analyzeWorkflowPatterns', () => {
    test('should analyze workflow patterns with valid input', async () => {
      const input = {
        workspaceId: 'test-workspace-123',
        timeframe: '1month' as const,
        includeAutomationOpportunities: true,
        analysisDepth: 'standard' as const
      };

      const result = await service.analyzeWorkflowPatterns(input);

      expect(result).toBeDefined();
      expect(result.workspaceId).toBe(input.workspaceId);
      expect(result.timeframe).toBe(input.timeframe);
      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.automationOpportunities).toBeInstanceOf(Array);
      expect(result.integrationRecommendations).toBeInstanceOf(Array);
      expect(result.overallEfficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.overallEfficiencyScore).toBeLessThanOrEqual(100);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe('4.1.0');
    });

    test('should handle different timeframes correctly', async () => {
      const timeframes = ['1week', '2weeks', '1month', '3months'] as const;
      
      for (const timeframe of timeframes) {
        const input = {
          workspaceId: 'test-workspace',
          timeframe,
          includeAutomationOpportunities: true,
          analysisDepth: 'standard' as const
        };

        const result = await service.analyzeWorkflowPatterns(input);
        expect(result.timeframe).toBe(timeframe);
        expect(result.metadata.dataPoints).toBeGreaterThan(0);
      }
    });

    test('should validate workflow pattern structure', async () => {
      const input = {
        workspaceId: 'test-workspace',
        timeframe: '1month' as const,
        includeAutomationOpportunities: true,
        analysisDepth: 'standard' as const
      };

      const result = await service.analyzeWorkflowPatterns(input);
      
      expect(result.patterns.length).toBeGreaterThan(0);
      
      const pattern = result.patterns[0];
      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.frequency).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(pattern.efficiency);
      expect(pattern.steps).toBeInstanceOf(Array);
      expect(pattern.bottlenecks).toBeInstanceOf(Array);
      expect(pattern.optimizationPotential).toBeGreaterThanOrEqual(0);
      expect(pattern.optimizationPotential).toBeLessThanOrEqual(1);
    });
  });

  describe('recommendAutomations', () => {
    test('should generate automation recommendations', async () => {
      const input = {
        workspaceId: 'test-workspace-123',
        workflowType: 'all' as const,
        complexityThreshold: 'medium' as const,
        includeIntegrations: true
      };

      const result = await service.recommendAutomations(input);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const automation = result[0];
      expect(automation.id).toBeDefined();
      expect(automation.title).toBeDefined();
      expect(automation.description).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(automation.complexity);
      expect(['low', 'medium', 'high']).toContain(automation.impact);
      expect(automation.estimatedTimeSavings).toBeGreaterThan(0);
      expect(automation.implementationSteps).toBeInstanceOf(Array);
      expect(automation.requiredTools).toBeInstanceOf(Array);
    });

    test('should filter by complexity threshold', async () => {
      const lowComplexityInput = {
        workspaceId: 'test-workspace',
        workflowType: 'all' as const,
        complexityThreshold: 'low' as const,
        includeIntegrations: true
      };

      const highComplexityInput = {
        ...lowComplexityInput,
        complexityThreshold: 'high' as const
      };

      const lowResults = await service.recommendAutomations(lowComplexityInput);
      const highResults = await service.recommendAutomations(highComplexityInput);

      expect(lowResults.length).toBeGreaterThanOrEqual(highResults.length);
    });
  });

  describe('optimizeIntegrations', () => {
    test('should provide integration recommendations', async () => {
      const input = {
        workspaceId: 'test-workspace-123',
        currentIntegrations: ['slack'],
        businessGoals: ['improve communication', 'automate workflows'],
        teamSize: 10
      };

      const result = await service.optimizeIntegrations(input);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const integration = result[0];
      expect(integration.tool).toBeDefined();
      expect(integration.category).toBeDefined();
      expect(integration.benefits).toBeInstanceOf(Array);
      expect(integration.implementation).toBeDefined();
      expect(['free', 'low', 'medium', 'high']).toContain(integration.cost);
      expect(integration.priority).toBeGreaterThanOrEqual(1);
      expect(integration.priority).toBeLessThanOrEqual(10);
    });

    test('should exclude current integrations', async () => {
      const input = {
        workspaceId: 'test-workspace',
        currentIntegrations: ['slack', 'github'],
        teamSize: 5
      };

      const result = await service.optimizeIntegrations(input);

      const toolNames = result.map(r => r.tool.toLowerCase());
      expect(toolNames).not.toContain('slack');
      expect(toolNames).not.toContain('github');
    });
  });
});
