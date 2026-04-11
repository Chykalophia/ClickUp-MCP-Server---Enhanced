/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createListsClient } from '../clickup-client/lists.js';
import { createFoldersClient } from '../clickup-client/folders.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const listsClient = createListsClient(clickUpClient);
const foldersClient = createFoldersClient(clickUpClient);

export function setupListFolderTools(server: McpServer): void {
  server.tool(
    'clickup_get_lists',
    'Get lists from a ClickUp folder or space. Returns list details including name and content.',
    {
      container_type: z
        .enum(['folder', 'space'])
        .describe('The type of container to get lists from'),
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
      } catch (error: unknown) {
        return mcpError('getting lists', error);
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
      } catch (error: unknown) {
        return mcpError('creating folder', error);
      }
    }
  );

  server.tool(
    'clickup_update_folder',
    "Update an existing ClickUp folder's name.",
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
      } catch (error: unknown) {
        return mcpError('updating folder', error);
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
      } catch (error: unknown) {
        return mcpError('deleting folder', error);
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
      } catch (error: unknown) {
        return mcpError('creating list', error);
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
      } catch (error: unknown) {
        return mcpError('creating folderless list', error);
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
      } catch (error: unknown) {
        return mcpError('getting list', error);
      }
    }
  );

  server.tool(
    'clickup_update_list',
    "Update an existing ClickUp list's name.",
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
      } catch (error: unknown) {
        return mcpError('updating list', error);
      }
    }
  );

  server.tool(
    'clickup_delete_list',
    '⚠️ DESTRUCTIVE: Delete a list from ClickUp. This action cannot be undone and will permanently remove the list and all its tasks.',
    {
      list_id: z.string().describe('The ID of the list to delete'),
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
      folder_id: z.string().describe('The ID of the folder to create the list in'),
      template_id: z.string().describe('The ID of the template to use'),
      name: z.string().describe('The name of the list')
    },
    async ({ folder_id, template_id, name }) => {
      try {
        const result = await listsClient.createListFromTemplateInFolder(folder_id, template_id, {
          name
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
      space_id: z.string().describe('The ID of the space to create the list in'),
      template_id: z.string().describe('The ID of the template to use'),
      name: z.string().describe('The name of the list')
    },
    async ({ space_id, template_id, name }) => {
      try {
        const result = await listsClient.createListFromTemplateInSpace(space_id, template_id, {
          name
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('creating list from template in space', error);
      }
    }
  );
}
