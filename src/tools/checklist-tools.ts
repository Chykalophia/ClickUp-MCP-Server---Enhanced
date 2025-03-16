import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createChecklistsClient, CreateChecklistParams, UpdateChecklistParams, CreateChecklistItemParams, UpdateChecklistItemParams } from '../clickup-client/checklists.js';

// Create clients
const clickUpClient = createClickUpClient();
const checklistsClient = createChecklistsClient(clickUpClient);

export function setupChecklistTools(server: McpServer): void {
  // Register create_checklist tool
  server.tool(
    'create_checklist',
    {
      task_id: z.string().describe('The ID of the task to create the checklist in'),
      name: z.string().describe('The name of the checklist')
    },
    async ({ task_id, name }) => {
      try {
        const checklist = await checklistsClient.createChecklist(task_id, { name } as CreateChecklistParams);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(checklist, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating checklist:', error);
        return {
          content: [{ type: 'text', text: `Error creating checklist: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register update_checklist tool
  server.tool(
    'update_checklist',
    {
      checklist_id: z.string().describe('The ID of the checklist to update'),
      name: z.string().describe('The new name of the checklist')
    },
    async ({ checklist_id, name }) => {
      try {
        const checklist = await checklistsClient.updateChecklist(checklist_id, { name });
        
        return {
          content: [{ type: 'text', text: JSON.stringify(checklist, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error updating checklist:', error);
        return {
          content: [{ type: 'text', text: `Error updating checklist: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register delete_checklist tool
  server.tool(
    'delete_checklist',
    {
      checklist_id: z.string().describe('The ID of the checklist to delete')
    },
    async ({ checklist_id }) => {
      try {
        const result = await checklistsClient.deleteChecklist(checklist_id);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error deleting checklist:', error);
        return {
          content: [{ type: 'text', text: `Error deleting checklist: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register create_checklist_item tool
  server.tool(
    'create_checklist_item',
    {
      checklist_id: z.string().describe('The ID of the checklist to create the item in'),
      name: z.string().describe('The name of the checklist item'),
      assignee: z.number().optional().describe('The ID of the user to assign to the checklist item'),
      resolved: z.boolean().optional().describe('Whether the checklist item is resolved')
    },
    async ({ checklist_id, name, assignee, resolved }) => {
      try {
        const itemParams: CreateChecklistItemParams = { name };
        if (assignee !== undefined) itemParams.assignee = assignee;
        if (resolved !== undefined) itemParams.resolved = resolved;
        
        const checklistItem = await checklistsClient.createChecklistItem(checklist_id, itemParams);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(checklistItem, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating checklist item:', error);
        return {
          content: [{ type: 'text', text: `Error creating checklist item: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register update_checklist_item tool
  server.tool(
    'update_checklist_item',
    {
      checklist_id: z.string().describe('The ID of the checklist containing the item'),
      checklist_item_id: z.string().describe('The ID of the checklist item to update'),
      name: z.string().optional().describe('The new name of the checklist item'),
      assignee: z.number().optional().describe('The ID of the user to assign to the checklist item'),
      resolved: z.boolean().optional().describe('Whether the checklist item is resolved')
    },
    async ({ checklist_id, checklist_item_id, name, assignee, resolved }) => {
      try {
        const itemParams: UpdateChecklistItemParams = {};
        if (name !== undefined) itemParams.name = name;
        if (assignee !== undefined) itemParams.assignee = assignee;
        if (resolved !== undefined) itemParams.resolved = resolved;
        
        const checklistItem = await checklistsClient.updateChecklistItem(checklist_id, checklist_item_id, itemParams);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(checklistItem, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error updating checklist item:', error);
        return {
          content: [{ type: 'text', text: `Error updating checklist item: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register delete_checklist_item tool
  server.tool(
    'delete_checklist_item',
    {
      checklist_id: z.string().describe('The ID of the checklist containing the item'),
      checklist_item_id: z.string().describe('The ID of the checklist item to delete')
    },
    async ({ checklist_id, checklist_item_id }) => {
      try {
        const result = await checklistsClient.deleteChecklistItem(checklist_id, checklist_item_id);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error deleting checklist item:', error);
        return {
          content: [{ type: 'text', text: `Error deleting checklist item: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
