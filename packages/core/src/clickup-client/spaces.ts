import { ClickUpClient } from './index.js';
import { validateResponse, SpacesResponseSchema } from '../schemas/response-schemas.js';

// Space interface based on ClickUp API response
export interface Space {
  id: string;
  name: string;
  private: boolean;
  statuses: any[];
  multiple_assignees: boolean;
  features: {
    due_dates: {
      enabled: boolean;
      start_date: boolean;
      remap_due_dates: boolean;
      remap_closed_due_date: boolean;
    };
    time_tracking: {
      enabled: boolean;
    };
    tags: {
      enabled: boolean;
    };
    time_estimates: {
      enabled: boolean;
    };
    checklists: {
      enabled: boolean;
    };
    custom_fields: {
      enabled: boolean;
    };
    remap_dependencies: {
      enabled: boolean;
    };
    dependency_warning: {
      enabled: boolean;
    };
    portfolios: {
      enabled: boolean;
    };
  };
  archived: boolean;
}

// Feature configuration accepted by the Create/Update Space endpoints
export interface SpaceFeaturesParams {
  due_dates?: {
    enabled?: boolean;
    start_date?: boolean;
    remap_due_dates?: boolean;
    remap_closed_due_date?: boolean;
  };
  time_tracking?: {
    enabled?: boolean;
  };
  tags?: {
    enabled?: boolean;
  };
  time_estimates?: {
    enabled?: boolean;
  };
  checklists?: {
    enabled?: boolean;
  };
  custom_fields?: {
    enabled?: boolean;
  };
}

export interface CreateSpaceParams {
  name: string;
  multiple_assignees?: boolean;
  features?: SpaceFeaturesParams;
}

export interface UpdateSpaceParams {
  name?: string;
  color?: string;
  private?: boolean;
  admin_can_manage?: boolean;
  multiple_assignees?: boolean;
  features?: SpaceFeaturesParams;
}

// Space tag based on ClickUp API response
export interface SpaceTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator?: number;
}

export interface SpaceTagParams {
  name: string;
  tag_fg?: string;
  tag_bg?: string;
}

export class SpacesClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get spaces from a specific workspace
   * @param workspaceId The ID of the workspace to get spaces from
   * @param params Optional parameters (archived: include archived spaces, default false)
   * @returns A list of spaces
   */
  async getSpacesFromWorkspace(
    workspaceId: string,
    params?: { archived?: boolean }
  ): Promise<Space[]> {
    // Use the v2 API endpoint for spaces
    const raw = await this.client.get<unknown>(`/team/${workspaceId}/space`, params);
    const response = validateResponse(SpacesResponseSchema, raw, 'getSpacesFromWorkspace');
    return response.spaces as Space[];
  }

  /**
   * Get a specific space by ID
   * @param spaceId The ID of the space to get
   * @returns The space details
   */
  async getSpace(spaceId: string): Promise<Space> {
    const response = await this.client.get<Space>(`/space/${spaceId}`);
    return response;
  }

  /**
   * Create a new space in a workspace
   * @param workspaceId The ID of the workspace to create the space in
   * @param params The space parameters (name required; multiple_assignees and features optional)
   * @returns The created space
   */
  async createSpace(workspaceId: string, params: CreateSpaceParams): Promise<Space> {
    return this.client.post<Space>(`/team/${workspaceId}/space`, params);
  }

  /**
   * Update an existing space
   * @param spaceId The ID of the space to update
   * @param params The space parameters to update
   * @returns The updated space
   */
  async updateSpace(spaceId: string, params: UpdateSpaceParams): Promise<Space> {
    return this.client.put<Space>(`/space/${spaceId}`, params);
  }

  /**
   * Delete a space permanently, including all folders, lists, and tasks it contains
   * @param spaceId The ID of the space to delete
   * @returns Empty response on success
   */
  async deleteSpace(spaceId: string): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/space/${spaceId}`);
  }

  /**
   * Get the task tags defined in a space
   * @param spaceId The ID of the space to get tags from
   * @returns A list of space tags
   */
  async getSpaceTags(spaceId: string): Promise<SpaceTag[]> {
    const response = await this.client.get<{ tags: SpaceTag[] }>(`/space/${spaceId}/tag`);
    return response.tags;
  }

  /**
   * Create a new task tag in a space
   * @param spaceId The ID of the space to create the tag in
   * @param tag The tag parameters (name required; tag_fg/tag_bg optional hex colors)
   * @returns Empty response on success
   */
  async createSpaceTag(spaceId: string, tag: SpaceTagParams): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(`/space/${spaceId}/tag`, { tag });
  }

  /**
   * Edit an existing task tag in a space
   * @param spaceId The ID of the space containing the tag
   * @param tagName The current name of the tag to edit
   * @param tag The updated tag parameters
   * @returns Empty response on success
   */
  async editSpaceTag(
    spaceId: string,
    tagName: string,
    tag: SpaceTagParams
  ): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(
      `/space/${spaceId}/tag/${encodeURIComponent(tagName)}`,
      { tag }
    );
  }

  /**
   * Delete a task tag from a space
   * @param spaceId The ID of the space containing the tag
   * @param tagName The name of the tag to delete
   * @returns Empty response on success
   */
  async deleteSpaceTag(spaceId: string, tagName: string): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/space/${spaceId}/tag/${encodeURIComponent(tagName)}`
    );
  }
}

export const createSpacesClient = (client: ClickUpClient): SpacesClient => {
  return new SpacesClient(client);
};
