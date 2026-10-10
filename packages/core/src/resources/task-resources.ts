/* eslint-disable max-len */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient } from '../clickup-client/tasks.js';
import { resourceError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);

export function setupTaskResources(server: McpServer): void {
  // Register task details resource
  server.resource(
    'task-details',
    new ResourceTemplate('clickup://task/{task_id}', { list: undefined }),
    {
      description:
        'Get detailed information about a specific ClickUp task, including its name, description, assignees, status, and dates.',
    },
    async (uri, params) => {
      try {
        const task_id = params.task_id as string;
        console.error('[TaskResources] Fetching task:', task_id);
        const task = await tasksClient.getTask(task_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(task),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching task', error);
      }
    }
  );
}
