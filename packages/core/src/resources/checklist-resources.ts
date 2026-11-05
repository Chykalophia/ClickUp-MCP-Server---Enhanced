/* eslint-disable max-len */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient } from '../clickup-client/tasks.js';
import { Checklist } from '../clickup-client/checklists.js';
import { resourceError } from '../utils/error-handling.js';

const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);

export function setupChecklistResources(server: McpServer): void {
  server.resource(
    'task-checklists',
    new ResourceTemplate('clickup://task/{task_id}/checklist', { list: undefined }),
    {
      description:
        'Get all checklists for a specific ClickUp task, including their names, items, and completion status.',
    },
    async (uri, params) => {
      try {
        const task_id = params.task_id as string;

        const task = await tasksClient.getTask(task_id);

        // Get Task already embeds the task's checklists; ClickUp has no read endpoint for a
        // single checklist, so this is the only way to read them.
        const checklists: Checklist[] = (task as { checklists?: Checklist[] }).checklists ?? [];

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  task_id,
                  task_name: task.name,
                  checklists,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching checklists', error);
      }
    }
  );

}
