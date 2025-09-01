# Velocity Analyzer API

## Overview

The **Velocity Analyzer** provides comprehensive team velocity analysis using historical sprint data to predict future performance with statistical confidence intervals. This tool combines historical data analysis, seasonal adjustments, and team composition impact assessment to deliver accurate velocity predictions.

## Tool Information

- **Tool Name**: `clickup_analyze_team_velocity`
- **Category**: Sprint Planning
- **Version**: 4.1.0
- **Response Time**: ~800ms
- **Memory Usage**: ~45MB
- **Rate Limit**: 30 requests/minute

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | ClickUp workspace ID to analyze |
| `teamId` | string | Team identifier for velocity analysis |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeframe` | string | "3months" | Analysis timeframe: "1month", "3months", "6months", "1year" |
| `includeSeasonality` | boolean | true | Include seasonal velocity adjustments |
| `confidenceLevel` | number | 0.95 | Statistical confidence level (0.8-0.99) |
| `includeComposition` | boolean | true | Factor in team composition changes |
| `sprintLength` | number | 14 | Sprint length in days for calculations |

## Response Schema

```json
{
  "velocityAnalysis": {
    "currentVelocity": {
      "average": 45.2,
      "median": 43.0,
      "standardDeviation": 8.5,
      "trend": "increasing"
    },
    "prediction": {
      "nextSprint": {
        "predicted": 47.1,
        "confidenceInterval": {
          "lower": 42.3,
          "upper": 51.9
        },
        "confidence": 0.95
      },
      "next3Sprints": {
        "predicted": [47.1, 48.2, 49.0],
        "averageConfidenceInterval": {
          "lower": 41.8,
          "upper": 54.2
        }
      }
    },
    "seasonalFactors": {
      "currentSeason": "Q4",
      "seasonalMultiplier": 0.92,
      "historicalSeasonality": {
        "Q1": 1.05,
        "Q2": 1.08,
        "Q3": 0.95,
        "Q4": 0.92
      }
    },
    "teamComposition": {
      "stabilityScore": 0.85,
      "experienceLevel": "senior",
      "compositionChanges": [
        {
          "date": "2024-08-15",
          "change": "added_senior_developer",
          "velocityImpact": 1.15
        }
      ]
    },
    "qualityMetrics": {
      "dataQuality": "high",
      "samplesAnalyzed": 12,
      "outliersSuppressed": 2,
      "modelAccuracy": 0.87
    }
  },
  "recommendations": [
    {
      "type": "capacity_planning",
      "priority": "high",
      "title": "Adjust Sprint Capacity",
      "description": "Based on velocity trends, consider increasing sprint capacity by 8-12%",
      "impact": "medium",
      "effort": "low"
    }
  ],
  "metadata": {
    "analysisDate": "2024-09-01T20:51:24.228Z",
    "version": "4.1.0",
    "processingTime": "782ms",
    "dataPoints": 156
  }
}
```

## Usage Examples

### Basic Velocity Analysis

```javascript
const result = await callTool({
  name: 'clickup_analyze_team_velocity',
  arguments: {
    workspaceId: '9011839976',
    teamId: 'team_123'
  }
});
```

### Advanced Analysis with Custom Parameters

```javascript
const result = await callTool({
  name: 'clickup_analyze_team_velocity',
  arguments: {
    workspaceId: '9011839976',
    teamId: 'team_123',
    timeframe: '6months',
    confidenceLevel: 0.90,
    includeSeasonality: true,
    includeComposition: true,
    sprintLength: 10
  }
});
```

## Key Features

### Statistical Analysis
- **Confidence Intervals**: Provides statistical confidence ranges for predictions
- **Trend Analysis**: Identifies velocity trends (increasing, decreasing, stable)
- **Outlier Detection**: Automatically identifies and handles velocity outliers
- **Model Validation**: Includes accuracy metrics and data quality assessment

### Seasonal Adjustments
- **Quarterly Patterns**: Analyzes seasonal velocity variations
- **Holiday Impact**: Factors in holiday and vacation periods
- **Business Cycle**: Considers business cycle impacts on velocity
- **Historical Correlation**: Uses multi-year data for seasonal patterns

### Team Composition Impact
- **Stability Scoring**: Measures team composition stability
- **Experience Weighting**: Factors in team experience levels
- **Change Tracking**: Tracks impact of team composition changes
- **Skill Assessment**: Considers skill distribution effects

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INSUFFICIENT_DATA` | Less than 3 sprints of data available | Collect more historical data |
| `INVALID_TIMEFRAME` | Unsupported timeframe parameter | Use supported timeframe values |
| `TEAM_NOT_FOUND` | Team ID not found in workspace | Verify team ID exists |
| `CONFIDENCE_OUT_OF_RANGE` | Confidence level outside 0.8-0.99 range | Adjust confidence level parameter |

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_DATA",
    "message": "Minimum 3 sprints of historical data required for velocity analysis",
    "details": {
      "sprintsFound": 2,
      "minimumRequired": 3,
      "suggestion": "Collect more sprint data or reduce analysis scope"
    }
  }
}
```

## Performance Characteristics

- **Response Time**: 600-1000ms depending on data volume
- **Memory Usage**: 35-55MB for analysis processing
- **Cache Duration**: 4 hours for velocity predictions
- **Concurrent Limit**: 5 simultaneous analyses per workspace
- **Data Retention**: Analysis results cached for 24 hours

## Integration Notes

### Prerequisites
- Minimum 3 completed sprints in the specified timeframe
- Sprint data must include story points or task counts
- Team assignments must be consistently tracked

### Best Practices
- Run velocity analysis at the beginning of sprint planning
- Use 3-6 month timeframes for optimal accuracy
- Include seasonality for long-term planning
- Monitor team composition changes for accuracy

### Related Tools
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Uses velocity predictions for sprint planning
- [`clickup_model_team_capacity`](./capacity-modeler.md) - Complements velocity with capacity analysis
- [`clickup_optimize_sprint_tasks`](./sprint-optimizer.md) - Uses velocity data for task optimization

## Changelog

### Version 4.1.0
- Added seasonal adjustment capabilities
- Improved team composition impact analysis
- Enhanced statistical confidence calculations
- Added model accuracy metrics

### Version 4.0.0
- Initial release with core velocity analysis
- Basic trend detection and prediction
- Confidence interval calculations
