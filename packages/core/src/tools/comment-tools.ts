import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { 
  CommentsEnhancedClient, 
  // CreateTaskCommentParams, 
  CreateChatViewCommentParams,
  CreateListCommentParams,
  UpdateCommentParams,
  CreateThreadedCommentParams
} from '../clickup-client/comments-enhanced.js';
import { /* applyMarkdownStyling, */ createMarkdownPreview } from '../utils/markdown-styling.js';
import { processCommentBlocks } from '../utils/clickup-comment-formatter.js';

// Create clients
const clickUpClient = createClickUpClient();
const commentsClient = new CommentsEnhancedClient(clickUpClient);

/**
 * Format comment response with enhanced markdown styling
 */
function formatCommentResponse(result: any, title?: string): any {
  try {
    // Create a styled preview if we have markdown content
    if (result.comment_markdown) {
      const styledPreview = createMarkdownPreview(
        result.comment_markdown, 
        title || 'Comment Preview',
        { useColors: true, useEmojis: true }
      );
      
      // Add the styled preview to the response
      result.styled_preview = styledPreview;
    }
    
    // If we have multiple comments, style each one
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any, index: number) => {
        if (comment.comment_markdown) {
          comment.styled_preview = createMarkdownPreview(
            comment.comment_markdown,
            `Comment ${index + 1}`,
            { useColors: true, useEmojis: true }
          );
        }
        return comment;
      });
    }
    
    return result;
  } catch (error) {
    console.warn('Failed to apply markdown styling:', error);
    return result;
  }
}

export function setupCommentTools(server: McpServer): void {
  // Register raw API test tool for debugging
  server.tool(
    'clickup_create_task_comment_raw_test',
    'RAW API TEST: Create a comment bypassing ALL MCP processing to isolate duplication issue. Returns raw ClickUp API response.',
    {
      task_id: z.string().describe('The ID of the task to comment on'),
      comment_text: z.string().describe('The text content of the comment')
    },
    async ({ task_id, comment_text }) => {
      try {
        const result = await commentsClient.createTaskCommentRaw(task_id, comment_text);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error in raw API test:', error);
        return {
          content: [{ type: 'text', text: `Error in raw API test: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register get_task_comments tool
  server.tool(
    'clickup_get_task_comments',
    'Get comments for a ClickUp task. Returns comment details including text, author, and timestamps with enhanced markdown styling.',
    {
      task_id: z.string().describe('The ID of the task to get comments for'),
      start: z.number().optional().describe('Pagination start (timestamp)'),
      start_id: z.string().optional().describe('Pagination start ID')
    },
    async ({ task_id, ...params }) => {
      try {
        const result = await commentsClient.getTaskComments(task_id, params);
        const styledResult = formatCommentResponse(result, 'Task Comments');
        return {
          content: [{ type: 'text', text: JSON.stringify(styledResult, null, 2) }]
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
    'clickup_create_task_comment',
    'Create a new comment on a ClickUp task using structured array format. Supports optional assignee and notification settings.',
    {
      task_id: z.string().describe('The ID of the task to comment on'),
      comment: z.array(z.object({
        text: z.string().describe('The text content of this block'),
        attributes: z.object({
          bold: z.boolean().optional().describe('Whether text is bold'),
          italic: z.boolean().optional().describe('Whether text is italic'),
          underline: z.boolean().optional().describe('Whether text is underlined'),
          strikethrough: z.boolean().optional().describe('Whether text is strikethrough'),
          code: z.boolean().optional().describe('Whether text is code'),
          color: z.string().optional().describe('Text color'),
          background_color: z.string().optional().describe('Background color'),
          link: z.object({
            url: z.string().describe('Link URL')
          }).optional().describe('Link attributes'),
          'code-block': z.object({
            'code-block': z.string().describe('Programming language for syntax highlighting (e.g., "javascript", "python", "bash", "plain")')
          }).optional().describe('Code block attributes for multi-line code with syntax highlighting')
        }).optional().describe('Text formatting attributes')
      })).describe('Array of comment blocks with text and formatting'),
      assignee: z.number().optional().describe('The ID of the user to assign to the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees')
    },
    async ({ task_id, comment, ...commentParams }) => {
      try {
        // Process comment blocks to ensure proper code block separation
        const processedComment = processCommentBlocks(comment);
        
        // Create payload with processed structured comment array
        const payload = {
          notify_all: commentParams.notify_all || false,
          assignee: commentParams.assignee,
          comment: processedComment
        };
        
        // DEBUG: Log exactly what we're sending to ClickUp API
        console.log('=== DEBUG: Sending to ClickUp API ===');
        console.log('URL:', `/task/${task_id}/comment`);
        console.log('Original comment blocks:', JSON.stringify(comment, null, 2));
        console.log('Processed comment blocks:', JSON.stringify(processedComment, null, 2));
        console.log('Full payload:', JSON.stringify(payload, null, 2));
        console.log('=====================================');
        
        const result = await clickUpClient.post(`/task/${task_id}/comment`, payload);
        
        // DEBUG: Log what ClickUp returns
        console.log('=== DEBUG: ClickUp API Response ===');
        console.log('Raw Response:', JSON.stringify(result, null, 2));
        console.log('===================================');
        
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
    'clickup_get_chat_view_comments',
    'Get comments for a ClickUp chat view. Returns comment details with pagination support.',
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
    'clickup_create_chat_view_comment',
    'Create a new comment in a ClickUp chat view. Supports notification settings. Supports GitHub Flavored Markdown in comment text.',
    {
      view_id: z.string().describe('The ID of the chat view to comment on'),
      comment_text: z.string().describe('The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'),
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
    'clickup_get_list_comments',
    'Get comments for a ClickUp list. Returns comment details with pagination support.',
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
    'clickup_create_list_comment',
    'Create a new comment on a ClickUp list. Supports optional assignee and notification settings. Supports GitHub Flavored Markdown in comment text.',
    {
      list_id: z.string().describe('The ID of the list to comment on'),
      comment_text: z.string().describe('The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'),
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
    'clickup_update_comment',
    'Update an existing ClickUp comment\'s properties including text, assignee, and resolved status. Supports GitHub Flavored Markdown in comment text.',
    {
      comment_id: z.string().describe('The ID of the comment to update'),
      comment_text: z.string().describe('The new text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'),
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
    'clickup_delete_comment',
    'Delete a comment from ClickUp.',
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
    'clickup_get_threaded_comments',
    'Get threaded comments (replies) for a parent comment. Returns comment details with pagination support.',
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
    'clickup_create_threaded_comment',
    'Create a new threaded comment (reply) to a parent comment. Supports notification settings. Supports GitHub Flavored Markdown in comment text.',
    {
      comment_id: z.string().describe('The ID of the parent comment'),
      comment_text: z.string().describe('The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.)'),
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
