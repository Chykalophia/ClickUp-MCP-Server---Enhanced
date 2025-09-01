# Workload Analyzer

**Tool Name**: `clickup_analyze_workload`

## Overview

Comprehensive team workload analysis with capacity utilization, skill distribution, and burnout risk assessment. Provides actionable insights for workload balancing and resource optimization.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `teamId` | string | Team ID for workload analysis |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeframe` | enum | `current_sprint` | Analysis timeframe: `current_sprint`, `next_sprint`, `month`, `quarter` |
| `includeSkillAnalysis` | boolean | `true` | Include skill distribution analysis |
| `includeBurnoutRisk` | boolean | `true` | Include burnout risk assessment |
| `includeRecommendations` | boolean | `true` | Include optimization recommendations |
| `granularity` | enum | `individual` | Analysis level: `individual`, `team`, `both` |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted workload analysis report
    }
  ]
}
```

## Example Usage

### Basic Workload Analysis

```typescript
const result = await callTool({
  name: 'clickup_analyze_workload',
  arguments: {
    teamId: 'team_12345'
  }
});
```

### Comprehensive Analysis with Custom Timeframe

```typescript
const result = await callTool({
  name: 'clickup_analyze_workload',
  arguments: {
    teamId: 'team_12345',
    timeframe: 'quarter',
    includeSkillAnalysis: true,
    includeBurnoutRisk: true,
    granularity: 'both'
  }
});
```

## Sample Response

```markdown
# 👥 TEAM WORKLOAD ANALYSIS

## Team Overview
- **Team**: Frontend Development Team
- **Members**: 5 active members
- **Analysis Period**: Current Sprint (14 days)
- **Total Capacity**: 280 hours

## Individual Workload Distribution

### John Doe (Senior Developer)
- **Current Load**: 32 hours (80% capacity)
- **Utilization**: ✅ Optimal
- **Skills**: React (Expert), TypeScript (Advanced)
- **Burnout Risk**: 🟢 Low (2/10)

### Jane Smith (Mid-Level Developer)  
- **Current Load**: 20 hours (50% capacity)
- **Utilization**: ⚠️ Under-utilized
- **Skills**: Vue.js (Intermediate), CSS (Advanced)
- **Burnout Risk**: 🟢 Low (1/10)

### Mike Wilson (Senior Developer)
- **Current Load**: 48 hours (120% capacity)
- **Utilization**: 🔴 Over-allocated
- **Skills**: Node.js (Expert), Database (Advanced)
- **Burnout Risk**: 🟡 Medium (6/10)

## Team Metrics

### Capacity Utilization
- **Average Utilization**: 83%
- **Optimal Range**: 70-90%
- **Over-allocated Members**: 1 (Mike Wilson)
- **Under-utilized Members**: 1 (Jane Smith)

### Skill Distribution
- **Frontend Skills**: Well covered (4/5 members)
- **Backend Skills**: Limited (2/5 members)
- **Database Skills**: Concentrated (1 expert)
- **Testing Skills**: Gap identified

### Burnout Risk Assessment
- **Low Risk**: 3 members (60%)
- **Medium Risk**: 1 member (20%)
- **High Risk**: 0 members (0%)
- **Team Average**: 3.2/10 (Healthy)

## Workload Balance Recommendations

### Immediate Actions (This Sprint)
1. **Redistribute Work**: Move 8 hours from Mike to Jane
2. **Skill Development**: Pair Jane with John for React training
3. **Capacity Buffer**: Maintain 10% buffer for unexpected work

### Medium-term Improvements (Next 2 Sprints)
1. **Cross-training**: Backend skills for frontend developers
2. **Testing Skills**: Implement testing training program
3. **Load Balancing**: Establish workload monitoring process

### Long-term Strategy (Next Quarter)
1. **Team Expansion**: Consider hiring backend specialist
2. **Skill Matrix**: Develop comprehensive skill tracking
3. **Automation**: Implement workload balancing tools

## Risk Factors
- **Single Point of Failure**: Database expertise concentrated in one person
- **Skill Gaps**: Limited testing and backend capabilities
- **Workload Variance**: 70% difference between highest and lowest utilization

## Success Metrics
- **Target Utilization**: 70-90% for all members
- **Skill Coverage**: 2+ experts per critical skill
- **Burnout Risk**: <5/10 average across team
- **Workload Variance**: <30% between team members
```

## Analysis Dimensions

### Capacity Utilization
- **Time Allocation**: Hours assigned vs. available
- **Task Distribution**: Number and complexity of tasks
- **Deadline Pressure**: Urgency and time constraints
- **Context Switching**: Frequency of task changes

### Skill Analysis
- **Skill Coverage**: Team expertise across required skills
- **Skill Gaps**: Missing or under-represented capabilities
- **Skill Concentration**: Over-reliance on specific individuals
- **Development Opportunities**: Areas for skill growth

### Burnout Risk Factors
- **Workload Volume**: Total hours and task count
- **Complexity Stress**: Difficulty of assigned tasks
- **Deadline Pressure**: Time constraints and urgency
- **Work-Life Balance**: Overtime and weekend work patterns

## Timeframe Options

| Timeframe | Use Case | Analysis Depth |
|-----------|----------|----------------|
| `current_sprint` | Immediate workload management | High detail, current tasks |
| `next_sprint` | Sprint planning optimization | Medium detail, planned work |
| `month` | Monthly resource planning | Trend analysis, patterns |
| `quarter` | Strategic capacity planning | Long-term trends, growth planning |

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Team not found` | Invalid team ID | Verify team ID and permissions |
| `Insufficient data` | New team with limited history | Use shorter timeframe or manual input |
| `No active members` | Team has no active members | Check team membership and status |
| `Permission denied` | Insufficient access rights | Ensure API token has team access |

## Performance Characteristics

- **Response Time**: 2-4 seconds for team analysis
- **Memory Usage**: ~20MB per team analysis
- **Cache Duration**: Results cached for 30 minutes
- **Concurrent Limit**: 5 analyses per team simultaneously

## Integration Points

- **ClickUp Teams**: Pulls team member data and assignments
- **Time Tracking**: Uses historical time data for utilization
- **Task Management**: Analyzes current and planned task assignments
- **Custom Fields**: Considers skill tags and capacity settings

## Related Tools

- [`clickup_optimize_task_assignment`](./task-assignment-optimizer.md) - Optimize task distribution
- [`clickup_analyze_burnout_risk`](./burnout-analyzer.md) - Detailed burnout analysis
- [`clickup_forecast_capacity`](./capacity-forecaster.md) - Future capacity planning
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Use workload data for sprint planning
