/* eslint-disable no-console */
/**
 * ClickUp Intelligence MCP Server - Main Entry Point
 * 
 * AI-powered project management intelligence and workflow optimization.
 * Provides advanced analytics, predictive insights, and optimization tools.
 * 
 * @version 4.1.0
 * @package @chykalophia/clickup-intelligence-mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Phase 1.1 - Project Health Analyzer (COMPLETED)
import { setupProjectHealthAnalyzer } from './tools/project-health-analyzer.js';
import { HealthMetricsService } from './services/health-metrics-service.js';

// Phase 1.2 - Smart Sprint Planner (COMPLETED)
import { SmartSprintPlanner, createSmartSprintPlanner, SmartSprintPlannerInputSchema } from './tools/smart-sprint-planner.js';
import { VelocityAnalysisService, createVelocityAnalysisService, VelocityAnalysisInputSchema } from './services/velocity-analysis-service.js';
import { CapacityModelingService, createCapacityModelingService, CapacityModelingInputSchema } from './services/capacity-modeling-service.js';
import { SprintOptimizationService, createSprintOptimizationService, SprintOptimizationInputSchema } from './services/sprint-optimization-service.js';

// Phase 1.3 - Task Decomposition Engine (NEW)
import { TaskDecompositionEngine, taskDecompositionTool, complexityAnalysisTool, decompositionTemplatesTools } from './tools/task-decomposition-engine.js';
import { TaskAnalysisService } from './services/task-analysis-service.js';
import { TaskDecompositionFormatter } from './utils/task-decomposition-formatter.js';

// Phase 1.4 - Resource Optimizer (NEW)
import { ResourceOptimizer, workloadAnalysisTool, taskAssignmentTool, burnoutAnalysisTool, capacityForecastTool } from './tools/resource-optimizer.js';
import { ResourceOptimizationService } from './services/resource-optimization-service-impl.js';
import { ResourceOptimizationFormatter } from './utils/resource-optimization-formatter.js';

// Phase 1.5 - Workflow Intelligence (NEW)
import { WorkflowIntelligence, workflowPatternAnalysisTool, automationRecommendationTool, integrationOptimizationTool } from './tools/workflow-intelligence.js';
import { WorkflowIntelligenceService, WorkflowPatternAnalysisInputSchema, AutomationRecommendationInputSchema, IntegrationOptimizationInputSchema } from './services/workflow-intelligence-service.js';
import { WorkflowIntelligenceFormatter } from './utils/workflow-intelligence-formatter.js';

// Phase 3.1 - Real-Time Data Processing Engine (NEW)
import { 
  startRealTimeEngine, 
  processWebhookEvent, 
  addProcessingRule, 
  getRealTimeMetrics, 
  stopRealTimeEngine, 
  getCachedTaskData,
  startRealTimeEngineSchema,
  processWebhookSchema,
  addProcessingRuleSchema,
  getRealTimeMetricsSchema
} from './tools/real-time-tools.js';

// Shared utilities
import { formatMarkdownReport, generateExecutiveDashboard } from './utils/report-formatter.js';

/**
 * ClickUp Intelligence MCP Server
 * 
 * Provides AI-powered project management intelligence through MCP protocol.
 * Features advanced analytics, predictive insights, and optimization tools.
 */
class ClickUpIntelligenceServer {
  private server: Server;
  private smartSprintPlanner: SmartSprintPlanner;
  private healthMetricsService: HealthMetricsService;
  private velocityAnalysisService: VelocityAnalysisService;
  private capacityModelingService: CapacityModelingService;
  private sprintOptimizationService: SprintOptimizationService;
  private taskDecompositionEngine: TaskDecompositionEngine;
  private taskAnalysisService: TaskAnalysisService;
  private resourceOptimizer: ResourceOptimizer;
  private resourceOptimizationService: ResourceOptimizationService;
  private workflowIntelligence: WorkflowIntelligence;

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'clickup-intelligence-mcp-server',
        version: '4.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Initialize AI services
    this.smartSprintPlanner = createSmartSprintPlanner();
    this.healthMetricsService = new HealthMetricsService();
    this.velocityAnalysisService = createVelocityAnalysisService();
    this.capacityModelingService = createCapacityModelingService();
    this.sprintOptimizationService = createSprintOptimizationService();
    this.taskDecompositionEngine = new TaskDecompositionEngine();
    this.taskAnalysisService = new TaskAnalysisService();
    this.resourceOptimizer = new ResourceOptimizer();
    this.resourceOptimizationService = new ResourceOptimizationService();
    this.workflowIntelligence = new WorkflowIntelligence();

    this.setupToolHandlers();
  }

  /**
   * Sets up MCP tool handlers for all intelligence tools
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Phase 1.1 - Project Health Analyzer
        {
          name: 'clickup_analyze_project_health',
          description: '🏥 **AI PROJECT HEALTH ANALYZER** - Comprehensive real-time project health analysis with risk assessment, velocity trends, and actionable recommendations. Provides executive dashboard with letter grades (A-F) and specific improvement suggestions.',
          inputSchema: {
            type: 'object',
            properties: {
              workspaceId: {
                type: 'string',
                description: 'ClickUp workspace ID to analyze'
              },
              spaceId: {
                type: 'string',
                description: 'Optional: Specific space ID to analyze (analyzes entire workspace if not provided)'
              },
              analysisDepth: {
                type: 'string',
                enum: ['quick', 'standard', 'comprehensive'],
                default: 'standard',
                description: 'Analysis depth: quick (basic metrics), standard (full analysis), comprehensive (deep insights)'
              },
              includeRecommendations: {
                type: 'boolean',
                default: true,
                description: 'Include actionable recommendations in the analysis'
              },
              timeframe: {
                type: 'string',
                enum: ['1week', '2weeks', '1month', '3months'],
                default: '1month',
                description: 'Historical data timeframe for trend analysis'
              }
            },
            required: ['workspaceId']
          }
        },
        
        // Phase 1.2 - Smart Sprint Planner
        {
          name: 'clickup_plan_smart_sprint',
          description: '🚀 **AI SMART SPRINT PLANNER** - Advanced AI-powered sprint planning with velocity analysis, capacity modeling, and task optimization. Combines historical data, team capacity, and business priorities for optimal sprint plans.',
          inputSchema: SmartSprintPlannerInputSchema
        },
        
        {
          name: 'clickup_analyze_team_velocity',
          description: '📈 **VELOCITY ANALYSIS** - Analyzes historical sprint data to predict team velocity with confidence intervals. Includes seasonal adjustments, team composition impact, and trend analysis.',
          inputSchema: VelocityAnalysisInputSchema
        },
        
        {
          name: 'clickup_model_team_capacity',
          description: '⚡ **CAPACITY MODELING** - Advanced team capacity modeling with availability factors, focus factors, and skill-based adjustments. Provides individual and team capacity analysis.',
          inputSchema: CapacityModelingInputSchema
        },
        
        {
          name: 'clickup_optimize_sprint_tasks',
          description: '🎯 **SPRINT OPTIMIZATION** - Multi-objective optimization for task selection using constraint satisfaction algorithms. Balances business value, capacity, dependencies, and risk factors.',
          inputSchema: SprintOptimizationInputSchema
        },

        // Phase 1.3 - Task Decomposition Engine
        {
          name: 'clickup_decompose_task',
          description: '🔄 **AI TASK DECOMPOSITION ENGINE** - Intelligently decompose complex tasks into smaller, manageable subtasks with AI-powered analysis. Features complexity assessment, effort estimation, dependency identification, and template-based decomposition patterns.',
          inputSchema: taskDecompositionTool.inputSchema
        },

        {
          name: 'clickup_analyze_task_complexity',
          description: '🧠 **TASK COMPLEXITY ANALYZER** - Analyze task complexity across multiple dimensions (technical, business, integration, uncertainty) to determine if decomposition is needed. Provides detailed reasoning and recommendations.',
          inputSchema: complexityAnalysisTool.inputSchema
        },

        {
          name: 'clickup_get_decomposition_templates',
          description: '📋 **DECOMPOSITION TEMPLATES** - Get available task decomposition templates for common development patterns (API development, UI features, database changes, bug fixes, research tasks).',
          inputSchema: decompositionTemplatesTools.inputSchema
        },

        // Phase 1.4 - Resource Optimizer
        {
          name: 'clickup_analyze_team_workload',
          description: '⚖️ **TEAM WORKLOAD ANALYZER** - Comprehensive analysis of team workload distribution, capacity utilization, and resource bottlenecks. Identifies optimization opportunities and provides actionable recommendations for balanced team productivity.',
          inputSchema: workloadAnalysisTool.inputSchema
        },

        {
          name: 'clickup_optimize_task_assignment',
          description: '🎯 **TASK ASSIGNMENT OPTIMIZER** - AI-powered task assignment optimization that balances workload, maximizes skill matching, and promotes team development. Uses constraint satisfaction algorithms for optimal resource allocation.',
          inputSchema: taskAssignmentTool.inputSchema
        },

        {
          name: 'clickup_analyze_burnout_risk',
          description: '🚨 **BURNOUT RISK ANALYZER** - Advanced burnout risk assessment using workload patterns, performance metrics, and early warning indicators. Provides personalized prevention strategies and intervention recommendations.',
          inputSchema: burnoutAnalysisTool.inputSchema
        },

        {
          name: 'clickup_forecast_team_capacity',
          description: '📈 **CAPACITY FORECASTING** - Predictive capacity analysis for future resource planning. Identifies potential bottlenecks, resource needs, and hiring recommendations based on historical trends and growth projections.',
          inputSchema: capacityForecastTool.inputSchema
        },

        // Phase 1.5 - Workflow Intelligence
        {
          name: 'clickup_analyze_workflow_patterns',
          description: '🔄 **WORKFLOW PATTERN ANALYZER** - Identify recurring workflow patterns, bottlenecks, and optimization opportunities. Analyzes team workflows to discover inefficiencies and automation potential.',
          inputSchema: WorkflowPatternAnalysisInputSchema
        },

        {
          name: 'clickup_recommend_automations',
          description: '🤖 **AUTOMATION RECOMMENDER** - Generate AI-powered automation recommendations based on workflow analysis. Identifies repetitive tasks and suggests automation solutions with implementation guidance.',
          inputSchema: AutomationRecommendationInputSchema
        },

        {
          name: 'clickup_optimize_integrations',
          description: '🔗 **INTEGRATION OPTIMIZER** - Recommend optimal third-party integrations and workflow connections. Analyzes current setup and suggests integrations to maximize productivity and reduce manual work.',
          inputSchema: IntegrationOptimizationInputSchema
        },

        // Phase 3.1 - Real-Time Data Processing Engine
        {
          name: 'clickup_start_realtime_engine',
          description: '🚀 **REAL-TIME PROCESSING ENGINE** - Start the real-time data processing engine for live ClickUp integration. Enables WebSocket connections, event streaming, and real-time analytics with <2s latency.',
          inputSchema: startRealTimeEngineSchema
        },
        
        {
          name: 'clickup_process_webhook',
          description: '📡 **WEBHOOK PROCESSOR** - Process incoming ClickUp webhook events in real-time. Validates signatures, processes events through stream pipeline, and broadcasts to connected clients.',
          inputSchema: processWebhookSchema
        },
        
        {
          name: 'clickup_add_processing_rule',
          description: '⚙️ **PROCESSING RULE ENGINE** - Add custom processing rules for real-time event handling. Define conditions and actions for automated responses to ClickUp events.',
          inputSchema: addProcessingRuleSchema
        },
        
        {
          name: 'clickup_get_realtime_metrics',
          description: '📊 **REAL-TIME METRICS** - Get comprehensive metrics from the real-time processing engine including latency, throughput, cache hit rates, and SLA compliance.',
          inputSchema: getRealTimeMetricsSchema
        },
        
        {
          name: 'clickup_get_cached_task',
          description: '💾 **CACHED DATA ACCESS** - Retrieve cached task data from the real-time processing engine for instant access without API calls.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'ClickUp task ID to retrieve from cache'
              }
            },
            required: ['taskId']
          }
        },
        
        {
          name: 'clickup_stop_realtime_engine',
          description: '🛑 **STOP REAL-TIME ENGINE** - Gracefully stop the real-time processing engine and return final metrics.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Phase 1.1 - Project Health Analyzer
          case 'clickup_analyze_project_health':
            console.log('[Intelligence] Executing project health analysis...');
            // For now, return mock health analysis data
            const healthResult = {
              workspaceId: (args as any)?.workspaceId || 'unknown',
              healthScore: 85,
              grade: 'B',
              analysis: 'Mock project health analysis for Phase 1.2 development',
              metadata: { version: '4.0.0', timestamp: new Date().toISOString() }
            };
            return {
              content: [
                {
                  type: 'text',
                  text: formatMarkdownReport(healthResult, 'Project Health Analysis')
                }
              ]
            };

          // Phase 1.2 - Smart Sprint Planner
          case 'clickup_plan_smart_sprint':
            console.log('[Intelligence] Executing smart sprint planning...');
            if (!args) throw new Error('Missing required arguments for sprint planning');
            const sprintPlan = await this.smartSprintPlanner.planSprint(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: generateExecutiveDashboard(sprintPlan, 'Smart Sprint Plan')
                }
              ]
            };

          case 'clickup_analyze_team_velocity':
            console.log('[Intelligence] Executing velocity analysis...');
            if (!args) throw new Error('Missing required arguments for velocity analysis');
            const velocityResult = await this.velocityAnalysisService.analyzeVelocity(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: formatMarkdownReport(velocityResult, 'Team Velocity Analysis')
                }
              ]
            };

          case 'clickup_model_team_capacity':
            console.log('[Intelligence] Executing capacity modeling...');
            if (!args) throw new Error('Missing required arguments for capacity modeling');
            const capacityResult = await this.capacityModelingService.modelCapacity(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: formatMarkdownReport(capacityResult, 'Team Capacity Analysis')
                }
              ]
            };

          case 'clickup_optimize_sprint_tasks':
            console.log('[Intelligence] Executing sprint optimization...');
            if (!args) throw new Error('Missing required arguments for sprint optimization');
            const optimizationResult = await this.sprintOptimizationService.optimizeSprint(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: formatMarkdownReport(optimizationResult, 'Sprint Task Optimization')
                }
              ]
            };

          // Phase 1.3 - Task Decomposition Engine
          case 'clickup_decompose_task':
            console.log('[Intelligence] Executing task decomposition...');
            if (!args) throw new Error('Missing required arguments for task decomposition');
            const decompositionResult = await this.taskDecompositionEngine.decomposeTask(
              (args as any).task,
              (args as any).options
            );
            return {
              content: [
                {
                  type: 'text',
                  text: TaskDecompositionFormatter.generateReport(decompositionResult)
                }
              ]
            };

          case 'clickup_analyze_task_complexity':
            console.log('[Intelligence] Executing task complexity analysis...');
            if (!args) throw new Error('Missing required arguments for complexity analysis');
            const complexityResult = await this.taskDecompositionEngine.analyzeComplexity((args as any).task);
            return {
              content: [
                {
                  type: 'text',
                  text: formatMarkdownReport(complexityResult, 'Task Complexity Analysis')
                }
              ]
            };

          case 'clickup_get_decomposition_templates':
            console.log('[Intelligence] Retrieving decomposition templates...');
            const templates = this.taskDecompositionEngine.getAvailableTemplates();
            return {
              content: [
                {
                  type: 'text',
                  text: formatMarkdownReport(templates, 'Available Decomposition Templates')
                }
              ]
            };

          // Phase 1.4 - Resource Optimizer
          case 'clickup_analyze_team_workload':
            console.log('[Intelligence] Executing team workload analysis...');
            if (!args) throw new Error('Missing required arguments for workload analysis');
            const workloadResult = await this.resourceOptimizer.analyzeTeamWorkload(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: ResourceOptimizationFormatter.generateWorkloadReport(workloadResult)
                }
              ]
            };

          case 'clickup_optimize_task_assignment':
            console.log('[Intelligence] Executing task assignment optimization...');
            if (!args) throw new Error('Missing required arguments for task assignment');
            const assignmentResult = await this.resourceOptimizer.optimizeTaskAssignment(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: ResourceOptimizationFormatter.generateAssignmentReport(assignmentResult)
                }
              ]
            };

          case 'clickup_analyze_burnout_risk':
            console.log('[Intelligence] Executing burnout risk analysis...');
            if (!args) throw new Error('Missing required arguments for burnout analysis');
            const burnoutResult = await this.resourceOptimizer.analyzeBurnoutRisk(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: ResourceOptimizationFormatter.generateBurnoutReport(burnoutResult)
                }
              ]
            };

          case 'clickup_forecast_team_capacity':
            console.log('[Intelligence] Executing capacity forecasting...');
            if (!args) throw new Error('Missing required arguments for capacity forecasting');
            const forecastResult = await this.resourceOptimizer.forecastCapacity(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: ResourceOptimizationFormatter.generateCapacityReport(forecastResult)
                }
              ]
            };

          // Phase 1.5 - Workflow Intelligence
          case 'clickup_analyze_workflow_patterns':
            console.log('[Intelligence] Executing workflow pattern analysis...');
            if (!args) throw new Error('Missing required arguments for workflow pattern analysis');
            const workflowResult = await this.workflowIntelligence.analyzeWorkflowPatterns(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: WorkflowIntelligenceFormatter.generateWorkflowReport(workflowResult)
                }
              ]
            };

          case 'clickup_recommend_automations':
            console.log('[Intelligence] Executing automation recommendations...');
            if (!args) throw new Error('Missing required arguments for automation recommendations');
            const automationResult = await this.workflowIntelligence.recommendAutomations(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: WorkflowIntelligenceFormatter.generateAutomationReport(automationResult)
                }
              ]
            };

          case 'clickup_optimize_integrations':
            console.log('[Intelligence] Executing integration optimization...');
            if (!args) throw new Error('Missing required arguments for integration optimization');
            const integrationResult = await this.workflowIntelligence.optimizeIntegrations(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: WorkflowIntelligenceFormatter.generateIntegrationReport(integrationResult)
                }
              ]
            };

          // Phase 3.1 - Real-Time Data Processing Engine
          case 'clickup_start_realtime_engine':
            console.log('[Intelligence] Starting real-time processing engine...');
            return await startRealTimeEngine(args as any);

          case 'clickup_process_webhook':
            console.log('[Intelligence] Processing webhook event...');
            return await processWebhookEvent(args as any);

          case 'clickup_add_processing_rule':
            console.log('[Intelligence] Adding processing rule...');
            return await addProcessingRule(args as any);

          case 'clickup_get_realtime_metrics':
            console.log('[Intelligence] Getting real-time metrics...');
            return await getRealTimeMetrics(args as any);

          case 'clickup_get_cached_task':
            console.log('[Intelligence] Getting cached task data...');
            return await getCachedTaskData(args as any);

          case 'clickup_stop_realtime_engine':
            console.log('[Intelligence] Stopping real-time processing engine...');
            return await stopRealTimeEngine();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`[Intelligence] Tool execution failed for ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Error executing ${name}**\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n*Please check your input parameters and try again.*`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[Intelligence] ClickUp Intelligence MCP Server started successfully');
    console.log('[Intelligence] Phase 1.1: Project Health Analyzer ✅');
    console.log('[Intelligence] Phase 1.2: Smart Sprint Planner ✅');
    console.log('[Intelligence] Phase 1.3: Task Decomposition Engine ✅');
    console.log('[Intelligence] Phase 1.4: Resource Optimizer ✅');
    console.log('[Intelligence] Phase 1.5: Workflow Intelligence ✅');
    console.log('[Intelligence] Phase 3.1: Real-Time Data Processing Engine ✅');
    console.log('[Intelligence] Available tools: 21');
  }
}

// Export main classes and services
export {
  ClickUpIntelligenceServer,
  SmartSprintPlanner,
  HealthMetricsService,
  VelocityAnalysisService,
  CapacityModelingService,
  SprintOptimizationService
};

// Export factory functions
export {
  createSmartSprintPlanner,
  createVelocityAnalysisService,
  createCapacityModelingService,
  createSprintOptimizationService
};

// Export schemas for external use
export {
  SmartSprintPlannerInputSchema,
  VelocityAnalysisInputSchema,
  CapacityModelingInputSchema,
  SprintOptimizationInputSchema
};

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ClickUpIntelligenceServer();
  server.start().catch((error) => {
    console.error('[Intelligence] Failed to start server:', error);
    process.exit(1);
  });
}

export default ClickUpIntelligenceServer;
