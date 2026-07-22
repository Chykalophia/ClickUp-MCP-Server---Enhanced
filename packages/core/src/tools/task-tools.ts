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
      list_id: z.coerce.string().describe('The ID of the list to get tasks from'),
      include_closed: z.boolean().optional().describe('Whether to include closed tasks'),
      subtasks: z.boolean().optional().describe('Whether to include subtasks in the results'),
      include_markdown_description: z
        .boolean()
        .optional()
        .describe('Whether to return task descriptions in Markdown format'),
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
      task_id: z.coerce.string().describe('The ID of the task to get'),
      include_subtasks: z
        .boolean()
        .optional()
        .describe('Whether to include subtasks in the task details'),
      include_markdown_description: z
        .boolean()
        .optional()
        .describe('Whether to return the task description in Markdown format'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_id, include_subtasks, include_markdown_description, custom_task_ids, team_id }) => {
      try {
        const task = await tasksClient.getTask(task_id, {
          include_subtasks,
          include_markdown_description,
          custom_task_ids,
          team_id
        });
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
      list_id: z.coerce.string().describe('The ID of the list to create the task in'),
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
      parent: z.string().optional().describe('The ID of the parent task'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when parent/links_to reference custom task IDs (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ list_id, custom_task_ids, team_id, ...taskParams }) => {
      try {
        // If both description and markdown_content are provided, prefer markdown_content
        if (taskParams.markdown_content && taskParams.description) {
          console.warn('Both description and markdown_content provided. Using markdown_content.');
          delete taskParams.description;
        }

        const result = await tasksClient.createTask(list_id, taskParams as CreateTaskParams, {
          custom_task_ids,
          team_id
        });
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
      task_id: z.coerce.string().describe('The ID of the task to update'),
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
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_id, custom_task_ids, team_id, ...taskParams }) => {
      try {
        // If both description and markdown_content are provided, prefer markdown_content
        if (taskParams.markdown_content && taskParams.description) {
          console.warn('Both description and markdown_content provided. Using markdown_content.');
          delete taskParams.description;
        }

        const result = await tasksClient.updateTask(task_id, taskParams as UpdateTaskParams, {
          custom_task_ids,
          team_id
        });
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
      task_id: z.coerce.string().min(1).describe('The ID of the task to delete'),
      confirm_deletion: z
        .boolean()
        .describe('Confirmation that you want to permanently delete this task (must be true)'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_id, confirm_deletion, custom_task_ids, team_id }) => {
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
        const taskDetails = await tasksClient.getTask(task_id, { custom_task_ids, team_id });
        await tasksClient.deleteTask(task_id, { custom_task_ids, team_id });

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
      list_id: z.coerce.string().describe('The ID of the list to add the task to'),
      task_id: z.coerce.string().describe('The ID of the task to add')
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
      list_id: z.coerce.string().describe('The ID of the list to remove the task from'),
      task_id: z.coerce.string().describe('The ID of the task to remove')
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

  server.tool(
    'clickup_get_task_time_in_status',
    "Get a ClickUp task's time-in-status data: current status (with elapsed time) plus the full status_history. Requires the workspace's \"Total time in Status\" ClickApp to be enabled. Response fields (including status_history[*].orderindex) may be omitted by ClickUp on some entries and are tolerated rather than rejected.",
    {
      task_id: z.coerce.string().describe('The ID of the task'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_id, custom_task_ids, team_id }) => {
      try {
        const result = await tasksClient.getTaskTimeInStatus(task_id, {
          custom_task_ids,
          team_id
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting task time in status', error);
      }
    }
  );

  server.tool(
    'clickup_get_bulk_tasks_time_in_status',
    'Get time-in-status data for multiple ClickUp tasks in one call (2–100 task IDs). Returns an object keyed by task_id with { current_status, status_history }. Requires the workspace\'s "Total time in Status" ClickApp to be enabled. Schema is lenient: per-entry fields like orderindex are optional and partial responses are surfaced rather than rejected.',
    {
      task_ids: z
        .array(z.string())
        .min(2)
        .max(100)
        .describe('2 to 100 task IDs (ClickUp API constraints)'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_ids are custom task IDs (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_ids, custom_task_ids, team_id }) => {
      try {
        const result = await tasksClient.getBulkTasksTimeInStatus(task_ids, {
          custom_task_ids,
          team_id
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting bulk tasks time in status', error);
      }
    }
  );

  server.tool(
    'clickup_get_filtered_team_tasks',
    'Search tasks across an entire ClickUp workspace (team) with filters for statuses, assignees, tags, lists, spaces, and date ranges. Results are paginated (100 tasks per page).',
    {
      team_id: z.coerce.string().describe('The ID of the workspace (team) to search'),
      page: z.number().optional().describe('The page number to get (starts at 0)'),
      order_by: z.string().optional().describe('The field to order by (id, created, updated, due_date)'),
      reverse: z.boolean().optional().describe('Whether to reverse the order'),
      subtasks: z.boolean().optional().describe('Whether to include subtasks in the results'),
      space_ids: z.array(z.string()).optional().describe('Filter by space IDs'),
      project_ids: z.array(z.string()).optional().describe('Filter by folder (project) IDs'),
      list_ids: z.array(z.string()).optional().describe('Filter by list IDs'),
      statuses: z.array(z.string()).optional().describe('Filter by status names'),
      include_closed: z.boolean().optional().describe('Whether to include closed tasks'),
      include_markdown_description: z
        .boolean()
        .optional()
        .describe('Whether to return task descriptions in Markdown format'),
      assignees: z.array(z.string()).optional().describe('Filter by assignee user IDs'),
      tags: z.array(z.string()).optional().describe('Filter by tag names'),
      due_date_gt: z.number().optional().describe('Filter by due date greater than (Unix timestamp in ms)'),
      due_date_lt: z.number().optional().describe('Filter by due date less than (Unix timestamp in ms)'),
      date_created_gt: z.number().optional().describe('Filter by created date greater than (Unix timestamp in ms)'),
      date_created_lt: z.number().optional().describe('Filter by created date less than (Unix timestamp in ms)'),
      date_updated_gt: z.number().optional().describe('Filter by updated date greater than (Unix timestamp in ms)'),
      date_updated_lt: z.number().optional().describe('Filter by updated date less than (Unix timestamp in ms)'),
      parent: z.string().optional().describe('Filter by parent task ID')
    },
    async ({ team_id, ...params }) => {
      try {
        const result = await tasksClient.getFilteredTeamTasks(team_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting filtered team tasks', error);
      }
    }
  );

  server.tool(
    'clickup_add_tag_to_task',
    'Add a tag to an existing ClickUp task. The tag must already exist in the space.',
    {
      task_id: z.coerce.string().describe('The ID of the task to tag'),
      tag_name: z.string().describe('The name of the tag to add'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_id, tag_name, custom_task_ids, team_id }) => {
      try {
        await tasksClient.addTagToTask(task_id, tag_name, { custom_task_ids, team_id });
        return {
          content: [
            { type: 'text', text: `✅ Tag "${tag_name}" added to task ${task_id}.` }
          ]
        };
      } catch (error: unknown) {
        return mcpError('adding tag to task', error);
      }
    }
  );

  server.tool(
    'clickup_remove_tag_from_task',
    'Remove a tag from a ClickUp task without deleting the tag itself.',
    {
      task_id: z.coerce.string().describe('The ID of the task to remove the tag from'),
      tag_name: z.string().describe('The name of the tag to remove'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true')
    },
    async ({ task_id, tag_name, custom_task_ids, team_id }) => {
      try {
        await tasksClient.removeTagFromTask(task_id, tag_name, { custom_task_ids, team_id });
        return {
          content: [
            { type: 'text', text: `✅ Tag "${tag_name}" removed from task ${task_id}.` }
          ]
        };
      } catch (error: unknown) {
        return mcpError('removing tag from task', error);
      }
    }
  );

  server.tool(
    'clickup_create_task_from_template',
    'Create a new task in a ClickUp list from a saved task template. Template contents such as checklists and subtasks are included.',
    {
      list_id: z.coerce.string().describe('The ID of the list to create the task in'),
      template_id: z.coerce.string().describe('The ID of the task template to instantiate'),
      name: z.string().describe('The name of the new task')
    },
    async ({ list_id, template_id, name }) => {
      try {
        const result = await tasksClient.createTaskFromTemplate(list_id, template_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating task from template', error);
      }
    }
  );
}
