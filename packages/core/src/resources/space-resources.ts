/* eslint-disable max-len */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createSpacesClient } from '../clickup-client/spaces.js';
import { resourceError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const spacesClient = createSpacesClient(clickUpClient);

export function setupSpaceResources(server: McpServer): void {
  // Register workspace spaces resource
  server.resource(
    'workspace-spaces',
    new ResourceTemplate('clickup://workspace/{workspace_id}/spaces', { list: undefined }),
    {
      description:
        'Get all spaces in a ClickUp workspace, including their names, settings, and features.',
    },
    async (uri, params) => {
      try {
        const workspace_id = params.workspace_id as string;
        console.error('[SpaceResources] Fetching spaces for workspace:', workspace_id);
        const spaces = await spacesClient.getSpacesFromWorkspace(workspace_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(spaces),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching workspace spaces', error);
      }
    }
  );

  // Register space details resource
  server.resource(
    'space-details',
    new ResourceTemplate('clickup://space/{space_id}', { list: undefined }),
    {
      description:
        'Get detailed information about a specific ClickUp space, including its name, settings, features, and metadata.',
    },
    async (uri, params) => {
      try {
        const space_id = params.space_id as string;
        console.error('[SpaceResources] Fetching space:', space_id);
        const space = await spacesClient.getSpace(space_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(space),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching space', error);
      }
    }
  );
}
