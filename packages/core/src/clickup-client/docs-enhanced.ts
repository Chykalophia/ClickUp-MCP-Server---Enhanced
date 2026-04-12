/* eslint-disable no-console */
import { ClickUpClient } from './index.js';
import axios, { AxiosInstance } from 'axios';

// Enhanced interfaces based on research
export interface Doc {
  id: string;
  name: string;
  date_created: number;
  date_updated: number;
  parent?: {
    id: string;
    type: number;
  };
  public: boolean;
  workspace_id: number;
  creator: number;
  deleted: boolean;
  type: number;
  content?: string;
  url?: string;
  sharing?: SharingConfig;
  page_count?: number;
}

export interface Page {
  id: string;
  name: string;
  content: string;
  content_format: ContentFormat;
  doc_id: string;
  parent_page_id?: string;
  position: number;
  date_created: number;
  date_updated: number;
  creator: number;
}

export type ContentFormat = 'markdown' | 'html' | 'text/md' | 'text/plain' | 'text/html';

export interface SharingConfig {
  public: boolean;
  public_share_expires_on?: number;
  public_fields?: string[];
  team_sharing?: boolean;
  guest_sharing?: boolean;
  token?: string;
  seo_optimized?: boolean;
}

// Parameter interfaces
export interface CreateDocParams {
  workspace_id?: string;
  space_id?: string;
  folder_id?: string;
  name: string;
  content?: string;
  public?: boolean;
  template_id?: string;
}

export interface UpdateDocParams {
  name?: string;
  content?: string;
  public?: boolean;
}

export interface CreatePageParams {
  name: string;
  content: string;
  content_format?: ContentFormat;
  parent_page_id?: string;
  position?: number;
}

export interface UpdatePageParams {
  name?: string;
  content?: string;
  content_format?: ContentFormat;
  position?: number;
}

export interface SharingParams {
  public?: boolean;
  public_share_expires_on?: number;
  public_fields?: string[];
  team_sharing?: boolean;
  guest_sharing?: boolean;
}

export interface CreateFromTemplateParams {
  workspace_id?: string;
  space_id?: string;
  folder_id?: string;
  name: string;
  template_variables?: Record<string, any>;
}

export interface GetDocsParams {
  cursor?: string;
  deleted?: boolean;
  archived?: boolean;
  limit?: number;
}

export interface SearchDocsParams {
  query: string;
  cursor?: string;
}

export interface DocsResponse {
  docs: Doc[];
  next_cursor?: string;
}

/**
 * Enhanced Documents Client with full CRUD operations
 * Extends the existing read-only functionality with write operations
 */
export class EnhancedDocsClient {
  private client: ClickUpClient;
  private http: AxiosInstance;

  constructor(client: ClickUpClient) {
    this.client = client;
    // Reuse the shared client's axios instance (has timeout, interceptors, auth headers)
    this.http = client.getAxiosInstance();
  }

  // ========================================
  // EXISTING READ OPERATIONS (Enhanced)
  // ========================================

  /**
   * Get docs from a specific workspace
   */
  async getDocsFromWorkspace(workspaceId: string, params?: GetDocsParams): Promise<DocsResponse> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`;
      const response = await this.http.get(url, { params });
      return response.data;
    } catch (error) {
      console.error('Error getting docs from workspace:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to get docs from workspace');
    }
  }

  /**
   * Get the pages of a doc
   */
  async getDocPages(
    workspaceId: string,
    docId: string,
    contentFormat: string = 'text/md'
  ): Promise<Page[]> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`;
      const params = {
        max_page_depth: -1,
        content_format: contentFormat
      };

      const response = await this.http.get(url, { params });

      return response.data;
    } catch (error) {
      console.error('Error getting doc pages:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to get doc pages');
    }
  }

  /**
   * Search for docs in a workspace
   */
  async searchDocs(workspaceId: string, params: SearchDocsParams): Promise<DocsResponse> {
    try {
      const url = `https://api.clickup.com/api/v2/team/${workspaceId}/docs/search`;
      const queryParams: any = {
        doc_name: params.query,
        cursor: params.cursor
      };

      if (params.query.startsWith('space:')) {
        const spaceId = params.query.substring(6);
        queryParams.space_id = spaceId;
        delete queryParams.doc_name;
      }

      const response = await this.http.get(url, { params: queryParams });

      return response.data;
    } catch (error) {
      console.error('Error searching docs:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to search docs');
    }
  }

  // ========================================
  // NEW: DOCUMENT CRUD OPERATIONS
  // ========================================

  /**
   * Create a new document
   */
  async createDoc(params: CreateDocParams): Promise<Doc> {
    try {
      let url: string;

      // Determine the correct endpoint based on parent
      if (params.workspace_id) {
        url = `https://api.clickup.com/api/v3/workspaces/${params.workspace_id}/docs`;
      } else if (params.space_id) {
        url = `https://api.clickup.com/api/v3/spaces/${params.space_id}/docs`;
      } else if (params.folder_id) {
        url = `https://api.clickup.com/api/v3/folders/${params.folder_id}/docs`;
      } else {
        throw new Error('Must specify workspace_id, space_id, or folder_id');
      }

      const requestBody = {
        name: params.name,
        content: params.content || '',
        public: params.public || false
      };

      // Add template_id if provided
      if (params.template_id) {
        (requestBody as any).template_id = params.template_id;
      }

      const response = await this.http.post(url, requestBody);

      return response.data;
    } catch (error) {
      console.error('Error creating document:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to create document');
    }
  }

  /**
   * Update an existing document
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async updateDoc(workspaceId: string, docId: string, params: UpdateDocParams): Promise<Doc> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}`;

      const requestBody: any = {};
      if (params.name !== undefined) requestBody.name = params.name;
      if (params.content !== undefined) requestBody.content = params.content;
      if (params.public !== undefined) requestBody.public = params.public;

      const response = await this.http.put(url, requestBody);

      return response.data;
    } catch (error) {
      console.error('Error updating document:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to update document ${docId}`);
    }
  }

  /**
   * Delete a document
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async deleteDoc(workspaceId: string, docId: string): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}`;

      await this.http.delete(url);
    } catch (error) {
      console.error('Error deleting document:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to delete document ${docId}`);
    }
  }

  /**
   * Get document details
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async getDoc(workspaceId: string, docId: string): Promise<Doc> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}`;

      const response = await this.http.get(url);

      return response.data;
    } catch (error) {
      console.error('Error getting document:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get document ${docId}`);
    }
  }

  // ========================================
  // NEW: PAGE MANAGEMENT OPERATIONS
  // ========================================

  /**
   * Create a new page in a document
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async createPage(workspaceId: string, docId: string, params: CreatePageParams): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`;

      const requestBody = {
        name: params.name,
        content: params.content,
        content_format: params.content_format || 'markdown'
      };

      if (params.parent_page_id) {
        (requestBody as any).parent_page_id = params.parent_page_id;
      }
      if (params.position !== undefined) {
        (requestBody as any).position = params.position;
      }

      const response = await this.http.post(url, requestBody);

      return response.data;
    } catch (error) {
      console.error('Error creating page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to create page in document ${docId}`);
    }
  }

  /**
   * Update an existing page
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   * @param pageId The page ID
   */
  async updatePage(
    workspaceId: string,
    docId: string,
    pageId: string,
    params: UpdatePageParams
  ): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`;

      const requestBody: any = {};
      if (params.name !== undefined) requestBody.name = params.name;
      if (params.content !== undefined) requestBody.content = params.content;
      if (params.content_format !== undefined) requestBody.content_format = params.content_format;
      if (params.position !== undefined) requestBody.position = params.position;

      const response = await this.http.put(url, requestBody);

      return response.data;
    } catch (error) {
      console.error('Error updating page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to update page ${pageId} in document ${docId}`);
    }
  }

  /**
   * Delete a page from a document
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   * @param pageId The page ID
   */
  async deletePage(workspaceId: string, docId: string, pageId: string): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`;

      await this.http.delete(url);
    } catch (error) {
      console.error('Error deleting page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to delete page ${pageId} from document ${docId}`);
    }
  }

  /**
   * Get page details
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   * @param pageId The page ID
   */
  async getPage(
    workspaceId: string,
    docId: string,
    pageId: string,
    contentFormat?: ContentFormat
  ): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`;
      const params = contentFormat ? { content_format: contentFormat } : {};

      const response = await this.http.get(url, { params });

      return response.data;
    } catch (error) {
      console.error('Error getting page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get page ${pageId} from document ${docId}`);
    }
  }

  // ========================================
  // NEW: SHARING MANAGEMENT
  // ========================================

  /**
   * Get document sharing settings
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async getDocSharing(workspaceId: string, docId: string): Promise<SharingConfig> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/sharing`;

      const response = await this.http.get(url);

      return response.data;
    } catch (error) {
      console.error('Error getting document sharing:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get sharing settings for document ${docId}`);
    }
  }

  /**
   * Update document sharing settings
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async updateDocSharing(
    workspaceId: string,
    docId: string,
    params: SharingParams
  ): Promise<SharingConfig> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/sharing`;

      const response = await this.http.put(url, params);

      return response.data;
    } catch (error) {
      console.error('Error updating document sharing:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to update sharing settings for document ${docId}`);
    }
  }

  // ========================================
  // NEW: TEMPLATE OPERATIONS
  // ========================================

  /**
   * Create document from template
   */
  async createDocFromTemplate(templateId: string, params: CreateFromTemplateParams): Promise<Doc> {
    try {
      const createParams: CreateDocParams = {
        ...params,
        template_id: templateId
      };

      return await this.createDoc(createParams);
    } catch (error) {
      console.error('Error creating document from template:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to create document from template ${templateId}`);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Enhanced error handling with context
   */
  private handleError(error: any, context: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      switch (status) {
      case 400:
        return new Error(`${context}: Invalid request - ${message}`);
      case 401:
        return new Error(`${context}: Authentication failed - check API token`);
      case 403:
        return new Error(`${context}: Permission denied - insufficient access rights`);
      case 404:
        return new Error(`${context}: Resource not found - ${message}`);
      case 413:
        return new Error(`${context}: Content too large - reduce document size`);
      case 429:
        return new Error(`${context}: Rate limit exceeded - please retry later`);
      case 500:
        return new Error(`${context}: Server error - please try again`);
      default:
        return new Error(`${context}: ${message}`);
      }
    }

    return new Error(`${context}: ${error.message || 'Unknown error'}`);
  }

  /**
   * Validate content format
   */
  private validateContentFormat(format: ContentFormat): boolean {
    const validFormats: ContentFormat[] = [
      'markdown',
      'html',
      'text/md',
      'text/plain',
      'text/html'
    ];
    return validFormats.includes(format);
  }

  /**
   * Sanitize HTML content with comprehensive security measures
   */
  private sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Comprehensive HTML sanitization
    return (
      html
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove style tags and their content
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove all event handlers
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove vbscript: protocol
        .replace(/vbscript:/gi, '')
        // Remove data: protocol (can be used for XSS)
        .replace(/data:/gi, '')
        // Remove dangerous tags
        .replace(
          /<(iframe|object|embed|applet|meta|link|base|form|input|button|textarea|select|option)\b[^>]*>/gi,
          ''
        )
        // Remove closing tags for dangerous elements
        .replace(
          /<\/(iframe|object|embed|applet|meta|link|base|form|input|button|textarea|select|option)>/gi,
          ''
        )
        // Limit to reasonable length to prevent DoS
        .substring(0, 100000)
    );
  }
}

export const createEnhancedDocsClient = (client: ClickUpClient): EnhancedDocsClient => {
  return new EnhancedDocsClient(client);
};
