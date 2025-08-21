import { ClickUpClient } from './index.js';
import { prepareContentForClickUp, processClickUpResponse } from '../utils/markdown.js';

export interface Comment {
  id: string;
  comment: string[];
  comment_text: string;
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

export class CommentsClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get comments for a specific task
   * @param taskId The ID of the task to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content
   */
  async getTaskComments(taskId: string, params?: GetTaskCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/task/${taskId}/comment`, params);
    
    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processClickUpResponse(comment));
    }
    
    return result;
  }

  /**
   * Create a new comment on a task
   * @param taskId The ID of the task to comment on
   * @param params The comment parameters (supports markdown in comment_text)
   * @returns The created comment with processed content
   */
  async createTaskComment(taskId: string, params: CreateTaskCommentParams): Promise<Comment> {
    // Process comment text for markdown support
    const processedParams = { ...params };
    if (params.comment_text) {
      const contentData = prepareContentForClickUp(params.comment_text);
      // For comments, ClickUp expects comment_text field with HTML
      processedParams.comment_text = contentData.description;
    }
    
    const result = await this.client.post(`/task/${taskId}/comment`, processedParams);
    return processClickUpResponse(result);
  }

  /**
   * Get comments for a chat view
   * @param viewId The ID of the chat view to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content
   */
  async getChatViewComments(viewId: string, params?: GetChatViewCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/view/${viewId}/comment`, params);
    
    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processClickUpResponse(comment));
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
    // Process comment text for markdown support
    const processedParams = { ...params };
    if (params.comment_text) {
      const contentData = prepareContentForClickUp(params.comment_text);
      processedParams.comment_text = contentData.description;
    }
    
    const result = await this.client.post(`/view/${viewId}/comment`, processedParams);
    return processClickUpResponse(result);
  }

  /**
   * Get comments for a list
   * @param listId The ID of the list to get comments for
   * @param params Optional parameters for pagination
   * @returns A list of comments with processed content
   */
  async getListComments(listId: string, params?: GetListCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/list/${listId}/comment`, params);
    
    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processClickUpResponse(comment));
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
    // Process comment text for markdown support
    const processedParams = { ...params };
    if (params.comment_text) {
      const contentData = prepareContentForClickUp(params.comment_text);
      processedParams.comment_text = contentData.description;
    }
    
    const result = await this.client.post(`/list/${listId}/comment`, processedParams);
    return processClickUpResponse(result);
  }

  /**
   * Update an existing comment
   * @param commentId The ID of the comment to update
   * @param params The comment parameters to update (supports markdown in comment_text)
   * @returns The updated comment with processed content
   */
  async updateComment(commentId: string, params: UpdateCommentParams): Promise<Comment> {
    // Process comment text for markdown support
    const processedParams = { ...params };
    if (params.comment_text) {
      const contentData = prepareContentForClickUp(params.comment_text);
      processedParams.comment_text = contentData.description;
    }
    
    const result = await this.client.put(`/comment/${commentId}`, processedParams);
    return processClickUpResponse(result);
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
   * @returns A list of threaded comments with processed content
   */
  async getThreadedComments(commentId: string, params?: GetThreadedCommentsParams): Promise<{ comments: Comment[] }> {
    const result = await this.client.get(`/comment/${commentId}/reply`, params);
    
    // Process each comment's content
    if (result.comments && Array.isArray(result.comments)) {
      result.comments = result.comments.map((comment: any) => processClickUpResponse(comment));
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
    // Process comment text for markdown support
    const processedParams = { ...params };
    if (params.comment_text) {
      const contentData = prepareContentForClickUp(params.comment_text);
      processedParams.comment_text = contentData.description;
    }
    
    const result = await this.client.post(`/comment/${commentId}/reply`, processedParams);
    return processClickUpResponse(result);
  }
}

export const createCommentsClient = (client: ClickUpClient): CommentsClient => {
  return new CommentsClient(client);
};
