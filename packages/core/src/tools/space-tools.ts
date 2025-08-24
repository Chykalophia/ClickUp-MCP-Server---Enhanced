import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createSpacesClient } from '../clickup-client/spaces.js';

// Create clients
const clickUpClient = createClickUpClient();
const spacesClient = createSpacesClient(clickUpClient);

export function setupSpaceTools(server: McpServer): void {
  // Register get_spaces tool
  server.tool(
    'clickup_get_spaces',
    'Get spaces from a ClickUp workspace. Returns space details including name, settings, and features.',
    { workspace_id: z.string().describe('The ID of the workspace to get spaces from') },
    async ({ workspace_id }) => {
      try {
        console.error(`[SpaceTools] Getting spaces for workspace ${workspace_id}...`);
        const spaces = await spacesClient.getSpacesFromWorkspace(workspace_id);
        console.error(`[SpaceTools] Got ${spaces.length} spaces`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(spaces, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting spaces:', error);
        return {
          content: [{ type: 'text', text: `Error getting spaces: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register get_space tool
  server.tool(
    'clickup_get_space',
    'Get details about a specific ClickUp space. Returns space name, settings, features, and metadata.',
    { space_id: z.string().describe('The ID of the space to get') },
    async ({ space_id }) => {
      try {
        console.error(`[SpaceTools] Getting space ${space_id}...`);
        const space = await spacesClient.getSpace(space_id);
        console.error(`[SpaceTools] Got space: ${space.name}`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(space, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting space:', error);
        return {
          content: [{ type: 'text', text: `Error getting space: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
