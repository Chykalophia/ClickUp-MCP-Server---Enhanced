/* eslint-disable no-console, max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import {
  CommentsEnhancedClient,
  CreateTaskCommentParams,
  CreateChatViewCommentParams,
  CreateListCommentParams,
  UpdateCommentParams,
  CreateThreadedCommentParams,
} from '../clickup-client/comments-enhanced.js';
import { processCommentBlocks } from '../utils/clickup-comment-formatter.js';
import { mcpError } from '../utils/error-handling.js';
import { idSchema } from '../schemas/common.js';

// Create clients
const clickUpClient = createClickUpClient();
const commentsClient = new CommentsEnhancedClient(clickUpClient);

/**
 * Shared zod schema for ClickUp's structured comment block array.
 * Supports plain/formatted text, @mentions (tag blocks), and emoticons.
 */
const commentBlocksSchema = z
  .array(
    z
      .object({
        text: z
          .string()
          .optional()
          .describe(
            'The text content of this block. Optional for tag/emoticon blocks that reference a user/emoji by id.'
          ),
        type: z
          .string()
          .optional()
          .describe(
            'Block type. Use "tag" for @mentions, "emoticon" for emoji blocks. Omit for plain/formatted text blocks.'
          ),
        user: z
          .object({
            id: z.number().int().positive().describe('Numeric ClickUp user ID being mentioned'),
          })
          .passthrough()
          .optional()
          .describe(
            'User reference for tag (mention) blocks. Canonical, fully-supported shape per ClickUp API: {"type":"tag","user":{"id":<userId>}}. This form reliably triggers native @mention notifications.'
          ),
        emoticon: z
          .object({
            code: z.string().describe('Emoticon code, e.g. "1f600"'),
          })
          .passthrough()
          .optional()
          .describe('Emoticon reference for emoticon blocks.'),
        attributes: z
          .object({
            bold: z.boolean().optional().describe('Whether text is bold'),
            italic: z.boolean().optional().describe('Whether text is italic'),
            underline: z.boolean().optional().describe('Whether text is underlined'),
            strikethrough: z.boolean().optional().describe('Whether text is strikethrough'),
            code: z.boolean().optional().describe('Whether text is code'),
            color: z.string().optional().describe('Text color'),
            background_color: z.string().optional().describe('Background color'),
            link: z
              .union([
                z.string().describe('Link URL'),
                z.object({ url: z.string().describe('Link URL') }),
              ])
              .optional()
              .describe(
                'Link URL. ClickUp documents this as a plain string ("link": "https://..."); the legacy {url} object form is accepted and converted.'
              ),
            'code-block': z
              .object({
                'code-block': z
                  .string()
                  .describe(
                    'Programming language for syntax highlighting (e.g., "javascript", "python", "bash", "plain")'
                  ),
              })
              .optional()
              .describe('Code block attributes for multi-line code with syntax highlighting'),
          })
          .passthrough()
          .optional()
          .describe('Text formatting attributes'),
      })
      .passthrough()
  )
  .min(1);

/**
 * Shape comment read results for an LLM client.
 *
 * ClickUp returns every comment body twice (the `comment` block array and the
 * flattened `comment_text`), the client adds a third copy as
 * `comment_markdown`, and this tool used to add a fourth: an ANSI-coloured,
 * box-drawn `styled_preview` that serialised as `\u001b[...m` noise. A 1 KB
 * comment cost 4-6 KB of tokens. The default now returns the identifying
 * fields plus ONE body (`comment_markdown`); the raw block array and
 * `comment_text` are returned only when include_raw is set.
 */
export function slimCommentsResponse(
  result: { comments?: unknown[] } | null | undefined,
  includeRaw = false
): { comments: Record<string, unknown>[] } {
  const comments = Array.isArray(result?.comments) ? result.comments : [];
  return { comments: comments.map(comment => slimComment(comment, includeRaw)) };
}

const slimUser = (user: unknown): Record<string, unknown> | undefined => {
  if (!user || typeof user !== 'object') return undefined;
  const { id, username, email } = user as Record<string, unknown>;
  return { id, username, email };
};

function slimComment(comment: unknown, includeRaw: boolean): Record<string, unknown> {
  const source = (comment ?? {}) as Record<string, unknown>;
  const slim: Record<string, unknown> = {
    id: source.id,
    user: slimUser(source.user),
    date: source.date,
    comment_markdown: source.comment_markdown ?? source.comment_text ?? '',
  };
  if (source.resolved !== undefined) slim.resolved = source.resolved;
  if (source.assignee) slim.assignee = slimUser(source.assignee);
  if (source.reply_count !== undefined) slim.reply_count = source.reply_count;
  if (source.parent !== undefined) slim.parent = source.parent;
  if (includeRaw) {
    slim.comment = source.comment;
    slim.comment_text = source.comment_text;
  }
  return slim;
}

const includeRawSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    'Also return ClickUp\'s raw rich-text block array ("comment") and its flattened "comment_text". Off by default: comment_markdown already carries the full formatted body.'
  );

export interface CommentToolsOptions {
  /**
   * Register `clickup_create_task_comment_raw_test`. It bypasses MCP processing
   * to isolate an API-level duplication issue and is a debugging aid, not a
   * product tool — off unless CLICKUP_DEBUG_TOOLS is set.
   */
  includeDebugTools?: boolean;
}

export function setupCommentTools(server: McpServer, options: CommentToolsOptions = {}): void {
  if (options.includeDebugTools) {
    server.tool(
      'clickup_create_task_comment_raw_test',
      'RAW API TEST: Create a comment bypassing ALL MCP processing to isolate duplication issue. Returns raw ClickUp API response.',
      {
        task_id: idSchema().describe('The ID of the task to comment on'),
        comment_text: z.string().describe('The text content of the comment'),
      },
      async ({ task_id, comment_text }) => {
        try {
          const result = await commentsClient.createTaskCommentRaw(task_id, comment_text);
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (error: unknown) {
          return mcpError('in raw API test', error);
        }
      }
    );
  }

  // Register get_task_comments tool
  server.tool(
    'clickup_get_task_comments',
    "Get comments for a ClickUp task. Each comment returns id, user (id/username/email), date (Unix ms), resolved, reply_count and the body as markdown (comment_markdown). Set include_raw for ClickUp's raw rich-text blocks. Returns the newest 25 comments; page older ones with start + start_id taken from the oldest comment returned.",
    {
      task_id: idSchema().describe('The ID of the task to get comments for'),
      start: z
        .number()
        .optional()
        .describe(
          'Pagination: the date (Unix timestamp in milliseconds) of the oldest comment from the previous page'
        ),
      start_id: idSchema()
        .optional()
        .describe('Pagination: the id of the oldest comment from the previous page'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true to reference the task by its custom task ID (e.g. "PROJ-123")'),
      team_id: idSchema()
        .optional()
        .describe('The Workspace ID. Required when custom_task_ids is true'),
      include_raw: includeRawSchema,
    },
    async ({ task_id, include_raw, ...params }) => {
      try {
        if (params.custom_task_ids && params.team_id === undefined) {
          throw new Error('team_id is required when custom_task_ids is true');
        }
        const result = await commentsClient.getTaskComments(task_id, params);
        return {
          content: [
            { type: 'text', text: JSON.stringify(slimCommentsResponse(result, include_raw)) },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting task comments', error);
      }
    }
  );

  // Register create_task_comment tool
  server.tool(
    'clickup_create_task_comment',
    'Create a new comment on a ClickUp task. Supports GitHub Flavored Markdown in comment text, including inline @mentions written as @[Name](userId); structured comment blocks are an alternative for callers that already have them. Provide either comment_text or comment. Supports optional assignee and notification settings.',
    {
      task_id: idSchema().describe('The ID of the task to comment on'),
      comment_text: z
        .string()
        .optional()
        .describe(
          'The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.). To @mention someone inline, write @[Display Name](userId) with a numeric ClickUp user ID — e.g. "over to @[Jane](81344)". Mentions and Markdown work together; there is no need to drop to plain text or to hand-build blocks to mention someone. Required unless comment blocks are provided.'
        ),
      comment: commentBlocksSchema
        .optional()
        .describe(
          'Array of comment blocks (alternative to comment_text). Plain/formatted text uses {text, attributes}. @mentions use {type:"tag", user:{id}} (canonical, recommended — reliably triggers native mention notifications) or {type:"tag", text:"@Full Name"} (UI fallback shape; notification behavior may be less reliable). Unknown keys pass through to the ClickUp API. Takes precedence over comment_text when provided.'
        ),
      assignee: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('The ID of the user to assign to the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true to reference the task by its custom task ID (e.g. "PROJ-123")'),
      team_id: idSchema()
        .optional()
        .describe('The Workspace ID. Required when custom_task_ids is true'),
    },
    async ({ task_id, comment, custom_task_ids, team_id, ...commentParams }) => {
      try {
        if (!comment?.length && !commentParams.comment_text) {
          throw new Error(
            'Provide comment_text (plain GitHub Flavored Markdown) or comment (structured blocks)'
          );
        }
        const params: CreateTaskCommentParams = {
          ...commentParams,
          custom_task_ids,
          team_id,
          // Blocks win over text, matching clickup_create_chat_view_comment.
          ...(comment?.length
            ? { comment: processCommentBlocks(comment), comment_text: undefined }
            : {}),
        };
        const result = await commentsClient.createTaskComment(task_id, params);

        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('creating task comment', error);
      }
    }
  );

  // Register get_chat_view_comments tool
  server.tool(
    'clickup_get_chat_view_comments',
    'Get comments for a ClickUp chat view. Each comment returns id, user, date (Unix ms) and the body as markdown (comment_markdown); set include_raw for the raw rich-text blocks. Paginate with start + start_id from the oldest comment returned.',
    {
      view_id: idSchema().describe('The ID of the chat view to get comments for'),
      start: z
        .number()
        .optional()
        .describe(
          'Pagination: the date (Unix timestamp in milliseconds) of the oldest comment from the previous page'
        ),
      start_id: idSchema()
        .optional()
        .describe('Pagination: the id of the oldest comment from the previous page'),
      include_raw: includeRawSchema,
    },
    async ({ view_id, include_raw, ...params }) => {
      try {
        const result = await commentsClient.getChatViewComments(view_id, params);
        return {
          content: [
            { type: 'text', text: JSON.stringify(slimCommentsResponse(result, include_raw)) },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting chat view comments', error);
      }
    }
  );

  // Register create_chat_view_comment tool
  server.tool(
    'clickup_create_chat_view_comment',
    'Create a new comment in a ClickUp chat view. Supports notification settings. Supports GitHub Flavored Markdown in comment text, including inline @mentions written as @[Name](userId); structured comment blocks are an alternative for callers that already have them. Provide either comment_text or comment.',
    {
      view_id: idSchema().describe('The ID of the chat view to comment on'),
      comment_text: z
        .string()
        .optional()
        .describe(
          'The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.). To @mention someone inline, write @[Display Name](userId) with a numeric ClickUp user ID — e.g. "over to @[Jane](81344)". Mentions and Markdown work together; there is no need to drop to plain text or to hand-build blocks to mention someone. Required unless comment blocks are provided.'
        ),
      comment: commentBlocksSchema
        .optional()
        .describe(
          'Structured comment blocks (alternative to comment_text). @mentions use {type:"tag", user:{id}}. Takes precedence over comment_text when provided.'
        ),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees'),
    },
    async ({ view_id, comment, ...commentParams }) => {
      try {
        if (!comment?.length && !commentParams.comment_text) {
          throw new Error('Provide comment_text or comment blocks');
        }
        const params: CreateChatViewCommentParams = {
          ...commentParams,
          ...(comment?.length
            ? { comment: processCommentBlocks(comment), comment_text: undefined }
            : {}),
        };
        const result = await commentsClient.createChatViewComment(view_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('creating chat view comment', error);
      }
    }
  );

  // Register get_list_comments tool
  server.tool(
    'clickup_get_list_comments',
    'Get comments for a ClickUp list. Each comment returns id, user, date (Unix ms) and the body as markdown (comment_markdown); set include_raw for the raw rich-text blocks. Paginate with start + start_id from the oldest comment returned.',
    {
      list_id: idSchema().describe('The ID of the list to get comments for'),
      start: z
        .number()
        .optional()
        .describe(
          'Pagination: the date (Unix timestamp in milliseconds) of the oldest comment from the previous page'
        ),
      start_id: idSchema()
        .optional()
        .describe('Pagination: the id of the oldest comment from the previous page'),
      include_raw: includeRawSchema,
    },
    async ({ list_id, include_raw, ...params }) => {
      try {
        const result = await commentsClient.getListComments(list_id, params);
        return {
          content: [
            { type: 'text', text: JSON.stringify(slimCommentsResponse(result, include_raw)) },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting list comments', error);
      }
    }
  );

  // Register create_list_comment tool
  server.tool(
    'clickup_create_list_comment',
    'Create a new comment on a ClickUp list. Supports optional assignee and notification settings. Supports GitHub Flavored Markdown in comment text, including inline @mentions written as @[Name](userId); structured comment blocks are an alternative for callers that already have them. Provide either comment_text or comment.',
    {
      list_id: idSchema().describe('The ID of the list to comment on'),
      comment_text: z
        .string()
        .optional()
        .describe(
          'The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.). To @mention someone inline, write @[Display Name](userId) with a numeric ClickUp user ID — e.g. "over to @[Jane](81344)". Mentions and Markdown work together; there is no need to drop to plain text or to hand-build blocks to mention someone. Required unless comment blocks are provided.'
        ),
      comment: commentBlocksSchema
        .optional()
        .describe(
          'Structured comment blocks (alternative to comment_text). @mentions use {type:"tag", user:{id}}. Takes precedence over comment_text when provided.'
        ),
      assignee: z.number().optional().describe('The ID of the user to assign to the comment'),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees'),
    },
    async ({ list_id, comment, ...commentParams }) => {
      try {
        if (!comment?.length && !commentParams.comment_text) {
          throw new Error('Provide comment_text or comment blocks');
        }
        const params: CreateListCommentParams = {
          ...commentParams,
          ...(comment?.length
            ? { comment: processCommentBlocks(comment), comment_text: undefined }
            : {}),
        };
        const result = await commentsClient.createListComment(list_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('creating list comment', error);
      }
    }
  );

  // Register update_comment tool
  server.tool(
    'clickup_update_comment',
    "Update an existing ClickUp comment's properties including text, assignee, and resolved status. Supports GitHub Flavored Markdown in comment text, including inline @mentions written as @[Name](userId); structured comment blocks are an alternative for callers that already have them. Omit comment_text/comment for resolve-only or assign-only updates that leave the comment body untouched.",
    {
      comment_id: idSchema().describe('The ID of the comment to update'),
      comment_text: z
        .string()
        .optional()
        .describe(
          'The new text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.). To @mention someone inline, write @[Display Name](userId) with a numeric ClickUp user ID — e.g. "over to @[Jane](81344)". Mentions and Markdown work together. Omit to leave the comment body unchanged.'
        ),
      comment: commentBlocksSchema
        .optional()
        .describe(
          'Structured comment blocks (alternative to comment_text). @mentions use {type:"tag", user:{id}}. Takes precedence over comment_text when provided.'
        ),
      assignee: z.number().optional().describe('The ID of the user to assign to the comment'),
      resolved: z.boolean().optional().describe('Whether the comment is resolved'),
    },
    async ({ comment_id, comment, ...commentParams }) => {
      try {
        // Resolve-only / assign-only updates are valid without a new body,
        // but reject calls that update nothing at all.
        if (
          !comment?.length &&
          commentParams.comment_text === undefined &&
          commentParams.assignee === undefined &&
          commentParams.resolved === undefined
        ) {
          throw new Error('Provide at least one of comment_text, comment, assignee, or resolved');
        }
        const params: UpdateCommentParams = {
          ...commentParams,
          // Structured blocks take precedence: drop comment_text so the
          // client does not prefer it over the supplied blocks.
          ...(comment?.length
            ? { comment: processCommentBlocks(comment), comment_text: undefined }
            : {}),
        };
        const result = await commentsClient.updateComment(comment_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('updating comment', error);
      }
    }
  );

  // Register delete_comment tool
  server.tool(
    'clickup_delete_comment',
    'Delete a comment from ClickUp.',
    {
      comment_id: idSchema().describe('The ID of the comment to delete'),
    },
    async ({ comment_id }) => {
      try {
        const result = await commentsClient.deleteComment(comment_id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('deleting comment', error);
      }
    }
  );

  // Register get_threaded_comments tool
  server.tool(
    'clickup_get_threaded_comments',
    'Get threaded comments (replies) for a parent comment. Each reply returns id, user, date (Unix ms) and the body as markdown (comment_markdown); set include_raw for the raw rich-text blocks.',
    {
      comment_id: idSchema().describe('The ID of the parent comment'),
      start: z
        .number()
        .optional()
        .describe(
          'Pagination: the date (Unix timestamp in milliseconds) of the oldest reply from the previous page'
        ),
      start_id: idSchema()
        .optional()
        .describe('Pagination: the id of the oldest reply from the previous page'),
      include_raw: includeRawSchema,
    },
    async ({ comment_id, include_raw, ...params }) => {
      try {
        const result = await commentsClient.getThreadedComments(comment_id, params);
        return {
          content: [
            { type: 'text', text: JSON.stringify(slimCommentsResponse(result, include_raw)) },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting threaded comments', error);
      }
    }
  );

  // Register create_threaded_comment tool
  server.tool(
    'clickup_create_threaded_comment',
    'Create a new threaded comment (reply) to a parent comment. Supports notification settings. Supports GitHub Flavored Markdown in comment text, including inline @mentions written as @[Name](userId); structured comment blocks are an alternative for callers that already have them. Provide either comment_text or comment.',
    {
      comment_id: idSchema().describe('The ID of the parent comment'),
      comment_text: z
        .string()
        .optional()
        .describe(
          'The text content of the comment (supports GitHub Flavored Markdown including headers, bold, italic, code blocks, links, lists, etc.). To @mention someone inline, write @[Display Name](userId) with a numeric ClickUp user ID — e.g. "over to @[Jane](81344)". Mentions and Markdown work together; there is no need to drop to plain text or to hand-build blocks to mention someone. Required unless comment blocks are provided.'
        ),
      comment: commentBlocksSchema
        .optional()
        .describe(
          'Structured comment blocks (alternative to comment_text). @mentions use {type:"tag", user:{id}}. Takes precedence over comment_text when provided.'
        ),
      notify_all: z.boolean().optional().describe('Whether to notify all assignees'),
    },
    async ({ comment_id, comment, ...commentParams }) => {
      try {
        if (!comment?.length && !commentParams.comment_text) {
          throw new Error('Provide comment_text or comment blocks');
        }
        const params: CreateThreadedCommentParams = {
          ...commentParams,
          ...(comment?.length
            ? { comment: processCommentBlocks(comment), comment_text: undefined }
            : {}),
        };
        const result = await commentsClient.createThreadedComment(comment_id, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error: unknown) {
        return mcpError('creating threaded comment', error);
      }
    }
  );
}
