# Task Assignment Optimizer

**Tool Name**: `clickup_optimize_task_assignment`

## Overview

Optimize task assignments using AI-powered skill matching, workload balancing, and performance prediction. Automatically assigns tasks to team members based on skills, capacity, and historical performance.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasks` | array | Array of tasks to assign with requirements |
| `teamMembers` | array | Array of available team members with skills |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `optimizationGoal` | enum | `balanced` | Goal: `balanced`, `speed`, `quality`, `learning` |
| `considerWorkload` | boolean | `true` | Factor in current workload |
| `skillWeighting` | number | `0.7` | Skill match importance (0-1) |
| `workloadWeighting` | number | `0.3` | Workload balance importance (0-1) |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted assignment plan
    }
  ]
}
```

## Example Usage

### Basic Assignment Optimization

```typescript
const result = await callTool({
  name: 'clickup_optimize_task_assignment',
  arguments: {
    tasks: [
      {
        id: 'task_1',
        name: 'Frontend Component',
        skills: ['React', 'CSS'],
        complexity: 'medium',
        estimatedHours: 16
      }
    ],
    teamMembers: [
      {
        id: 'user_1',
        name: 'John Doe',
        skills: ['React', 'TypeScript'],
        capacity: 40,
        currentWorkload: 20
      }
    ]
  }
});
```

## Sample Response

```markdown
# 🎯 OPTIMIZED TASK ASSIGNMENTS

## Assignment Summary
- **Total Tasks**: 5
- **Team Members**: 4
- **Optimization Goal**: Balanced
- **Overall Match Score**: 87%

## Recommended Assignments

### John Doe (Senior Developer)
**Assigned Tasks**: 2 tasks, 28 hours
- **Task 1**: Frontend Component (16h)
  - Skill Match: 95% (React Expert, CSS Advanced)
  - Complexity: Medium
  - Priority: High
- **Task 2**: API Integration (12h)
  - Skill Match: 85% (TypeScript Expert)
  - Complexity: Low
  - Priority: Medium

**Workload**: 48/40 hours (120% - ⚠️ Over capacity)
**Recommendation**: Consider redistributing 8 hours

### Jane Smith (Mid-Level Developer)
**Assigned Tasks**: 1 task, 20 hours
- **Task 3**: Database Schema (20h)
  - Skill Match: 78% (SQL Intermediate)
  - Complexity: High
  - Priority: High
  - Learning Opportunity: ✅

**Workload**: 20/40 hours (50% - Under-utilized)
**Recommendation**: Can take additional tasks

## Assignment Optimization Details

### Skill Matching Analysis
- **Perfect Matches**: 2 tasks (40%)
- **Good Matches**: 2 tasks (40%)
- **Learning Opportunities**: 1 task (20%)
- **Average Skill Match**: 87%

### Workload Distribution
- **Balanced Members**: 2 (50%)
- **Over-allocated**: 1 (25%)
- **Under-utilized**: 1 (25%)
- **Team Utilization**: 85%

### Performance Predictions
- **Estimated Completion**: 2.5 weeks
- **Quality Score**: 8.5/10
- **Risk Level**: Medium
- **Success Probability**: 92%

## Alternative Assignments

### Option 2: Speed-Optimized
- **Completion Time**: 2 weeks
- **Quality Score**: 7.8/10
- **Team Stress**: Higher

### Option 3: Learning-Focused
- **Completion Time**: 3 weeks
- **Quality Score**: 8.8/10
- **Skill Development**: Maximum
```

## Optimization Goals

### Balanced (Default)
- Equal weight to skills and workload
- Optimal team utilization
- Sustainable pace

### Speed
- Prioritize fastest completion
- Assign to most experienced members
- May create workload imbalances

### Quality
- Prioritize skill matching
- Assign complex tasks to experts
- Focus on deliverable quality

### Learning
- Maximize skill development opportunities
- Pair junior with senior members
- Longer timelines for growth

## Task Requirements

### Required Fields
```typescript
{
  id: string,           // Unique task identifier
  name: string,         // Task name
  skills: string[],     // Required skills
  complexity: 'low' | 'medium' | 'high',
  estimatedHours: number
}
```

### Optional Fields
```typescript
{
  priority: 'low' | 'medium' | 'high',
  deadline: string,     // ISO date string
  dependencies: string[], // Task IDs
  preferredAssignee: string // User ID
}
```

## Team Member Profile

### Required Fields
```typescript
{
  id: string,           // Unique user identifier
  name: string,         // Display name
  skills: string[],     // Available skills
  capacity: number,     // Hours per sprint
  currentWorkload: number // Current assigned hours
}
```

### Optional Fields
```typescript
{
  experienceLevel: 'junior' | 'mid' | 'senior',
  performanceRating: number, // 1-10 scale
  availability: {
    startDate: string,
    endDate: string
  },
  preferences: {
    taskTypes: string[],
    avoidTaskTypes: string[]
  }
}
```

## Optimization Algorithm

### Skill Matching (70% weight)
- **Exact Match**: 100% score
- **Related Skills**: 80% score
- **Transferable Skills**: 60% score
- **Learning Opportunity**: 40% score

### Workload Balancing (30% weight)
- **Optimal Range**: 70-90% capacity
- **Under-utilized**: <70% capacity
- **Over-allocated**: >90% capacity
- **Critical**: >100% capacity

### Performance Factors
- **Historical Success Rate**: Past task completion
- **Quality Metrics**: Code review scores, bug rates
- **Velocity**: Story points completed per sprint
- **Collaboration**: Team feedback scores

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `No suitable assignee` | Skills not available in team | Add team members or adjust requirements |
| `Capacity exceeded` | Too many tasks for team | Reduce scope or extend timeline |
| `Invalid task data` | Missing required fields | Provide complete task information |
| `Empty team` | No team members provided | Add team member data |

## Performance Characteristics

- **Response Time**: 3-8 seconds depending on team size
- **Memory Usage**: ~5MB per optimization
- **Scalability**: Up to 50 tasks, 20 team members
- **Cache Duration**: Results cached for 1 hour

## Related Tools

- [`clickup_analyze_workload`](./workload-analyzer.md) - Analyze current team workload
- [`clickup_analyze_burnout_risk`](./burnout-analyzer.md) - Assess assignment impact
- [`clickup_forecast_capacity`](./capacity-forecaster.md) - Plan future capacity needs
