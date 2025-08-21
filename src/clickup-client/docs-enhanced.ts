import { ClickUpClient } from './index.js';
import axios from 'axios';

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
  private apiToken: string;

  constructor(client: ClickUpClient) {
    this.client = client;
    this.apiToken = process.env.CLICKUP_API_TOKEN || '';
  }

  private getHeaders() {
    return {
      'Authorization': this.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
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
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error getting docs from workspace:', error);
      throw this.handleError(error, 'Failed to get docs from workspace');
    }
  }

  /**
   * Get the pages of a doc
   */
  async getDocPages(workspaceId: string, docId: string, contentFormat: string = 'text/md'): Promise<Page[]> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`;
      const params = { 
        max_page_depth: -1,
        content_format: contentFormat
      };
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting doc pages:', error);
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
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params: queryParams
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching docs:', error);
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

      const response = await axios.post(url, requestBody, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error creating document:', error);
      throw this.handleError(error, 'Failed to create document');
    }
  }

  /**
   * Update an existing document
   */
  async updateDoc(docId: string, params: UpdateDocParams): Promise<Doc> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}`;
      
      const requestBody: any = {};
      if (params.name !== undefined) requestBody.name = params.name;
      if (params.content !== undefined) requestBody.content = params.content;
      if (params.public !== undefined) requestBody.public = params.public;

      const response = await axios.put(url, requestBody, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error updating document:', error);
      throw this.handleError(error, `Failed to update document ${docId}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDoc(docId: string): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}`;
      
      await axios.delete(url, {
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw this.handleError(error, `Failed to delete document ${docId}`);
    }
  }

  /**
   * Get document details
   */
  async getDoc(docId: string): Promise<Doc> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting document:', error);
      throw this.handleError(error, `Failed to get document ${docId}`);
    }
  }

  // ========================================
  // NEW: PAGE MANAGEMENT OPERATIONS
  // ========================================

  /**
   * Create a new page in a document
   */
  async createPage(docId: string, params: CreatePageParams): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}/pages`;
      
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

      const response = await axios.post(url, requestBody, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error creating page:', error);
      throw this.handleError(error, `Failed to create page in document ${docId}`);
    }
  }

  /**
   * Update an existing page
   */
  async updatePage(docId: string, pageId: string, params: UpdatePageParams): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}/pages/${pageId}`;
      
      const requestBody: any = {};
      if (params.name !== undefined) requestBody.name = params.name;
      if (params.content !== undefined) requestBody.content = params.content;
      if (params.content_format !== undefined) requestBody.content_format = params.content_format;
      if (params.position !== undefined) requestBody.position = params.position;

      const response = await axios.put(url, requestBody, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error updating page:', error);
      throw this.handleError(error, `Failed to update page ${pageId} in document ${docId}`);
    }
  }

  /**
   * Delete a page from a document
   */
  async deletePage(docId: string, pageId: string): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}/pages/${pageId}`;
      
      await axios.delete(url, {
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      throw this.handleError(error, `Failed to delete page ${pageId} from document ${docId}`);
    }
  }

  /**
   * Get page details
   */
  async getPage(docId: string, pageId: string, contentFormat?: ContentFormat): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}/pages/${pageId}`;
      const params = contentFormat ? { content_format: contentFormat } : {};
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error getting page:', error);
      throw this.handleError(error, `Failed to get page ${pageId} from document ${docId}`);
    }
  }

  // ========================================
  // NEW: SHARING MANAGEMENT
  // ========================================

  /**
   * Get document sharing settings
   */
  async getDocSharing(docId: string): Promise<SharingConfig> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}/sharing`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting document sharing:', error);
      throw this.handleError(error, `Failed to get sharing settings for document ${docId}`);
    }
  }

  /**
   * Update document sharing settings
   */
  async updateDocSharing(docId: string, params: SharingParams): Promise<SharingConfig> {
    try {
      const url = `https://api.clickup.com/api/v3/docs/${docId}/sharing`;
      
      const response = await axios.put(url, params, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Error updating document sharing:', error);
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
      console.error('Error creating document from template:', error);
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
    const validFormats: ContentFormat[] = ['markdown', 'html', 'text/md', 'text/plain', 'text/html'];
    return validFormats.includes(format);
  }

  /**
   * Sanitize HTML content (basic implementation)
   */
  private sanitizeHtml(html: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }
}

export const createEnhancedDocsClient = (client: ClickUpClient): EnhancedDocsClient => {
  return new EnhancedDocsClient(client);
};
