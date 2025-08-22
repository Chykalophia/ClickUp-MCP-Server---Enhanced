import { ClickUpClient } from './index.js';
import { processClickUpResponse } from '../utils/markdown.js';
import { prepareCommentForClickUp, clickUpCommentToMarkdown, ClickUpCommentBlock } from '../utils/clickup-comment-formatter.js';

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
  comment_text?: string; // Make optional since we'll be using comment array
  assignee?: number;
  notify_all?: boolean;
}

export interface GetChatViewCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateChatViewCommentParams {
  comment_text?: string; // Make optional since we'll be using comment array
  notify_all?: boolean;
}

export interface GetListCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateListCommentParams {
  comment_text?: string; // Make optional since we'll be using comment array
  assignee?: number;
  notify_all?: boolean;
}

export interface UpdateCommentParams {
  comment_text?: string; // Make optional since we'll be using comment array
  assignee?: number;
  resolved?: boolean;
}

export interface GetThreadedCommentsParams {
  start?: number;
  start_id?: string;
}

export interface CreateThreadedCommentParams {
  comment_text?: string; // Make optional since we'll be using comment array
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
      result.comments = result.comments.map((comment: any) => {
        const processed = processClickUpResponse(comment);
        
        // Convert ClickUp comment format to markdown for display
        if (processed.comment && Array.isArray(processed.comment)) {
          try {
            processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
          } catch (error) {
            console.warn('Failed to convert ClickUp comment to markdown:', error);
          }
        }
        
        return processed;
      });
    }
    
    return result;
  }

  /**
   * Clean up ClickUp comment response by removing duplicate text blocks
   * ClickUp automatically appends original text as final block - we remove it
   */
  private cleanupCommentResponse(processed: any): any {
    if (processed.comment && Array.isArray(processed.comment) && processed.comment.length > 1) {
      const lastBlock = processed.comment[processed.comment.length - 1];
      
      // Check if the last block is a duplicate of the original markdown
      if (lastBlock && typeof lastBlock.text === 'string' && 
          (!lastBlock.attributes || Object.keys(lastBlock.attributes).length === 0)) {
        
        // If the last block contains markdown syntax, it's likely the duplicate
        const hasMarkdownSyntax = /[*_`#\[\]()>-]/.test(lastBlock.text) || 
                                  lastBlock.text.includes('```') ||
                                  lastBlock.text.includes('**') ||
                                  lastBlock.text.includes('##');
        
        if (hasMarkdownSyntax && lastBlock.text.length > 50) {
          // Remove the duplicate block
          processed.comment = processed.comment.slice(0, -1);
          
          // Also clean up the comment_text field
          if (processed.comment_text && processed.comment_text.includes(lastBlock.text)) {
            processed.comment_text = processed.comment_text.replace(lastBlock.text, '').trim();
          }
          
          // Regenerate clean comment_markdown
          if (processed.comment && Array.isArray(processed.comment)) {
            try {
              processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
            } catch (error) {
              console.warn('Failed to regenerate clean comment markdown:', error);
            }
          }
        }
      }
    }
    
    return processed;
  }

  /**
   * Create a new comment on a task
   * @param taskId The ID of the task to comment on
   * @param params The comment parameters (supports markdown in comment_text)
   * @returns The created comment with processed content
   */
  async createTaskComment(taskId: string, params: CreateTaskCommentParams): Promise<Comment> {
    // Use ONLY structured format - no comment_text to avoid duplication
    const processedParams: any = { ...params };
    
    if (params.comment_text) {
      const commentData = prepareCommentForClickUp(params.comment_text);
      
      // Send ONLY structured format - remove comment_text completely
      delete processedParams.comment_text;
      processedParams.comment = commentData.comment;
      
      // Remove any other text fields to prevent conflicts
      delete processedParams.text;
      delete processedParams.description;
    }
    
    const result = await this.client.post(`/task/${taskId}/comment`, processedParams);
    
    // Process the response
    let processed = processClickUpResponse(result);
    
    // Clean up ClickUp's duplicate text blocks
    processed = this.cleanupCommentResponse(processed);
    
    return processed;
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
      result.comments = result.comments.map((comment: any) => {
        const processed = processClickUpResponse(comment);
        
        // Convert ClickUp comment format to markdown for display
        if (processed.comment && Array.isArray(processed.comment)) {
          try {
            processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
          } catch (error) {
            console.warn('Failed to convert ClickUp comment to markdown:', error);
          }
        }
        
        return processed;
      });
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
    // Use ONLY structured format - no comment_text to avoid duplication
    const processedParams: any = { ...params };
    
    if (params.comment_text) {
      const commentData = prepareCommentForClickUp(params.comment_text);
      
      // Send ONLY structured format - remove comment_text completely
      delete processedParams.comment_text;
      processedParams.comment = commentData.comment;
      
      // Remove any other text fields to prevent conflicts
      delete processedParams.text;
      delete processedParams.description;
    }
    
    const result = await this.client.post(`/view/${viewId}/comment`, processedParams);
    
    // Process the response
    const processed = processClickUpResponse(result);
    
    // Convert ClickUp comment format to markdown for display
    if (processed.comment && Array.isArray(processed.comment)) {
      try {
        processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
      } catch (error) {
        console.warn('Failed to convert ClickUp comment to markdown:', error);
      }
    }
    
    return processed;
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
      result.comments = result.comments.map((comment: any) => {
        const processed = processClickUpResponse(comment);
        
        // Convert ClickUp comment format to markdown for display
        if (processed.comment && Array.isArray(processed.comment)) {
          try {
            processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
          } catch (error) {
            console.warn('Failed to convert ClickUp comment to markdown:', error);
          }
        }
        
        return processed;
      });
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
    // Use ONLY structured format - no comment_text to avoid duplication
    const processedParams: any = { ...params };
    
    if (params.comment_text) {
      const commentData = prepareCommentForClickUp(params.comment_text);
      
      // Send ONLY structured format - remove comment_text completely
      delete processedParams.comment_text;
      processedParams.comment = commentData.comment;
      
      // Remove any other text fields to prevent conflicts
      delete processedParams.text;
      delete processedParams.description;
    }
    
    const result = await this.client.post(`/list/${listId}/comment`, processedParams);
    
    // Process the response
    const processed = processClickUpResponse(result);
    
    // Convert ClickUp comment format to markdown for display
    if (processed.comment && Array.isArray(processed.comment)) {
      try {
        processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
      } catch (error) {
        console.warn('Failed to convert ClickUp comment to markdown:', error);
      }
    }
    
    return processed;
  }

  /**
   * Update an existing comment
   * @param commentId The ID of the comment to update
   * @param params The comment parameters to update (supports markdown in comment_text)
   * @returns The updated comment with processed content
   */
  async updateComment(commentId: string, params: UpdateCommentParams): Promise<Comment> {
    // Use ONLY structured format - no comment_text to avoid duplication
    const processedParams: any = { ...params };
    
    if (params.comment_text) {
      const commentData = prepareCommentForClickUp(params.comment_text);
      
      // Send ONLY structured format - remove comment_text completely
      delete processedParams.comment_text;
      processedParams.comment = commentData.comment;
      
      // Remove any other text fields to prevent conflicts
      delete processedParams.text;
      delete processedParams.description;
    }
    
    const result = await this.client.put(`/comment/${commentId}`, processedParams);
    
    // Process the response
    const processed = processClickUpResponse(result);
    
    // Convert ClickUp comment format to markdown for display
    if (processed.comment && Array.isArray(processed.comment)) {
      try {
        processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
      } catch (error) {
        console.warn('Failed to convert ClickUp comment to markdown:', error);
      }
    }
    
    return processed;
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
      result.comments = result.comments.map((comment: any) => {
        const processed = processClickUpResponse(comment);
        
        // Convert ClickUp comment format to markdown for display
        if (processed.comment && Array.isArray(processed.comment)) {
          try {
            processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
          } catch (error) {
            console.warn('Failed to convert ClickUp comment to markdown:', error);
          }
        }
        
        return processed;
      });
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
    // Process comment text for ClickUp's structured format ONLY
    const processedParams: any = { ...params };
    if (params.comment_text) {
      const commentData = prepareCommentForClickUp(params.comment_text);
      
      // Use ONLY ClickUp's structured comment format - no comment_text at all
      delete processedParams.comment_text;
      processedParams.comment = commentData.comment;
      
      // Remove any other text fields to prevent ClickUp auto-detection
      delete processedParams.text;
      delete processedParams.description;
    }
    
    const result = await this.client.post(`/comment/${commentId}/reply`, processedParams);
    
    // Process the response
    const processed = processClickUpResponse(result);
    
    // Convert ClickUp comment format to markdown for display
    if (processed.comment && Array.isArray(processed.comment)) {
      try {
        processed.comment_markdown = clickUpCommentToMarkdown({ comment: processed.comment });
      } catch (error) {
        console.warn('Failed to convert ClickUp comment to markdown:', error);
      }
    }
    
    return processed;
  }
}

export const createCommentsClient = (client: ClickUpClient): CommentsClient => {
  return new CommentsClient(client);
};
