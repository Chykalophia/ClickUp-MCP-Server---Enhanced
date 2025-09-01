# Capacity Forecaster

**Tool Name**: `clickup_forecast_capacity`

## Overview

Forecast team capacity and resource needs using predictive analytics, historical data, and growth projections. Provides strategic planning insights for team scaling and workload management.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `teamId` | string | Team ID for capacity forecasting |
| `forecastPeriod` | object | Forecast period with start/end dates |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `granularity` | enum | `weekly` | Forecast granularity: `daily`, `weekly`, `monthly` |
| `includeGrowth` | boolean | `true` | Include team growth projections |
| `confidenceLevel` | number | `0.8` | Confidence level for predictions (0.5-0.95) |
| `seasonalAdjustment` | boolean | `true` | Adjust for seasonal patterns |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted capacity forecast
    }
  ]
}
```

## Example Usage

### Basic Capacity Forecast

```typescript
const result = await callTool({
  name: 'clickup_forecast_capacity',
  arguments: {
    teamId: 'team_12345',
    forecastPeriod: {
      startDate: '2025-10-01',
      endDate: '2025-12-31'
    }
  }
});
```

### Detailed Forecast with Growth

```typescript
const result = await callTool({
  name: 'clickup_forecast_capacity',
  arguments: {
    teamId: 'team_12345',
    forecastPeriod: {
      startDate: '2025-10-01',
      endDate: '2026-03-31'
    },
    granularity: 'monthly',
    includeGrowth: true,
    confidenceLevel: 0.85,
    seasonalAdjustment: true
  }
});
```

## Sample Response

```markdown
# 📊 TEAM CAPACITY FORECAST

## Forecast Overview
- **Team**: Frontend Development Team
- **Period**: October 2025 - December 2025 (3 months)
- **Confidence Level**: 80%
- **Granularity**: Weekly forecasts

## Current Baseline
- **Team Size**: 5 members
- **Current Capacity**: 200 hours/week
- **Utilization Rate**: 85%
- **Effective Capacity**: 170 hours/week

## Capacity Projections

### October 2025
- **Week 1**: 170 hours (baseline)
- **Week 2**: 165 hours (holiday impact)
- **Week 3**: 175 hours (team ramp-up)
- **Week 4**: 180 hours (full productivity)
- **Monthly Total**: 690 hours

### November 2025
- **Week 1**: 185 hours (continued growth)
- **Week 2**: 190 hours (peak performance)
- **Week 3**: 160 hours (Thanksgiving week)
- **Week 4**: 185 hours (recovery)
- **Monthly Total**: 720 hours

### December 2025
- **Week 1**: 190 hours (maintained pace)
- **Week 2**: 195 hours (pre-holiday push)
- **Week 3**: 120 hours (holiday season)
- **Week 4**: 100 hours (year-end holidays)
- **Monthly Total**: 605 hours

## Growth Projections

### Team Expansion Plan
- **Current**: 5 members
- **November**: +1 senior developer (6 members)
- **January**: +1 junior developer (7 members)
- **March**: +1 designer (8 members)

### Capacity Impact
- **November**: +40 hours/week (new hire)
- **January**: +32 hours/week (junior developer)
- **March**: +40 hours/week (designer)
- **Total Growth**: +112 hours/week by March

## Demand vs. Capacity Analysis

### Projected Demand
- **October**: 720 hours (4% over capacity)
- **November**: 780 hours (8% over capacity)
- **December**: 650 hours (7% over capacity)

### Capacity Gaps
- **October**: -30 hours (manageable with overtime)
- **November**: -60 hours (requires prioritization)
- **December**: +45 hours (under-utilized due to holidays)

## Risk Factors

### High Risk
- **Team Member Departure**: 25% probability
- **Extended Sick Leave**: 15% probability
- **Scope Creep**: 40% probability

### Medium Risk
- **Holiday Impact**: 80% probability (already factored)
- **New Hire Delays**: 30% probability
- **Training Overhead**: 60% probability

### Low Risk
- **Technology Changes**: 10% probability
- **Client Changes**: 20% probability

## Recommendations

### Immediate Actions (October)
1. **Hire Senior Developer**: Start recruitment immediately
2. **Overtime Planning**: Budget for 30 hours overtime
3. **Scope Management**: Defer non-critical features

### Medium-term (November-December)
1. **Onboarding Plan**: Prepare comprehensive training
2. **Knowledge Transfer**: Document critical processes
3. **Holiday Coverage**: Plan coverage rotations

### Long-term (Q1 2026)
1. **Team Structure**: Establish sub-teams by specialty
2. **Skill Development**: Cross-training program
3. **Capacity Buffer**: Maintain 10% capacity buffer

## Confidence Intervals

### 80% Confidence Range
- **October**: 650-730 hours
- **November**: 680-760 hours
- **December**: 570-640 hours

### Factors Affecting Confidence
- **Historical Data**: 18 months available (good)
- **Team Stability**: High (low turnover)
- **Process Maturity**: Medium (some variability)
- **External Factors**: Medium (market conditions)
```

## Forecasting Models

### Historical Trend Analysis
- **Velocity Trends**: Sprint-over-sprint performance
- **Seasonal Patterns**: Holiday and vacation impacts
- **Team Performance**: Individual and collective metrics
- **External Factors**: Market conditions and client demands

### Predictive Algorithms
- **Linear Regression**: Basic trend projection
- **Seasonal Decomposition**: Holiday and cyclical adjustments
- **Monte Carlo Simulation**: Risk and uncertainty modeling
- **Machine Learning**: Pattern recognition and anomaly detection

### Growth Modeling
- **Hiring Plans**: Planned team additions
- **Skill Development**: Training and capability growth
- **Process Improvements**: Efficiency gains over time
- **Technology Adoption**: Tool and automation impacts

## Forecast Parameters

### Granularity Options
- **Daily**: Detailed short-term planning (up to 1 month)
- **Weekly**: Standard operational planning (up to 6 months)
- **Monthly**: Strategic planning (up to 2 years)
- **Quarterly**: Long-term capacity planning (up to 5 years)

### Confidence Levels
- **50%**: Basic trend projection
- **80%**: Standard business planning
- **90%**: Conservative planning
- **95%**: Risk-averse planning

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Insufficient historical data` | New team or limited history | Use industry benchmarks or manual estimates |
| `Invalid forecast period` | End date before start date | Correct date parameters |
| `Team not found` | Invalid team ID | Verify team ID and permissions |
| `Confidence level out of range` | Value not between 0.5-0.95 | Use valid confidence level |

## Performance Characteristics

- **Response Time**: 5-15 seconds depending on forecast period
- **Memory Usage**: ~20MB per forecast
- **Cache Duration**: Results cached for 24 hours
- **Concurrent Limit**: 2 forecasts per team simultaneously

## Related Tools

- [`clickup_analyze_workload`](./workload-analyzer.md) - Current capacity analysis
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Use forecasts for sprint planning
- [`clickup_optimize_task_assignment`](./task-assignment-optimizer.md) - Optimize based on capacity
