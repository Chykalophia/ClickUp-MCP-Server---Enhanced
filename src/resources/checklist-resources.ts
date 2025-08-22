import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient } from '../clickup-client/tasks.js';
import { /* createChecklistsClient, */ Checklist } from '../clickup-client/checklists.js';

// Create clients
const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);
// const checklistsClient = createChecklistsClient(clickUpClient);

export function setupChecklistResources(server: McpServer): void {
  // Register task checklists resource
  server.resource(
    'task-checklists',
    new ResourceTemplate('clickup://task/{task_id}/checklist', { list: undefined }),
    {
      description: 'Get all checklists for a specific ClickUp task, including their names, items, and completion status.'
    },
    async (uri, params) => {
      try {
        const task_id = params.task_id as string;
        
        // Get the task details
        const task = await tasksClient.getTask(task_id);
        
        // Note: The ClickUp API doesn't return checklists directly with task data
        // We would need to make a separate call to get checklists for a task
        // This would need to be implemented in the checklistsClient if API supports it
        
        // For now, return an empty array with proper typing
        const checklists: Checklist[] = [];
        
        // In a real implementation, we might do something like:
        // const checklists = await checklistsClient.getChecklistsForTask(task_id);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({
                task_id,
                task_name: task.name,
                checklists
              }, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[ChecklistResources] Error fetching checklists:', error);
        throw new Error(`Error fetching checklists: ${error.message}`);
      }
    }
  );

  // Register checklist items resource
  server.resource(
    'checklist-items',
    new ResourceTemplate('clickup://checklist/{checklist_id}/items', { list: undefined }),
    {
      description: 'Get all items in a specific ClickUp checklist, including their names, assignees, and completion status.'
    },
    async (uri, params) => {
      try {
        const checklist_id = params.checklist_id as string;
        
        // For now, this is a placeholder as we'd need to implement a method
        // to get all items for a checklist - we'll need to implement this endpoint
        // or extract this data from the checklist details
        
        // Placeholder for response format
        const checklistItems = {
          checklist_id,
          items: []
        };
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(checklistItems, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[ChecklistResources] Error fetching checklist items:', error);
        throw new Error(`Error fetching checklist items: ${error.message}`);
      }
    }
  );

  // Add some example static resources for discoverability
  server.resource(
    'example-task-checklists',
    'clickup://task/86rkjvttt/checklist',
    {
      description: 'An example task checklists resource demonstrating the checklist data format.'
    },
    async (uri) => {
      try {
        const task_id = '86rkjvttt';
        
        // Get the task details
        const task = await tasksClient.getTask(task_id);
        
        // Placeholder for checklists
        const checklists: Checklist[] = [];
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({
                task_id,
                task_name: task.name,
                checklists
              }, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[ChecklistResources] Error fetching example checklists:', error);
        throw new Error(`Error fetching example checklists: ${error.message}`);
      }
    }
  );
}
