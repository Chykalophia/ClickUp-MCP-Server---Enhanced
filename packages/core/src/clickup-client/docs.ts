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
  cursor?: string;
  deleted?: boolean;
  archived?: boolean;
  limit?: number;
}

export interface SearchDocsParams {
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
  async getDocsFromWorkspace(workspaceId: string, params?: GetDocsParams): Promise<{ docs: Doc[], next_cursor: string }> {
    // Get the API token directly from the environment variable
    const apiToken = process.env.CLICKUP_API_TOKEN;
    
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`;
      
      // Use the exact same headers that worked in the successful request
      const headers = {
        'Authorization': apiToken,
        'Accept': 'application/json'
      };
      
      const response = await axios.get(url, {
        headers,
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting docs:', error);
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
  async getDocPages(workspaceId: string, docId: string, contentFormat: string = 'text/md'): Promise<any> {
    // Get the API token directly from the environment variable
    const apiToken = process.env.CLICKUP_API_TOKEN;
    
    try {
      const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`;
      
      // Use the exact same parameters that worked in the successful request
      const params = { 
        max_page_depth: -1,
        content_format: contentFormat
      };
      
      // Use the exact same headers that worked in the successful request
      const headers = {
        'Authorization': apiToken,
        'Accept': 'application/json'
      };
      
      const response = await axios.get(url, {
        headers,
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting doc pages:', error);
      throw error;
    }
  }

  /**
   * Search for docs in a workspace
   * @param workspaceId The ID of the workspace to search in
   * @param params The search parameters
   * @returns A list of docs matching the search query
   */
  async searchDocs(workspaceId: string, params: SearchDocsParams): Promise<{ docs: Doc[], next_cursor: string }> {
    // Get the API token directly from the environment variable
    const apiToken = process.env.CLICKUP_API_TOKEN;
    
    try {
      // According to the ClickUp API documentation, the endpoint is:
      // GET /api/v2/team/{team_id}/docs/search
      // where team_id is the workspace ID
      const url = `https://api.clickup.com/api/v2/team/${workspaceId}/docs/search`;
      
      // Use the exact same headers that worked in the successful request
      const headers = {
        'Authorization': apiToken,
        'Accept': 'application/json'
      };
      
      // According to the ClickUp API documentation, this should be a GET request
      // with the parameters as query parameters
      const queryParams: any = {
        doc_name: params.query,
        cursor: params.cursor
      };
      
      // If the query is a space ID, use it as a space_id parameter
      if (params.query.startsWith('space:')) {
        const spaceId = params.query.substring(6);
        queryParams.space_id = spaceId;
        delete queryParams.doc_name;
      }
      
      const response = await axios.get(url, {
        headers,
        params: queryParams
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching docs:', error);
      throw error;
    }
  }

  /**
   * Create a new doc in a list
   * @param listId The ID of the list to create the doc in
   * @param title The title of the doc
   * @param content The content of the doc (HTML format)
   * @returns The created doc
   */
  async createDocInList(listId: string, title: string, content: string): Promise<Doc> {
    // Create a custom axios instance for v3 API
    const axiosInstance = this.client.getAxiosInstance();
    const response = await axiosInstance.post(`https://api.clickup.com/api/v3/lists/${listId}/docs`, { name: title, content });
    return response.data;
  }

  /**
   * Create a new doc in a folder
   * @param folderId The ID of the folder to create the doc in
   * @param title The title of the doc
   * @param content The content of the doc (HTML format)
   * @returns The created doc
   */
  async createDocInFolder(folderId: string, title: string, content: string): Promise<Doc> {
    // Create a custom axios instance for v3 API
    const axiosInstance = this.client.getAxiosInstance();
    const response = await axiosInstance.post(`https://api.clickup.com/api/v3/folders/${folderId}/docs`, { name: title, content });
    return response.data;
  }

  /**
   * Update an existing doc
   * @param docId The ID of the doc to update
   * @param title The new title of the doc
   * @param content The new content of the doc (HTML format)
   * @returns The updated doc
   */
  async updateDoc(docId: string, title?: string, content?: string): Promise<Doc> {
    const params: any = {};
    if (title !== undefined) params.name = title;
    if (content !== undefined) params.content = content;
    
    // Create a custom axios instance for v3 API
    const axiosInstance = this.client.getAxiosInstance();
    const response = await axiosInstance.put(`https://api.clickup.com/api/v3/docs/${docId}`, params);
    return response.data;
  }
}

export const createDocsClient = (client: ClickUpClient): DocsClient => {
  return new DocsClient(client);
};
