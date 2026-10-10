/* eslint-disable no-console */
import { ClickUpClient } from './index.js';
import axios, { AxiosInstance } from 'axios';

// Enhanced interfaces based on the public v3 Docs API
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
  page_count?: number;
}

export interface Page {
  id: string;
  name: string;
  sub_title?: string;
  content: string;
  content_format?: ApiContentFormat;
  doc_id: string;
  parent_page_id?: string;
  date_created: number;
  date_updated: number;
  creator: number;
  pages?: Page[];
}

export interface PageListingEntry {
  id: string;
  name: string;
  doc_id?: string;
  parent_page_id?: string;
  pages?: PageListingEntry[];
}

// Values the ClickUp v3 Docs API accepts for page content. There is no HTML
// format: Create/Edit/Get Page document only text/md and text/plain.
export type ApiContentFormat = 'text/md' | 'text/plain';
// Values accepted by client callers ('markdown' is a legacy alias for text/md)
export type ContentFormat = ApiContentFormat | 'markdown';

export type ContentEditMode = 'replace' | 'append' | 'prepend';

/**
 * Parent types documented for Create Doc:
 * 4 = Space, 5 = Folder, 6 = List, 7 = Everything, 12 = Workspace
 */
export type DocParentType = 4 | 5 | 6 | 7 | 12;

// Parameter interfaces
export interface CreateDocParams {
  workspace_id: string;
  name: string;
  /** Explicit parent placement inside the workspace hierarchy */
  parent?: {
    id: string;
    type: DocParentType;
  };
  /** Convenience: place the doc in a space (parent type 4) */
  space_id?: string;
  /** Convenience: place the doc in a folder (parent type 5) */
  folder_id?: string;
  /** Initial content; added as the first page in a follow-up call */
  content?: string;
  content_format?: ContentFormat;
  public?: boolean;
  visibility?: 'PUBLIC' | 'PRIVATE';
  create_page?: boolean;
}

export interface CreatePageParams {
  name: string;
  content: string;
  sub_title?: string;
  content_format?: ContentFormat;
  parent_page_id?: string;
}

export interface UpdatePageParams {
  name?: string;
  sub_title?: string;
  content?: string;
  content_edit_mode?: ContentEditMode;
  content_format?: ContentFormat;
}

export interface GetDocsParams {
  id?: string;
  creator?: number;
  deleted?: boolean;
  archived?: boolean;
  parent_id?: string;
  parent_type?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchDocsParams extends GetDocsParams {
  /**
   * Free-text name filter. The v3 API has no query parameter, so this is
   * applied client-side against the returned doc names.
   */
  query?: string;
}

export interface DocsResponse {
  docs: Doc[];
  next_cursor?: string;
}

export interface SearchDocsResponse extends DocsResponse {
  /** Pages of GET /docs read to answer a name query (absent without a query) */
  pages_scanned?: number;
}

/** Upper bound on GET /docs pages one name search will read */
export const DEFAULT_SEARCH_MAX_PAGES = 10;

/**
 * Flatten a page tree (as returned by GET /docs/{id}/pages with
 * max_page_depth=-1, where child pages nest under each page's `pages`) into
 * one markdown document. Top-level pages get `#`, children `##`, and so on,
 * capped at `######`.
 */
export function flattenDocPages(pages: Page[] | undefined, depth = 1): string {
  if (!Array.isArray(pages)) return '';
  let combined = '';
  for (const page of pages) {
    const hasChildren = Array.isArray(page.pages) && page.pages.length > 0;
    if (page.content || hasChildren) {
      const heading = '#'.repeat(Math.min(depth, 6));
      combined += `${heading} ${page.name}\n\n`;
      if (page.content) {
        combined += `${page.content}\n\n`;
      }
    }
    if (hasChildren) {
      combined += flattenDocPages(page.pages, depth + 1);
    }
  }
  return combined;
}

/**
 * Enhanced Documents Client aligned with the public ClickUp v3 Docs API.
 *
 * Supported operations (all under /api/v3/workspaces/{workspaceId}/):
 * - GET  docs                      (search/list docs)
 * - POST docs                      (create doc)
 * - GET  docs/{docId}              (fetch doc)
 * - GET  docs/{docId}/page_listing (page hierarchy without content)
 * - GET  docs/{docId}/pages        (fetch pages with content)
 * - POST docs/{docId}/pages        (create page)
 * - GET  docs/{docId}/pages/{pageId}
 * - PUT  docs/{docId}/pages/{pageId} (edit page, supports append/prepend)
 *
 * The public API provides NO doc update/delete, page delete, sharing, or
 * template endpoints.
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
  // READ OPERATIONS
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
      console.error(
        'Error getting docs from workspace:',
        error instanceof Error ? error.message : error
      );
      throw this.handleError(error, 'Failed to get docs from workspace');
    }
  }

  /**
   * Get the pages of a doc (with content)
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
        content_format: normalizeContentFormat(contentFormat),
      };

      const response = await this.http.get(url, { params });

      return response.data;
    } catch (error) {
      console.error('Error getting doc pages:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to get doc pages');
    }
  }

  /**
   * Get the page hierarchy of a doc (IDs and names, no content).
   * Cheap table-of-contents call compared to getDocPages.
   */
  async getDocPageListing(
    workspaceId: string,
    docId: string,
    maxPageDepth: number = -1
  ): Promise<PageListingEntry[]> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/page_listing`;
      const response = await this.http.get(url, { params: { max_page_depth: maxPageDepth } });
      return response.data;
    } catch (error) {
      console.error(
        'Error getting doc page listing:',
        error instanceof Error ? error.message : error
      );
      throw this.handleError(error, 'Failed to get doc page listing');
    }
  }

  /**
   * Search for docs in a workspace.
   *
   * Uses GET /api/v3/workspaces/{workspaceId}/docs with the documented
   * filters (id, creator, deleted, archived, parent_id, parent_type, limit,
   * cursor). The API has no free-text search parameter, so `query` is
   * matched client-side against doc names.
   *
   * Without `query` this is a single page, returned with its next_cursor.
   * With `query`, a single page of docs can easily contain no match while
   * later pages do, so pages are followed via next_cursor until at least
   * `limit` (default 10) matches are found, the docs run out, or `maxPages`
   * pages have been scanned. The returned next_cursor resumes the scan after
   * the last page read; it is absent when every doc has been scanned.
   */
  async searchDocs(
    workspaceId: string,
    params: SearchDocsParams,
    maxPages: number = DEFAULT_SEARCH_MAX_PAGES
  ): Promise<SearchDocsResponse> {
    try {
      const { query, ...filters } = params;
      if (!query) {
        return await this.getDocsFromWorkspace(workspaceId, filters);
      }

      const lowerQuery = query.toLowerCase();
      const wanted = filters.limit ?? 10;
      const matches: Doc[] = [];
      let cursor = filters.cursor;
      let pagesScanned = 0;

      do {
        const page = await this.getDocsFromWorkspace(workspaceId, { ...filters, cursor });
        pagesScanned++;
        for (const doc of page.docs ?? []) {
          if (doc.name?.toLowerCase().includes(lowerQuery)) {
            matches.push(doc);
          }
        }
        cursor = page.next_cursor || undefined;
      } while (cursor && matches.length < wanted && pagesScanned < maxPages);

      return {
        docs: matches,
        ...(cursor ? { next_cursor: cursor } : {}),
        pages_scanned: pagesScanned,
      };
    } catch (error) {
      console.error('Error searching docs:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to search docs');
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
  // DOCUMENT CREATION
  // ========================================

  /**
   * Create a new document.
   *
   * Always POSTs to /api/v3/workspaces/{workspaceId}/docs; placement in the
   * hierarchy is expressed via the `parent` body field ({id, type} with
   * 4=space, 5=folder, 6=list, 7=everything, 12=workspace).
   *
   * If `content` is supplied, an initial page is created in a follow-up call
   * (the create-doc endpoint does not accept content).
   */
  async createDoc(params: CreateDocParams): Promise<Doc> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${params.workspace_id}/docs`;

      const placements = [params.parent, params.space_id, params.folder_id].filter(
        value => value !== undefined
      );
      if (placements.length > 1) {
        throw new Error('Provide at most one of parent, space_id, or folder_id');
      }

      let parent = params.parent;
      if (!parent && params.space_id) {
        parent = { id: params.space_id, type: 4 };
      }
      if (!parent && params.folder_id) {
        parent = { id: params.folder_id, type: 5 };
      }

      const visibility = params.visibility || (params.public ? 'PUBLIC' : 'PRIVATE');

      const requestBody: Record<string, unknown> = {
        name: params.name,
        visibility,
        // When content is supplied we create the first page ourselves
        create_page: params.content ? false : params.create_page !== false,
      };
      if (parent) {
        requestBody.parent = parent;
      }

      const response = await this.http.post(url, requestBody);
      const doc: Doc = response.data;

      // The create endpoint does not accept content; add it as the first page.
      // The doc already exists at this point, so a page failure must not be
      // reported as a failed creation (a retry would duplicate the doc).
      if (params.content && doc?.id) {
        try {
          await this.createPage(params.workspace_id, doc.id, {
            name: params.name,
            content: params.content,
            content_format: params.content_format || 'text/md',
          });
        } catch (pageError) {
          const message = pageError instanceof Error ? pageError.message : String(pageError);
          return {
            ...doc,
            warning: `Document created (id: ${doc.id}) but the initial content page failed: ${message}. Add the content with clickup_create_doc_page instead of retrying the creation.`,
          } as Doc;
        }
      }

      return doc;
    } catch (error) {
      console.error('Error creating document:', error instanceof Error ? error.message : error);
      throw this.handleError(error, 'Failed to create document');
    }
  }

  // ========================================
  // PAGE MANAGEMENT OPERATIONS
  // ========================================

  /**
   * Create a new page in a document
   * @param workspaceId The workspace ID containing the document (required by ClickUp v3 API)
   * @param docId The document ID
   */
  async createPage(workspaceId: string, docId: string, params: CreatePageParams): Promise<Page> {
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`;

      const requestBody: Record<string, unknown> = {
        name: params.name,
        content: params.content,
        content_format: normalizeContentFormat(params.content_format),
      };

      if (params.sub_title) {
        requestBody.sub_title = params.sub_title;
      }
      if (params.parent_page_id) {
        requestBody.parent_page_id = params.parent_page_id;
      }

      const response = await this.http.post(url, requestBody);

      return response.data;
    } catch (error) {
      console.error('Error creating page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to create page in document ${docId}`);
    }
  }

  /**
   * Update an existing page (Edit Page).
   * Supports content_edit_mode 'replace' (default), 'append', and 'prepend'.
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

      const requestBody: Record<string, unknown> = {};
      if (params.name !== undefined) requestBody.name = params.name;
      if (params.sub_title !== undefined) requestBody.sub_title = params.sub_title;
      if (params.content !== undefined) {
        requestBody.content = params.content;
        requestBody.content_edit_mode = params.content_edit_mode || 'replace';
        requestBody.content_format = normalizeContentFormat(params.content_format);
      }

      const response = await this.http.put(url, requestBody);

      return response.data;
    } catch (error) {
      console.error('Error updating page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to update page ${pageId} in document ${docId}`);
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
      const params = contentFormat ? { content_format: normalizeContentFormat(contentFormat) } : {};

      const response = await this.http.get(url, { params });

      return response.data;
    } catch (error) {
      console.error('Error getting page:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get page ${pageId} from document ${docId}`);
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
}

/**
 * Map a content format to a value the v3 Docs API accepts. Only text/md and
 * text/plain exist; 'markdown' is a legacy alias, and anything else (including
 * the old, never-supported 'text/html') falls back to text/md.
 */
export function normalizeContentFormat(format?: string): ApiContentFormat {
  return format === 'text/plain' ? 'text/plain' : 'text/md';
}

export const createEnhancedDocsClient = (client: ClickUpClient): EnhancedDocsClient => {
  return new EnhancedDocsClient(client);
};
