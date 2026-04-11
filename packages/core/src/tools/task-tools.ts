/* eslint-disable no-console, max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient, CreateTaskParams, UpdateTaskParams } from '../clickup-client/tasks.js';
import { createListsClient } from '../clickup-client/lists.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);
const listsClient = createListsClient(clickUpClient);

export function setupTaskTools(server: McpServer): void {
  // Task tools
  server.tool(
    'clickup_get_tasks',
    'Get tasks from a ClickUp list. Returns task details including name, description, assignees, and status.',
    {
      list_id: z.string().describe('The ID of the list to get tasks from'),
      include_closed: z.boolean().optional().describe('Whether to include closed tasks'),
      subtasks: z.boolean().optional().describe('Whether to include subtasks in the results'),
      page: z.number().optional().describe('The page number to get'),
      order_by: z.string().optional().describe('The field to order by'),
      reverse: z.boolean().optional().describe('Whether to reverse the order')
    },
    async ({ list_id, ...params }) => {
      try {
        const result = await tasksClient.getTasksFromList(list_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting tasks', error);
      }
    }
  );

  server.tool(
    'clickup_get_task_details',
    'Get detailed information about a specific ClickUp task. Returns comprehensive task data including description, assignees, status, and dates.',
    {
      task_id: z.string().describe('The ID of the task to get'),
      include_subtasks: z
        .boolean()
        .optional()
        .describe('Whether to include subtasks in the task details')
    },
    async ({ task_id, include_subtasks }) => {
      try {
        const task = await tasksClient.getTask(task_id, { include_subtasks });
        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting task details', error);
      }
    }
  );

  server.tool(
    'clickup_create_task',
    'Create a new task in a ClickUp list with specified properties like name, description, assignees, status, and dates. Supports GitHub Flavored Markdown in description field.',
    {
      list_id: z.string().describe('The ID of the list to create the task in'),
      name: z.string().describe('The name of the task'),
      description: z
        .string()
        .optional()
        .describe(
          'The description of the task (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'
        ),
      markdown_content: z
        .string()
        .optional()
        .describe(
          'Raw markdown content for the task description (alternative to description field)'
        ),
      assignees: z
        .array(z.number())
        .optional()
        .describe('The IDs of the users to assign to the task'),
      tags: z.array(z.string()).optional().describe('The tags to add to the task'),
      status: z.string().optional().describe('The status of the task'),
      priority: z.number().optional().describe('The priority of the task (1-4)'),
      due_date: z.number().optional().describe('The due date of the task (Unix timestamp)'),
      due_date_time: z.boolean().optional().describe('Whether the due date includes a time'),
      time_estimate: z
        .number()
        .optional()
        .describe('The time estimate for the task (in milliseconds)'),
      start_date: z.number().optional().describe('The start date of the task (Unix timestamp)'),
      start_date_time: z.boolean().optional().describe('Whether the start date includes a time'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees'),
      parent: z.string().optional().describe('The ID of the parent task')
    },
    async ({ list_id, ...taskParams }) => {
      try {
        // If both description and markdown_content are provided, prefer markdown_content
        if (taskParams.markdown_content && taskParams.description) {
          console.warn('Both description and markdown_content provided. Using markdown_content.');
          delete taskParams.description;
        }

        const result = await tasksClient.createTask(list_id, taskParams as CreateTaskParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating task', error);
      }
    }
  );

  server.tool(
    'clickup_update_task',
    "Update an existing ClickUp task's properties including name, description, assignees, status, and dates. Supports GitHub Flavored Markdown in description field.",
    {
      task_id: z.string().describe('The ID of the task to update'),
      name: z.string().optional().describe('The new name of the task'),
      description: z
        .string()
        .optional()
        .describe(
          'The new description of the task (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'
        ),
      markdown_content: z
        .string()
        .optional()
        .describe(
          'Raw markdown content for the task description (alternative to description field)'
        ),
      assignees: z
        .array(z.number())
        .optional()
        .describe('The IDs of the users to assign to the task'),
      status: z.string().optional().describe('The new status of the task'),
      priority: z.number().optional().describe('The new priority of the task (1-4)'),
      due_date: z.number().optional().describe('The new due date of the task (Unix timestamp)'),
      due_date_time: z.boolean().optional().describe('Whether the due date includes a time'),
      time_estimate: z
        .number()
        .optional()
        .describe('The new time estimate for the task (in milliseconds)'),
      start_date: z.number().optional().describe('The new start date of the task (Unix timestamp)'),
      start_date_time: z.boolean().optional().describe('Whether the start date includes a time'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees')
    },
    async ({ task_id, ...taskParams }) => {
      try {
        // If both description and markdown_content are provided, prefer markdown_content
        if (taskParams.markdown_content && taskParams.description) {
          console.warn('Both description and markdown_content provided. Using markdown_content.');
          delete taskParams.description;
        }

        const result = await tasksClient.updateTask(task_id, taskParams as UpdateTaskParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('updating task', error);
      }
    }
  );

  server.tool(
    'clickup_delete_task',
    '⚠️ DESTRUCTIVE: Delete a task from ClickUp. This action cannot be undone and will permanently remove the task and all its data.',
    {
      task_id: z.string().min(1).describe('The ID of the task to delete'),
      confirm_deletion: z
        .boolean()
        .describe('Confirmation that you want to permanently delete this task (must be true)')
    },
    async ({ task_id, confirm_deletion }) => {
      try {
        if (!confirm_deletion) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Task deletion cancelled. You must set confirm_deletion to true to proceed with this destructive operation.'
              }
            ],
            isError: true
          };
        }

        // Get task details first for confirmation message
        const taskDetails = await tasksClient.getTask(task_id);
        await tasksClient.deleteTask(task_id);

        return {
          content: [
            {
              type: 'text',
              text:
                `✅ Task "${taskDetails.name}" (ID: ${task_id}) has been permanently deleted.\n\n` +
                '⚠️ This action cannot be undone. The task and all its data have been removed from ClickUp.'
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('deleting task', error);
      }
    }
  );

  server.tool(
    'clickup_add_task_to_list',
    'Add an existing task to a ClickUp list.',
    {
      list_id: z.string().describe('The ID of the list to add the task to'),
      task_id: z.string().describe('The ID of the task to add')
    },
    async ({ list_id, task_id }) => {
      try {
        const result = await listsClient.addTaskToList(list_id, task_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('adding task to list', error);
      }
    }
  );

  server.tool(
    'clickup_remove_task_from_list',
    'Remove a task from a ClickUp list without deleting the task.',
    {
      list_id: z.string().describe('The ID of the list to remove the task from'),
      task_id: z.string().describe('The ID of the task to remove')
    },
    async ({ list_id, task_id }) => {
      try {
        const result = await listsClient.removeTaskFromList(list_id, task_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('removing task from list', error);
      }
    }
  );
}
