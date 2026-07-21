import { ClickUpClient } from './index.js';
import {
  validateResponse,
  FoldersResponseSchema,
  ListsResponseSchema
} from '../schemas/response-schemas.js';

export interface Folder {
  id: string;
  name: string;
  // ...other folder properties...
}

export interface GetFoldersParams {
  archived?: boolean;
}

export interface List {
  id: string;
  name: string;
  // ...other list properties...
}

export interface GetListsParams {
  archived?: boolean;
}

export interface CreateFolderFromTemplateParams {
  name: string;
  options?: {
    return_immediately?: boolean;
  };
}

export class FoldersClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get folders from a specific space
   * @param spaceId The ID of the space to get folders from
   * @param params Optional parameters for filtering folders
   * @returns A list of folders
   */
  async getFoldersFromSpace(
    spaceId: string,
    params?: GetFoldersParams
  ): Promise<{ folders: Folder[] }> {
    const raw = await this.client.get(`/space/${spaceId}/folder`, params);
    return validateResponse(FoldersResponseSchema, raw, 'getFoldersFromSpace') as { folders: Folder[] };
  }

  /**
   * Get lists from a specific folder
   * @param folderId The ID of the folder to get lists from
   * @param params Optional parameters for filtering lists
   * @returns A list of lists
   */
  async getListsFromFolder(folderId: string, params?: GetListsParams): Promise<{ lists: List[] }> {
    const raw = await this.client.get(`/folder/${folderId}/list`, params);
    return validateResponse(ListsResponseSchema, raw, 'getListsFromFolder') as { lists: List[] };
  }

  /**
   * Get a specific folder by ID
   * @param folderId The ID of the folder to get
   * @returns The folder details, including its lists
   */
  async getFolder(folderId: string): Promise<Folder> {
    return this.client.get(`/folder/${folderId}`);
  }

  /**
   * Create a new folder in a space
   * @param spaceId The ID of the space to create the folder in
   * @param params The folder parameters
   * @returns The created folder
   */
  async createFolder(spaceId: string, params: { name: string }): Promise<Folder> {
    return this.client.post(`/space/${spaceId}/folder`, params);
  }

  /**
   * Update an existing folder
   * @param folderId The ID of the folder to update
   * @param params The folder parameters to update
   * @returns The updated folder
   */
  async updateFolder(folderId: string, params: { name: string }): Promise<Folder> {
    return this.client.put(`/folder/${folderId}`, params);
  }

  /**
   * Delete a folder
   * @param folderId The ID of the folder to delete
   * @returns Success message
   */
  async deleteFolder(folderId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/folder/${folderId}`);
  }

  /**
   * Create a new folder from a template in a space
   * @param spaceId The ID of the space to create the folder in
   * @param templateId The ID of the folder template to use (e.g. "t-7162342")
   * @param params The folder parameters
   * @returns The created folder (or a partial response when return_immediately is true)
   */
  async createFolderFromTemplate(
    spaceId: string,
    templateId: string,
    params: CreateFolderFromTemplateParams
  ): Promise<Folder> {
    return this.client.post(`/space/${encodeURIComponent(spaceId)}/folder_template/${encodeURIComponent(templateId)}`, params);
  }

  /**
   * Get the folder templates available in a workspace
   * @param teamId The ID of the workspace (team) to get folder templates from
   * @returns The available folder templates
   */
  async getFolderTemplates(teamId: string): Promise<Record<string, unknown>> {
    return this.client.get(`/team/${encodeURIComponent(teamId)}/folder_template`);
  }
}

export const createFoldersClient = (client: ClickUpClient): FoldersClient => {
  return new FoldersClient(client);
};
