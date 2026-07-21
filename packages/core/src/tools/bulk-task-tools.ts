/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient, CreateTaskParams, UpdateTaskParams } from '../clickup-client/tasks.js';
import {
  BulkCreateTasksSchema,
  BulkUpdateTasksSchema,
  BulkCreateTaskItemSchema,
  BulkUpdateTaskItemSchema
} from '../schemas/task-schemas.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);

export function setupBulkTaskTools(server: McpServer): void {
  server.tool(
    'clickup_bulk_create_tasks',
    'Create multiple tasks in a ClickUp list in a single operation. More efficient than creating tasks individually. ' +
      'Supports up to 50 tasks per request.',
    {
      list_id: z.string().min(1).describe('The ID of the list to create tasks in'),
      tasks: z
        .array(BulkCreateTaskItemSchema)
        .min(1)
        .max(50)
        .describe('Array of tasks to create (maximum 50 tasks per request)'),
      continue_on_error: z
        .boolean()
        .default(false)
        .describe('Whether to continue creating remaining tasks if one fails')
    },
    async ({ list_id, tasks, continue_on_error }) => {
      try {
        const validatedData = BulkCreateTasksSchema.parse({ list_id, tasks, continue_on_error });

        // Convert tasks to CreateTaskParams format
        const taskParams: CreateTaskParams[] = validatedData.tasks.map(task => {
          // Handle markdown content preference
          if (task.markdown_content && task.description) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
            const { description, ...rest } = task;
            return rest as CreateTaskParams;
          }
          return task as CreateTaskParams;
        });

        const result = await tasksClient.bulkCreateTasks(
          validatedData.list_id,
          taskParams,
          validatedData.continue_on_error
        );

        return {
          content: [
            {
              type: 'text',
              text:
                'Bulk task creation completed!\n\n' +
                `✅ Successfully created: ${result.success_count} tasks\n` +
                `❌ Failed: ${result.error_count} tasks\n` +
                `📊 Total: ${result.total_count} tasks\n` +
                `⏱️ Execution time: ${result.execution_time_ms}ms\n\n` +
                `Detailed Results:\n${JSON.stringify(result.results, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('in bulk task creation', error);
      }
    }
  );

  server.tool(
    'clickup_bulk_update_tasks',
    'Update multiple tasks in ClickUp in a single operation. More efficient than updating tasks individually. ' +
      'Supports up to 50 tasks per request.',
    {
      tasks: z
        .array(BulkUpdateTaskItemSchema)
        .min(1)
        .max(50)
        .describe('Array of task updates to perform (maximum 50 tasks per request)'),
      continue_on_error: z
        .boolean()
        .default(false)
        .describe('Whether to continue updating remaining tasks if one fails')
    },
    async ({ tasks, continue_on_error }) => {
      try {
        const validatedData = BulkUpdateTasksSchema.parse({ tasks, continue_on_error });

        // Convert tasks to the format expected by bulkUpdateTasks
        const taskUpdates = validatedData.tasks.map(task => {
          // Handle markdown content preference
          if (task.markdown_content && task.description) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
            const { description, ...rest } = task;
            return rest as { task_id: string } & UpdateTaskParams;
          }
          return task as { task_id: string } & UpdateTaskParams;
        });

        const result = await tasksClient.bulkUpdateTasks(
          taskUpdates,
          validatedData.continue_on_error
        );

        return {
          content: [
            {
              type: 'text',
              text:
                'Bulk task update completed!\n\n' +
                `✅ Successfully updated: ${result.success_count} tasks\n` +
                `❌ Failed: ${result.error_count} tasks\n` +
                `📊 Total: ${result.total_count} tasks\n` +
                `⏱️ Execution time: ${result.execution_time_ms}ms\n\n` +
                `Detailed Results:\n${JSON.stringify(result.results, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('in bulk task update', error);
      }
    }
  );

  server.tool(
    'clickup_bulk_delete_tasks',
    '⚠️ DESTRUCTIVE: Delete multiple tasks from ClickUp in a single operation. This action cannot be undone and will permanently remove all specified tasks.',
    {
      task_ids: z
        .array(z.string().min(1))
        .min(1)
        .max(50)
        .describe('Array of task IDs to delete (maximum 50 tasks per request)'),
      confirm_deletion: z
        .boolean()
        .describe('Confirmation that you want to permanently delete these tasks (must be true)'),
      continue_on_error: z
        .boolean()
        .default(false)
        .describe('Whether to continue deleting remaining tasks if one fails')
    },
    async ({ task_ids, confirm_deletion, continue_on_error }) => {
      try {
        if (!confirm_deletion) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Bulk task deletion cancelled. You must set confirm_deletion to true to proceed with this destructive operation.'
              }
            ],
            isError: true
          };
        }

        const startTime = Date.now();
        const results: Array<{
          success: boolean;
          task_id: string;
          task_name?: string;
          error?: string;
          index: number;
        }> = [];

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < task_ids.length; i++) {
          try {
            const taskId = task_ids[i];
            // Get task name for confirmation
            const taskDetails = await tasksClient.getTask(taskId);
            await tasksClient.deleteTask(taskId);

            results.push({
              success: true,
              task_id: taskId,
              task_name: taskDetails.name,
              index: i
            });
            successCount++;
          } catch (error: any) {
            const errorMessage = error.message || 'Unknown error occurred';
            results.push({
              success: false,
              task_id: task_ids[i],
              error: errorMessage,
              index: i
            });
            errorCount++;

            if (!continue_on_error) {
              // Add remaining tasks as failed
              for (let j = i + 1; j < task_ids.length; j++) {
                results.push({
                  success: false,
                  task_id: task_ids[j],
                  error: 'Skipped due to previous error',
                  index: j
                });
                errorCount++;
              }
              break;
            }
          }
        }

        const executionTime = Date.now() - startTime;

        return {
          content: [
            {
              type: 'text',
              text:
                '⚠️ Bulk task deletion completed!\n\n' +
                `✅ Successfully deleted: ${successCount} tasks\n` +
                `❌ Failed: ${errorCount} tasks\n` +
                `📊 Total: ${task_ids.length} tasks\n` +
                `⏱️ Execution time: ${executionTime}ms\n\n` +
                '⚠️ This action cannot be undone. All successfully deleted tasks have been permanently removed.\n\n' +
                `Detailed Results:\n${JSON.stringify(results, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('in bulk task deletion', error);
      }
    }
  );

  server.tool(
    'clickup_delete_subtask',
    '⚠️ DESTRUCTIVE: Delete a subtask from ClickUp. This action cannot be undone and will permanently remove the subtask.',
    {
      task_id: z.string().min(1).describe('The ID of the subtask to delete'),
      confirm_deletion: z
        .boolean()
        .describe('Confirmation that you want to permanently delete this subtask (must be true)')
    },
    async ({ task_id, confirm_deletion }) => {
      try {
        if (!confirm_deletion) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Subtask deletion cancelled. You must set confirm_deletion to true to proceed with this destructive operation.'
              }
            ],
            isError: true
          };
        }

        // Get subtask details first for confirmation message
        const subtaskDetails = await tasksClient.getTask(task_id);
        await tasksClient.deleteTask(task_id);

        return {
          content: [
            {
              type: 'text',
              text:
                `✅ Subtask "${subtaskDetails.name}" (ID: ${task_id}) has been permanently deleted.\n\n` +
                '⚠️ This action cannot be undone. The subtask and all its data have been removed from ClickUp.'
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('deleting subtask', error);
      }
    }
  );

  server.tool(
    'clickup_merge_tasks',
    "Merge multiple tasks into a single task using ClickUp's native merge. Content from the secondary tasks (comments, attachments, and other data) is migrated into the primary task server-side. Custom Task IDs are not supported.",
    {
      primary_task_id: z
        .string()
        .min(1)
        .describe(
          'The ID of the task that will remain after merging (receives all merged content)'
        ),
      secondary_task_ids: z
        .array(z.string().min(1))
        .min(1)
        .max(10)
        .describe(
          'Array of task IDs to merge into the primary task (maximum 10 tasks)'
        ),
      confirm_merge: z
        .boolean()
        .describe(
          'Confirmation that you want to merge these tasks (secondary tasks are absorbed into the primary task)'
        )
    },
    async ({ primary_task_id, secondary_task_ids, confirm_merge }) => {
      try {
        if (!confirm_merge) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Task merge cancelled. You must set confirm_merge to true to proceed. Secondary tasks will be merged into the primary task.'
              }
            ],
            isError: true
          };
        }

        // Get task details first for the confirmation message
        const primaryTask = await tasksClient.getTask(primary_task_id);
        const secondaryTasks = await Promise.all(
          secondary_task_ids.map(id => tasksClient.getTask(id))
        );

        const mergedTask = await tasksClient.mergeTasks(primary_task_id, secondary_task_ids);

        return {
          content: [
            {
              type: 'text',
              text:
                '✅ Task merge completed!\n\n' +
                `Primary Task: "${primaryTask.name}" (${primary_task_id})\n` +
                `Merged Tasks: ${secondaryTasks.map(task => task.name).join(', ')}\n\n` +
                'Comments, attachments, and other content were migrated into the primary task by ClickUp.\n\n' +
                `Merged Task:\n${JSON.stringify(mergedTask, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('merging tasks', error);
      }
    }
  );
}
