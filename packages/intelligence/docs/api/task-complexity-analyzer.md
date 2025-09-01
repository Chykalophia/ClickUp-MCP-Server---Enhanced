# Task Complexity Analyzer

**Tool Name**: `clickup_analyze_task_complexity`

## Overview

Analyze task complexity using AI-powered assessment of technical scope, dependencies, risk factors, and skill requirements. Provides complexity scoring and decomposition recommendations.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskDescription` | string | Description of the task to analyze |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeRecommendations` | boolean | `true` | Include complexity reduction recommendations |
| `skillContext` | array | `[]` | Available team skills for context |
| `timeConstraints` | string | - | Time constraints or deadlines |
| `technicalContext` | string | - | Technical environment or stack information |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted complexity analysis
    }
  ]
}
```

## Example Usage

### Basic Complexity Analysis

```typescript
const result = await callTool({
  name: 'clickup_analyze_task_complexity',
  arguments: {
    taskDescription: 'Implement real-time chat with file sharing and encryption'
  }
});
```

### Detailed Analysis with Context

```typescript
const result = await callTool({
  name: 'clickup_analyze_task_complexity',
  arguments: {
    taskDescription: 'Build microservices architecture with API gateway',
    skillContext: ['Node.js', 'Docker', 'Kubernetes', 'AWS'],
    timeConstraints: '2 weeks',
    technicalContext: 'Existing monolith needs to be migrated',
    includeRecommendations: true
  }
});
```

## Sample Response

```markdown
# 🔍 TASK COMPLEXITY ANALYSIS

## Task Overview
**Build microservices architecture with API gateway**

## Complexity Assessment

### Overall Complexity Score: 8.5/10 (Very High)

### Complexity Breakdown
- **Technical Scope**: 9/10 (Very High)
  - Multiple services coordination
  - API gateway configuration
  - Service discovery implementation
  - Inter-service communication

- **Integration Complexity**: 8/10 (High)
  - Legacy system migration
  - Database partitioning
  - Authentication across services
  - Monitoring and logging setup

- **Risk Factors**: 7/10 (High)
  - Data consistency challenges
  - Network latency issues
  - Deployment complexity
  - Rollback scenarios

- **Skill Requirements**: 6/10 (Medium-High)
  - Available: Node.js, Docker, Kubernetes, AWS ✅
  - Missing: Service mesh, distributed tracing
  - Learning curve: Moderate

## Detailed Analysis

### Technical Challenges
1. **Service Decomposition**
   - Identify service boundaries
   - Handle shared data models
   - Manage cross-service transactions

2. **Infrastructure Setup**
   - Container orchestration
   - Load balancing configuration
   - Service discovery mechanism

3. **Data Management**
   - Database per service pattern
   - Event sourcing implementation
   - Eventual consistency handling

### Risk Assessment
- **High Risk**: Data migration and consistency
- **Medium Risk**: Performance degradation during migration
- **Low Risk**: Team skill gaps (good coverage)

### Time Estimation
- **Optimistic**: 3 weeks
- **Realistic**: 5-6 weeks
- **Pessimistic**: 8-10 weeks
- **Recommended**: 6 weeks with 2-week buffer

## Complexity Reduction Recommendations

### Phase 1: Foundation (2 weeks)
- Set up basic microservices infrastructure
- Implement API gateway
- Establish monitoring and logging

### Phase 2: Service Migration (3 weeks)
- Migrate one service at a time
- Implement data synchronization
- Test service interactions

### Phase 3: Optimization (1 week)
- Performance tuning
- Security hardening
- Documentation completion

### Alternative Approaches
1. **Strangler Fig Pattern**: Gradually replace monolith
2. **Database-First**: Start with data layer separation
3. **API-First**: Begin with API gateway and routing

## Skill Development Needs
- **Service Mesh**: Istio or Linkerd training
- **Distributed Tracing**: Jaeger or Zipkin
- **Event Streaming**: Kafka or RabbitMQ

## Success Criteria
- All services independently deployable
- <200ms inter-service latency
- 99.9% availability maintained
- Zero data loss during migration
```

## Complexity Factors

### Technical Scope
- **System Integration**: Number of systems involved
- **Technology Stack**: Complexity of technologies used
- **Architecture Patterns**: Design pattern complexity
- **Performance Requirements**: Scalability and speed needs

### Dependencies
- **External Services**: Third-party integrations
- **Internal Dependencies**: Other team deliverables
- **Infrastructure**: Required infrastructure changes
- **Data Dependencies**: Database or data model changes

### Risk Assessment
- **Technical Risks**: Unknown or unproven technologies
- **Business Risks**: Impact of failure or delays
- **Resource Risks**: Skill gaps or availability
- **Timeline Risks**: Aggressive deadlines or constraints

### Skill Requirements
- **Required Skills**: Technical expertise needed
- **Available Skills**: Team's current capabilities
- **Skill Gaps**: Missing expertise areas
- **Learning Curve**: Time to acquire new skills

## Complexity Scoring

### Score Ranges
- **1-3**: Low complexity - Straightforward implementation
- **4-6**: Medium complexity - Some challenges expected
- **7-8**: High complexity - Significant planning required
- **9-10**: Very high complexity - Consider decomposition

### Scoring Factors
- **Technical Difficulty**: 30% weight
- **Integration Complexity**: 25% weight
- **Risk Level**: 25% weight
- **Skill Requirements**: 20% weight

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Task too vague` | Insufficient task description | Provide more detailed description |
| `Invalid skill context` | Malformed skill array | Use array of skill strings |
| `Analysis timeout` | Very complex task description | Simplify description or break into parts |

## Performance Characteristics

- **Response Time**: 2-5 seconds depending on complexity
- **Memory Usage**: ~8MB per analysis
- **Cache Duration**: Results cached for 2 hours
- **Concurrent Limit**: 5 analyses simultaneously

## Related Tools

- [`clickup_decompose_task`](./task-decomposition-engine.md) - Break down complex tasks
- [`clickup_get_decomposition_templates`](./decomposition-templates.md) - Get templates for complex tasks
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Use complexity data for sprint planning
