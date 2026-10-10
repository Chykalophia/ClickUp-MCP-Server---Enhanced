/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createAuthClient } from '../clickup-client/auth.js';
import { mcpError } from '../utils/error-handling.js';
import { idSchema } from '../schemas/common.js';

// Create clients
const clickUpClient = createClickUpClient();
const authClient = createAuthClient(clickUpClient);

export function setupWorkspaceTools(server: McpServer): void {
  server.tool(
    'clickup_get_workspace_seats',
    'Get information about seats (user licenses) in a ClickUp workspace. Returns details about seat allocation and availability.',
    { workspace_id: idSchema().describe('The ID of the workspace to get seats information for') },
    async ({ workspace_id }) => {
      try {
        const result = await authClient.getWorkspaceSeats(workspace_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('getting workspace seats', error);
      }
    }
  );

  server.tool(
    'clickup_get_workspaces',
    'Get all ClickUp workspaces accessible to the authenticated user. Returns id, name and color for each. Set include_members to also return the full member roster, which is large — most callers only need the workspace ID.',
    {
      include_members: z
        .boolean()
        .optional()
        .describe(
          'Include the full member roster and workspace avatar URL. Off by default: on a real workspace the roster is ~10 KB per workspace and is almost never what the caller wanted. Use clickup_get_list_members to inspect the members of a specific list instead, and turn this on only when you genuinely need every workspace member (e.g. resolving a user ID for an @mention).'
        ),
    },
    async ({ include_members }) => {
      try {
        const result = await authClient.getWorkspaces();
        // Trimmed by default. The raw response is dominated by `members` (a full
        // roster with avatars and signed URLs) which the overwhelmingly common
        // "which workspace am I in?" question does not need.
        const payload = include_members
          ? result.teams
          : (result.teams ?? []).map((team: Record<string, unknown>) => ({
              id: team.id,
              name: team.name,
              color: team.color,
            }));
        return {
          content: [{ type: 'text', text: JSON.stringify(payload) }],
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
          content: [{ type: 'text', text: JSON.stringify(result) }],
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
      workspace_id: idSchema().describe('The ID of the workspace to get user groups for'),
      group_ids: z
        .string()
        .optional()
        .describe('Optional comma-separated list of group IDs to filter by'),
    },
    async ({ workspace_id, group_ids }) => {
      try {
        const result = await authClient.getUserGroups(workspace_id, group_ids);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.groups) }],
        };
      } catch (error: unknown) {
        return mcpError('getting user groups', error);
      }
    }
  );

  server.tool(
    'clickup_get_workspace_plan',
    'Get the current pricing plan of a ClickUp workspace. Returns the plan ID and name (e.g. Free Forever, Unlimited, Business).',
    { workspace_id: idSchema().describe('The ID of the workspace to get the plan for') },
    async ({ workspace_id }) => {
      try {
        const result = await authClient.getWorkspacePlan(workspace_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
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
      workspace_id: idSchema().describe('The ID of the workspace to get custom roles for'),
      include_members: z
        .boolean()
        .optional()
        .describe('Whether to include the member user IDs assigned to each role'),
    },
    async ({ workspace_id, include_members }) => {
      try {
        const result = await authClient.getCustomRoles(workspace_id, include_members);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.custom_roles) }],
        };
      } catch (error: unknown) {
        return mcpError('getting custom roles', error);
      }
    }
  );
  // ========================================
  // MEMBER LOOKUP
  // ========================================

  server.tool(
    'clickup_find_member',
    'Find ClickUp workspace members by name or email (case-insensitive substring match). Returns id, username and email for each match — the cheap way to resolve a person to the numeric user ID needed for assignees or @[Name](id) mentions, instead of pulling the whole roster.',
    {
      query: z
        .string()
        .trim()
        .min(1)
        .describe('Part of the member\'s username or email, e.g. "jane" or "@acme.com"'),
      workspace_id: idSchema()
        .optional()
        .describe('Limit the search to this workspace. Omit to search every authorized workspace'),
    },
    async ({ query, workspace_id }) => {
      try {
        const members = await authClient.findMembers(query, workspace_id);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ query, count: members.length, members }) },
          ],
        };
      } catch (error: unknown) {
        return mcpError('finding workspace members', error);
      }
    }
  );

  // ========================================
  // USER GROUPS
  // ========================================

  server.tool(
    'clickup_create_user_group',
    'Create a User Group (ClickUp "Team") in a workspace with an initial set of members.',
    {
      workspace_id: idSchema().describe('The ID of the workspace to create the group in'),
      name: z.string().min(1).describe('Name of the User Group'),
      members: z
        .array(z.number().int().positive())
        .describe('User IDs to add to the group (may be empty)'),
      handle: z.string().min(1).optional().describe('Handle used to @mention the group'),
    },
    async ({ workspace_id, name, members, handle }) => {
      try {
        const result = await authClient.createUserGroup(workspace_id, {
          name,
          members,
          ...(handle !== undefined ? { handle } : {}),
        });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('creating user group', error);
      }
    }
  );

  server.tool(
    'clickup_update_user_group',
    "Update a User Group's name or handle, and add or remove members. Membership changes are deltas: only the listed users are added or removed.",
    {
      group_id: idSchema().describe('The ID of the User Group (e.g. "C9C58BE9")'),
      name: z.string().min(1).optional().describe('New name'),
      handle: z.string().min(1).optional().describe('New @mention handle'),
      add_members: z
        .array(z.number().int().positive())
        .optional()
        .describe('User IDs to add to the group'),
      remove_members: z
        .array(z.number().int().positive())
        .optional()
        .describe('User IDs to remove from the group'),
    },
    async ({ group_id, ...params }) => {
      try {
        const result = await authClient.updateUserGroup(group_id, params);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('updating user group', error);
      }
    }
  );

  server.tool(
    'clickup_delete_user_group',
    '⚠️ DESTRUCTIVE: Delete a User Group. The users themselves are not affected.',
    {
      group_id: idSchema().describe('The ID of the User Group to delete'),
    },
    async ({ group_id }) => {
      try {
        await authClient.deleteUserGroup(group_id);
        return { content: [{ type: 'text', text: `User Group ${group_id} deleted.` }] };
      } catch (error: unknown) {
        return mcpError('deleting user group', error);
      }
    }
  );

  // ========================================
  // GUESTS (Enterprise plan only)
  // ========================================

  const guestPermissionShape = {
    can_edit_tags: z.boolean().optional().describe('Allow the guest to edit tags'),
    can_see_time_spent: z.boolean().optional().describe('Allow the guest to see time spent'),
    can_see_time_estimated: z
      .boolean()
      .optional()
      .describe('Allow the guest to see time estimates'),
    can_create_views: z.boolean().optional().describe('Allow the guest to create views'),
    can_see_points_estimated: z
      .boolean()
      .optional()
      .describe('Allow the guest to see sprint points'),
    custom_role_id: z
      .number()
      .int()
      .optional()
      .describe('Custom role to give the guest (see clickup_get_custom_roles)'),
  };

  server.tool(
    'clickup_invite_guest',
    'Invite a guest to a workspace by email (Enterprise plan only). The guest then needs access to specific items: use clickup_add_guest_to_item.',
    {
      workspace_id: idSchema().describe('The ID of the workspace'),
      email: z.string().email().describe("The guest's email address"),
      ...guestPermissionShape,
    },
    async ({ workspace_id, ...params }) => {
      try {
        const result = await authClient.inviteGuest(workspace_id, params);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('inviting guest', error);
      }
    }
  );

  server.tool(
    'clickup_get_guest',
    'Get a guest of a workspace, including what has been shared with them (Enterprise plan only).',
    {
      workspace_id: idSchema().describe('The ID of the workspace'),
      guest_id: idSchema().describe("The guest's user ID"),
    },
    async ({ workspace_id, guest_id }) => {
      try {
        const result = await authClient.getGuest(workspace_id, guest_id);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('getting guest', error);
      }
    }
  );

  server.tool(
    'clickup_edit_guest',
    "Change a workspace guest's permissions (Enterprise plan only). Only the fields you pass are changed.",
    {
      workspace_id: idSchema().describe('The ID of the workspace'),
      guest_id: idSchema().describe("The guest's user ID"),
      ...guestPermissionShape,
    },
    async ({ workspace_id, guest_id, ...params }) => {
      try {
        if (Object.values(params).every(value => value === undefined)) {
          throw new Error('Provide at least one permission to change');
        }
        const result = await authClient.editGuest(workspace_id, guest_id, params);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('editing guest', error);
      }
    }
  );

  server.tool(
    'clickup_remove_guest',
    '⚠️ DESTRUCTIVE: Remove a guest from a workspace, revoking all of their access (Enterprise plan only).',
    {
      workspace_id: idSchema().describe('The ID of the workspace'),
      guest_id: idSchema().describe("The guest's user ID"),
    },
    async ({ workspace_id, guest_id }) => {
      try {
        const result = await authClient.removeGuest(workspace_id, guest_id);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('removing guest', error);
      }
    }
  );

  const guestItemShape = {
    item_type: z
      .enum(['task', 'list', 'folder'])
      .describe('What kind of item to share: task, list or folder'),
    item_id: idSchema().describe('The ID of the task, List or Folder'),
    guest_id: idSchema().describe("The guest's user ID"),
    include_shared: z
      .boolean()
      .optional()
      .describe(
        'Set false to leave the details of items shared with the guest out of the response'
      ),
    custom_task_ids: z
      .boolean()
      .optional()
      .describe('Task items only: item_id is a custom task ID (also requires team_id)'),
    team_id: idSchema().optional().describe('Workspace ID — required when custom_task_ids is true'),
  };

  server.tool(
    'clickup_add_guest_to_item',
    'Share a task, List or Folder with a workspace guest at a given permission level (Enterprise plan only).',
    {
      ...guestItemShape,
      permission_level: z
        .enum(['read', 'comment', 'edit', 'create'])
        .describe('read = view only, comment, edit, or create = full access'),
    },
    async ({ item_type, item_id, guest_id, permission_level, ...options }) => {
      try {
        const result = await authClient.addGuestToItem(
          item_type,
          item_id,
          guest_id,
          permission_level,
          options
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('adding guest to item', error);
      }
    }
  );

  server.tool(
    'clickup_remove_guest_from_item',
    'Stop sharing a task, List or Folder with a workspace guest (Enterprise plan only). The guest stays in the workspace.',
    guestItemShape,
    async ({ item_type, item_id, guest_id, ...options }) => {
      try {
        const result = await authClient.removeGuestFromItem(item_type, item_id, guest_id, options);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: unknown) {
        return mcpError('removing guest from item', error);
      }
    }
  );
}
