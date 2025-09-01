/**
 * Workflow Intelligence Formatter Unit Tests
 * 
 * Phase 2.1: Comprehensive unit testing for workflow intelligence formatting
 * Target Coverage: >95%
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

import { WorkflowIntelligenceFormatter } from '../../utils/workflow-intelligence-formatter';
import { 
  WorkflowAnalysisResult, 
  AutomationOpportunity, 
  IntegrationRecommendation 
} from '../../services/workflow-intelligence-service';

describe('WorkflowIntelligenceFormatter', () => {
  describe('generateWorkflowReport', () => {
    test('should generate a comprehensive workflow report', () => {
      const mockAnalysis: WorkflowAnalysisResult = {
        workspaceId: 'test-workspace-123',
        analysisDate: new Date().toISOString(),
        timeframe: '1month',
        patterns: [
          {
            id: 'test-pattern',
            name: 'Test Pattern',
            frequency: 50,
            efficiency: 'medium',
            steps: [
              {
                action: 'Test Action',
                tool: 'clickup_test_tool',
                averageTime: 30,
                errorRate: 0.05,
                automationPotential: 0.8
              }
            ],
            bottlenecks: ['Test bottleneck'],
            optimizationPotential: 0.7
          }
        ],
        automationOpportunities: [
          {
            id: 'test-automation',
            title: 'Test Automation',
            description: 'Test automation description',
            complexity: 'medium',
            impact: 'high',
            estimatedTimeSavings: 120,
            implementationSteps: ['Step 1', 'Step 2'],
            requiredTools: ['clickup_test_tool']
          }
        ],
        integrationRecommendations: [
          {
            tool: 'Test Tool',
            category: 'Test Category',
            benefits: ['Benefit 1', 'Benefit 2'],
            implementation: 'Test implementation',
            cost: 'free',
            priority: 8
          }
        ],
        overallEfficiencyScore: 75,
        recommendations: ['Test recommendation'],
        metadata: {
          version: '4.1.0',
          analysisDepth: 'standard',
          dataPoints: 1000
        }
      };

      const report = WorkflowIntelligenceFormatter.generateWorkflowReport(mockAnalysis);

      expect(report).toContain('Workflow Intelligence Analysis Report');
      expect(report).toContain('test-workspace-123');
      expect(report).toContain('75/100');
      expect(report).toContain('Test Pattern');
      expect(report).toContain('Test Automation');
      expect(report).toContain('Test Tool');
      expect(report).toContain('Test recommendation');
      expect(report).toContain('v4.1.0');
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Workflow Patterns Identified');
      expect(report).toContain('Automation Opportunities');
      expect(report).toContain('Integration Recommendations');
      expect(report).toContain('Key Recommendations');
      expect(report).toContain('Next Steps');
    });

    test('should handle empty patterns gracefully', () => {
      const mockAnalysis: WorkflowAnalysisResult = {
        workspaceId: 'empty-workspace',
        analysisDate: new Date().toISOString(),
        timeframe: '1week',
        patterns: [],
        automationOpportunities: [],
        integrationRecommendations: [],
        overallEfficiencyScore: 0,
        recommendations: [],
        metadata: {
          version: '4.1.0',
          analysisDepth: 'quick',
          dataPoints: 0
        }
      };

      const report = WorkflowIntelligenceFormatter.generateWorkflowReport(mockAnalysis);

      expect(report).toContain('Workflow Intelligence Analysis Report');
      expect(report).toContain('empty-workspace');
      expect(report).toContain('0/100');
    });

    test('should format efficiency scores with appropriate emojis', () => {
      const highEfficiencyAnalysis: WorkflowAnalysisResult = {
        workspaceId: 'high-efficiency',
        analysisDate: new Date().toISOString(),
        timeframe: '1month',
        patterns: [],
        automationOpportunities: [],
        integrationRecommendations: [],
        overallEfficiencyScore: 85,
        recommendations: [],
        metadata: {
          version: '4.1.0',
          analysisDepth: 'standard',
          dataPoints: 500
        }
      };

      const report = WorkflowIntelligenceFormatter.generateWorkflowReport(highEfficiencyAnalysis);
      expect(report).toContain('85/100 🟢');
    });
  });

  describe('generateAutomationReport', () => {
    test('should generate automation recommendations report', () => {
      const mockAutomations: AutomationOpportunity[] = [
        {
          id: 'test-automation-1',
          title: 'Test Automation 1',
          description: 'First test automation',
          complexity: 'low',
          impact: 'high',
          estimatedTimeSavings: 180,
          implementationSteps: ['Step 1', 'Step 2'],
          requiredTools: ['clickup_tool_1']
        },
        {
          id: 'test-automation-2',
          title: 'Test Automation 2',
          description: 'Second test automation',
          complexity: 'high',
          impact: 'medium',
          estimatedTimeSavings: 90,
          implementationSteps: ['Step A', 'Step B'],
          requiredTools: ['clickup_tool_2']
        }
      ];

      const report = WorkflowIntelligenceFormatter.generateAutomationReport(mockAutomations);

      expect(report).toContain('Automation Recommendations Report');
      expect(report).toContain('Total Opportunities: 2');
      expect(report).toContain('270 minutes/week');
      expect(report).toContain('Test Automation 1');
      expect(report).toContain('Test Automation 2');
      expect(report).toContain('Implementation Priority');
      expect(report).toContain('🚀 HIGH');
      expect(report).toContain('🟢 LOW');
      expect(report).toContain('🔴 HIGH');
    });

    test('should calculate total time savings correctly', () => {
      const automations: AutomationOpportunity[] = [
        {
          id: 'auto-1',
          title: 'Automation 1',
          description: 'Description 1',
          complexity: 'low',
          impact: 'high',
          estimatedTimeSavings: 100,
          implementationSteps: ['Step 1'],
          requiredTools: ['tool1']
        },
        {
          id: 'auto-2',
          title: 'Automation 2',
          description: 'Description 2',
          complexity: 'medium',
          impact: 'medium',
          estimatedTimeSavings: 50,
          implementationSteps: ['Step 2'],
          requiredTools: ['tool2']
        }
      ];

      const report = WorkflowIntelligenceFormatter.generateAutomationReport(automations);

      expect(report).toContain('150 minutes/week');
      expect(report).toContain('325 hours/month saved'); // 150 * 4.33 * 0.5
    });

    test('should handle empty automation list', () => {
      const report = WorkflowIntelligenceFormatter.generateAutomationReport([]);

      expect(report).toContain('Automation Recommendations Report');
      expect(report).toContain('Total Opportunities: 0');
      expect(report).toContain('0 minutes/week');
    });
  });

  describe('generateIntegrationReport', () => {
    test('should generate integration optimization report', () => {
      const mockIntegrations: IntegrationRecommendation[] = [
        {
          tool: 'Slack',
          category: 'Communication',
          benefits: ['Real-time notifications', 'Team collaboration'],
          implementation: 'Native integration',
          cost: 'free',
          priority: 9
        },
        {
          tool: 'GitHub',
          category: 'Development',
          benefits: ['Code tracking', 'Automated updates'],
          implementation: 'API integration',
          cost: 'free',
          priority: 8
        }
      ];

      const report = WorkflowIntelligenceFormatter.generateIntegrationReport(mockIntegrations);

      expect(report).toContain('Integration Optimization Report');
      expect(report).toContain('Recommended Integrations: 2');
      expect(report).toContain('Slack');
      expect(report).toContain('GitHub');
      expect(report).toContain('Communication, Development');
      expect(report).toContain('Integration Roadmap');
      expect(report).toContain('Phase 1: Essential Integrations');
      expect(report).toContain('🆓 FREE');
    });

    test('should categorize integrations by priority phases', () => {
      const integrations: IntegrationRecommendation[] = [
        {
          tool: 'High Priority Tool',
          category: 'Essential',
          benefits: ['Critical benefit'],
          implementation: 'Easy setup',
          cost: 'free',
          priority: 9
        },
        {
          tool: 'Medium Priority Tool',
          category: 'Enhancement',
          benefits: ['Nice benefit'],
          implementation: 'Moderate setup',
          cost: 'low',
          priority: 7
        },
        {
          tool: 'Low Priority Tool',
          category: 'Advanced',
          benefits: ['Advanced benefit'],
          implementation: 'Complex setup',
          cost: 'high',
          priority: 4
        }
      ];

      const report = WorkflowIntelligenceFormatter.generateIntegrationReport(integrations);

      expect(report).toContain('Phase 1: Essential Integrations');
      expect(report).toContain('High Priority Tool');
      expect(report).toContain('Phase 2: Enhancement Integrations');
      expect(report).toContain('Medium Priority Tool');
      expect(report).toContain('Phase 3: Advanced Integrations');
      expect(report).toContain('Low Priority Tool');
    });

    test('should handle empty integration list', () => {
      const report = WorkflowIntelligenceFormatter.generateIntegrationReport([]);

      expect(report).toContain('Integration Optimization Report');
      expect(report).toContain('Recommended Integrations: 0');
    });

    test('should display cost indicators correctly', () => {
      const integrations: IntegrationRecommendation[] = [
        {
          tool: 'Free Tool',
          category: 'Test',
          benefits: ['Benefit'],
          implementation: 'Easy',
          cost: 'free',
          priority: 8
        },
        {
          tool: 'Expensive Tool',
          category: 'Test',
          benefits: ['Benefit'],
          implementation: 'Complex',
          cost: 'high',
          priority: 6
        }
      ];

      const report = WorkflowIntelligenceFormatter.generateIntegrationReport(integrations);

      expect(report).toContain('🆓 FREE');
      expect(report).toContain('💰💰💰 HIGH');
    });
  });

  describe('private helper methods', () => {
    test('should format efficiency emojis correctly', () => {
      // Test through public methods that use these helpers
      const highEfficiencyAnalysis: WorkflowAnalysisResult = {
        workspaceId: 'test',
        analysisDate: new Date().toISOString(),
        timeframe: '1month',
        patterns: [
          {
            id: 'high-pattern',
            name: 'High Efficiency Pattern',
            frequency: 10,
            efficiency: 'high',
            steps: [],
            bottlenecks: [],
            optimizationPotential: 0.9
          }
        ],
        automationOpportunities: [],
        integrationRecommendations: [],
        overallEfficiencyScore: 90,
        recommendations: [],
        metadata: {
          version: '4.1.0',
          analysisDepth: 'standard',
          dataPoints: 100
        }
      };

      const report = WorkflowIntelligenceFormatter.generateWorkflowReport(highEfficiencyAnalysis);
      expect(report).toContain('🟢');
    });

    test('should format impact and complexity emojis correctly', () => {
      const automations: AutomationOpportunity[] = [
        {
          id: 'high-impact',
          title: 'High Impact Automation',
          description: 'Description',
          complexity: 'low',
          impact: 'high',
          estimatedTimeSavings: 100,
          implementationSteps: ['Step'],
          requiredTools: ['tool']
        }
      ];

      const report = WorkflowIntelligenceFormatter.generateAutomationReport(automations);
      expect(report).toContain('🚀 HIGH'); // Impact emoji
      expect(report).toContain('🟢 LOW');  // Complexity emoji
    });
  });
});
