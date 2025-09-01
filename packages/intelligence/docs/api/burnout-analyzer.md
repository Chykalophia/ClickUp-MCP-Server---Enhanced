# Burnout Risk Analyzer

**Tool Name**: `clickup_analyze_burnout_risk`

## Overview

Analyze team burnout risk using workload patterns, stress indicators, and performance metrics. Provides early warning system for team wellness with actionable recommendations.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `teamMembers` | array | Array of team members to analyze |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeframe` | enum | `month` | Analysis period: `week`, `month`, `quarter` |
| `includeRecommendations` | boolean | `true` | Include burnout prevention recommendations |
| `riskThreshold` | enum | `medium` | Alert threshold: `low`, `medium`, `high` |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted burnout risk analysis
    }
  ]
}
```

## Example Usage

### Basic Burnout Analysis

```typescript
const result = await callTool({
  name: 'clickup_analyze_burnout_risk',
  arguments: {
    teamMembers: [
      {
        id: 'user_1',
        name: 'John Doe',
        workloadHours: 55,
        overtimeHours: 15,
        taskComplexity: 'high',
        performanceMetrics: {
          velocity: 0.8,
          qualityScore: 7.5
        }
      }
    ]
  }
});
```

## Sample Response

```markdown
# ⚠️ TEAM BURNOUT RISK ANALYSIS

## Overall Team Risk: MEDIUM (6.2/10)

### Risk Distribution
- **High Risk**: 1 member (25%)
- **Medium Risk**: 2 members (50%)
- **Low Risk**: 1 member (25%)

## Individual Risk Assessment

### 🔴 John Doe - HIGH RISK (8.5/10)
**Risk Factors:**
- **Workload**: 55 hours/week (38% over capacity)
- **Overtime**: 15 hours/week (excessive)
- **Task Complexity**: High (stress multiplier)
- **Performance Decline**: -20% velocity, quality dropping

**Warning Signs:**
- Consistent overtime for 3+ weeks
- Quality metrics declining
- Velocity below historical average
- High-complexity task concentration

**Immediate Actions:**
1. Redistribute 15 hours to other team members
2. Assign simpler tasks for next sprint
3. Schedule 1:1 check-in within 48 hours
4. Consider temporary workload reduction

### 🟡 Jane Smith - MEDIUM RISK (5.8/10)
**Risk Factors:**
- **Workload**: 42 hours/week (5% over capacity)
- **Task Switching**: High context switching
- **Meeting Load**: 12 hours/week meetings
- **Performance**: Stable but showing stress signs

**Warning Signs:**
- Increased meeting overhead
- Frequent task context switching
- Slight performance variance

**Preventive Actions:**
1. Reduce meeting load by 25%
2. Group similar tasks to reduce switching
3. Monitor workload trends weekly

### 🟢 Mike Wilson - LOW RISK (2.1/10)
**Status:**
- **Workload**: 35 hours/week (optimal)
- **Performance**: Above average
- **Stress Indicators**: Minimal
- **Capacity**: Available for additional work

## Team Burnout Indicators

### Workload Metrics
- **Average Hours**: 44 hours/week
- **Overtime Rate**: 18% of team
- **Capacity Utilization**: 110% (over-allocated)
- **Workload Variance**: High (35% difference)

### Performance Trends
- **Team Velocity**: -12% (declining)
- **Quality Scores**: 7.8/10 (stable)
- **Task Completion**: 87% (below target)
- **Bug Rate**: +15% (increasing)

### Stress Indicators
- **High Complexity Tasks**: 60% of workload
- **Deadline Pressure**: 3 urgent tasks
- **Context Switching**: 4.2 switches/day average
- **Meeting Overhead**: 22% of work time

## Risk Prediction Model

### Next 2 Weeks
- **John Doe**: Risk increasing to 9.2/10 without intervention
- **Jane Smith**: Risk stable at current level
- **Team Overall**: Risk increasing to 7.1/10

### Next Month
- **Projected Burnout**: 2 team members at high risk
- **Performance Impact**: -25% team velocity
- **Quality Impact**: -15% quality scores
- **Turnover Risk**: 1 team member (John Doe)

## Burnout Prevention Plan

### Immediate Actions (This Week)
1. **Workload Redistribution**
   - Move 15 hours from John to Mike
   - Defer 2 non-critical tasks
   - Reduce John's task complexity

2. **Stress Reduction**
   - Cancel non-essential meetings
   - Implement "no meeting" mornings
   - Encourage breaks and time off

### Short-term (2-4 Weeks)
1. **Process Improvements**
   - Reduce context switching
   - Batch similar tasks
   - Streamline handoff processes

2. **Team Support**
   - Weekly burnout check-ins
   - Peer support system
   - Flexible work arrangements

### Long-term (1-3 Months)
1. **Capacity Planning**
   - Hire additional team member
   - Cross-train for skill redundancy
   - Implement sustainable pace

2. **Culture Changes**
   - Normalize saying "no" to overcommitment
   - Celebrate sustainable performance
   - Regular team retrospectives

## Success Metrics
- **Target Risk Level**: <4.0/10 team average
- **Workload Target**: <45 hours/week average
- **Performance Stability**: ±5% velocity variance
- **Quality Maintenance**: >8.0/10 quality scores
```

## Risk Factors

### Workload Indicators
- **Hours per Week**: >45 hours sustained
- **Overtime Frequency**: >10 hours/week
- **Capacity Utilization**: >90% for extended periods
- **Task Complexity**: High complexity concentration

### Performance Indicators
- **Velocity Decline**: >15% drop from baseline
- **Quality Degradation**: Increasing bug rates
- **Completion Rates**: <90% task completion
- **Response Times**: Delayed communications

### Behavioral Indicators
- **Context Switching**: >5 switches per day
- **Meeting Overhead**: >25% of work time
- **After-hours Work**: Regular evening/weekend work
- **Time Off**: Unused vacation days

### Team Dynamics
- **Communication**: Decreased collaboration
- **Morale**: Negative sentiment in retrospectives
- **Conflict**: Increased interpersonal tension
- **Turnover Intent**: Exit interview themes

## Risk Scoring Algorithm

### Workload Score (40% weight)
- Hours per week vs. capacity
- Overtime frequency and duration
- Task complexity distribution
- Deadline pressure intensity

### Performance Score (30% weight)
- Velocity trends over time
- Quality metrics and bug rates
- Task completion percentages
- Response time patterns

### Behavioral Score (20% weight)
- Context switching frequency
- Meeting load and overhead
- Work-life balance indicators
- Communication patterns

### Environmental Score (10% weight)
- Team dynamics and morale
- Organizational changes
- External stressors
- Support system availability

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Insufficient data` | Limited historical data | Use shorter timeframe or manual input |
| `Invalid team member data` | Missing required fields | Provide complete team member profiles |
| `No risk detected` | All members low risk | Confirm data accuracy or celebrate! |

## Performance Characteristics

- **Response Time**: 2-5 seconds for team analysis
- **Memory Usage**: ~10MB per team analysis
- **Cache Duration**: Results cached for 4 hours
- **Concurrent Limit**: 3 analyses per team

## Related Tools

- [`clickup_analyze_workload`](./workload-analyzer.md) - Detailed workload analysis
- [`clickup_optimize_task_assignment`](./task-assignment-optimizer.md) - Rebalance assignments
- [`clickup_forecast_capacity`](./capacity-forecaster.md) - Plan sustainable capacity
