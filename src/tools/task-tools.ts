import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient, CreateTaskParams, UpdateTaskParams } from '../clickup-client/tasks.js';
import { createListsClient } from '../clickup-client/lists.js';
import { createFoldersClient } from '../clickup-client/folders.js';
import { createAuthClient } from '../clickup-client/auth.js';

// Create clients
const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);
const listsClient = createListsClient(clickUpClient);
const foldersClient = createFoldersClient(clickUpClient);
const authClient = createAuthClient(clickUpClient);

export function setupTaskTools(server: McpServer): void {
  // Workspace and Auth tools
  server.tool(
    'clickup_get_workspace_seats',
    'Get information about seats (user licenses) in a ClickUp workspace. Returns details about seat allocation and availability.',
    { workspace_id: z.string().describe('The ID of the workspace to get seats information for') },
    async ({ workspace_id }) => {
      try {
        const result = await authClient.getWorkspaceSeats(workspace_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting workspace seats:', error);
        return {
          content: [{ type: 'text', text: `Error getting workspace seats: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_workspaces',
    'Get a list of all ClickUp workspaces accessible to the authenticated user. Returns workspace IDs, names, and metadata.',
    {},
    async () => {
      try {
        const result = await authClient.getWorkspaces();
        return {
          content: [{ type: 'text', text: JSON.stringify(result.teams, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting workspaces:', error);
        return {
          content: [{ type: 'text', text: `Error getting workspaces: ${error.message}` }],
          isError: true
        };
      }
    }
  );

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
      } catch (error: any) {
        console.error('Error getting tasks:', error);
        return {
          content: [{ type: 'text', text: `Error getting tasks: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_task_details',
    'Get detailed information about a specific ClickUp task. Returns comprehensive task data including description, assignees, status, and dates.',
    {
      task_id: z.string().describe('The ID of the task to get'),
      include_subtasks: z.boolean().optional().describe('Whether to include subtasks in the task details')
    },
    async ({ task_id, include_subtasks }) => {
      try {
        const task = await tasksClient.getTask(task_id, { include_subtasks });
        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting task details:', error);
        return {
          content: [{ type: 'text', text: `Error getting task details: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_task',
    'Create a new task in a ClickUp list with specified properties like name, description, assignees, status, and dates. Supports GitHub Flavored Markdown in description field.',
    {
      list_id: z.string().describe('The ID of the list to create the task in'),
      name: z.string().describe('The name of the task'),
      description: z.string().optional().describe('The description of the task (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'),
      markdown_content: z.string().optional().describe('Raw markdown content for the task description (alternative to description field)'),
      assignees: z.array(z.number()).optional().describe('The IDs of the users to assign to the task'),
      tags: z.array(z.string()).optional().describe('The tags to add to the task'),
      status: z.string().optional().describe('The status of the task'),
      priority: z.number().optional().describe('The priority of the task (1-4)'),
      due_date: z.number().optional().describe('The due date of the task (Unix timestamp)'),
      due_date_time: z.boolean().optional().describe('Whether the due date includes a time'),
      time_estimate: z.number().optional().describe('The time estimate for the task (in milliseconds)'),
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
      } catch (error: any) {
        console.error('Error creating task:', error);
        return {
          content: [{ type: 'text', text: `Error creating task: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_task',
    'Update an existing ClickUp task\'s properties including name, description, assignees, status, and dates. Supports GitHub Flavored Markdown in description field.',
    {
      task_id: z.string().describe('The ID of the task to update'),
      name: z.string().optional().describe('The new name of the task'),
      description: z.string().optional().describe('The new description of the task (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'),
      markdown_content: z.string().optional().describe('Raw markdown content for the task description (alternative to description field)'),
      assignees: z.array(z.number()).optional().describe('The IDs of the users to assign to the task'),
      status: z.string().optional().describe('The new status of the task'),
      priority: z.number().optional().describe('The new priority of the task (1-4)'),
      due_date: z.number().optional().describe('The new due date of the task (Unix timestamp)'),
      due_date_time: z.boolean().optional().describe('Whether the due date includes a time'),
      time_estimate: z.number().optional().describe('The new time estimate for the task (in milliseconds)'),
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
      } catch (error: any) {
        console.error('Error updating task:', error);
        return {
          content: [{ type: 'text', text: `Error updating task: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // List and Folder tools
  server.tool(
    'clickup_get_lists',
    'Get lists from a ClickUp folder or space. Returns list details including name and content.',
    {
      container_type: z.enum(['folder', 'space']).describe('The type of container to get lists from'),
      container_id: z.string().describe('The ID of the container to get lists from')
    },
    async ({ container_type, container_id }) => {
      try {
        let result;
        if (container_type === 'folder') {
          result = await foldersClient.getListsFromFolder(container_id);
        } else if (container_type === 'space') {
          result = await listsClient.getListsFromSpace(container_id);
        } else {
          throw new Error('Invalid container_type. Must be one of: folder, space');
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error(`Error getting lists from ${container_type}:`, error);
        return {
          content: [{ type: 'text', text: `Error getting lists: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_folder',
    'Create a new folder in a ClickUp space with the specified name.',
    {
      space_id: z.string().describe('The ID of the space to create the folder in'),
      name: z.string().describe('The name of the folder')
    },
    async ({ space_id, name }) => {
      try {
        const result = await foldersClient.createFolder(space_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating folder:', error);
        return {
          content: [{ type: 'text', text: `Error creating folder: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_folder',
    'Update an existing ClickUp folder\'s name.',
    {
      folder_id: z.string().describe('The ID of the folder to update'),
      name: z.string().describe('The new name of the folder')
    },
    async ({ folder_id, name }) => {
      try {
        const result = await foldersClient.updateFolder(folder_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error updating folder:', error);
        return {
          content: [{ type: 'text', text: `Error updating folder: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_folder',
    'Delete a folder from ClickUp. Removes the folder and its contents.',
    {
      folder_id: z.string().describe('The ID of the folder to delete')
    },
    async ({ folder_id }) => {
      try {
        const result = await foldersClient.deleteFolder(folder_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error deleting folder:', error);
        return {
          content: [{ type: 'text', text: `Error deleting folder: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_folderless_lists',
    'Get lists that are not in any folder within a ClickUp space.',
    {
      space_id: z.string().describe('The ID of the space to get folderless lists from')
    },
    async ({ space_id }) => {
      try {
        const result = await listsClient.getListsFromSpace(space_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting folderless lists:', error);
        return {
          content: [{ type: 'text', text: `Error getting folderless lists: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_list',
    'Create a new list in a ClickUp folder or space with the specified name.',
    {
      container_type: z.enum(['folder', 'space']).describe('The type of container to create the list in'),
      container_id: z.string().describe('The ID of the container to create the list in'),
      name: z.string().describe('The name of the list')
    },
    async ({ container_type, container_id, name }) => {
      try {
        let result;
        if (container_type === 'folder') {
          result = await listsClient.createListInFolder(container_id, { name });
        } else if (container_type === 'space') {
          result = await listsClient.createFolderlessList(container_id, { name });
        } else {
          throw new Error('Invalid container_type. Must be one of: folder, space');
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error(`Error creating list in ${container_type}:`, error);
        return {
          content: [{ type: 'text', text: `Error creating list: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_folderless_list',
    'Create a new list directly in a ClickUp space without placing it in a folder.',
    {
      space_id: z.string().describe('The ID of the space to create the folderless list in'),
      name: z.string().describe('The name of the folderless list')
    },
    async ({ space_id, name }) => {
      try {
        const result = await listsClient.createFolderlessList(space_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating folderless list:', error);
        return {
          content: [{ type: 'text', text: `Error creating folderless list: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_list',
    'Get details about a specific ClickUp list including its name and content.',
    {
      list_id: z.string().describe('The ID of the list to get')
    },
    async ({ list_id }) => {
      try {
        const result = await listsClient.getList(list_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting list:', error);
        return {
          content: [{ type: 'text', text: `Error getting list: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_list',
    'Update an existing ClickUp list\'s name.',
    {
      list_id: z.string().describe('The ID of the list to update'),
      name: z.string().describe('The new name of the list')
    },
    async ({ list_id, name }) => {
      try {
        const result = await listsClient.updateList(list_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error updating list:', error);
        return {
          content: [{ type: 'text', text: `Error updating list: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_list',
    'Delete a list from ClickUp. Removes the list and its tasks.',
    {
      list_id: z.string().describe('The ID of the list to delete')
    },
    async ({ list_id }) => {
      try {
        const result = await listsClient.deleteList(list_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error deleting list:', error);
        return {
          content: [{ type: 'text', text: `Error deleting list: ${error.message}` }],
          isError: true
        };
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
      } catch (error: any) {
        console.error('Error adding task to list:', error);
        return {
          content: [{ type: 'text', text: `Error adding task to list: ${error.message}` }],
          isError: true
        };
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
      } catch (error: any) {
        console.error('Error removing task from list:', error);
        return {
          content: [{ type: 'text', text: `Error removing task from list: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_list_from_template_in_folder',
    'Create a new list in a ClickUp folder using an existing template.',
    {
      folder_id: z.string().describe('The ID of the folder to create the list in'),
      template_id: z.string().describe('The ID of the template to use'),
      name: z.string().describe('The name of the list')
    },
    async ({ folder_id, template_id, name }) => {
      try {
        const result = await listsClient.createListFromTemplateInFolder(folder_id, template_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating list from template in folder:', error);
        return {
          content: [{ type: 'text', text: `Error creating list from template in folder: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_list_from_template_in_space',
    'Create a new list in a ClickUp space using an existing template.',
    {
      space_id: z.string().describe('The ID of the space to create the list in'),
      template_id: z.string().describe('The ID of the template to use'),
      name: z.string().describe('The name of the list')
    },
    async ({ space_id, template_id, name }) => {
      try {
        const result = await listsClient.createListFromTemplateInSpace(space_id, template_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating list from template in space:', error);
        return {
          content: [{ type: 'text', text: `Error creating list from template in space: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
