import { ClickUpClient } from './index.js';
// import { processClickUpResponse } from '../utils/markdown.js';
import { prepareCommentForClickUp, clickUpCommentToMarkdown, ClickUpCommentBlock /* cleanClickUpCommentResponse */ } from '../utils/clickup-comment-formatter.js';

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
}

export interface CreateTaskCommentParams {
  comment_text: string;
  assignee?: number;
  notify_all?: boolean;
}

export interface GetChatViewCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateChatViewCommentParams {
  comment_text: string;
  notify_all?: boolean;
}

export interface GetListCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateListCommentParams {
  comment_text: string;
  assignee?: number;
  notify_all?: boolean;
}

export interface UpdateCommentParams {
  comment_text: string;
  assignee?: number;
  resolved?: boolean;
}

export interface GetThreadedCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateThreadedCommentParams {
  comment_text: string;
  notify_all?: boolean;
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
  async getTaskComments(taskId: string, params?: GetTaskCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/task/${taskId}/comment`, params);
    
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
    
    console.log('=== RAW API TEST ===');
    console.log('URL:', `/task/${taskId}/comment`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('===================');
    
    // Send raw request without any processing
    const result = await this.client.post(`/task/${taskId}/comment`, payload);
    
    console.log('=== RAW API RESPONSE ===');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('========================');
    
    // Return raw response without any processing
    return result;
  }

  async createTaskComment(taskId: string, params: CreateTaskCommentParams): Promise<Comment> {
    // Convert comment_text to structured array format
    const structuredComment = prepareCommentForClickUp(params.comment_text);
    
    const payload = {
      notify_all: params.notify_all || false,
      assignee: params.assignee,
      ...structuredComment // This adds the 'comment' array, NOT comment_text
    };
    
    // DEBUG: Log exactly what we're sending to ClickUp API
    console.log('=== DEBUG: Sending to ClickUp API ===');
    console.log('URL:', `/task/${taskId}/comment`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('=====================================');
    
    const result = await this.client.post(`/task/${taskId}/comment`, payload);
    
    // DEBUG: Log what ClickUp returns
    console.log('=== DEBUG: ClickUp API Response ===');
    console.log('Raw Response:', JSON.stringify(result, null, 2));
    console.log('===================================');
    
    return processCommentResponse(result);
  }

  /**
   * Get comments for a chat view
   * @param viewId The ID of the chat view to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content and markdown representation
   */
  async getChatViewComments(viewId: string, params?: GetChatViewCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/view/${viewId}/comment`, params);
    
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
  async createChatViewComment(viewId: string, params: CreateChatViewCommentParams): Promise<Comment> {
    // Convert comment_text to structured array format
    const structuredComment = prepareCommentForClickUp(params.comment_text);
    
    const payload = {
      notify_all: params.notify_all || false,
      ...structuredComment // This adds the 'comment' array, NOT comment_text
    };
    
    const result = await this.client.post(`/view/${viewId}/comment`, payload);
    return processCommentResponse(result);
  }

  /**
   * Get comments for a list
   * @param listId The ID of the list to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content and markdown representation
   */
  async getListComments(listId: string, params?: GetListCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/list/${listId}/comment`, params);
    
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
  async createListComment(listId: string, params: CreateListCommentParams): Promise<Comment> {
    // Convert comment_text to structured array format
    const structuredComment = prepareCommentForClickUp(params.comment_text);
    
    const payload = {
      notify_all: params.notify_all || false,
      assignee: params.assignee,
      ...structuredComment // This adds the 'comment' array, NOT comment_text
    };
    
    const result = await this.client.post(`/list/${listId}/comment`, payload);
    return processCommentResponse(result);
  }

  /**
   * Update an existing comment
   * @param commentId The ID of the comment to update
   * @param params The comment parameters to update (supports markdown in comment_text)
   * @returns The updated comment with processed content
   */
  async updateComment(commentId: string, params: UpdateCommentParams): Promise<Comment> {
    // Convert comment_text to structured array format
    const structuredComment = prepareCommentForClickUp(params.comment_text);
    
    const payload = {
      assignee: params.assignee,
      resolved: params.resolved,
      ...structuredComment // This adds the 'comment' array, NOT comment_text
    };
    
    const result = await this.client.put(`/comment/${commentId}`, payload);
    return processCommentResponse(result);
  }

  /**
   * Delete a comment
   * @param commentId The ID of the comment to delete
   * @returns Success message
   */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/comment/${commentId}`);
  }

  /**
   * Get threaded comments for a parent comment
   * @param commentId The ID of the parent comment
   * @param params Optional parameters for pagination
   * @returns A list of threaded comments with processed content and markdown representation
   */
  async getThreadedComments(commentId: string, params?: GetThreadedCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/comment/${commentId}/reply`, params);
    
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
  async createThreadedComment(commentId: string, params: CreateThreadedCommentParams): Promise<Comment> {
    // Convert comment_text to structured array format
    const structuredComment = prepareCommentForClickUp(params.comment_text);
    
    const payload = {
      notify_all: params.notify_all || false,
      ...structuredComment // This adds the 'comment' array, NOT comment_text
    };
    
    const result = await this.client.post(`/comment/${commentId}/reply`, payload);
    return processCommentResponse(result);
  }
}

export const createCommentsEnhancedClient = (client: ClickUpClient): CommentsEnhancedClient => {
  return new CommentsEnhancedClient(client);
};
