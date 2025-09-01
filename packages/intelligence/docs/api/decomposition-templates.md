# Decomposition Templates

**Tool Name**: `clickup_get_decomposition_templates`

## Overview

Retrieve pre-built task decomposition templates for common development patterns, project types, and methodologies. Provides standardized task breakdown structures for consistent project planning.

## Parameters

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | enum | `all` | Template category: `all`, `development`, `design`, `marketing`, `operations` |
| `methodology` | enum | `agile` | Project methodology: `agile`, `waterfall`, `kanban`, `scrum` |
| `complexity` | enum | `all` | Complexity level: `all`, `simple`, `medium`, `complex` |
| `includeExamples` | boolean | `true` | Include example implementations |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted template catalog
    }
  ]
}
```

## Example Usage

### Get All Templates

```typescript
const result = await callTool({
  name: 'clickup_get_decomposition_templates',
  arguments: {}
});
```

### Get Development Templates for Agile

```typescript
const result = await callTool({
  name: 'clickup_get_decomposition_templates',
  arguments: {
    category: 'development',
    methodology: 'agile',
    complexity: 'medium',
    includeExamples: true
  }
});
```

## Sample Response

```markdown
# 📋 TASK DECOMPOSITION TEMPLATES

## Template Catalog
- **Total Templates**: 24 available
- **Categories**: 5 categories
- **Methodologies**: 4 methodologies supported
- **Complexity Levels**: 3 levels

## Development Templates

### 1. Full-Stack Feature Development 🚀
**Category**: Development | **Methodology**: Agile | **Complexity**: Medium

**Template Structure**:
1. **Requirements Analysis** (4-8 hours)
   - Gather functional requirements
   - Define acceptance criteria
   - Create user stories
   - Review with stakeholders

2. **Technical Design** (8-12 hours)
   - System architecture design
   - Database schema design
   - API endpoint specification
   - Security considerations

3. **Frontend Development** (16-24 hours)
   - UI component creation
   - State management setup
   - API integration
   - Responsive design implementation

4. **Backend Development** (20-32 hours)
   - Database model creation
   - API endpoint implementation
   - Business logic development
   - Authentication/authorization

5. **Testing & QA** (12-16 hours)
   - Unit test creation
   - Integration testing
   - Manual QA testing
   - Bug fixes and refinements

6. **Deployment & Documentation** (4-8 hours)
   - Production deployment
   - Documentation updates
   - Performance monitoring setup
   - Post-deployment verification

**Example Implementation**:
```
Epic: User Authentication System
├── Requirements Analysis
│   ├── Define login/logout flows
│   ├── Security requirements gathering
│   └── User experience specifications
├── Technical Design
│   ├── JWT token architecture
│   ├── Database user schema
│   └── API security design
├── Frontend Development
│   ├── Login form component
│   ├── Authentication state management
│   └── Protected route implementation
├── Backend Development
│   ├── User model and validation
│   ├── Authentication endpoints
│   └── JWT middleware implementation
├── Testing & QA
│   ├── Authentication flow testing
│   ├── Security penetration testing
│   └── Cross-browser compatibility
└── Deployment & Documentation
    ├── Production environment setup
    └── API documentation updates
```

### 2. Bug Fix Template 🐛
**Category**: Development | **Methodology**: Kanban | **Complexity**: Simple

**Template Structure**:
1. **Investigation** (1-2 hours)
   - Reproduce the issue
   - Identify root cause
   - Assess impact and priority

2. **Solution Development** (2-4 hours)
   - Implement fix
   - Add regression tests
   - Code review preparation

3. **Testing & Validation** (1-2 hours)
   - Verify fix works
   - Run regression tests
   - Manual testing

4. **Deployment** (0.5-1 hour)
   - Deploy to staging
   - Production deployment
   - Monitor for issues

### 3. API Development Template 🔌
**Category**: Development | **Methodology**: Agile | **Complexity**: Medium

**Template Structure**:
1. **API Specification** (4-6 hours)
   - OpenAPI/Swagger documentation
   - Request/response schemas
   - Error handling specification
   - Authentication requirements

2. **Implementation** (12-20 hours)
   - Endpoint implementation
   - Data validation
   - Error handling
   - Authentication/authorization

3. **Testing** (8-12 hours)
   - Unit tests
   - Integration tests
   - API documentation testing
   - Performance testing

4. **Documentation & Deployment** (2-4 hours)
   - API documentation finalization
   - Deployment configuration
   - Monitoring setup

## Design Templates

### 4. UI/UX Design Process 🎨
**Category**: Design | **Methodology**: Design Thinking | **Complexity**: Medium

**Template Structure**:
1. **Research & Discovery** (8-12 hours)
   - User research
   - Competitive analysis
   - Requirements gathering
   - Persona development

2. **Ideation & Wireframing** (12-16 hours)
   - Concept sketching
   - Wireframe creation
   - User flow mapping
   - Information architecture

3. **Visual Design** (16-24 hours)
   - Style guide creation
   - High-fidelity mockups
   - Component library
   - Responsive design variants

4. **Prototyping & Testing** (8-12 hours)
   - Interactive prototype
   - User testing sessions
   - Feedback incorporation
   - Design iteration

5. **Handoff & Implementation** (4-6 hours)
   - Design system documentation
   - Developer handoff
   - Implementation support
   - Quality assurance

## Marketing Templates

### 5. Campaign Launch Template 📢
**Category**: Marketing | **Methodology**: Agile | **Complexity**: Complex

**Template Structure**:
1. **Strategy & Planning** (16-24 hours)
   - Campaign objectives
   - Target audience research
   - Channel strategy
   - Budget allocation

2. **Content Creation** (24-40 hours)
   - Copy writing
   - Visual asset creation
   - Video production
   - Landing page development

3. **Campaign Setup** (8-12 hours)
   - Platform configuration
   - Tracking implementation
   - A/B test setup
   - Quality assurance

4. **Launch & Monitoring** (4-8 hours)
   - Campaign activation
   - Performance monitoring
   - Real-time optimization
   - Issue resolution

5. **Analysis & Optimization** (8-12 hours)
   - Performance analysis
   - ROI calculation
   - Optimization recommendations
   - Report generation

## Operations Templates

### 6. Infrastructure Setup Template ⚙️
**Category**: Operations | **Methodology**: DevOps | **Complexity**: Complex

**Template Structure**:
1. **Planning & Architecture** (12-16 hours)
   - Infrastructure requirements
   - Architecture design
   - Security planning
   - Cost estimation

2. **Environment Setup** (20-32 hours)
   - Server provisioning
   - Network configuration
   - Security implementation
   - Monitoring setup

3. **Application Deployment** (8-12 hours)
   - Deployment pipeline
   - Configuration management
   - Database setup
   - SSL certificate installation

4. **Testing & Validation** (8-12 hours)
   - Load testing
   - Security testing
   - Backup verification
   - Disaster recovery testing

5. **Documentation & Handover** (4-8 hours)
   - Infrastructure documentation
   - Runbook creation
   - Team training
   - Support procedures

## Template Usage Guidelines

### Customization Tips
- **Adjust Time Estimates**: Scale based on team experience and complexity
- **Add/Remove Steps**: Customize based on project requirements
- **Parallel Execution**: Identify tasks that can run concurrently
- **Dependencies**: Map task dependencies for proper sequencing

### Best Practices
- **Start with Templates**: Use as starting point, not rigid structure
- **Team Input**: Involve team in template customization
- **Iterative Improvement**: Refine templates based on experience
- **Documentation**: Keep templates updated and well-documented

### Template Selection Criteria
- **Project Type**: Match template to project characteristics
- **Team Size**: Consider team capacity and skills
- **Timeline**: Align template complexity with available time
- **Methodology**: Choose templates that fit your process

## Template Metrics

### Usage Statistics
- **Most Popular**: Full-Stack Feature Development (34% usage)
- **Highest Success Rate**: Bug Fix Template (96% completion)
- **Average Time Savings**: 23% vs. manual decomposition
- **Template Adoption**: 78% of teams use templates

### Effectiveness Metrics
- **Planning Accuracy**: +31% improvement with templates
- **Task Completion**: +18% higher completion rates
- **Time Estimation**: +27% more accurate estimates
- **Team Consistency**: +42% more consistent deliverables
```

## Template Categories

### Development Templates
- **Feature Development**: Full-stack, frontend, backend
- **Bug Fixes**: Investigation, fix, testing, deployment
- **API Development**: Design, implementation, testing
- **Database Work**: Schema design, migration, optimization
- **DevOps**: CI/CD, infrastructure, monitoring

### Design Templates
- **UI/UX Design**: Research, wireframes, visual design
- **Brand Development**: Logo, guidelines, assets
- **User Research**: Surveys, interviews, analysis
- **Prototyping**: Interactive prototypes, testing
- **Design Systems**: Component libraries, documentation

### Marketing Templates
- **Campaign Launch**: Strategy, content, execution
- **Content Creation**: Blog posts, videos, social media
- **SEO Optimization**: Research, implementation, monitoring
- **Email Marketing**: Design, automation, analysis
- **Event Planning**: Logistics, promotion, execution

### Operations Templates
- **Infrastructure**: Setup, monitoring, maintenance
- **Security**: Audits, implementation, compliance
- **Process Improvement**: Analysis, design, implementation
- **Training**: Material creation, delivery, assessment
- **Incident Response**: Detection, resolution, post-mortem

## Template Customization

### Adaptation Guidelines
- **Time Scaling**: Adjust estimates based on team experience
- **Skill Matching**: Align tasks with team member skills
- **Methodology Alignment**: Adapt to your project methodology
- **Tool Integration**: Customize for your tool ecosystem

### Template Evolution
- **Feedback Integration**: Incorporate team feedback
- **Performance Tracking**: Monitor template effectiveness
- **Continuous Improvement**: Regular template updates
- **Best Practice Sharing**: Share successful customizations

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `No templates found` | Invalid filter criteria | Broaden search criteria |
| `Template unavailable` | Template not in database | Check template name or create custom |
| `Category not supported` | Invalid category parameter | Use supported category values |

## Performance Characteristics

- **Response Time**: <1 second for template retrieval
- **Memory Usage**: ~5MB for full template catalog
- **Cache Duration**: Templates cached for 24 hours
- **Update Frequency**: Templates updated monthly

## Related Tools

- [`clickup_decompose_task`](./task-decomposition-engine.md) - Use templates for task decomposition
- [`clickup_analyze_task_complexity`](./task-complexity-analyzer.md) - Assess complexity before template selection
- [`clickup_plan_smart_sprint`](./smart-sprint-planner.md) - Use decomposed tasks in sprint planning
