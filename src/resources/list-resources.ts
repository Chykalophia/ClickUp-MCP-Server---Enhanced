import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createListsClient } from '../clickup-client/lists.js';

// Create clients
const clickUpClient = createClickUpClient();
const listsClient = createListsClient(clickUpClient);

export function setupListResources(server: McpServer): void {
  // Register space lists resource
  server.resource(
    'space-lists',
    new ResourceTemplate('clickup://space/{space_id}/lists', { list: undefined }),
    {
      description: 'Get all lists directly in a ClickUp space (not in folders), including their names and settings.'
    },
    async (uri, params) => {
      try {
        const space_id = params.space_id as string;
        console.log('[ListResources] Fetching lists for space:', space_id);
        const result = await listsClient.getListsFromSpace(space_id);
        console.log('[ListResources] Got lists:', result);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[ListResources] Error fetching space lists:', error);
        throw new Error(`Error fetching space lists: ${error.message}`);
      }
    }
  );

  // Register list details resource
  server.resource(
    'list-details',
    new ResourceTemplate('clickup://list/{list_id}', { list: undefined }),
    {
      description: 'Get detailed information about a specific ClickUp list, including its name, settings, and metadata.'
    },
    async (uri, params) => {
      try {
        const list_id = params.list_id as string;
        console.log('[ListResources] Fetching list:', list_id);
        const list = await listsClient.getList(list_id);
        console.log('[ListResources] Got list:', list);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(list, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[ListResources] Error fetching list:', error);
        throw new Error(`Error fetching list: ${error.message}`);
      }
    }
  );

  // Add some example static resources for discoverability
  server.resource(
    'example-list',
    'clickup://list/901109776097',
    {
      description: 'An example list resource demonstrating the list details format.'
    },
    async (uri) => {
      try {
        const list_id = '901109776097';
        console.log('[ListResources] Fetching example list:', list_id);
        const list = await listsClient.getList(list_id);
        console.log('[ListResources] Got list:', list);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(list, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[ListResources] Error fetching example list:', error);
        throw new Error(`Error fetching example list: ${error.message}`);
      }
    }
  );

  server.resource(
    'example-space-lists',
    'clickup://space/90113637923/lists',
    {
      description: 'An example space lists resource demonstrating the list data format.'
    },
    async (uri) => {
      try {
        const space_id = '90113637923';
        console.log('[ListResources] Fetching lists for example space:', space_id);
        const result = await listsClient.getListsFromSpace(space_id);
        console.log('[ListResources] Got lists:', result);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[ListResources] Error fetching example space lists:', error);
        throw new Error(`Error fetching example space lists: ${error.message}`);
      }
    }
  );
}
