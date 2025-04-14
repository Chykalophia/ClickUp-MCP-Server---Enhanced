import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient } from '../clickup-client/tasks.js';

// Create clients
const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);

export function setupTaskResources(server: McpServer): void {
  // Register task details resource
  server.resource(
    'task-details',
    new ResourceTemplate('clickup://task/{task_id}', { list: undefined }),
    {
      description: 'Get detailed information about a specific ClickUp task, including its name, description, assignees, status, and dates.'
    },
    async (uri, params) => {
      try {
        const task_id = params.task_id as string;
        console.log('[TaskResources] Fetching task:', task_id);
        const task = await tasksClient.getTask(task_id);
        console.log('[TaskResources] Got task:', task);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[TaskResources] Error fetching task:', error);
        throw new Error(`Error fetching task: ${error.message}`);
      }
    }
  );

  // Add some example static resources for discoverability
  server.resource(
    'example-task',
    'clickup://task/86rkjvttt',
    {
      description: 'An example task resource demonstrating the task details format.'
    },
    async (uri) => {
      try {
        const task_id = '86rkjvttt';
        console.log('[TaskResources] Fetching example task:', task_id);
        const task = await tasksClient.getTask(task_id);
        console.log('[TaskResources] Got task:', task);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[TaskResources] Error fetching example task:', error);
        throw new Error(`Error fetching example task: ${error.message}`);
      }
    }
  );
}
