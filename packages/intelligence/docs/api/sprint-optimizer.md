# Sprint Optimizer API

## Overview

The **Sprint Optimizer** provides multi-objective optimization for task selection using advanced constraint satisfaction algorithms. This tool balances business value, team capacity, task dependencies, and risk factors to create optimal sprint plans that maximize value delivery while respecting constraints.

## Tool Information

- **Tool Name**: `clickup_optimize_sprint_tasks`
- **Category**: Sprint Planning
- **Version**: 4.1.0
- **Response Time**: ~950ms
- **Memory Usage**: ~52MB
- **Rate Limit**: 25 requests/minute

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | ClickUp workspace ID to analyze |
| `sprintId` | string | Sprint identifier for optimization |
| `candidateTasks` | array | Array of task IDs to consider for optimization |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `optimizationGoals` | array | ["value", "capacity"] | Optimization objectives: "value", "capacity", "risk", "dependencies" |
| `constraints` | object | {} | Sprint constraints (capacity, deadlines, dependencies) |
| `weightings` | object | {} | Objective weightings for multi-criteria optimization |
| `riskTolerance` | string | "medium" | Risk tolerance level: "low", "medium", "high" |
| `includeBuffer` | boolean | true | Include capacity buffer in optimization |
| `maxIterations` | number | 1000 | Maximum optimization iterations |

## Response Schema

```json
{
  "optimizedSprint": {
    "selectedTasks": [
      {
        "taskId": "868f9p3bg",
        "title": "API Documentation Phase 3.1",
        "businessValue": 85,
        "effort": 13,
        "priority": "high",
        "assignee": "38366580",
        "dependencies": ["868fahzue"],
        "riskScore": 0.25,
        "valueEfficiency": 6.54
      }
    ],
    "optimization": {
      "totalValue": 342,
      "totalEffort": 67,
      "capacityUtilization": 0.89,
      "riskScore": 0.31,
      "dependencyComplexity": 0.42,
      "valueEfficiency": 5.10
    },
    "constraints": {
      "capacity": {
        "available": 75,
        "used": 67,
        "buffer": 8,
        "utilization": 0.89
      },
      "dependencies": {
        "satisfied": 12,
        "blocked": 0,
        "circular": 0
      },
      "deadlines": {
        "met": 8,
        "at_risk": 1,
        "missed": 0
      }
    },
    "alternatives": [
      {
        "scenario": "max_value",
        "totalValue": 365,
        "totalEffort": 78,
        "riskScore": 0.45,
        "feasible": false,
        "reason": "Exceeds capacity constraints"
      },
      {
        "scenario": "min_risk",
        "totalValue": 298,
        "totalEffort": 58,
        "riskScore": 0.18,
        "feasible": true,
        "reason": "Conservative approach with lower risk"
      }
    ]
  },
  "optimizationDetails": {
    "algorithm": "multi_objective_genetic",
    "iterations": 847,
    "convergence": 0.95,
    "solutionQuality": "optimal",
    "alternativesEvaluated": 2340
  },
  "recommendations": [
    {
      "type": "task_prioritization",
      "priority": "high",
      "title": "Consider High-Value Quick Wins",
      "description": "Tasks 'User Authentication' and 'API Validation' offer high value-to-effort ratios",
      "impact": "high",
      "effort": "low",
      "tasks": ["auth_task_123", "validation_456"]
    }
  ],
  "metadata": {
    "analysisDate": "2024-09-01T20:51:24.228Z",
    "version": "4.1.0",
    "processingTime": "943ms",
    "tasksEvaluated": 45
  }
}
```

## Usage Examples

### Basic Sprint Optimization

```javascript
const result = await callTool({
  name: 'clickup_optimize_sprint_tasks',
  arguments: {
    workspaceId: '9011839976',
    sprintId: 'sprint_123',
    candidateTasks: ['task1', 'task2', 'task3', 'task4']
  }
});
```

### Advanced Multi-Objective Optimization

```javascript
const result = await callTool({
  name: 'clickup_optimize_sprint_tasks',
  arguments: {
    workspaceId: '9011839976',
    sprintId: 'sprint_123',
    candidateTasks: ['task1', 'task2', 'task3', 'task4', 'task5'],
    optimizationGoals: ['value', 'capacity', 'risk'],
    constraints: {
      maxCapacity: 80,
      deadline: '2024-09-15',
      requiredTasks: ['task1']
    },
    weightings: {
      value: 0.4,
      capacity: 0.3,
      risk: 0.3
    },
    riskTolerance: 'low',
    includeBuffer: true
  }
});
```

## Key Features

### Multi-Objective Optimization
- **Value Maximization**: Prioritizes high business value tasks
- **Capacity Optimization**: Ensures optimal resource utilization
- **Risk Minimization**: Balances risk exposure across the sprint
- **Dependency Management**: Handles complex task dependencies

### Constraint Satisfaction
- **Capacity Constraints**: Respects team capacity limits
- **Deadline Constraints**: Ensures critical deadlines are met
- **Dependency Constraints**: Maintains proper task ordering
- **Resource Constraints**: Considers skill and availability constraints

### Advanced Algorithms
- **Genetic Algorithm**: Multi-objective genetic optimization
- **Constraint Propagation**: Efficient constraint satisfaction
- **Pareto Optimization**: Finds optimal trade-off solutions
- **Sensitivity Analysis**: Evaluates solution robustness

## Optimization Objectives

### Business Value Optimization
- **ROI Maximization**: Prioritizes tasks with highest return on investment
- **Strategic Alignment**: Weights tasks by strategic importance
- **Customer Impact**: Considers customer value and satisfaction
- **Revenue Impact**: Factors in direct revenue implications

### Capacity Optimization
- **Utilization Maximization**: Optimizes team capacity usage
- **Load Balancing**: Distributes work evenly across team members
- **Skill Matching**: Assigns tasks to best-suited team members
- **Buffer Management**: Maintains appropriate capacity buffers

### Risk Optimization
- **Technical Risk**: Assesses technical complexity and uncertainty
- **Schedule Risk**: Evaluates timeline and deadline risks
- **Resource Risk**: Considers team availability and skill risks
- **Dependency Risk**: Analyzes inter-task dependency risks

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `NO_FEASIBLE_SOLUTION` | No solution satisfies all constraints | Relax constraints or reduce task scope |
| `INSUFFICIENT_CAPACITY` | Tasks exceed available capacity | Reduce task scope or increase capacity |
| `CIRCULAR_DEPENDENCIES` | Circular dependencies detected | Resolve dependency conflicts |
| `INVALID_WEIGHTINGS` | Objective weightings don't sum to 1.0 | Adjust weighting values |

### Error Response Format

```json
{
  "error": {
    "code": "NO_FEASIBLE_SOLUTION",
    "message": "No feasible solution found that satisfies all constraints",
    "details": {
      "constraintViolations": [
        {
          "constraint": "capacity",
          "required": 95,
          "available": 75,
          "violation": 20
        }
      ],
      "suggestions": [
        "Reduce task scope by 20 story points",
        "Increase team capacity",
        "Extend sprint duration"
      ]
    }
  }
}
```

## Performance Characteristics

- **Response Time**: 700-1200ms depending on problem complexity
- **Memory Usage**: 40-65MB for optimization processing
- **Cache Duration**: 1 hour for optimization results
- **Concurrent Limit**: 3 simultaneous optimizations per workspace
- **Data Retention**: Optimization results cached for 6 hours

## Integration Notes

### Prerequisites
- Tasks must have business value and effort estimates
- Team capacity data must be available
- Task dependencies should be properly defined

### Best Practices
- Provide accurate effort estimates for better optimization
- Define clear business value metrics
- Use appropriate risk tolerance settings
- Review alternative scenarios for decision making

### Related Tools
- [`clickup_analyze_team_velocity`](./velocity-analyzer.md) - Provides velocity data for capacity constraints
- [`clickup_model_team_capacity`](./capacity-modeler.md) - Supplies capacity constraints for optimization
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Uses optimization results for sprint planning

## Optimization Algorithms

### Multi-Objective Genetic Algorithm
- **Population Size**: 100-500 solutions
- **Crossover Rate**: 0.8
- **Mutation Rate**: 0.1
- **Selection Method**: Tournament selection
- **Convergence Criteria**: 95% solution stability

### Constraint Satisfaction
- **Forward Checking**: Eliminates inconsistent values
- **Arc Consistency**: Maintains constraint consistency
- **Backtracking**: Systematic solution space exploration
- **Heuristic Ordering**: Most constrained variable first

## Changelog

### Version 4.1.0
- Added multi-objective genetic algorithm optimization
- Enhanced constraint satisfaction capabilities
- Improved risk assessment and management
- Added alternative scenario generation

### Version 4.0.0
- Initial release with basic optimization algorithms
- Core constraint satisfaction implementation
- Business value and capacity optimization
