/* eslint-disable no-console */
import { ClickUpClient } from './index.js';

export interface AuthorizedUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  avatar: string;
  members: Array<{
    user: {
      id: number;
      username: string;
      email: string;
      color: string;
      profilePicture: string;
    };
    role: number;
    custom_role?: string;
  }>;
}

export class AuthClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get the authorized user's information
   * @returns The authorized user's information
   */
  async getAuthorizedUser(): Promise<AuthorizedUser> {
    try {
      // The API wraps the payload in a { user: {...} } envelope
      const response = await this.client.get<{ user: AuthorizedUser }>('/user');
      return response.user;
    } catch (error) {
      console.error('Error getting authorized user:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the workspaces (teams) that the authorized user belongs to
   * @returns A list of workspaces
   */
  async getWorkspaces(): Promise<{ teams: Workspace[] }> {
    try {
      return await this.client.get('/team');
    } catch (error) {
      console.error('Error getting workspaces:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the spaces in a workspace
   * @param workspaceId The ID of the workspace to get spaces from
   * @returns A list of spaces
   */
  async getSpaces(workspaceId: string): Promise<{
    spaces: Array<{
      id: string;
      name: string;
      private: boolean;
      statuses: Array<{
        id: string;
        status: string;
        type: string;
        orderindex: number;
        color: string;
      }>;
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
    }>;
  }> {
    try {
      return await this.client.get(`/team/${workspaceId}/space`);
    } catch (error) {
      console.error('Error getting spaces:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the folders in a space
   * @param spaceId The ID of the space to get folders from
   * @returns A list of folders
   */
  async getFolders(spaceId: string): Promise<{
    folders: Array<{
      id: string;
      name: string;
      orderindex: number;
      override_statuses: boolean;
      hidden: boolean;
      space: {
        id: string;
        name: string;
      };
      task_count: string;
      lists: Array<{
        id: string;
        name: string;
        orderindex: number;
        status: {
          status: string;
          color: string;
          hide_label: boolean;
        };
        priority: {
          priority: string;
          color: string;
        };
        assignee: {
          id: number;
          username: string;
          color: string;
          initials: string;
          email: string;
          profilePicture: string;
        };
        task_count: number;
        due_date: string;
        start_date: string;
        folder: {
          id: string;
          name: string;
          hidden: boolean;
          access: boolean;
        };
        space: {
          id: string;
          name: string;
          access: boolean;
        };
        archived: boolean;
        override_statuses: boolean;
        permission_level: string;
      }>;
      permission_level: string;
    }>;
  }> {
    try {
      return await this.client.get(`/space/${spaceId}/folder`);
    } catch (error) {
      console.error('Error getting folders:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the lists in a folder
   * @param folderId The ID of the folder to get lists from
   * @returns A list of lists
   */
  async getLists(folderId: string): Promise<{
    lists: Array<{
      id: string;
      name: string;
      orderindex: number;
      status: {
        status: string;
        color: string;
        hide_label: boolean;
      };
      priority: {
        priority: string;
        color: string;
      };
      assignee: {
        id: number;
        username: string;
        color: string;
        initials: string;
        email: string;
        profilePicture: string;
      };
      task_count: number;
      due_date: string;
      start_date: string;
      folder: {
        id: string;
        name: string;
        hidden: boolean;
        access: boolean;
      };
      space: {
        id: string;
        name: string;
        access: boolean;
      };
      archived: boolean;
      override_statuses: boolean;
      permission_level: string;
    }>;
  }> {
    try {
      return await this.client.get(`/folder/${folderId}/list`);
    } catch (error) {
      console.error('Error getting lists:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the lists in a space
   * @param spaceId The ID of the space to get lists from
   * @returns A list of lists
   */
  async getListsFromSpace(spaceId: string): Promise<{
    lists: Array<{
      id: string;
      name: string;
      orderindex: number;
      status: {
        status: string;
        color: string;
        hide_label: boolean;
      };
      priority: {
        priority: string;
        color: string;
      };
      assignee: {
        id: number;
        username: string;
        color: string;
        initials: string;
        email: string;
        profilePicture: string;
      };
      task_count: number;
      due_date: string;
      start_date: string;
      space: {
        id: string;
        name: string;
        access: boolean;
      };
      archived: boolean;
      override_statuses: boolean;
      permission_level: string;
    }>;
  }> {
    try {
      return await this.client.get(`/space/${spaceId}/list`);
    } catch (error) {
      console.error('Error getting lists from space:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the seats information for a workspace
   * @param workspaceId The ID of the workspace to get seats information for
   * @returns Seats information including used, total, and available seats
   */
  async getWorkspaceSeats(workspaceId: string): Promise<{
    members: {
      filled_member_seats: number;
      total_member_seats: number;
      empty_member_seats: number;
    };
    guests: {
      filled_guest_seats: number;
      // Unlimited-guest plans return the string 'Infinity'
      total_guest_seats: number | 'Infinity';
      empty_guest_seats: number | 'Infinity';
    };
  }> {
    try {
      return await this.client.get(`/team/${workspaceId}/seats`);
    } catch (error) {
      console.error('Error getting workspace seats:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the User Groups (ClickUp "Teams" feature) in a workspace
   * @param workspaceId The ID of the workspace to get user groups for
   * @param groupIds Optional comma-separated group IDs to filter by
   * @returns A list of user groups
   */
  async getUserGroups(workspaceId: string, groupIds?: string): Promise<{
    groups: Array<{
      id: string;
      team_id: string;
      userid: number;
      name: string;
      handle: string;
      date_created: string;
      initials: string;
      members: Array<{
        id: number;
        username: string;
        email: string;
        color: string;
        initials: string;
        profilePicture: string | null;
      }>;
      avatar: {
        attachment_id: string | null;
        color: string | null;
        source: string | null;
        icon: string | null;
      };
    }>;
  }> {
    try {
      // group_ids must be sent as repeated query parameters, not one
      // comma-joined value, so build the query string explicitly.
      const search = new URLSearchParams({ team_id: workspaceId });
      if (groupIds) {
        for (const id of groupIds.split(',').map(part => part.trim()).filter(Boolean)) {
          search.append('group_ids', id);
        }
      }
      return await this.client.get(`/group?${search.toString()}`);
    } catch (error) {
      console.error('Error getting user groups:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the pricing plan of a workspace
   * @param workspaceId The ID of the workspace to get the plan for
   * @returns The workspace's current pricing plan id and name
   */
  async getWorkspacePlan(workspaceId: string): Promise<{
    plan_id: number;
    plan_name: string;
  }> {
    try {
      return await this.client.get(`/team/${encodeURIComponent(workspaceId)}/plan`);
    } catch (error) {
      console.error('Error getting workspace plan:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the Custom Roles defined in a workspace
   * @param workspaceId The ID of the workspace to get custom roles for
   * @param includeMembers Whether to include the members assigned to each role
   * @returns A list of custom roles
   */
  async getCustomRoles(workspaceId: string, includeMembers?: boolean): Promise<{
    custom_roles: Array<{
      id: number;
      team_id: string;
      name: string;
      inherited_role: number;
      date_created: string;
      members?: number[];
    }>;
  }> {
    try {
      const params: Record<string, boolean> = {};
      if (includeMembers !== undefined) {
        params.include_members = includeMembers;
      }
      return await this.client.get(`/team/${encodeURIComponent(workspaceId)}/customroles`, params);
    } catch (error) {
      console.error('Error getting custom roles:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export const createAuthClient = (client: ClickUpClient): AuthClient => {
  return new AuthClient(client);
};
