import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { 
  createCommentsClient, 
  CreateTaskCommentParams, 
  CreateChatViewCommentParams,
  CreateListCommentParams,
  UpdateCommentParams,
  CreateThreadedCommentParams
} from '../clickup-client/comments.js';

// Create clients
const clickUpClient = createClickUpClient();
const commentsClient = createCommentsClient(clickUpClient);

export function setupCommentTools(server: McpServer): void {
  // Register get_task_comments tool
  server.tool(
    'get_task_comments',
    {
      task_id: z.string().describe('The ID of the task to get comments for'),
      start: z.number().optional().describe('Pagination start (timestamp)'),
      start_id: z.string().optional().describe('Pagination start ID')
    },
    async ({ task_id, ...params }) => {
      try {
        const result = await commentsClient.getTaskComments(task_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting task comments:', error);
        return {
          content: [{ type: 'text', text: `Error getting task comments: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register create_task_comment tool
  server.tool(
    'create_task_comment',
    {
      task_id: z.string().describe('The ID of the task to comment on'),
      comment_text: z.string().describe('The text content of the comment'),
      assignee: z.number().optional().describe('The ID of the user to assign to the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees')
    },
    async ({ task_id, ...commentParams }) => {
      try {
        const result = await commentsClient.createTaskComment(task_id, commentParams as CreateTaskCommentParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating task comment:', error);
        return {
          content: [{ type: 'text', text: `Error creating task comment: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register get_chat_view_comments tool
  server.tool(
    'get_chat_view_comments',
    {
      view_id: z.string().describe('The ID of the chat view to get comments for'),
      start: z.number().optional().describe('Pagination start (timestamp)'),
      start_id: z.string().optional().describe('Pagination start ID')
    },
    async ({ view_id, ...params }) => {
      try {
        const result = await commentsClient.getChatViewComments(view_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting chat view comments:', error);
        return {
          content: [{ type: 'text', text: `Error getting chat view comments: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register create_chat_view_comment tool
  server.tool(
    'create_chat_view_comment',
    {
      view_id: z.string().describe('The ID of the chat view to comment on'),
      comment_text: z.string().describe('The text content of the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees')
    },
    async ({ view_id, ...commentParams }) => {
      try {
        const result = await commentsClient.createChatViewComment(view_id, commentParams as CreateChatViewCommentParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating chat view comment:', error);
        return {
          content: [{ type: 'text', text: `Error creating chat view comment: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register get_list_comments tool
  server.tool(
    'get_list_comments',
    {
      list_id: z.string().describe('The ID of the list to get comments for'),
      start: z.number().optional().describe('Pagination start (timestamp)'),
      start_id: z.string().optional().describe('Pagination start ID')
    },
    async ({ list_id, ...params }) => {
      try {
        const result = await commentsClient.getListComments(list_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting list comments:', error);
        return {
          content: [{ type: 'text', text: `Error getting list comments: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register create_list_comment tool
  server.tool(
    'create_list_comment',
    {
      list_id: z.string().describe('The ID of the list to comment on'),
      comment_text: z.string().describe('The text content of the comment'),
      assignee: z.number().optional().describe('The ID of the user to assign to the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees')
    },
    async ({ list_id, ...commentParams }) => {
      try {
        const result = await commentsClient.createListComment(list_id, commentParams as CreateListCommentParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating list comment:', error);
        return {
          content: [{ type: 'text', text: `Error creating list comment: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register update_comment tool
  server.tool(
    'update_comment',
    {
      comment_id: z.string().describe('The ID of the comment to update'),
      comment_text: z.string().describe('The new text content of the comment'),
      assignee: z.number().optional().describe('The ID of the user to assign to the comment'),
      resolved: z.boolean().optional().describe('Whether the comment is resolved')
    },
    async ({ comment_id, ...commentParams }) => {
      try {
        const result = await commentsClient.updateComment(comment_id, commentParams as UpdateCommentParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error updating comment:', error);
        return {
          content: [{ type: 'text', text: `Error updating comment: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register delete_comment tool
  server.tool(
    'delete_comment',
    {
      comment_id: z.string().describe('The ID of the comment to delete')
    },
    async ({ comment_id }) => {
      try {
        const result = await commentsClient.deleteComment(comment_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error deleting comment:', error);
        return {
          content: [{ type: 'text', text: `Error deleting comment: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register get_threaded_comments tool
  server.tool(
    'get_threaded_comments',
    {
      comment_id: z.string().describe('The ID of the parent comment'),
      start: z.number().optional().describe('Pagination start (timestamp)'),
      start_id: z.string().optional().describe('Pagination start ID')
    },
    async ({ comment_id, ...params }) => {
      try {
        const result = await commentsClient.getThreadedComments(comment_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting threaded comments:', error);
        return {
          content: [{ type: 'text', text: `Error getting threaded comments: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register create_threaded_comment tool
  server.tool(
    'create_threaded_comment',
    {
      comment_id: z.string().describe('The ID of the parent comment'),
      comment_text: z.string().describe('The text content of the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees')
    },
    async ({ comment_id, ...commentParams }) => {
      try {
        const result = await commentsClient.createThreadedComment(comment_id, commentParams as CreateThreadedCommentParams);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error creating threaded comment:', error);
        return {
          content: [{ type: 'text', text: `Error creating threaded comment: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
