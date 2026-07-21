/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createAuthClient } from '../clickup-client/auth.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const authClient = createAuthClient(clickUpClient);

export function setupWorkspaceTools(server: McpServer): void {
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
      } catch (error: unknown) {
        return mcpError('getting workspace seats', error);
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
      } catch (error: unknown) {
        return mcpError('getting workspaces', error);
      }
    }
  );

  server.tool(
    'clickup_get_authorized_user',
    'Get details about the currently authenticated ClickUp user (whoami). Returns the user ID, username, email, and profile information. Useful for resolving "me" when filtering assignees or time entries.',
    {},
    async () => {
      try {
        const result = await authClient.getAuthorizedUser();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting authorized user', error);
      }
    }
  );

  server.tool(
    'clickup_get_user_groups',
    'Get the User Groups (ClickUp "Teams" feature) in a workspace. Returns group IDs, names, handles, and members. Group IDs can be used as group_assignees on tasks.',
    {
      workspace_id: z.string().describe('The ID of the workspace to get user groups for'),
      group_ids: z
        .string()
        .optional()
        .describe('Optional comma-separated list of group IDs to filter by')
    },
    async ({ workspace_id, group_ids }) => {
      try {
        const result = await authClient.getUserGroups(workspace_id, group_ids);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.groups, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting user groups', error);
      }
    }
  );

  server.tool(
    'clickup_get_workspace_plan',
    'Get the current pricing plan of a ClickUp workspace. Returns the plan ID and name (e.g. Free Forever, Unlimited, Business).',
    { workspace_id: z.string().describe('The ID of the workspace to get the plan for') },
    async ({ workspace_id }) => {
      try {
        const result = await authClient.getWorkspacePlan(workspace_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting workspace plan', error);
      }
    }
  );

  server.tool(
    'clickup_get_custom_roles',
    'Get the Custom Roles defined in a ClickUp workspace. Useful for resolving the custom_role IDs referenced on workspace members.',
    {
      workspace_id: z.string().describe('The ID of the workspace to get custom roles for'),
      include_members: z
        .boolean()
        .optional()
        .describe('Whether to include the member user IDs assigned to each role')
    },
    async ({ workspace_id, include_members }) => {
      try {
        const result = await authClient.getCustomRoles(workspace_id, include_members);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.custom_roles, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting custom roles', error);
      }
    }
  );
}
