/* eslint-disable max-len */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createFoldersClient } from '../clickup-client/folders.js';
import { resourceError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const foldersClient = createFoldersClient(clickUpClient);

export function setupFolderResources(server: McpServer): void {
  // Register space folders resource
  server.resource(
    'space-folders',
    new ResourceTemplate('clickup://space/{space_id}/folders', { list: undefined }),
    {
      description:
        'Get all folders in a ClickUp space, including their names, settings, and contained lists.',
    },
    async (uri, params) => {
      try {
        const space_id = params.space_id as string;
        console.error('[FolderResources] Fetching folders for space:', space_id);
        const foldersResponse = await foldersClient.getFoldersFromSpace(space_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(foldersResponse),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching space folders', error);
      }
    }
  );

  // Register folder details resource
  server.resource(
    'folder-details',
    new ResourceTemplate('clickup://folder/{folder_id}', { list: undefined }),
    {
      description:
        'Get detailed information about a specific ClickUp folder, including its name, settings, and metadata.',
    },
    async (uri, params) => {
      try {
        const folder_id = params.folder_id as string;
        console.error('[FolderResources] Fetching folder:', folder_id);

        // Note: The ClickUp API doesn't have a direct endpoint to get folder details
        // We would need to implement this in the foldersClient if API supports it
        // For now, return a placeholder response

        // Create a folder object with the ID and a message
        const folder = {
          id: folder_id,
          message: 'Folder details endpoint not available in ClickUp API',
        };

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(folder),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching folder', error);
      }
    }
  );

  // Register folder lists resource
  server.resource(
    'folder-lists',
    new ResourceTemplate('clickup://folder/{folder_id}/lists', { list: undefined }),
    {
      description:
        'Get all lists contained within a specific ClickUp folder, including their names and settings.',
    },
    async (uri, params) => {
      try {
        const folder_id = params.folder_id as string;
        console.error('[FolderResources] Fetching lists for folder:', folder_id);
        const lists = await foldersClient.getListsFromFolder(folder_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(lists),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching folder lists', error);
      }
    }
  );
}
