/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import {
  createChecklistsClient,
  CreateChecklistParams,
  UpdateChecklistParams,
  CreateChecklistItemParams,
  UpdateChecklistItemParams,
} from '../clickup-client/checklists.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const checklistsClient = createChecklistsClient(clickUpClient);

export function setupChecklistTools(server: McpServer): void {
  // Register create_checklist tool
  server.tool(
    'clickup_create_checklist',
    'Create a new checklist in a ClickUp task. Returns the created checklist details.',
    {
      task_id: z.string().describe('The ID of the task to create the checklist in'),
      name: z.string().describe('The name of the checklist'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set true when task_id is a custom task ID (also requires team_id)'),
      team_id: z
        .string()
        .optional()
        .describe('Workspace (team) ID — required when custom_task_ids is true'),
    },
    async ({ task_id, name, custom_task_ids, team_id }) => {
      try {
        const checklist = await checklistsClient.createChecklist(
          task_id,
          { name } as CreateChecklistParams,
          { custom_task_ids, team_id }
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(checklist, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('creating checklist', error);
      }
    }
  );

  // Register update_checklist tool
  server.tool(
    'clickup_update_checklist',
    "Update an existing ClickUp checklist's name and/or position (order of appearance on the task; 0 = top). The ClickUp API returns an empty response for this operation; use get_task to see the updated state.",
    {
      checklist_id: z.string().describe('The ID of the checklist to update'),
      name: z.string().optional().describe('The new name of the checklist'),
      position: z
        .number()
        .optional()
        .describe('The order of appearance of the checklist on the task (0 = top)'),
    },
    async ({ checklist_id, name, position }) => {
      try {
        if (name === undefined && position === undefined) {
          return mcpError(
            'updating checklist',
            new Error('At least one of name or position must be provided')
          );
        }

        const checklistParams: UpdateChecklistParams = {};
        if (name !== undefined) checklistParams.name = name;
        if (position !== undefined) checklistParams.position = position;

        await checklistsClient.updateChecklist(checklist_id, checklistParams);

        return {
          content: [
            {
              type: 'text',
              text: `Checklist ${checklist_id} updated successfully. (ClickUp returns no body for this operation; use get_task to see the updated state.)`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating checklist', error);
      }
    }
  );

  // Register delete_checklist tool
  server.tool(
    'clickup_delete_checklist',
    'Delete a checklist from a ClickUp task. Removes the checklist and all its items.',
    {
      checklist_id: z.string().describe('The ID of the checklist to delete'),
    },
    async ({ checklist_id }) => {
      try {
        await checklistsClient.deleteChecklist(checklist_id);

        return {
          content: [
            {
              type: 'text',
              text: `Checklist ${checklist_id} deleted successfully.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting checklist', error);
      }
    }
  );

  // Register create_checklist_item tool
  server.tool(
    'clickup_create_checklist_item',
    'Create a new item in a ClickUp checklist. Supports optional assignee and resolved status (resolved is applied via a follow-up update, since the create endpoint does not accept it). Returns the full parent checklist including all items.',
    {
      checklist_id: z.string().describe('The ID of the checklist to create the item in'),
      name: z.string().describe('The name of the checklist item'),
      assignee: z
        .number()
        .optional()
        .describe('The ID of the user to assign to the checklist item'),
      resolved: z.boolean().optional().describe('Whether the checklist item is resolved'),
    },
    async ({ checklist_id, name, assignee, resolved }) => {
      try {
        const itemParams: CreateChecklistItemParams = { name };
        if (assignee !== undefined) itemParams.assignee = assignee;

        let checklist = await checklistsClient.createChecklistItem(checklist_id, itemParams);

        // The Create Checklist Item endpoint does not accept 'resolved', so
        // honor resolved=true with a follow-up update of the new item. The
        // response contains the full checklist; the created item is the
        // matching-name item with the highest orderindex (appended last).
        if (resolved === true) {
          const createdItem = (checklist.items ?? [])
            .filter(item => item.name === name)
            .sort((a, b) => a.orderindex - b.orderindex)
            .pop();
          if (createdItem) {
            checklist = await checklistsClient.updateChecklistItem(checklist_id, createdItem.id, {
              resolved: true,
            });
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(checklist, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('creating checklist item', error);
      }
    }
  );

  // Register update_checklist_item tool
  server.tool(
    'clickup_update_checklist_item',
    "Update an existing ClickUp checklist item's properties including name, assignee (null to unassign), resolved status, and parent (nest under another item, or null to un-nest). Returns the full parent checklist including all items.",
    {
      checklist_id: z.string().describe('The ID of the checklist containing the item'),
      checklist_item_id: z.string().describe('The ID of the checklist item to update'),
      name: z.string().optional().describe('The new name of the checklist item'),
      assignee: z
        .union([z.number(), z.string(), z.null()])
        .optional()
        .describe('The ID of the user to assign to the checklist item, or null to unassign'),
      resolved: z.boolean().optional().describe('Whether the checklist item is resolved'),
      parent: z
        .string()
        .nullable()
        .optional()
        .describe(
          'The ID of another checklist item to nest this item under, or null to un-nest'
        ),
    },
    async ({ checklist_id, checklist_item_id, name, assignee, resolved, parent }) => {
      try {
        const itemParams: UpdateChecklistItemParams = {};
        if (name !== undefined) itemParams.name = name;
        if (assignee !== undefined) itemParams.assignee = assignee;
        if (resolved !== undefined) itemParams.resolved = resolved;
        if (parent !== undefined) itemParams.parent = parent;

        const checklist = await checklistsClient.updateChecklistItem(
          checklist_id,
          checklist_item_id,
          itemParams
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(checklist, null, 2) }],
        };
      } catch (error: unknown) {
        return mcpError('updating checklist item', error);
      }
    }
  );

  // Register delete_checklist_item tool
  server.tool(
    'clickup_delete_checklist_item',
    'Delete an item from a ClickUp checklist.',
    {
      checklist_id: z.string().describe('The ID of the checklist containing the item'),
      checklist_item_id: z.string().describe('The ID of the checklist item to delete'),
    },
    async ({ checklist_id, checklist_item_id }) => {
      try {
        await checklistsClient.deleteChecklistItem(checklist_id, checklist_item_id);

        return {
          content: [
            {
              type: 'text',
              text: `Checklist item ${checklist_item_id} deleted successfully from checklist ${checklist_id}.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting checklist item', error);
      }
    }
  );
}
