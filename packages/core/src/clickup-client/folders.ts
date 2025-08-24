import { ClickUpClient } from './index.js';

export interface Folder {
  id: string;
  name: string;
  // ...other folder properties...
}

export interface GetFoldersParams {
  // ...parameters for getting folders...
}

export interface List {
  id: string;
  name: string;
  // ...other list properties...
}

export interface GetListsParams {
  // ...parameters for getting lists...
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
  async getFoldersFromSpace(spaceId: string, params?: GetFoldersParams): Promise<{ folders: Folder[] }> {
    return this.client.get(`/space/${spaceId}/folder`, params);
  }

  /**
   * Get lists from a specific folder
   * @param folderId The ID of the folder to get lists from
   * @param params Optional parameters for filtering lists
   * @returns A list of lists
   */
  async getListsFromFolder(folderId: string, params?: GetListsParams): Promise<{ lists: List[] }> {
    return this.client.get(`/folder/${folderId}/list`, params);
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
}

export const createFoldersClient = (client: ClickUpClient): FoldersClient => {
  return new FoldersClient(client);
};