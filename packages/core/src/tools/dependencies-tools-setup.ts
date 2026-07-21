/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiToken } from '../clickup-client/index.js';
import { DependenciesEnhancedClient } from '../clickup-client/dependencies-enhanced.js';
import {
  CreateDependencySchema,
  DeleteDependencySchema,
  GetTaskDependenciesSchema,
  AddTaskLinkSchema,
  DeleteTaskLinkSchema,
  DependencyGraphOptionsSchema,
  DependencyConflictCheckSchema,
  BulkDependencyOperationSchema,
} from '../schemas/dependencies-schemas.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const dependenciesClient = new DependenciesEnhancedClient(getApiToken());

// Shared custom-task-ID query param inputs (accepted by all relationship endpoints)
const customTaskIdInputs = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe('Set true when the task IDs are custom task IDs (also requires team_id)'),
  team_id: z
    .string()
    .optional()
    .describe('Workspace (team) ID — required when custom_task_ids is true'),
};

export function setupDependenciesTools(server: McpServer): void {
  // ========================================
  // DEPENDENCY MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_create_dependency',
    'Create a dependency between two tasks. Provide exactly one of depends_on (this task is WAITING ON the other task) or dependency_of (this task is BLOCKING the other task).',
    {
      task_id: z.string().min(1).describe('The ID of the task to add the dependency to'),
      depends_on: z
        .string()
        .min(1)
        .optional()
        .describe('ID of the task this task is waiting on (must finish before this task)'),
      dependency_of: z
        .string()
        .min(1)
        .optional()
        .describe('ID of the task this task is blocking (cannot start until this task finishes)'),
      ...customTaskIdInputs,
    },
    async args => {
      try {
        const request = CreateDependencySchema.parse(args);
        await dependenciesClient.createDependency(request);

        const description = request.depends_on
          ? `task ${request.task_id} is now waiting on task ${request.depends_on}`
          : `task ${request.task_id} is now blocking task ${request.dependency_of}`;

        return {
          content: [
            {
              type: 'text',
              text: `Dependency created successfully: ${description}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating dependency', error);
      }
    }
  );

  server.tool(
    'clickup_get_task_dependencies',
    "Get a task's dependencies and linked tasks (read from the task's dependencies and linked_tasks arrays).",
    {
      task_id: z.string().min(1).describe('The ID of the task to get dependencies and links for'),
      ...customTaskIdInputs,
    },
    async args => {
      try {
        const filter = GetTaskDependenciesSchema.parse(args);
        const result = await dependenciesClient.getTaskDependencies(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Dependencies for task ${args.task_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting task dependencies', error);
      }
    }
  );

  server.tool(
    'clickup_delete_dependency',
    'Delete a dependency between two tasks. Provide exactly one of depends_on or dependency_of to identify which dependency to remove.',
    {
      task_id: z.string().min(1).describe('The ID of the task to remove the dependency from'),
      depends_on: z
        .string()
        .min(1)
        .optional()
        .describe('ID of the "waiting on" task in the dependency to remove'),
      dependency_of: z
        .string()
        .min(1)
        .optional()
        .describe('ID of the "blocking" task in the dependency to remove'),
      ...customTaskIdInputs,
    },
    async args => {
      try {
        const request = DeleteDependencySchema.parse(args);
        const result = await dependenciesClient.deleteDependency(request);

        return {
          content: [
            {
              type: 'text',
              text: `Dependency deleted successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting dependency', error);
      }
    }
  );

  // ========================================
  // TASK LINK OPERATIONS
  // ========================================

  server.tool(
    'clickup_add_task_link',
    'Link two tasks together (a non-blocking "linked" relationship). Returns the updated task.',
    {
      task_id: z.string().min(1).describe('The ID of the task to add the link to'),
      links_to: z.string().min(1).describe('The ID of the task to link to'),
      ...customTaskIdInputs,
    },
    async args => {
      try {
        const request = AddTaskLinkSchema.parse(args);
        const result = await dependenciesClient.addTaskLink(request);

        return {
          content: [
            {
              type: 'text',
              text: `Task link created successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('adding task link', error);
      }
    }
  );

  server.tool(
    'clickup_delete_task_link',
    'Remove a link between two tasks. Returns the updated task.',
    {
      task_id: z.string().min(1).describe('The ID of the task to remove the link from'),
      links_to: z.string().min(1).describe('The ID of the linked task to unlink'),
      ...customTaskIdInputs,
    },
    async args => {
      try {
        const request = DeleteTaskLinkSchema.parse(args);
        const result = await dependenciesClient.deleteTaskLink(request);

        return {
          content: [
            {
              type: 'text',
              text: `Task link removed successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('removing task link', error);
      }
    }
  );

  // ========================================
  // CLIENT-SIDE DEPENDENCY ANALYSIS
  // ========================================

  server.tool(
    'clickup_get_dependency_graph',
    'Build a dependency graph for a task by traversing related tasks (computed client-side from task data; issues one Get Task request per task in the graph).',
    {
      task_id: z.string().min(1).describe('The root task ID for the dependency graph'),
      depth: z
        .number()
        .min(1)
        .max(10)
        .default(3)
        .describe('Maximum depth to traverse in the graph'),
    },
    async args => {
      try {
        const options = DependencyGraphOptionsSchema.parse(args);
        const result = await dependenciesClient.getDependencyGraph(options);

        return {
          content: [
            {
              type: 'text',
              text: `Dependency graph for task ${args.task_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting dependency graph', error);
      }
    }
  );

  server.tool(
    'clickup_check_dependency_conflicts',
    'Check for circular or duplicate dependencies around a task, optionally including proposed new dependencies (computed client-side from task data).',
    {
      task_id: z.string().min(1).describe('The task ID to check for conflicts'),
      proposed_dependencies: z
        .array(
          z.object({
            depends_on: z
              .string()
              .min(1)
              .optional()
              .describe('ID of a task this task would be waiting on'),
            dependency_of: z
              .string()
              .min(1)
              .optional()
              .describe('ID of a task this task would be blocking'),
          })
        )
        .optional()
        .describe(
          'Proposed new dependencies to check for conflicts (each with exactly one of depends_on or dependency_of)'
        ),
    },
    async args => {
      try {
        const check = DependencyConflictCheckSchema.parse(args);
        const result = await dependenciesClient.checkDependencyConflicts(check);

        return {
          content: [
            {
              type: 'text',
              text: `Dependency conflict check results:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('checking dependency conflicts', error);
      }
    }
  );

  server.tool(
    'clickup_bulk_dependency_operations',
    'Create or delete multiple dependencies in one call (executed as individual API requests; results are reported per item).',
    {
      operation: z.enum(['create', 'delete']).describe('The bulk operation to perform'),
      dependencies: z
        .array(
          z.object({
            task_id: z.string().min(1).describe('The task to add/remove the dependency on'),
            depends_on: z
              .string()
              .min(1)
              .optional()
              .describe('ID of the task being waited on'),
            dependency_of: z
              .string()
              .min(1)
              .optional()
              .describe('ID of the task being blocked'),
          })
        )
        .min(1)
        .describe(
          'Array of dependencies to create or delete (each with exactly one of depends_on or dependency_of)'
        ),
    },
    async args => {
      try {
        const operation = BulkDependencyOperationSchema.parse(args);
        const result = await dependenciesClient.bulkDependencyOperations(operation);

        return {
          content: [
            {
              type: 'text',
              text: `Bulk dependency operations results:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('performing bulk dependency operations', error);
      }
    }
  );
}
