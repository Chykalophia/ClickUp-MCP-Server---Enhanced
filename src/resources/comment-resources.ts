import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createCommentsClient } from '../clickup-client/comments.js';

// Create clients
const clickUpClient = createClickUpClient();
const commentsClient = createCommentsClient(clickUpClient);

export function setupCommentResources(server: McpServer): void {
  // Register task comments resource
  server.resource(
    'task-comments',
    new ResourceTemplate('clickup://task/{task_id}/comments', { list: undefined }),
    {
      description: 'Get comments for a ClickUp task, including text content, author information, and timestamps.'
    },
    async (uri, params) => {
      try {
        const task_id = params.task_id as string;
        console.log('[CommentResources] Fetching comments for task:', task_id);
        const comments = await commentsClient.getTaskComments(task_id);
        console.log('[CommentResources] Got comments:', comments);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[CommentResources] Error fetching task comments:', error);
        throw new Error(`Error fetching task comments: ${error.message}`);
      }
    }
  );

  // Register chat view comments resource
  server.resource(
    'chat-view-comments',
    new ResourceTemplate('clickup://view/{view_id}/comments', { list: undefined }),
    {
      description: 'Get comments from a ClickUp chat view, with support for pagination and threaded discussions.'
    },
    async (uri, params) => {
      try {
        const view_id = params.view_id as string;
        console.log('[CommentResources] Fetching comments for chat view:', view_id);
        const comments = await commentsClient.getChatViewComments(view_id);
        console.log('[CommentResources] Got comments:', comments);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[CommentResources] Error fetching chat view comments:', error);
        throw new Error(`Error fetching chat view comments: ${error.message}`);
      }
    }
  );

  // Register list comments resource
  server.resource(
    'list-comments',
    new ResourceTemplate('clickup://list/{list_id}/comments', { list: undefined }),
    {
      description: 'Get comments for a ClickUp list, including text content, author information, and timestamps.'
    },
    async (uri, params) => {
      try {
        const list_id = params.list_id as string;
        console.log('[CommentResources] Fetching comments for list:', list_id);
        const comments = await commentsClient.getListComments(list_id);
        console.log('[CommentResources] Got comments:', comments);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[CommentResources] Error fetching list comments:', error);
        throw new Error(`Error fetching list comments: ${error.message}`);
      }
    }
  );

  // Register threaded comments resource
  server.resource(
    'threaded-comments',
    new ResourceTemplate('clickup://comment/{comment_id}/reply', { list: undefined }),
    {
      description: 'Get threaded replies to a specific comment, supporting nested discussions and pagination.'
    },
    async (uri, params) => {
      try {
        const comment_id = params.comment_id as string;
        console.log('[CommentResources] Fetching threaded comments for comment:', comment_id);
        const comments = await commentsClient.getThreadedComments(comment_id);
        console.log('[CommentResources] Got comments:', comments);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[CommentResources] Error fetching threaded comments:', error);
        throw new Error(`Error fetching threaded comments: ${error.message}`);
      }
    }
  );

  // Add some example static resources for discoverability
  server.resource(
    'example-task-comments',
    'clickup://task/868czp2t3/comments',
    {
      description: 'An example task comments resource demonstrating the comment data format.'
    },
    async (uri) => {
      try {
        const task_id = '868czp2t3';
        console.log('[CommentResources] Fetching comments for example task:', task_id);
        const comments = await commentsClient.getTaskComments(task_id);
        console.log('[CommentResources] Got comments:', comments);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[CommentResources] Error fetching example task comments:', error);
        throw new Error(`Error fetching example task comments: ${error.message}`);
      }
    }
  );

  server.resource(
    'example-list-comments',
    'clickup://list/901109776097/comments',
    {
      description: 'An example list comments resource demonstrating the comment data format.'
    },
    async (uri) => {
      try {
        const list_id = '901109776097';
        console.log('[CommentResources] Fetching comments for example list:', list_id);
        const comments = await commentsClient.getListComments(list_id);
        console.log('[CommentResources] Got comments:', comments);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('[CommentResources] Error fetching example list comments:', error);
        throw new Error(`Error fetching example list comments: ${error.message}`);
      }
    }
  );
}
