import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { /* createClickUpClient */ } from '../clickup-client/index.js';
import { DependenciesEnhancedClient } from '../clickup-client/dependencies-enhanced.js';
import {
  CreateDependencySchema,
  UpdateDependencySchema,
  GetDependenciesFilterSchema,
  DependencyGraphOptionsSchema,
  DependencyConflictCheckSchema,
  BulkDependencyOperationSchema,
  DependencyTypeSchema,
  DependencyStatusSchema
} from '../schemas/dependencies-schemas.js';

// Create clients
// const clickUpClient = createClickUpClient();
const dependenciesClient = new DependenciesEnhancedClient(process.env.CLICKUP_API_TOKEN!);

export function setupDependenciesTools(server: McpServer): void {

  // ========================================
  // DEPENDENCY MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_create_dependency',
    'Create a new dependency relationship between two tasks. Dependencies define task execution order and blocking relationships.',
    {
      task_id: z.string().min(1).describe('The ID of the task that depends on another'),
      depends_on: z.string().min(1).describe('The ID of the task that this task depends on'),
      type: DependencyTypeSchema.default('blocking').describe('The type of dependency relationship'),
      link_id: z.string().optional().describe('Optional link ID for grouping related dependencies')
    },
    async (args) => {
      try {
        const request = CreateDependencySchema.parse(args);
        const result = await dependenciesClient.createDependency(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency created successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating dependency: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_task_dependencies',
    'Get all dependencies for a specific task with optional filtering by type and status.',
    {
      task_id: z.string().min(1).describe('The ID of the task to get dependencies for'),
      type: DependencyTypeSchema.optional().describe('Filter by dependency type'),
      status: DependencyStatusSchema.optional().describe('Filter by dependency status'),
      include_resolved: z.boolean().default(false).describe('Whether to include resolved dependencies')
    },
    async (args) => {
      try {
        const filter = GetDependenciesFilterSchema.parse(args);
        const result = await dependenciesClient.getTaskDependencies(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependencies for task ${args.task_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting task dependencies: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_dependency',
    'Update an existing dependency\'s type or status.',
    {
      dependency_id: z.string().min(1).describe('The ID of the dependency to update'),
      type: DependencyTypeSchema.optional().describe('New dependency type'),
      status: DependencyStatusSchema.optional().describe('New dependency status')
    },
    async (args) => {
      try {
        const request = UpdateDependencySchema.parse(args);
        const result = await dependenciesClient.updateDependency(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating dependency: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_dependency',
    'Delete a dependency relationship between tasks.',
    {
      dependency_id: z.string().min(1).describe('The ID of the dependency to delete')
    },
    async (args) => {
      try {
        const result = await dependenciesClient.deleteDependency(args.dependency_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency deleted successfully: ${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting dependency: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_dependency_graph',
    'Get a comprehensive dependency graph for a task showing all related dependencies and relationships.',
    {
      task_id: z.string().min(1).describe('The root task ID for the dependency graph'),
      depth: z.number().min(1).max(10).default(3).describe('Maximum depth to traverse in the graph'),
      direction: z.enum(['upstream', 'downstream', 'both']).default('both').describe('Direction to traverse dependencies'),
      include_resolved: z.boolean().default(false).describe('Whether to include resolved dependencies'),
      include_broken: z.boolean().default(true).describe('Whether to include broken dependencies')
    },
    async (args) => {
      try {
        const options = DependencyGraphOptionsSchema.parse(args);
        const result = await dependenciesClient.getDependencyGraph(options);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency graph for task ${args.task_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting dependency graph: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_check_dependency_conflicts',
    'Check for potential conflicts in task dependencies including circular dependencies and invalid relationships.',
    {
      task_id: z.string().min(1).describe('The task ID to check for conflicts'),
      proposed_dependencies: z.array(z.object({
        depends_on: z.string(),
        type: DependencyTypeSchema
      })).optional().describe('Proposed new dependencies to check for conflicts')
    },
    async (args) => {
      try {
        const check = DependencyConflictCheckSchema.parse(args);
        const result = await dependenciesClient.checkDependencyConflicts(check);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency conflict check results:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error checking dependency conflicts: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // ADVANCED DEPENDENCY OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_workspace_dependencies',
    'Get all dependencies in a workspace with filtering and pagination options.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      status: DependencyStatusSchema.optional().describe('Filter by dependency status'),
      type: DependencyTypeSchema.optional().describe('Filter by dependency type'),
      limit: z.number().positive().optional().describe('Maximum number of dependencies to return'),
      offset: z.number().min(0).optional().describe('Number of dependencies to skip for pagination')
    },
    async (args) => {
      try {
        const result = await dependenciesClient.getWorkspaceDependencies(args.workspace_id, {
          status: args.status,
          type: args.type,
          limit: args.limit,
          offset: args.offset
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Workspace dependencies:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting workspace dependencies: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_dependency_stats',
    'Get comprehensive statistics about dependencies in a workspace.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace')
    },
    async (args) => {
      try {
        const result = await dependenciesClient.getDependencyStats(args.workspace_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency statistics for workspace ${args.workspace_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting dependency statistics: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_resolve_dependency_conflicts',
    'Automatically resolve dependency conflicts such as circular dependencies and invalid statuses.',
    {
      task_id: z.string().min(1).describe('The task ID to resolve conflicts for'),
      break_cycles: z.boolean().default(true).describe('Whether to break circular dependencies'),
      remove_duplicates: z.boolean().default(true).describe('Whether to remove duplicate dependencies'),
      update_invalid_statuses: z.boolean().default(true).describe('Whether to update invalid dependency statuses')
    },
    async (args) => {
      try {
        const result = await dependenciesClient.resolveDependencyConflicts(args.task_id, {
          break_cycles: args.break_cycles,
          remove_duplicates: args.remove_duplicates,
          update_invalid_statuses: args.update_invalid_statuses
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency conflicts resolution results:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error resolving dependency conflicts: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_dependency_timeline_impact',
    'Analyze how dependencies affect task timelines and identify critical path impacts.',
    {
      task_id: z.string().min(1).describe('The task ID to analyze timeline impact for')
    },
    async (args) => {
      try {
        const result = await dependenciesClient.getDependencyTimelineImpact(args.task_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency timeline impact analysis:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error analyzing dependency timeline impact: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_bulk_dependency_operations',
    'Perform multiple dependency operations in a single request for efficiency.',
    {
      operation: z.enum(['create', 'delete', 'update']).describe('The bulk operation to perform'),
      dependencies: z.array(z.any()).describe('Array of dependency operations to perform')
    },
    async (args) => {
      try {
        const operation = BulkDependencyOperationSchema.parse(args);
        const result = await dependenciesClient.bulkDependencyOperations(operation);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Bulk dependency operations results:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error performing bulk dependency operations: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_export_dependency_graph',
    'Export dependency graph data in various formats for external analysis or backup.',
    {
      task_id: z.string().min(1).describe('The root task ID for the dependency graph to export'),
      format: z.enum(['json', 'csv', 'graphml']).default('json').describe('Export format')
    },
    async (args) => {
      try {
        const result = await dependenciesClient.exportDependencyGraph(args.task_id, args.format);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Dependency graph export:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error exporting dependency graph: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
}
