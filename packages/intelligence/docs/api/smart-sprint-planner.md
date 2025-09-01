# Smart Sprint Planner

**Tool Name**: `clickup_plan_smart_sprint`

## Overview

AI-optimized sprint planning with capacity analysis, velocity prediction, and intelligent task prioritization. Automatically balances team workload and suggests optimal sprint composition.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | ClickUp workspace ID for sprint planning |
| `teamId` | string | Team ID for capacity and velocity analysis |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sprintDuration` | number | `14` | Sprint duration in days (7, 14, 21, or 28) |
| `sprintGoal` | string | - | Optional sprint goal or theme |
| `priorityFilter` | enum | `all` | Task priority filter: `urgent`, `high`, `normal`, `low`, `all` |
| `includeVelocityPrediction` | boolean | `true` | Include velocity prediction based on historical data |
| `balanceWorkload` | boolean | `true` | Automatically balance workload across team members |
| `considerSkills` | boolean | `true` | Consider team member skills for task assignment |
| `riskTolerance` | enum | `medium` | Risk tolerance: `low`, `medium`, `high` |

## Response Format

```typescript
{
  content: [
    {
      type: "text", 
      text: string // Formatted sprint plan with recommendations
    }
  ]
}
```

## Example Usage

### Basic Sprint Planning

```typescript
const result = await callTool({
  name: 'clickup_plan_smart_sprint',
  arguments: {
    workspaceId: '12345',
    teamId: '67890'
  }
});
```

### Advanced Sprint Planning with Custom Parameters

```typescript
const result = await callTool({
  name: 'clickup_plan_smart_sprint',
  arguments: {
    workspaceId: '12345',
    teamId: '67890',
    sprintDuration: 21,
    sprintGoal: 'Complete user authentication system',
    priorityFilter: 'high',
    riskTolerance: 'low',
    considerSkills: true
  }
});
```

## Sample Response

```markdown
# 🎯 SMART SPRINT PLAN

## Sprint Overview
- **Duration**: 14 days
- **Team**: Frontend Development Team (5 members)
- **Goal**: Complete user authentication system
- **Predicted Velocity**: 42 story points

## Capacity Analysis
- **Total Capacity**: 280 hours (14 days × 5 members × 4 hours/day)
- **Available Capacity**: 252 hours (90% utilization target)
- **Buffer**: 28 hours (10% for unexpected work)

## Recommended Tasks

### High Priority (Must Have)
1. **User Login API** - 8 points - @john.doe
   - Estimated: 16 hours
   - Skills match: 95%
   - Dependencies: Database schema

2. **Authentication Middleware** - 5 points - @jane.smith  
   - Estimated: 10 hours
   - Skills match: 90%
   - Dependencies: User Login API

3. **Password Reset Flow** - 13 points - @mike.wilson
   - Estimated: 26 hours
   - Skills match: 85%
   - Dependencies: Email service

### Medium Priority (Should Have)
4. **Two-Factor Authentication** - 8 points - @sarah.jones
   - Estimated: 16 hours
   - Skills match: 80%
   - Risk: Medium complexity

5. **Social Login Integration** - 8 points - @alex.brown
   - Estimated: 16 hours
   - Skills match: 88%
   - Risk: External API dependency

## Team Workload Distribution

| Team Member | Assigned Points | Hours | Utilization |
|-------------|----------------|-------|-------------|
| John Doe | 8 | 16 | 80% |
| Jane Smith | 5 | 10 | 50% |
| Mike Wilson | 13 | 26 | 130% ⚠️ |
| Sarah Jones | 8 | 16 | 80% |
| Alex Brown | 8 | 16 | 80% |

### ⚠️ Workload Recommendations
- **Mike Wilson**: Overallocated by 6 hours - consider redistributing Password Reset Flow
- **Jane Smith**: Underutilized - can take additional tasks from backlog

## Velocity Prediction
- **Historical Average**: 38 points/sprint
- **Predicted Velocity**: 42 points (+10.5%)
- **Confidence**: 85%
- **Factors**: Team skill improvement, reduced technical debt

## Risk Assessment
- **Schedule Risk**: Low (10% buffer maintained)
- **Technical Risk**: Medium (external dependencies)
- **Resource Risk**: Medium (Mike Wilson overallocation)

## Sprint Success Metrics
- **Completion Target**: 90% of committed points
- **Quality Gate**: <2 critical bugs
- **Team Satisfaction**: >4.0/5.0
- **Velocity Variance**: ±15% of prediction

## Recommendations
1. **Redistribute Work**: Move 1 task from Mike to Jane
2. **Daily Standups**: Focus on dependency management
3. **Mid-Sprint Review**: Check progress at day 7
4. **Skill Development**: Pair programming for complex tasks
```

## Sprint Duration Options

| Duration | Use Case | Capacity Calculation |
|----------|----------|---------------------|
| 7 days | Rapid iterations, small teams | 35 hours/person |
| 14 days | Standard agile sprints | 70 hours/person |
| 21 days | Complex features, larger scope | 105 hours/person |
| 28 days | Enterprise projects, extensive planning | 140 hours/person |

## Velocity Prediction Algorithm

The AI uses multiple factors for velocity prediction:

1. **Historical Velocity** (40%) - Last 6 sprints average
2. **Team Composition** (20%) - Skill levels and experience
3. **Task Complexity** (15%) - Story point distribution
4. **External Factors** (15%) - Holidays, meetings, dependencies
5. **Team Morale** (10%) - Recent performance trends

## Workload Balancing

The tool automatically balances workload by:

- **Skill Matching**: Assigns tasks based on team member expertise
- **Capacity Limits**: Respects individual capacity constraints
- **Dependency Management**: Sequences tasks to minimize blockers
- **Risk Distribution**: Spreads high-risk tasks across team members

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Team not found` | Invalid team ID | Verify team ID and permissions |
| `Insufficient velocity data` | New team with <3 sprints | Use manual velocity estimate |
| `No available tasks` | Empty backlog | Add tasks to backlog first |
| `Capacity calculation failed` | Missing team member data | Update team member profiles |

## Performance Characteristics

- **Response Time**: 2-4 seconds for standard teams
- **Memory Usage**: ~15MB per team analysis
- **Cache Duration**: Results cached for 1 hour
- **Concurrent Limit**: 3 planning sessions per team

## Integration Points

- **ClickUp Lists**: Pulls tasks from specified lists
- **Time Tracking**: Uses historical time data for estimates
- **Custom Fields**: Considers story points and complexity ratings
- **Team Management**: Integrates with ClickUp team structure

## Related Tools

- [`clickup_analyze_project_health`](./project-health-analyzer.md) - Use health data for planning
- [`clickup_analyze_workload`](./workload-analyzer.md) - Detailed capacity analysis
- [`clickup_forecast_capacity`](./capacity-forecaster.md) - Long-term capacity planning
