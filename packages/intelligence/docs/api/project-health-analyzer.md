# Project Health Analyzer

**Tool Name**: `clickup_analyze_project_health`

## Overview

Comprehensive real-time project health analysis with risk assessment, velocity trends, and actionable recommendations. Provides executive dashboard with letter grades (A-F) and specific improvement suggestions.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | ClickUp workspace ID to analyze |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `spaceId` | string | - | Specific space ID to analyze (analyzes entire workspace if not provided) |
| `analysisDepth` | enum | `standard` | Analysis depth: `quick`, `standard`, `comprehensive` |
| `includeRecommendations` | boolean | `true` | Include actionable recommendations in the analysis |
| `timeframe` | enum | `1month` | Historical data timeframe: `1week`, `2weeks`, `1month`, `3months` |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted health analysis report
    }
  ]
}
```

## Example Usage

### Basic Health Analysis

```typescript
const result = await callTool({
  name: 'clickup_analyze_project_health',
  arguments: {
    workspaceId: '12345'
  }
});
```

### Comprehensive Analysis with Specific Timeframe

```typescript
const result = await callTool({
  name: 'clickup_analyze_project_health',
  arguments: {
    workspaceId: '12345',
    spaceId: '67890',
    analysisDepth: 'comprehensive',
    timeframe: '3months',
    includeRecommendations: true
  }
});
```

## Sample Response

```markdown
# 🏥 PROJECT HEALTH ANALYSIS

## Executive Summary
**Overall Health Grade: B+** (83/100)

### Key Metrics
- **Velocity Trend**: ↗️ +15% (Improving)
- **Task Completion Rate**: 87%
- **Team Utilization**: 92%
- **Risk Level**: Medium

## Detailed Analysis

### 📈 Velocity Analysis
- Current sprint velocity: 45 story points
- 3-month average: 39 story points
- Trend: Consistently improving (+15%)

### ⚠️ Risk Assessment
- **High Priority**: 3 overdue critical tasks
- **Medium Priority**: 12 tasks approaching deadline
- **Team Burnout Risk**: Low (2/10)

### 🎯 Recommendations
1. **Address Overdue Tasks**: Focus on 3 critical overdue items
2. **Capacity Planning**: Current team at 92% utilization - consider load balancing
3. **Process Improvement**: Implement daily standups to maintain velocity gains

## Health Metrics Breakdown
- **Task Flow Efficiency**: A- (91%)
- **Team Collaboration**: B+ (85%)
- **Technical Debt**: B (78%)
- **Customer Satisfaction**: A (94%)
```

## Analysis Depth Options

### Quick Analysis
- Basic metrics and health score
- Response time: <1 second
- Suitable for dashboards and quick checks

### Standard Analysis (Default)
- Comprehensive health metrics
- Trend analysis and recommendations
- Response time: 1-2 seconds
- Suitable for regular health reviews

### Comprehensive Analysis
- Deep insights and predictive analytics
- Detailed risk assessment and mitigation strategies
- Response time: 2-5 seconds
- Suitable for strategic planning sessions

## Health Scoring Algorithm

The health score (0-100) is calculated using weighted metrics:

- **Velocity Consistency** (25%) - Sprint-to-sprint velocity stability
- **Task Completion Rate** (20%) - Percentage of tasks completed on time
- **Team Utilization** (15%) - Optimal resource allocation
- **Risk Factors** (15%) - Overdue tasks, blockers, dependencies
- **Quality Metrics** (15%) - Bug rates, rework frequency
- **Team Satisfaction** (10%) - Workload balance, burnout indicators

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Workspace not found` | Invalid workspace ID | Verify workspace ID and permissions |
| `Insufficient data` | New workspace with limited history | Use shorter timeframe or quick analysis |
| `API rate limit` | Too many concurrent requests | Automatic retry with exponential backoff |
| `Permission denied` | Insufficient ClickUp permissions | Ensure API token has workspace access |

## Performance Characteristics

- **Response Time**: 1-2 seconds (standard), up to 5 seconds (comprehensive)
- **Memory Usage**: ~10MB per workspace analysis
- **Cache Duration**: Results cached for 5 minutes
- **Concurrent Limit**: 5 analyses per workspace simultaneously

## Related Tools

- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Use health insights for sprint planning
- [`clickup_analyze_workload`](./workload-analyzer.md) - Deep dive into team utilization
- [`clickup_generate_executive_dashboard`](./executive-dashboard.md) - Create executive reports
