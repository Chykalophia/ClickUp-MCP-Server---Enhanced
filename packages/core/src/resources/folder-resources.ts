/* eslint-disable max-len */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createFoldersClient } from '../clickup-client/folders.js';
import { resourceError } from '../utils/error-handling.js';

const clickUpClient = createClickUpClient();
const foldersClient = createFoldersClient(clickUpClient);

export function setupFolderResources(server: McpServer): void {
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
        // The ID is interpolated into the API path, so anything but an ID is refused.
        if (!/^[A-Za-z0-9_-]+$/.test(folder_id)) {
          throw new Error('Invalid folder ID');
        }
        const folder = await foldersClient.getFolder(folder_id);

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
