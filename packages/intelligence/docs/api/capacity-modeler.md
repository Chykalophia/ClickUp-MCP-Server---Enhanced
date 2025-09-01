# Capacity Modeler API

## Overview

The **Capacity Modeler** provides advanced team capacity modeling with availability factors, focus factors, and skill-based adjustments. This tool delivers comprehensive individual and team capacity analysis for accurate sprint planning and resource allocation.

## Tool Information

- **Tool Name**: `clickup_model_team_capacity`
- **Category**: Sprint Planning
- **Version**: 4.1.0
- **Response Time**: ~650ms
- **Memory Usage**: ~38MB
- **Rate Limit**: 40 requests/minute

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | ClickUp workspace ID to analyze |
| `teamId` | string | Team identifier for capacity modeling |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sprintLength` | number | 14 | Sprint length in days |
| `includeAvailability` | boolean | true | Factor in individual availability schedules |
| `includeFocusFactor` | boolean | true | Apply focus factor adjustments |
| `includeSkillWeighting` | boolean | true | Weight capacity by skill levels |
| `bufferPercentage` | number | 15 | Capacity buffer percentage (5-30) |
| `timeframe` | string | "current" | Analysis timeframe: "current", "next_sprint", "next_month" |

## Response Schema

```json
{
  "capacityModel": {
    "teamCapacity": {
      "totalHours": 320,
      "availableHours": 272,
      "effectiveHours": 231,
      "utilizationRate": 0.85,
      "bufferHours": 34.6
    },
    "individualCapacities": [
      {
        "userId": "38366580",
        "name": "John Developer",
        "role": "Senior Developer",
        "capacity": {
          "totalHours": 80,
          "availableHours": 72,
          "effectiveHours": 61.2,
          "focusFactor": 0.85,
          "availabilityFactor": 0.90
        },
        "skills": {
          "frontend": 0.9,
          "backend": 0.8,
          "testing": 0.7
        },
        "adjustments": [
          {
            "type": "vacation",
            "dates": ["2024-09-15", "2024-09-16"],
            "impact": -16
          }
        ]
      }
    ],
    "capacityFactors": {
      "availability": {
        "averageFactor": 0.88,
        "factors": {
          "meetings": 0.15,
          "vacation": 0.08,
          "sick_leave": 0.03,
          "training": 0.05
        }
      },
      "focus": {
        "averageFactor": 0.82,
        "factors": {
          "interruptions": 0.12,
          "context_switching": 0.08,
          "administrative": 0.06
        }
      },
      "skill": {
        "averageWeighting": 0.85,
        "skillDistribution": {
          "expert": 0.25,
          "senior": 0.45,
          "intermediate": 0.30
        }
      }
    },
    "capacityTrends": {
      "historical": [
        {
          "period": "last_sprint",
          "plannedCapacity": 240,
          "actualCapacity": 218,
          "variance": -0.09
        }
      ],
      "predictions": [
        {
          "period": "next_sprint",
          "predictedCapacity": 235,
          "confidenceLevel": 0.87
        }
      ]
    }
  },
  "recommendations": [
    {
      "type": "capacity_optimization",
      "priority": "medium",
      "title": "Reduce Meeting Overhead",
      "description": "Meeting time consuming 15% of capacity. Consider consolidating or reducing meeting frequency",
      "impact": "high",
      "effort": "medium",
      "potentialGain": "12 hours/sprint"
    }
  ],
  "metadata": {
    "analysisDate": "2024-09-01T20:51:24.228Z",
    "version": "4.1.0",
    "processingTime": "645ms",
    "teamMembers": 4
  }
}
```

## Usage Examples

### Basic Capacity Modeling

```javascript
const result = await callTool({
  name: 'clickup_model_team_capacity',
  arguments: {
    workspaceId: '9011839976',
    teamId: 'team_123'
  }
});
```

### Advanced Modeling with Custom Parameters

```javascript
const result = await callTool({
  name: 'clickup_model_team_capacity',
  arguments: {
    workspaceId: '9011839976',
    teamId: 'team_123',
    sprintLength: 10,
    includeAvailability: true,
    includeFocusFactor: true,
    includeSkillWeighting: true,
    bufferPercentage: 20,
    timeframe: 'next_month'
  }
});
```

## Key Features

### Multi-Factor Analysis
- **Availability Factors**: Vacation, meetings, training, sick leave
- **Focus Factors**: Interruptions, context switching, administrative tasks
- **Skill Weighting**: Individual skill levels and expertise areas
- **Buffer Management**: Configurable capacity buffers for risk mitigation

### Individual Capacity Modeling
- **Personal Schedules**: Individual availability and time-off tracking
- **Role-Based Adjustments**: Capacity adjustments based on roles and responsibilities
- **Skill Assessment**: Multi-dimensional skill evaluation and weighting
- **Historical Performance**: Individual capacity trend analysis

### Team Capacity Optimization
- **Utilization Analysis**: Team-wide capacity utilization patterns
- **Bottleneck Identification**: Identifies capacity constraints and bottlenecks
- **Load Balancing**: Recommendations for optimal workload distribution
- **Capacity Planning**: Future capacity needs and hiring recommendations

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `TEAM_NOT_FOUND` | Team ID not found in workspace | Verify team ID exists |
| `INSUFFICIENT_MEMBERS` | Team has fewer than 2 members | Ensure team has adequate members |
| `INVALID_BUFFER` | Buffer percentage outside 5-30% range | Adjust buffer percentage |
| `MISSING_SCHEDULE_DATA` | Individual schedule data unavailable | Update team member schedules |

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_MEMBERS",
    "message": "Team must have at least 2 members for capacity modeling",
    "details": {
      "currentMembers": 1,
      "minimumRequired": 2,
      "suggestion": "Add more team members or use individual capacity analysis"
    }
  }
}
```

## Performance Characteristics

- **Response Time**: 500-800ms depending on team size
- **Memory Usage**: 30-45MB for capacity calculations
- **Cache Duration**: 2 hours for capacity models
- **Concurrent Limit**: 8 simultaneous analyses per workspace
- **Data Retention**: Capacity models cached for 12 hours

## Integration Notes

### Prerequisites
- Team members must be assigned to the specified team
- Individual schedules and availability data recommended
- Historical sprint data enhances accuracy

### Best Practices
- Update individual availability regularly
- Include skill assessments for accurate weighting
- Use appropriate buffer percentages (15-20% typical)
- Review capacity models weekly during active sprints

### Related Tools
- [`clickup_analyze_team_velocity`](./velocity-analyzer.md) - Complements capacity with velocity analysis
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Uses capacity models for sprint planning
- [`clickup_optimize_sprint_tasks`](./sprint-optimizer.md) - Optimizes tasks based on capacity constraints

## Capacity Calculation Methods

### Base Capacity Calculation
```
Base Capacity = Team Size × Sprint Length × Daily Hours
```

### Adjusted Capacity Calculation
```
Adjusted Capacity = Base Capacity × Availability Factor × Focus Factor × Skill Factor
```

### Effective Capacity with Buffer
```
Effective Capacity = Adjusted Capacity × (1 - Buffer Percentage)
```

## Changelog

### Version 4.1.0
- Added skill-based capacity weighting
- Enhanced individual capacity modeling
- Improved focus factor calculations
- Added capacity trend analysis

### Version 4.0.0
- Initial release with core capacity modeling
- Basic availability and focus factor support
- Team-level capacity calculations
