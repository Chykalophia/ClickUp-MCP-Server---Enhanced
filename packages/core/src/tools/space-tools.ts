/* eslint-disable no-console */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createSpacesClient } from '../clickup-client/spaces.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const spacesClient = createSpacesClient(clickUpClient);

// Shared features schema for create/update space tools
const spaceFeaturesSchema = z
  .object({
    due_dates: z
      .object({
        enabled: z.boolean().optional(),
        start_date: z.boolean().optional(),
        remap_due_dates: z.boolean().optional(),
        remap_closed_due_date: z.boolean().optional(),
      })
      .optional(),
    time_tracking: z.object({ enabled: z.boolean().optional() }).optional(),
    tags: z.object({ enabled: z.boolean().optional() }).optional(),
    time_estimates: z.object({ enabled: z.boolean().optional() }).optional(),
    checklists: z.object({ enabled: z.boolean().optional() }).optional(),
    custom_fields: z.object({ enabled: z.boolean().optional() }).optional(),
    remap_dependencies: z.object({ enabled: z.boolean().optional() }).optional(),
    dependency_warning: z.object({ enabled: z.boolean().optional() }).optional(),
    portfolios: z.object({ enabled: z.boolean().optional() }).optional(),
  })
  .optional()
  .describe(
    'Features to enable for the space (due_dates, time_tracking, tags, time_estimates, checklists, custom_fields, remap_dependencies, dependency_warning, portfolios)'
  );

export function setupSpaceTools(server: McpServer): void {
  // Register get_spaces tool
  server.tool(
    'clickup_get_spaces',
    'Get spaces from a ClickUp workspace. Returns space details including name, settings, and features.',
    {
      workspace_id: z.string().describe('The ID of the workspace to get spaces from'),
      archived: z
        .boolean()
        .optional()
        .describe('Whether to include archived spaces (default false)'),
    },
    async ({ workspace_id, archived }) => {
      try {
        console.error(`[SpaceTools] Getting spaces for workspace ${workspace_id}...`);
        const spaces = await spacesClient.getSpacesFromWorkspace(
          workspace_id,
          archived !== undefined ? { archived } : undefined
        );
        console.error(`[SpaceTools] Got ${spaces.length} spaces`);

        return {
          content: [{ type: 'text', text: JSON.stringify(spaces, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('getting spaces', error);
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
          content: [{ type: 'text', text: JSON.stringify(space, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('getting space', error);
      }
    }
  );

  // Register create_space tool
  server.tool(
    'clickup_create_space',
    'Create a new space in a ClickUp workspace. Optionally configure multiple assignees and features (due dates, time tracking, tags, time estimates, checklists, custom fields).',
    {
      workspace_id: z.string().describe('The ID of the workspace to create the space in'),
      name: z.string().describe('The name of the space'),
      multiple_assignees: z
        .boolean()
        .optional()
        .describe('Whether to enable multiple assignees for tasks in this space'),
      features: spaceFeaturesSchema,
    },
    async ({ workspace_id, name, multiple_assignees, features }) => {
      try {
        console.error(`[SpaceTools] Creating space "${name}" in workspace ${workspace_id}...`);
        const space = await spacesClient.createSpace(workspace_id, {
          name,
          ...(multiple_assignees !== undefined && { multiple_assignees }),
          ...(features !== undefined && { features }),
        });
        console.error(`[SpaceTools] Created space: ${space.id}`);

        return {
          content: [{ type: 'text', text: JSON.stringify(space, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('creating space', error);
      }
    }
  );

  // Register update_space tool
  server.tool(
    'clickup_update_space',
    "Update an existing ClickUp space's name, color, privacy, admin management, multiple assignees setting, or features.",
    {
      space_id: z.string().describe('The ID of the space to update'),
      name: z.string().optional().describe('The new name of the space'),
      color: z.string().optional().describe('The new hex color code of the space (e.g. #7B68EE)'),
      private: z.boolean().optional().describe('Whether the space should be private'),
      admin_can_manage: z
        .boolean()
        .optional()
        .describe('Whether admins can manage the space'),
      multiple_assignees: z
        .boolean()
        .optional()
        .describe('Whether to enable multiple assignees for tasks in this space'),
      features: spaceFeaturesSchema,
    },
    async ({ space_id, name, color, private: isPrivate, admin_can_manage, multiple_assignees, features }) => {
      try {
        console.error(`[SpaceTools] Updating space ${space_id}...`);
        const space = await spacesClient.updateSpace(space_id, {
          ...(name !== undefined && { name }),
          ...(color !== undefined && { color }),
          ...(isPrivate !== undefined && { private: isPrivate }),
          ...(admin_can_manage !== undefined && { admin_can_manage }),
          ...(multiple_assignees !== undefined && { multiple_assignees }),
          ...(features !== undefined && { features }),
        });
        console.error(`[SpaceTools] Updated space: ${space.name}`);

        return {
          content: [{ type: 'text', text: JSON.stringify(space, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('updating space', error);
      }
    }
  );

  // Register delete_space tool
  server.tool(
    'clickup_delete_space',
    '⚠️ DESTRUCTIVE: Delete a space from ClickUp. This action cannot be undone and will permanently remove the space and ALL of its contents, including folders, lists, and tasks.',
    {
      space_id: z.string().describe('The ID of the space to delete'),
      confirm_deletion: z
        .boolean()
        .describe('Confirmation that you want to permanently delete this space (must be true)'),
    },
    async ({ space_id, confirm_deletion }) => {
      try {
        if (!confirm_deletion) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Space deletion cancelled. You must set confirm_deletion to true to proceed with this destructive operation.',
              },
            ],
            isError: true,
          };
        }

        console.error(`[SpaceTools] Deleting space ${space_id}...`);
        await spacesClient.deleteSpace(space_id);

        return {
          content: [
            {
              type: 'text',
              text:
                `✅ Space ${space_id} has been permanently deleted.\n\n` +
                '⚠️ This action cannot be undone. The space and all its folders, lists, and tasks have been removed from ClickUp.',
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting space', error);
      }
    }
  );

  // Register get_space_tags tool
  server.tool(
    'clickup_get_space_tags',
    'Get the task tags defined in a ClickUp space. Returns tag names and foreground/background colors.',
    { space_id: z.string().describe('The ID of the space to get tags from') },
    async ({ space_id }) => {
      try {
        console.error(`[SpaceTools] Getting tags for space ${space_id}...`);
        const tags = await spacesClient.getSpaceTags(space_id);
        console.error(`[SpaceTools] Got ${tags.length} tags`);

        return {
          content: [{ type: 'text', text: JSON.stringify(tags, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('getting space tags', error);
      }
    }
  );

  // Register create_space_tag tool
  server.tool(
    'clickup_create_space_tag',
    'Create a new task tag in a ClickUp space with an optional foreground and background color.',
    {
      space_id: z.string().describe('The ID of the space to create the tag in'),
      name: z.string().describe('The name of the tag'),
      tag_fg: z.string().optional().describe('The foreground (text) hex color of the tag (e.g. #FFFFFF)'),
      tag_bg: z.string().optional().describe('The background hex color of the tag (e.g. #7B68EE)'),
    },
    async ({ space_id, name, tag_fg, tag_bg }) => {
      try {
        console.error(`[SpaceTools] Creating tag "${name}" in space ${space_id}...`);
        await spacesClient.createSpaceTag(space_id, {
          name,
          ...(tag_fg !== undefined && { tag_fg }),
          ...(tag_bg !== undefined && { tag_bg }),
        });

        return {
          content: [{ type: 'text', text: `✅ Tag "${name}" created in space ${space_id}.` }],
        };
      } catch (error: unknown) {
        return mcpError('creating space tag', error);
      }
    }
  );

  // Register edit_space_tag tool
  server.tool(
    'clickup_edit_space_tag',
    "Edit an existing task tag in a ClickUp space. Update the tag's name and/or colors.",
    {
      space_id: z.string().describe('The ID of the space containing the tag'),
      tag_name: z.string().describe('The current name of the tag to edit'),
      new_name: z.string().optional().describe('The new name of the tag'),
      tag_fg: z.string().optional().describe('The new foreground (text) hex color of the tag'),
      tag_bg: z.string().optional().describe('The new background hex color of the tag'),
    },
    async ({ space_id, tag_name, new_name, tag_fg, tag_bg }) => {
      try {
        console.error(`[SpaceTools] Editing tag "${tag_name}" in space ${space_id}...`);
        await spacesClient.editSpaceTag(space_id, tag_name, {
          name: new_name ?? tag_name,
          ...(tag_fg !== undefined && { tag_fg }),
          ...(tag_bg !== undefined && { tag_bg }),
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ Tag "${tag_name}" updated in space ${space_id}.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('editing space tag', error);
      }
    }
  );

  // Register delete_space_tag tool
  server.tool(
    'clickup_delete_space_tag',
    '⚠️ DESTRUCTIVE: Delete a task tag from a ClickUp space. The tag is removed from the space and from all tasks that use it.',
    {
      space_id: z.string().describe('The ID of the space containing the tag'),
      tag_name: z.string().describe('The name of the tag to delete'),
    },
    async ({ space_id, tag_name }) => {
      try {
        console.error(`[SpaceTools] Deleting tag "${tag_name}" from space ${space_id}...`);
        await spacesClient.deleteSpaceTag(space_id, tag_name);

        return {
          content: [
            { type: 'text', text: `✅ Tag "${tag_name}" deleted from space ${space_id}.` },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting space tag', error);
      }
    }
  );
}
