#!/usr/bin/env node

/**
 * OpenAPI Specification Generator
 * 
 * Generates complete OpenAPI 3.0 specification from intelligence tool definitions
 * and existing API documentation.
 */

const fs = require('fs');
const path = require('path');

// Tool definitions from the main index.ts
const INTELLIGENCE_TOOLS = [
  {
    name: 'clickup_analyze_project_health',
    category: 'Project Health Analysis',
    description: '🏥 **AI PROJECT HEALTH ANALYZER** - Comprehensive real-time project health analysis with risk assessment, velocity trends, and actionable recommendations.',
    schema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'ClickUp workspace ID to analyze' },
        spaceId: { type: 'string', description: 'Optional: Specific space ID to analyze' },
        analysisDepth: { type: 'string', enum: ['quick', 'standard', 'comprehensive'], default: 'standard' },
        includeRecommendations: { type: 'boolean', default: true },
        timeframe: { type: 'string', enum: ['1week', '2weeks', '1month', '3months'], default: '1month' }
      },
      required: ['workspaceId']
    }
  },
  {
    name: 'clickup_plan_smart_sprint',
    category: 'Sprint Planning',
    description: '🚀 **AI SMART SPRINT PLANNER** - Advanced AI-powered sprint planning with velocity analysis, capacity modeling, and task optimization.',
    schema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'ClickUp workspace ID' },
        teamId: { type: 'string', description: 'Team identifier for sprint planning' },
        sprintGoal: { type: 'string', description: 'Sprint goal or objective' },
        sprintDuration: { type: 'integer', minimum: 1, maximum: 4, default: 2 },
        candidateTasks: { type: 'array', items: { type: 'string' } },
        teamCapacity: { type: 'number', minimum: 0 }
      },
      required: ['workspaceId', 'teamId', 'sprintGoal']
    }
  },
  {
    name: 'clickup_analyze_team_velocity',
    category: 'Sprint Planning',
    description: '📈 **VELOCITY ANALYSIS** - Analyzes historical sprint data to predict team velocity with confidence intervals.',
    schema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'ClickUp workspace ID' },
        teamId: { type: 'string', description: 'Team identifier for velocity analysis' },
        timeframe: { type: 'string', enum: ['1month', '3months', '6months', '1year'], default: '3months' },
        includeSeasonality: { type: 'boolean', default: true },
        confidenceLevel: { type: 'number', minimum: 0.8, maximum: 0.99, default: 0.95 },
        includeComposition: { type: 'boolean', default: true },
        sprintLength: { type: 'integer', minimum: 7, maximum: 28, default: 14 }
      },
      required: ['workspaceId', 'teamId']
    }
  },
  {
    name: 'clickup_model_team_capacity',
    category: 'Sprint Planning',
    description: '⚡ **CAPACITY MODELING** - Advanced team capacity modeling with availability factors, focus factors, and skill-based adjustments.',
    schema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'ClickUp workspace ID' },
        teamId: { type: 'string', description: 'Team identifier for capacity modeling' },
        sprintLength: { type: 'integer', minimum: 7, maximum: 28, default: 14 },
        includeAvailability: { type: 'boolean', default: true },
        includeFocusFactor: { type: 'boolean', default: true },
        includeSkillWeighting: { type: 'boolean', default: true },
        bufferPercentage: { type: 'number', minimum: 5, maximum: 30, default: 15 },
        timeframe: { type: 'string', enum: ['current', 'next_sprint', 'next_month'], default: 'current' }
      },
      required: ['workspaceId', 'teamId']
    }
  },
  {
    name: 'clickup_optimize_sprint_tasks',
    category: 'Sprint Planning',
    description: '🎯 **SPRINT OPTIMIZATION** - Multi-objective optimization for task selection using constraint satisfaction algorithms.',
    schema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'ClickUp workspace ID' },
        sprintId: { type: 'string', description: 'Sprint identifier for optimization' },
        candidateTasks: { type: 'array', items: { type: 'string' }, minItems: 1 },
        optimizationGoals: { type: 'array', items: { type: 'string', enum: ['value', 'capacity', 'risk', 'dependencies'] }, default: ['value', 'capacity'] },
        riskTolerance: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
        includeBuffer: { type: 'boolean', default: true },
        maxIterations: { type: 'integer', minimum: 100, maximum: 5000, default: 1000 }
      },
      required: ['workspaceId', 'sprintId', 'candidateTasks']
    }
  }
];

/**
 * Generate OpenAPI specification
 */
function generateOpenAPISpec() {
  const baseSpec = {
    openapi: '3.0.3',
    info: {
      title: 'ClickUp Intelligence MCP Server API',
      version: '4.1.0',
      description: `AI-powered project management intelligence and workflow optimization tools.

This API provides 21 advanced intelligence tools across 6 categories:
- **Project Health Analysis** - Real-time health scoring and risk assessment
- **Sprint Planning** - AI-optimized sprint planning with capacity analysis  
- **Task Management** - Intelligent task breakdown and complexity analysis
- **Resource Optimization** - Team workload balancing and skill matching
- **Workflow Intelligence** - Pattern analysis and automation recommendations
- **Real-Time Processing** - Live data streaming and event processing

All tools are designed for production use with comprehensive error handling,
rate limiting, and performance optimization.`,
      contact: {
        name: 'ClickUp Intelligence API Support',
        url: 'https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced',
        email: 'peter@chykalophia.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      },
      {
        url: 'https://api.clickup-intelligence.com',
        description: 'Production server'
      }
    ],
    security: [
      { ApiKeyAuth: [] }
    ],
    paths: {},
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'ClickUp API token for authentication'
        }
      },
      schemas: {
        ToolResponse: {
          type: 'object',
          required: ['content'],
          properties: {
            content: {
              type: 'array',
              items: { $ref: '#/components/schemas/ContentBlock' }
            },
            isError: {
              type: 'boolean',
              description: 'Indicates if the response contains an error',
              default: false
            }
          }
        },
        ContentBlock: {
          type: 'object',
          required: ['type', 'text'],
          properties: {
            type: {
              type: 'string',
              enum: ['text'],
              description: 'Content type (currently only text is supported)'
            },
            text: {
              type: 'string',
              description: 'The content text (may include markdown formatting)'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: {
              type: 'string',
              description: 'Error code identifier'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details',
              additionalProperties: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request - invalid parameters or malformed request',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ToolResponse' },
                  {
                    type: 'object',
                    properties: {
                      isError: { type: 'boolean', example: true }
                    }
                  }
                ]
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - invalid or missing API key',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ToolResponse' },
                  {
                    type: 'object',
                    properties: {
                      isError: { type: 'boolean', example: true }
                    }
                  }
                ]
              }
            }
          }
        },
        RateLimited: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ToolResponse' },
                  {
                    type: 'object',
                    properties: {
                      isError: { type: 'boolean', example: true }
                    }
                  }
                ]
              }
            }
          }
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ToolResponse' },
                  {
                    type: 'object',
                    properties: {
                      isError: { type: 'boolean', example: true }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Project Health Analysis', description: 'Real-time project health scoring and risk assessment tools' },
      { name: 'Sprint Planning', description: 'AI-optimized sprint planning with capacity analysis and task optimization' },
      { name: 'Task Management', description: 'Intelligent task breakdown and complexity analysis tools' },
      { name: 'Resource Optimization', description: 'Team workload balancing and skill matching tools' },
      { name: 'Workflow Intelligence', description: 'Pattern analysis and automation recommendation tools' },
      { name: 'Real-Time Processing', description: 'Live data streaming and event processing tools' }
    ]
  };

  // Generate paths for each tool
  INTELLIGENCE_TOOLS.forEach(tool => {
    const pathKey = `/tools/${tool.name}`;
    const schemaName = tool.name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Request';

    // Add schema to components
    baseSpec.components.schemas[schemaName] = tool.schema;

    // Add path
    baseSpec.paths[pathKey] = {
      post: {
        tags: [tool.category],
        summary: tool.name.replace('clickup_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: tool.description,
        operationId: tool.name.replace('clickup_', ''),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${schemaName}` }
            }
          }
        },
        responses: {
          '200': {
            description: 'Tool execution completed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ToolResponse' }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    };
  });

  return baseSpec;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🔧 Generating OpenAPI specification...');
    
    const spec = generateOpenAPISpec();
    const outputPath = path.join(__dirname, '../docs/openapi/openapi-generated.yaml');
    
    // Write JSON file only for now
    const jsonPath = path.join(__dirname, '../docs/openapi/openapi-generated.json');
    fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2), 'utf8');
    
    console.log('✅ OpenAPI specification generated successfully!');
    console.log(`📄 JSON: ${jsonPath}`);
    console.log(`🔧 Tools documented: ${INTELLIGENCE_TOOLS.length}`);
    
  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateOpenAPISpec, INTELLIGENCE_TOOLS };
