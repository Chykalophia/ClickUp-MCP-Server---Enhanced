import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createCommentsClient } from '../clickup-client/comments.js';
import { resourceError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const commentsClient = createCommentsClient(clickUpClient);

export function setupCommentResources(server: McpServer): void {
  // Register task comments resource
  server.resource(
    'task-comments',
    new ResourceTemplate('clickup://task/{task_id}/comments', { list: undefined }),
    {
      description:
        'Get comments for a ClickUp task, including text content, author information, and timestamps.',
    },
    async (uri, params) => {
      try {
        const task_id = params.task_id as string;
        console.error('[CommentResources] Fetching comments for task:', task_id);
        const comments = await commentsClient.getTaskComments(task_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching task comments', error);
      }
    }
  );

  // Register chat view comments resource
  server.resource(
    'chat-view-comments',
    new ResourceTemplate('clickup://view/{view_id}/comments', { list: undefined }),
    {
      description:
        'Get comments from a ClickUp chat view, with support for pagination and threaded discussions.',
    },
    async (uri, params) => {
      try {
        const view_id = params.view_id as string;
        console.error('[CommentResources] Fetching comments for chat view:', view_id);
        const comments = await commentsClient.getChatViewComments(view_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching chat view comments', error);
      }
    }
  );

  // Register list comments resource
  server.resource(
    'list-comments',
    new ResourceTemplate('clickup://list/{list_id}/comments', { list: undefined }),
    {
      description:
        'Get comments for a ClickUp list, including text content, author information, and timestamps.',
    },
    async (uri, params) => {
      try {
        const list_id = params.list_id as string;
        console.error('[CommentResources] Fetching comments for list:', list_id);
        const comments = await commentsClient.getListComments(list_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching list comments', error);
      }
    }
  );

  // Register threaded comments resource
  server.resource(
    'threaded-comments',
    new ResourceTemplate('clickup://comment/{comment_id}/reply', { list: undefined }),
    {
      description:
        'Get threaded replies to a specific comment, supporting nested discussions and pagination.',
    },
    async (uri, params) => {
      try {
        const comment_id = params.comment_id as string;
        console.error('[CommentResources] Fetching threaded comments for comment:', comment_id);
        const comments = await commentsClient.getThreadedComments(comment_id);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments),
            },
          ],
        };
      } catch (error: unknown) {
        resourceError('fetching threaded comments', error);
      }
    }
  );
}
