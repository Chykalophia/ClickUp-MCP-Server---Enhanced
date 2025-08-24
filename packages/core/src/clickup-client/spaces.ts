import { ClickUpClient } from './index.js';

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

export class SpacesClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get spaces from a specific workspace
   * @param workspaceId The ID of the workspace to get spaces from
   * @returns A list of spaces
   */
  async getSpacesFromWorkspace(workspaceId: string): Promise<Space[]> {
    // Use the v2 API endpoint for spaces
    const response = await this.client.get(`/team/${workspaceId}/space`);
    return response.spaces;
  }

  /**
   * Get a specific space by ID
   * @param spaceId The ID of the space to get
   * @returns The space details
   */
  async getSpace(spaceId: string): Promise<Space> {
    const response = await this.client.get(`/space/${spaceId}`);
    return response;
  }
}

export const createSpacesClient = (client: ClickUpClient): SpacesClient => {
  return new SpacesClient(client);
};
