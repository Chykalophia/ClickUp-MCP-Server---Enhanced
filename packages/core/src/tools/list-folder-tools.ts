/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createListsClient, List } from '../clickup-client/lists.js';
import { createFoldersClient } from '../clickup-client/folders.js';
import { mcpError } from '../utils/error-handling.js';
import { idSchema } from '../schemas/common.js';

// Create clients
const clickUpClient = createClickUpClient();
const listsClient = createListsClient(clickUpClient);
const foldersClient = createFoldersClient(clickUpClient);

export function setupListFolderTools(server: McpServer): void {
  server.tool(
    'clickup_get_lists',
    'Get lists from a ClickUp folder or space. For a space, returns both folderless lists and lists inside the space\'s folders. Returns list details including name and content.',
    {
      container_type: z
        .enum(['folder', 'space'])
        .describe('The type of container to get lists from'),
      container_id: idSchema().describe('The ID of the container to get lists from'),
      archived: z
        .boolean()
        .optional()
        .describe('Whether to return archived lists (defaults to false)')
    },
    async ({ container_type, container_id, archived }) => {
      try {
        const params = archived === undefined ? undefined : { archived };
        let result;
        if (container_type === 'folder') {
          result = await listsClient.getListsFromFolder(container_id, params);
        } else if (container_type === 'space') {
          // GET /space/{id}/list only returns folderless lists, so also collect
          // the lists embedded in the space's folders to cover the whole space.
          const [folderless, folderResult] = await Promise.all([
            listsClient.getListsFromSpace(container_id, params),
            foldersClient.getFoldersFromSpace(container_id, params)
          ]);
          const listsInFolders = folderResult.folders.flatMap(
            folder => (folder as { lists?: List[] }).lists ?? []
          );
          result = { lists: [...folderless.lists, ...listsInFolders] };
        } else {
          throw new Error('Invalid container_type. Must be one of: folder, space');
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting lists', error);
      }
    }
  );

  server.tool(
    'clickup_get_folders',
    'Get folders from a ClickUp space. Returns folder details including the lists inside each folder.',
    {
      space_id: idSchema().describe('The ID of the space to get folders from'),
      archived: z
        .boolean()
        .optional()
        .describe('Whether to return archived folders (defaults to false)')
    },
    async ({ space_id, archived }) => {
      try {
        const params = archived === undefined ? undefined : { archived };
        const result = await foldersClient.getFoldersFromSpace(space_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting folders', error);
      }
    }
  );

  server.tool(
    'clickup_get_folder',
    'Get details about a specific ClickUp folder including its name, statuses, and lists.',
    {
      folder_id: idSchema().describe('The ID of the folder to get')
    },
    async ({ folder_id }) => {
      try {
        const result = await foldersClient.getFolder(folder_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting folder', error);
      }
    }
  );

  server.tool(
    'clickup_create_folder',
    'Create a new folder in a ClickUp space with the specified name.',
    {
      space_id: idSchema().describe('The ID of the space to create the folder in'),
      name: z.string().describe('The name of the folder')
    },
    async ({ space_id, name }) => {
      try {
        const result = await foldersClient.createFolder(space_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating folder', error);
      }
    }
  );

  server.tool(
    'clickup_update_folder',
    "Update an existing ClickUp folder's name.",
    {
      folder_id: idSchema().describe('The ID of the folder to update'),
      name: z.string().describe('The new name of the folder')
    },
    async ({ folder_id, name }) => {
      try {
        const result = await foldersClient.updateFolder(folder_id, { name });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('updating folder', error);
      }
    }
  );

  server.tool(
    'clickup_delete_folder',
    'Delete a folder from ClickUp. Removes the folder and its contents.',
    {
      folder_id: idSchema().describe('The ID of the folder to delete')
    },
    async ({ folder_id }) => {
      try {
        const result = await foldersClient.deleteFolder(folder_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('deleting folder', error);
      }
    }
  );

  server.tool(
    'clickup_get_folderless_lists',
    'Get lists that are not in any folder within a ClickUp space.',
    {
      space_id: idSchema().describe('The ID of the space to get folderless lists from'),
      archived: z
        .boolean()
        .optional()
        .describe('Whether to return archived lists (defaults to false)')
    },
    async ({ space_id, archived }) => {
      try {
        const params = archived === undefined ? undefined : { archived };
        const result = await listsClient.getListsFromSpace(space_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting folderless lists', error);
      }
    }
  );

  server.tool(
    'clickup_create_list',
    'Create a new list in a ClickUp folder or space with the specified name.',
    {
      container_type: z
        .enum(['folder', 'space'])
        .describe('The type of container to create the list in'),
      container_id: idSchema().describe('The ID of the container to create the list in'),
      name: z.string().describe('The name of the list'),
      content: z.string().optional().describe('The description/content of the list'),
      due_date: z
        .number()
        .optional()
        .describe('The due date of the list (Unix timestamp in milliseconds)'),
      due_date_time: z
        .boolean()
        .optional()
        .describe('Whether the due date includes a time component'),
      priority: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe('The priority of the list (1 = Urgent, 2 = High, 3 = Normal, 4 = Low)'),
      assignee: z.number().int().optional().describe('The user ID to assign the list to'),
      status: z.string().optional().describe('The status of the list')
    },
    async ({ container_type, container_id, name, content, due_date, due_date_time, priority, assignee, status }) => {
      try {
        const params = { name, content, due_date, due_date_time, priority, assignee, status };
        let result;
        if (container_type === 'folder') {
          result = await listsClient.createListInFolder(container_id, params);
        } else if (container_type === 'space') {
          result = await listsClient.createFolderlessList(container_id, params);
        } else {
          throw new Error('Invalid container_type. Must be one of: folder, space');
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating list', error);
      }
    }
  );

  server.tool(
    'clickup_create_folderless_list',
    'Create a new list directly in a ClickUp space without placing it in a folder.',
    {
      space_id: idSchema().describe('The ID of the space to create the folderless list in'),
      name: z.string().describe('The name of the folderless list'),
      content: z.string().optional().describe('The description/content of the list'),
      due_date: z
        .number()
        .optional()
        .describe('The due date of the list (Unix timestamp in milliseconds)'),
      due_date_time: z
        .boolean()
        .optional()
        .describe('Whether the due date includes a time component'),
      priority: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe('The priority of the list (1 = Urgent, 2 = High, 3 = Normal, 4 = Low)'),
      assignee: z.number().int().optional().describe('The user ID to assign the list to'),
      status: z.string().optional().describe('The status of the list')
    },
    async ({ space_id, name, content, due_date, due_date_time, priority, assignee, status }) => {
      try {
        const result = await listsClient.createFolderlessList(space_id, {
          name,
          content,
          due_date,
          due_date_time,
          priority,
          assignee,
          status
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating folderless list', error);
      }
    }
  );

  server.tool(
    'clickup_get_list',
    'Get details about a specific ClickUp list including its name and content.',
    {
      list_id: idSchema().describe('The ID of the list to get')
    },
    async ({ list_id }) => {
      try {
        const result = await listsClient.getList(list_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting list', error);
      }
    }
  );

  server.tool(
    'clickup_update_list',
    'Update an existing ClickUp list. All fields are optional; only provided fields are changed.',
    {
      list_id: idSchema().describe('The ID of the list to update'),
      name: z.string().optional().describe('The new name of the list'),
      content: z.string().optional().describe('The new description/content of the list'),
      due_date: z
        .number()
        .optional()
        .describe('The new due date of the list (Unix timestamp in milliseconds)'),
      due_date_time: z
        .boolean()
        .optional()
        .describe('Whether the due date includes a time component'),
      priority: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe('The new priority of the list (1 = Urgent, 2 = High, 3 = Normal, 4 = Low)'),
      assignee: z
        .number()
        .int()
        .nullable()
        .optional()
        .describe('The user ID to assign the list to, or null to remove the assignee'),
      unset_status: z
        .boolean()
        .optional()
        .describe('Set to true to remove the list status')
    },
    async ({ list_id, name, content, due_date, due_date_time, priority, assignee, unset_status }) => {
      try {
        const params = { name, content, due_date, due_date_time, priority, assignee, unset_status };
        if (Object.values(params).every(value => value === undefined)) {
          throw new Error('At least one field to update must be provided');
        }
        const result = await listsClient.updateList(list_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('updating list', error);
      }
    }
  );

  server.tool(
    'clickup_get_list_members',
    'Get the members (users) who have access to a specific ClickUp list.',
    {
      list_id: idSchema().describe('The ID of the list to get members from')
    },
    async ({ list_id }) => {
      try {
        const result = await listsClient.getListMembers(list_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting list members', error);
      }
    }
  );

  server.tool(
    'clickup_delete_list',
    '⚠️ DESTRUCTIVE: Delete a list from ClickUp. This action cannot be undone and will permanently remove the list and all its tasks.',
    {
      list_id: idSchema().describe('The ID of the list to delete'),
      confirm_deletion: z
        .boolean()
        .describe(
          'Confirmation that you want to permanently delete this list and all its tasks (must be true)'
        )
    },
    async ({ list_id, confirm_deletion }) => {
      try {
        if (!confirm_deletion) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ List deletion cancelled. You must set confirm_deletion to true to proceed with this destructive operation.'
              }
            ],
            isError: true
          };
        }

        // Get list details first for confirmation message
        const listDetails = await listsClient.getList(list_id);
        await listsClient.deleteList(list_id);

        return {
          content: [
            {
              type: 'text',
              text:
                `✅ List "${listDetails.name}" (ID: ${list_id}) has been permanently deleted.\n\n` +
                '⚠️ This action cannot be undone. The list and all its tasks have been removed from ClickUp.'
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('deleting list', error);
      }
    }
  );

  server.tool(
    'clickup_create_list_from_template_in_folder',
    'Create a new list in a ClickUp folder using an existing template.',
    {
      folder_id: idSchema().describe('The ID of the folder to create the list in'),
      template_id: idSchema().describe('The ID of the template to use'),
      name: z.string().describe('The name of the list'),
      return_immediately: z
        .boolean()
        .optional()
        .describe('Return immediately with the future List ID instead of waiting for the template to finish')
    },
    async ({ folder_id, template_id, name, return_immediately }) => {
      try {
        const result = await listsClient.createListFromTemplateInFolder(folder_id, template_id, {
          name,
          ...(return_immediately === undefined ? {} : { options: { return_immediately } })
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating list from template in folder', error);
      }
    }
  );

  server.tool(
    'clickup_create_list_from_template_in_space',
    'Create a new list in a ClickUp space using an existing template.',
    {
      space_id: idSchema().describe('The ID of the space to create the list in'),
      template_id: idSchema().describe('The ID of the template to use'),
      name: z.string().describe('The name of the list'),
      return_immediately: z
        .boolean()
        .optional()
        .describe('Return immediately with the future List ID instead of waiting for the template to finish')
    },
    async ({ space_id, template_id, name, return_immediately }) => {
      try {
        const result = await listsClient.createListFromTemplateInSpace(space_id, template_id, {
          name,
          ...(return_immediately === undefined ? {} : { options: { return_immediately } })
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating list from template in space', error);
      }
    }
  );

  server.tool(
    'clickup_create_folder_from_template',
    'Create a new folder (with its nested lists and tasks) in a ClickUp space using an existing folder template.',
    {
      space_id: idSchema().describe('The ID of the space to create the folder in'),
      template_id: z
        .string()
        .describe('The ID of the folder template to use (e.g. "t-7162342")'),
      name: z.string().describe('The name of the new folder'),
      return_immediately: z
        .boolean()
        .optional()
        .describe(
          'Return immediately with the folder ID instead of waiting for all template assets to be created'
        )
    },
    async ({ space_id, template_id, name, return_immediately }) => {
      try {
        const result = await foldersClient.createFolderFromTemplate(space_id, template_id, {
          name,
          ...(return_immediately === undefined ? {} : { options: { return_immediately } })
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating folder from template', error);
      }
    }
  );

  server.tool(
    'clickup_get_folder_templates',
    'Get the folder templates available in a ClickUp workspace. Use the returned template IDs with clickup_create_folder_from_template.',
    {
      team_id: idSchema().describe('The ID of the workspace (team) to get folder templates from')
    },
    async ({ team_id }) => {
      try {
        const result = await foldersClient.getFolderTemplates(team_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting folder templates', error);
      }
    }
  );
}
