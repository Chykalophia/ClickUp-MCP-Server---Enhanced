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

export interface MemberMatch {
  id: number;
  username: string;
  email: string;
  workspace_id: string;
  role?: number;
}

export interface GuestPermissionParams {
  can_edit_tags?: boolean;
  can_see_time_spent?: boolean;
  can_see_time_estimated?: boolean;
  can_create_views?: boolean;
  can_see_points_estimated?: boolean;
  custom_role_id?: number;
}

export interface GuestInviteParams extends GuestPermissionParams {
  email: string;
}

export type GuestItemType = 'task' | 'list' | 'folder';
export type GuestPermissionLevel = 'read' | 'comment' | 'edit' | 'create';

export interface GuestItemOptions {
  include_shared?: boolean;
  /** Task items only: task_id is a custom task ID (requires team_id) */
  custom_task_ids?: boolean;
  team_id?: string;
}

function guestItemPath(itemType: GuestItemType, itemId: string, guestId: string): string {
  return `/${itemType}/${encodeURIComponent(itemId)}/guest/${encodeURIComponent(guestId)}`;
}

/** Query-string suffix ('' or '?...') for the guest item endpoints. */
function guestItemQuery(itemType: GuestItemType, options: GuestItemOptions): string {
  const query = new URLSearchParams();
  if (options.include_shared !== undefined) {
    query.set('include_shared', String(options.include_shared));
  }
  if (options.custom_task_ids) {
    if (itemType !== 'task') {
      throw new Error('custom_task_ids only applies to task items');
    }
    if (!options.team_id) {
      throw new Error('team_id is required when custom_task_ids is true');
    }
    query.set('custom_task_ids', 'true');
    query.set('team_id', options.team_id);
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
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
      console.error(
        'Error getting authorized user:',
        error instanceof Error ? error.message : error
      );
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
      console.error(
        'Error getting lists from space:',
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  /**
   * Get the seats information for a workspace
   * @param workspaceId The ID of the workspace to get seats information for
   * @returns Seats information including used, total, and available seats
   */
  async getWorkspaceSeats(workspaceId: string): Promise<{
    // Seat counts are returned at the TOP LEVEL of the response body.
    filled_member_seats: number;
    total_member_seats: number;
    empty_member_seats: number;
    filled_guest_seats: number;
    // Unlimited-guest plans return the string 'Infinity'
    total_guest_seats: number | 'Infinity';
    empty_guest_seats: number | 'Infinity';
    // The API may also return the member/guest collections alongside the counts.
    members?: Array<Record<string, unknown>>;
    guests?: Array<Record<string, unknown>>;
  }> {
    try {
      return await this.client.get(`/team/${workspaceId}/seats`);
    } catch (error) {
      console.error(
        'Error getting workspace seats:',
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  /**
   * Get the User Groups (ClickUp "Teams" feature) in a workspace
   * @param workspaceId The ID of the workspace to get user groups for
   * @param groupIds Optional comma-separated group IDs to filter by
   * @returns A list of user groups
   */
  async getUserGroups(
    workspaceId: string,
    groupIds?: string
  ): Promise<{
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
        for (const id of groupIds
          .split(',')
          .map(part => part.trim())
          .filter(Boolean)) {
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
      console.error(
        'Error getting workspace plan:',
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  /**
   * Get the Custom Roles defined in a workspace
   * @param workspaceId The ID of the workspace to get custom roles for
   * @param includeMembers Whether to include the members assigned to each role
   * @returns A list of custom roles
   */
  async getCustomRoles(
    workspaceId: string,
    includeMembers?: boolean
  ): Promise<{
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

  // ========================================
  // MEMBER LOOKUP
  // ========================================

  /**
   * Find workspace members whose username or email contains `query`
   * (case-insensitive substring). Uses the authorized-workspaces endpoint
   * (GET /team), which carries each workspace's member roster. When
   * workspaceId is omitted, every authorized workspace is searched.
   */
  async findMembers(query: string, workspaceId?: string): Promise<MemberMatch[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      throw new Error('query must not be empty');
    }
    const { teams } = await this.getWorkspaces();
    const workspaces = (teams ?? []).filter(
      team => workspaceId === undefined || String(team.id) === String(workspaceId)
    );
    if (workspaceId !== undefined && workspaces.length === 0) {
      throw new Error(`Workspace ${workspaceId} is not one of the authorized workspaces`);
    }

    const matches: MemberMatch[] = [];
    for (const team of workspaces) {
      for (const member of team.members ?? []) {
        const user = member?.user;
        if (!user) continue;
        const username = typeof user.username === 'string' ? user.username : '';
        const email = typeof user.email === 'string' ? user.email : '';
        if (username.toLowerCase().includes(needle) || email.toLowerCase().includes(needle)) {
          matches.push({
            id: user.id,
            username,
            email,
            workspace_id: String(team.id),
            ...(member.role !== undefined ? { role: member.role } : {}),
          });
        }
      }
    }
    return matches;
  }

  // ========================================
  // USER GROUPS
  // ========================================

  /** Create a User Group (POST /team/{team_id}/group). */
  async createUserGroup(
    workspaceId: string,
    params: { name: string; members: number[]; handle?: string }
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/team/${encodeURIComponent(workspaceId)}/group`, params);
  }

  /**
   * Update a User Group (PUT /group/{group_id}). Membership changes are a
   * delta: ClickUp requires both `add` and `rem` inside `members`.
   */
  async updateUserGroup(
    groupId: string,
    params: { name?: string; handle?: string; add_members?: number[]; remove_members?: number[] }
  ): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.handle !== undefined) body.handle = params.handle;
    if (params.add_members !== undefined || params.remove_members !== undefined) {
      body.members = { add: params.add_members ?? [], rem: params.remove_members ?? [] };
    }
    if (Object.keys(body).length === 0) {
      throw new Error('Provide at least one of name, handle, add_members or remove_members');
    }
    return this.client.put(`/group/${encodeURIComponent(groupId)}`, body);
  }

  /** Delete a User Group (DELETE /group/{group_id}). */
  async deleteUserGroup(groupId: string): Promise<Record<string, never>> {
    return this.client.delete(`/group/${encodeURIComponent(groupId)}`);
  }

  // ========================================
  // GUESTS (Enterprise plan)
  // ========================================

  /** Invite a guest to a workspace (POST /team/{team_id}/guest). */
  async inviteGuest(
    workspaceId: string,
    params: GuestInviteParams
  ): Promise<Record<string, unknown>> {
    return this.client.post(`/team/${encodeURIComponent(workspaceId)}/guest`, params);
  }

  /** Get a guest (GET /team/{team_id}/guest/{guest_id}). */
  async getGuest(workspaceId: string, guestId: string): Promise<Record<string, unknown>> {
    return this.client.get(
      `/team/${encodeURIComponent(workspaceId)}/guest/${encodeURIComponent(guestId)}`
    );
  }

  /** Edit a guest's workspace permissions (PUT /team/{team_id}/guest/{guest_id}). */
  async editGuest(
    workspaceId: string,
    guestId: string,
    params: GuestPermissionParams
  ): Promise<Record<string, unknown>> {
    return this.client.put(
      `/team/${encodeURIComponent(workspaceId)}/guest/${encodeURIComponent(guestId)}`,
      params
    );
  }

  /** Remove a guest from a workspace (DELETE /team/{team_id}/guest/{guest_id}). */
  async removeGuest(workspaceId: string, guestId: string): Promise<Record<string, unknown>> {
    return this.client.delete(
      `/team/${encodeURIComponent(workspaceId)}/guest/${encodeURIComponent(guestId)}`
    );
  }

  /**
   * Share a task, List or Folder with a guest
   * (POST /{task|list|folder}/{id}/guest/{guest_id}).
   */
  async addGuestToItem(
    itemType: GuestItemType,
    itemId: string,
    guestId: string,
    permissionLevel: GuestPermissionLevel,
    options: GuestItemOptions = {}
  ): Promise<Record<string, unknown>> {
    return this.client.post(
      `${guestItemPath(itemType, itemId, guestId)}${guestItemQuery(itemType, options)}`,
      { permission_level: permissionLevel }
    );
  }

  /**
   * Stop sharing a task, List or Folder with a guest
   * (DELETE /{task|list|folder}/{id}/guest/{guest_id}).
   */
  async removeGuestFromItem(
    itemType: GuestItemType,
    itemId: string,
    guestId: string,
    options: GuestItemOptions = {}
  ): Promise<Record<string, unknown>> {
    return this.client.delete(
      `${guestItemPath(itemType, itemId, guestId)}${guestItemQuery(itemType, options)}`
    );
  }
}

export const createAuthClient = (client: ClickUpClient): AuthClient => {
  return new AuthClient(client);
};
