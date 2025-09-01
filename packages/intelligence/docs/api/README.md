# ClickUp Intelligence MCP Server - API Documentation

Complete API reference for all AI-powered intelligence tools.

## Overview

The ClickUp Intelligence MCP Server provides 21 AI-powered tools across 6 categories:

- **Project Health Analysis** (1 tool) - Real-time health scoring and risk assessment
- **Sprint Planning** (1 tool) - AI-optimized sprint planning with capacity analysis  
- **Task Management** (3 tools) - Intelligent task breakdown and complexity analysis
- **Resource Optimization** (4 tools) - Team workload balancing and skill matching
- **Workflow Intelligence** (3 tools) - Pattern analysis and automation recommendations
- **Real-Time Processing** (6 tools) - Live data streaming and event processing
- **Utility Tools** (3 tools) - Report formatting and dashboard generation

## Quick Start

```typescript
// Example: Analyze project health
const result = await callTool({
  name: 'clickup_analyze_project_health',
  arguments: {
    workspaceId: '12345',
    analysisDepth: 'standard',
    timeframe: '1month'
  }
});
```

## Tool Categories

### 🏥 Project Health Analysis
- [`clickup_analyze_project_health`](./project-health-analyzer.md) - Comprehensive project health analysis

### 🎯 Sprint Planning  
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - AI-optimized sprint planning

### 📋 Task Management
- [`clickup_decompose_task`](./task-decomposition-engine.md) - Intelligent task breakdown
- [`clickup_analyze_task_complexity`](./task-complexity-analyzer.md) - Task complexity analysis
- [`clickup_get_decomposition_templates`](./decomposition-templates.md) - Task decomposition templates

### 👥 Resource Optimization
- [`clickup_analyze_workload`](./workload-analyzer.md) - Team workload analysis
- [`clickup_optimize_task_assignment`](./task-assignment-optimizer.md) - Optimal task assignment
- [`clickup_analyze_burnout_risk`](./burnout-analyzer.md) - Burnout risk assessment
- [`clickup_forecast_capacity`](./capacity-forecaster.md) - Team capacity forecasting

### 🔄 Workflow Intelligence
- [`clickup_analyze_workflow_patterns`](./workflow-pattern-analyzer.md) - Workflow pattern analysis
- [`clickup_recommend_automation`](./automation-recommender.md) - Automation recommendations
- [`clickup_optimize_integrations`](./integration-optimizer.md) - Integration optimization

### ⚡ Real-Time Processing
- [`clickup_start_realtime_engine`](./realtime-engine-start.md) - Start real-time processing
- [`clickup_process_webhook`](./webhook-processor.md) - Process ClickUp webhooks
- [`clickup_add_processing_rule`](./processing-rule-manager.md) - Add event processing rules
- [`clickup_get_realtime_metrics`](./realtime-metrics.md) - Get performance metrics
- [`clickup_get_cached_task`](./cached-task-retriever.md) - Access cached task data
- [`clickup_stop_realtime_engine`](./realtime-engine-stop.md) - Stop real-time processing

### 📊 Utility Tools
- [`clickup_format_markdown_report`](./markdown-formatter.md) - Format reports as markdown
- [`clickup_generate_executive_dashboard`](./executive-dashboard.md) - Generate executive dashboards
- [`clickup_analyze_workflow_efficiency`](./workflow-efficiency.md) - Analyze workflow efficiency

## Common Parameters

### Authentication
All tools require a ClickUp API token set in the environment:
```bash
export CLICKUP_API_TOKEN="your_token_here"
```

### Standard Parameters
- `workspaceId` (string) - ClickUp workspace ID
- `spaceId` (string, optional) - Specific space to analyze
- `listId` (string, optional) - Specific list to analyze
- `taskId` (string, optional) - Specific task to analyze

### Analysis Options
- `analysisDepth` - Analysis depth: `quick`, `standard`, `comprehensive`
- `timeframe` - Historical data timeframe: `1week`, `2weeks`, `1month`, `3months`
- `includeRecommendations` (boolean) - Include actionable recommendations

## Response Format

All tools return structured responses with:

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted analysis results
    }
  ],
  isError?: boolean // Present if an error occurred
}
```

## Error Handling

Common error scenarios:
- **Invalid API Token**: Check CLICKUP_API_TOKEN environment variable
- **Workspace Not Found**: Verify workspace ID and permissions
- **Rate Limiting**: Tools implement automatic retry with exponential backoff
- **Network Issues**: Automatic retry for transient failures

## Rate Limits

- **API Calls**: 1000 requests per minute per workspace
- **Webhook Processing**: 100 events per minute
- **Real-time Updates**: 10 concurrent connections per workspace

## Performance Targets

- **Response Time**: <2 seconds for standard analysis
- **Accuracy**: >95% for predictive insights
- **Availability**: 99.9% uptime SLA
- **Memory Usage**: <100MB per active workspace

## Next Steps

1. Review individual tool documentation for detailed parameters
2. Check the [User Guide](../guides/getting-started.md) for tutorials
3. See [Examples](../examples/) for common use cases
4. Read [Best Practices](../guides/best-practices.md) for optimization tips
