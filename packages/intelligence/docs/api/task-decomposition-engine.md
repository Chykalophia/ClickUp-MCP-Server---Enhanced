# Task Decomposition Engine

**Tool Name**: `clickup_decompose_task`

## Overview

Intelligent task breakdown and sizing using AI analysis. Automatically decomposes complex tasks into manageable subtasks with effort estimates and dependencies.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskDescription` | string | Description of the task to decompose |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `complexity` | enum | `medium` | Task complexity: `low`, `medium`, `high`, `very_high` |
| `targetSubtasks` | number | `5` | Target number of subtasks (3-10) |
| `includeEstimates` | boolean | `true` | Include effort estimates for subtasks |
| `includeDependencies` | boolean | `true` | Identify dependencies between subtasks |
| `skillLevel` | enum | `intermediate` | Team skill level: `beginner`, `intermediate`, `advanced` |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted decomposition with subtasks
    }
  ]
}
```

## Example Usage

### Basic Task Decomposition

```typescript
const result = await callTool({
  name: 'clickup_decompose_task',
  arguments: {
    taskDescription: 'Build user authentication system'
  }
});
```

### Advanced Decomposition with Custom Parameters

```typescript
const result = await callTool({
  name: 'clickup_decompose_task',
  arguments: {
    taskDescription: 'Implement real-time chat feature',
    complexity: 'high',
    targetSubtasks: 7,
    skillLevel: 'advanced',
    includeEstimates: true,
    includeDependencies: true
  }
});
```

## Sample Response

```markdown
# 🔧 TASK DECOMPOSITION ANALYSIS

## Original Task
**Build user authentication system** (Complexity: Medium)

## Recommended Subtasks (5)

### 1. Database Schema Design
- **Effort**: 8 hours
- **Complexity**: Medium
- **Skills**: Database design, SQL
- **Dependencies**: None (Starting point)

### 2. User Registration API
- **Effort**: 12 hours  
- **Complexity**: Medium
- **Skills**: Backend development, API design
- **Dependencies**: Database Schema Design

### 3. Login/Logout Endpoints
- **Effort**: 10 hours
- **Complexity**: Medium
- **Skills**: Authentication, Session management
- **Dependencies**: User Registration API

### 4. Password Reset Flow
- **Effort**: 16 hours
- **Complexity**: High
- **Skills**: Email integration, Security
- **Dependencies**: User Registration API

### 5. Frontend Integration
- **Effort**: 14 hours
- **Complexity**: Medium
- **Skills**: Frontend development, API integration
- **Dependencies**: Login/Logout Endpoints

## Summary
- **Total Estimated Effort**: 60 hours
- **Critical Path**: Database → Registration → Login → Frontend
- **Parallel Work Possible**: Password Reset can be developed alongside Login
- **Risk Areas**: Email integration, Security implementation
```

## Complexity Analysis

The tool automatically analyzes task complexity based on:

- **Technical Scope**: Number of systems involved
- **Integration Points**: External dependencies
- **Skill Requirements**: Specialized knowledge needed
- **Risk Factors**: Security, performance, scalability concerns

## Decomposition Strategies

### By Feature
- Breaks down by user-facing features
- Good for product development
- Clear value delivery per subtask

### By Layer
- Separates frontend, backend, database
- Good for technical teams
- Clear separation of concerns

### By Workflow
- Follows user journey or process flow
- Good for complex business logic
- Natural dependency ordering

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Task too simple` | Task doesn't need decomposition | Use task as-is or add more scope |
| `Invalid complexity` | Complexity parameter out of range | Use: low, medium, high, very_high |
| `Target subtasks out of range` | Number not between 3-10 | Adjust targetSubtasks parameter |

## Performance Characteristics

- **Response Time**: 1-3 seconds
- **Memory Usage**: ~5MB per decomposition
- **Cache Duration**: Results cached for 1 hour
- **Concurrent Limit**: 10 decompositions simultaneously

## Related Tools

- [`clickup_analyze_task_complexity`](./task-complexity-analyzer.md) - Analyze complexity before decomposition
- [`clickup_get_decomposition_templates`](./decomposition-templates.md) - Get pre-built templates
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Use decomposed tasks in sprint planning
