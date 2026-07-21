/* eslint-disable no-console, max-len */
import { ClickUpClient } from './index.js';
import axios from 'axios';

// Updated Doc interface based on v3 API response
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

export interface SearchDocsParams {
  /**
   * Free-text name filter. The v3 API has no query parameter, so this is
   * applied client-side against the returned doc names. A value of
   * 'space:{spaceId}' filters docs whose parent is that space instead.
   */
  query: string;
  cursor?: string;
}

export class DocsClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get docs from a specific workspace
   * @param workspaceId The ID of the workspace to get docs from
   * @param params Optional parameters for filtering docs
   * @returns A list of docs
   */
  async getDocsFromWorkspace(
    workspaceId: string,
    params?: GetDocsParams
  ): Promise<{ docs: Doc[]; next_cursor: string }> {
    // Get the API token directly from the environment variable
    const apiToken = process.env.CLICKUP_API_TOKEN;

    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`;

      // Use the exact same headers that worked in the successful request
      const headers = {
        Authorization: apiToken,
        Accept: 'application/json',
      };

      const response = await axios.get(url, {
        headers,
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting docs:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the pages of a doc
   * @param workspaceId The ID of the workspace
   * @param docId The ID of the doc
   * @param contentFormat The format to return the content in (text/md or text/plain)
   * @returns The pages of the doc
   */
  async getDocPages(
    workspaceId: string,
    docId: string,
    contentFormat: string = 'text/md'
  ): Promise<any> {
    // Get the API token directly from the environment variable
    const apiToken = process.env.CLICKUP_API_TOKEN;

    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`;

      // Use the exact same parameters that worked in the successful request
      const params = {
        max_page_depth: -1,
        content_format: contentFormat,
      };

      // Use the exact same headers that worked in the successful request
      const headers = {
        Authorization: apiToken,
        Accept: 'application/json',
      };

      const response = await axios.get(url, {
        headers,
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting doc pages:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Search for docs in a workspace.
   *
   * Uses the documented v3 endpoint GET /api/v3/workspaces/{workspaceId}/docs.
   * The API has no free-text search parameter, so the query is matched
   * client-side against doc names. A 'space:{spaceId}' query filters by
   * parent instead (parent_id + parent_type SPACE).
   * @param workspaceId The ID of the workspace to search in
   * @param params The search parameters
   * @returns A list of docs matching the search query
   */
  async searchDocs(
    workspaceId: string,
    params: SearchDocsParams
  ): Promise<{ docs: Doc[]; next_cursor: string }> {
    try {
      const queryParams: GetDocsParams = { cursor: params.cursor };
      let nameFilter: string | undefined = params.query;

      // If the query is a space ID, filter by parent instead of name
      if (params.query.startsWith('space:')) {
        queryParams.parent_id = params.query.substring(6);
        queryParams.parent_type = 'SPACE';
        nameFilter = undefined;
      }

      const result = await this.getDocsFromWorkspace(workspaceId, queryParams);

      if (nameFilter && Array.isArray(result.docs)) {
        const lowerQuery = nameFilter.toLowerCase();
        return {
          ...result,
          docs: result.docs.filter(doc => doc.name?.toLowerCase().includes(lowerQuery)),
        };
      }

      return result;
    } catch (error) {
      console.error('Error searching docs:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Create a new doc in a workspace.
   *
   * POST /api/v3/workspaces/{workspaceId}/docs — placement in the hierarchy
   * is expressed via the 'parent' body field ({id, type}: 4=space, 5=folder,
   * 6=list, 7=everything, 12=workspace). If content is provided, it is added
   * as the doc's first page in a follow-up call (the create endpoint does
   * not accept content).
   * @param workspaceId The ID of the workspace
   * @param title The title of the doc
   * @param content Optional initial content (markdown)
   * @param parent Optional parent placement
   * @returns The created doc
   */
  async createDoc(
    workspaceId: string,
    title: string,
    content?: string,
    parent?: { id: string; type: number }
  ): Promise<Doc> {
    const axiosInstance = this.client.getAxiosInstance();

    const requestBody: Record<string, unknown> = {
      name: title,
      visibility: 'PRIVATE',
      create_page: !content,
    };
    if (parent) {
      requestBody.parent = parent;
    }

    const response = await axiosInstance.post(
      `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`,
      requestBody
    );
    const doc: Doc = response.data;

    if (content && doc?.id) {
      await axiosInstance.post(
        `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${doc.id}/pages`,
        { name: title, content, content_format: 'text/md' }
      );
    }

    return doc;
  }

  /**
   * Create a new doc in a list (parent type 6)
   * @param workspaceId The ID of the workspace containing the list
   * @param listId The ID of the list to create the doc in
   * @param title The title of the doc
   * @param content Optional initial content (markdown)
   * @returns The created doc
   */
  async createDocInList(
    workspaceId: string,
    listId: string,
    title: string,
    content?: string
  ): Promise<Doc> {
    return this.createDoc(workspaceId, title, content, { id: listId, type: 6 });
  }

  /**
   * Create a new doc in a folder (parent type 5)
   * @param workspaceId The ID of the workspace containing the folder
   * @param folderId The ID of the folder to create the doc in
   * @param title The title of the doc
   * @param content Optional initial content (markdown)
   * @returns The created doc
   */
  async createDocInFolder(
    workspaceId: string,
    folderId: string,
    title: string,
    content?: string
  ): Promise<Doc> {
    return this.createDoc(workspaceId, title, content, { id: folderId, type: 5 });
  }
}

export const createDocsClient = (client: ClickUpClient): DocsClient => {
  return new DocsClient(client);
};
