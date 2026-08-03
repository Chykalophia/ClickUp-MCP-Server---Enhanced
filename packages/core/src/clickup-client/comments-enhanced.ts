/* eslint-disable no-console, max-len */
import { ClickUpClient } from './index.js';
// import { processClickUpResponse } from '../utils/markdown.js';
import {
  prepareCommentForClickUp,
  clickUpCommentToMarkdown,
  ClickUpCommentBlock
} from '../utils/clickup-comment-formatter.js';

export interface Comment {
  id: string;
  comment: ClickUpCommentBlock[]; // ClickUp's structured comment format
  comment_text: string; // Plain text representation
  comment_markdown?: string; // Markdown version for display
  user: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  };
  resolved: boolean;
  assignee?: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  };
  assigned_by?: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  };
  reactions?: {
    [key: string]: {
      count: number;
      users: Array<{
        id: number;
        username: string;
        email: string;
      }>;
    };
  };
  date: string;
  start_date?: string;
  due_date?: string;
  parent?: string;
  replies_count?: number;
}

export interface GetTaskCommentsParams {
  start?: number;
  start_id?: string;
  custom_task_ids?: boolean; // Set true to reference the task by its custom task ID
  team_id?: number; // Workspace ID; required when custom_task_ids is true
}

export interface CreateTaskCommentParams {
  comment_text: string;
  assignee?: number;
  notify_all?: boolean;
  custom_task_ids?: boolean; // Set true to reference the task by its custom task ID
  team_id?: number; // Workspace ID; required when custom_task_ids is true
}

export interface GetChatViewCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateChatViewCommentParams {
  comment_text?: string;
  comment?: ClickUpCommentBlock[]; // Structured comment blocks (supports @mentions via tag blocks)
  notify_all?: boolean;
}

export interface GetListCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateListCommentParams {
  comment_text?: string;
  comment?: ClickUpCommentBlock[]; // Structured comment blocks (supports @mentions via tag blocks)
  assignee?: number;
  notify_all?: boolean;
}

export interface UpdateCommentParams {
  comment_text?: string; // Optional so resolve/assign-only updates leave the comment body untouched
  comment?: ClickUpCommentBlock[]; // Structured comment blocks (supports @mentions via tag blocks)
  assignee?: number;
  resolved?: boolean;
}

export interface GetThreadedCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateThreadedCommentParams {
  comment_text?: string;
  comment?: ClickUpCommentBlock[]; // Structured comment blocks (supports @mentions via tag blocks)
  notify_all?: boolean;
}

/**
 * Response returned by ClickUp's comment-creation endpoints.
 * Create responses do NOT include the full Comment object.
 */
export interface CreateCommentResponse {
  id: string;
  hist_id: string;
  date: number;
}

/**
 * Process comment response to add markdown representation
 * SIMPLIFIED VERSION to avoid duplication issues
 */
function processCommentResponse(comment: any): Comment {
  // Skip the cleanClickUpCommentResponse and processClickUpResponse chain
  // that was causing duplication - just return the comment as-is with minimal processing

  const processed = { ...comment };

  // Only add markdown conversion if we have structured comment data
  if (processed.comment && Array.isArray(processed.comment)) {
    try {
      processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
    } catch (error) {
      console.warn('Failed to convert ClickUp comment to markdown:', error);
      // Fallback to comment_text if available
      processed.comment_markdown = processed.comment_text || '';
    }
  }

  return processed;
}

/**
 * Build the structured comment body for a create/update request.
 * Prefers a caller-supplied comment block array (needed for @mentions);
 * otherwise converts comment_text (markdown) into ClickUp's comment array.
 * Sends ONLY the 'comment' array - no comment_text - to avoid duplication.
 */
function buildCommentBody(params: {
  comment_text?: string;
  comment?: ClickUpCommentBlock[];
}): { comment: ClickUpCommentBlock[] } {
  if (params.comment && params.comment.length > 0) {
    return { comment: params.comment };
  }
  if (params.comment_text) {
    return prepareCommentForClickUp(params.comment_text);
  }
  throw new Error('Either comment_text or a structured comment array is required');
}

/**
 * Build the query string for task-comment endpoints that support
 * custom task IDs (custom_task_ids + team_id).
 */
function buildTaskQueryString(params?: { custom_task_ids?: boolean; team_id?: number }): string {
  const query = new URLSearchParams();
  if (params?.custom_task_ids) {
    query.set('custom_task_ids', 'true');
  }
  if (params?.team_id !== undefined) {
    query.set('team_id', String(params.team_id));
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Prepare comment parameters for ClickUp API using structured comment format
 * This uses ClickUp's structured comment array format for proper markdown rendering
 */
/*
function prepareCommentParams(params: any): any {
  if (params.comment_text) {
    // Use the structured comment format instead of plain comment_text
    const structuredComment = prepareCommentForClickUp(params.comment_text);
    
    return {
      notify_all: params.notify_all || false,
      assignee: params.assignee,
      resolved: params.resolved,
      ...structuredComment // This includes the 'comment' array
    };
  }
  
  return params;
}
*/

export class CommentsEnhancedClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get comments for a specific task
   * @param taskId The ID of the task to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content and markdown representation
   */
  async getTaskComments(
    taskId: string,
    params?: GetTaskCommentsParams
  ): Promise<{ comments: Comment[] }> {
    const result = await this.client.get<{ comments: any[] }>(`/task/${taskId}/comment`, params);

    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processCommentResponse(comment));
    }

    return result;
  }

  /**
   * Create a new comment on a task
   * @param taskId The ID of the task to comment on
   * @param params The comment parameters (supports markdown in comment_text)
   * @returns The created comment with processed content
   */
  /**
   * RAW API TEST - Bypass all processing and send exactly like ClickUp's official example
   */
  async createTaskCommentRaw(taskId: string, commentText: string): Promise<any> {
    // Exact match to ClickUp's official Node.js example
    const payload = {
      notify_all: false,
      comment_text: commentText
    };

    // Send raw request without any processing
    const result = await this.client.post(`/task/${taskId}/comment`, payload);

    // Return raw response without any processing
    return result;
  }

  async createTaskComment(
    taskId: string,
    params: CreateTaskCommentParams
  ): Promise<CreateCommentResponse> {
    // Convert comment_text to structured array format
    const structuredComment = prepareCommentForClickUp(params.comment_text);

    const payload = {
      notify_all: params.notify_all || false,
      assignee: params.assignee,
      ...structuredComment // This adds the 'comment' array, NOT comment_text
    };

    // Create responses only contain { id, hist_id, date } - no comment array to post-process
    return this.client.post<CreateCommentResponse>(
      `/task/${taskId}/comment${buildTaskQueryString(params)}`,
      payload
    );
  }

  /**
   * Get comments for a chat view
   * @param viewId The ID of the chat view to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content and markdown representation
   */
  async getChatViewComments(
    viewId: string,
    params?: GetChatViewCommentsParams
  ): Promise<{ comments: Comment[] }> {
    const result = await this.client.get<{ comments: any[] }>(`/view/${viewId}/comment`, params);

    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processCommentResponse(comment));
    }

    return result;
  }

  /**
   * Create a new comment on a chat view
   * @param viewId The ID of the chat view to comment on
   * @param params The comment parameters (supports markdown in comment_text)
   * @returns The created comment with processed content
   */
  async createChatViewComment(
    viewId: string,
    params: CreateChatViewCommentParams
  ): Promise<CreateCommentResponse> {
    const payload = {
      notify_all: params.notify_all || false,
      ...buildCommentBody(params) // This adds the 'comment' array, NOT comment_text
    };

    // Create responses only contain { id, hist_id, date } - no comment array to post-process
    return this.client.post<CreateCommentResponse>(`/view/${viewId}/comment`, payload);
  }

  /**
   * Get comments for a list
   * @param listId The ID of the list to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content and markdown representation
   */
  async getListComments(
    listId: string,
    params?: GetListCommentsParams
  ): Promise<{ comments: Comment[] }> {
    const result = await this.client.get<{ comments: any[] }>(`/list/${listId}/comment`, params);

    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processCommentResponse(comment));
    }

    return result;
  }

  /**
   * Create a new comment on a list
   * @param listId The ID of the list to comment on
   * @param params The comment parameters (supports markdown in comment_text)
   * @returns The created comment with processed content
   */
  async createListComment(
    listId: string,
    params: CreateListCommentParams
  ): Promise<CreateCommentResponse> {
    const payload = {
      notify_all: params.notify_all || false,
      assignee: params.assignee,
      ...buildCommentBody(params) // This adds the 'comment' array, NOT comment_text
    };

    // Create responses only contain { id, hist_id, date } - no comment array to post-process
    return this.client.post<CreateCommentResponse>(`/list/${listId}/comment`, payload);
  }

  /**
   * Update an existing comment
   * @param commentId The ID of the comment to update
   * @param params The comment parameters to update (supports markdown in comment_text)
   * @returns The updated comment with processed content
   */
  async updateComment(commentId: string, params: UpdateCommentParams): Promise<Comment> {
    const payload: Record<string, unknown> = {
      assignee: params.assignee,
      resolved: params.resolved
    };

    // Only send a new comment body when one was provided, so resolve/assign-only
    // updates leave the stored comment untouched
    if ((params.comment && params.comment.length > 0) || params.comment_text) {
      Object.assign(payload, buildCommentBody(params)); // Adds the 'comment' array, NOT comment_text
    }

    const result = await this.client.put(`/comment/${commentId}`, payload);
    return processCommentResponse(result);
  }

  /**
   * Delete a comment
   * @param commentId The ID of the comment to delete
   * @returns Success message
   */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    // ClickUp returns an empty object on success; synthesize success from the 2xx response
    await this.client.delete(`/comment/${commentId}`);
    return { success: true };
  }

  /**
   * Get threaded comments for a parent comment
   * @param commentId The ID of the parent comment
   * @param params Optional parameters for pagination
   * @returns A list of threaded comments with processed content and markdown representation
   */
  async getThreadedComments(
    commentId: string,
    params?: GetThreadedCommentsParams
  ): Promise<{ comments: Comment[] }> {
    const result = await this.client.get<{ comments: any[] }>(`/comment/${commentId}/reply`, params);

    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processCommentResponse(comment));
    }

    return result;
  }

  /**
   * Create a new threaded comment on a parent comment
   * @param commentId The ID of the parent comment
   * @param params The comment parameters (supports markdown in comment_text)
   * @returns The created threaded comment with processed content
   */
  async createThreadedComment(
    commentId: string,
    params: CreateThreadedCommentParams
  ): Promise<CreateCommentResponse> {
    const payload = {
      notify_all: params.notify_all || false,
      ...buildCommentBody(params) // This adds the 'comment' array, NOT comment_text
    };

    // Create responses only contain { id, hist_id, date } - no comment array to post-process
    return this.client.post<CreateCommentResponse>(`/comment/${commentId}/reply`, payload);
  }
}

export const createCommentsEnhancedClient = (client: ClickUpClient): CommentsEnhancedClient => {
  return new CommentsEnhancedClient(client);
};
