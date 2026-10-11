import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createListsClient } from '../clickup-client/lists.js';
import { resourceError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const listsClient = createListsClient(clickUpClient);

export function setupListResources(server: McpServer): void {
  // Register space lists resource
  server.resource(
    'space-lists',
    new ResourceTemplate('clickup://space/{space_id}/lists', { list: undefined }),
    {
      description:
        'Get all lists directly in a ClickUp space (not in folders), including their names and settings.',
    },
    async (uri, params) => {
      try {
        const space_id = params.space_id as string;
        console.error('[ListResources] Fetching lists for space:', space_id);
        const result = await listsClient.getListsFromSpace(space_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching space lists', error);
      }
    }
  );

  // Register list details resource
  server.resource(
    'list-details',
    new ResourceTemplate('clickup://list/{list_id}', { list: undefined }),
    {
      description:
        'Get detailed information about a specific ClickUp list, including its name, settings, and metadata.',
    },
    async (uri, params) => {
      try {
        const list_id = params.list_id as string;
        console.error('[ListResources] Fetching list:', list_id);
        const list = await listsClient.getList(list_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(list),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching list', error);
      }
    }
  );
}
