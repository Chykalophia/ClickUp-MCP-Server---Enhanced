/* eslint-disable max-len */
import { ClickUpClient } from './index.js';

export interface ChecklistItem {
  id: string;
  name: string;
  orderindex: number;
  resolved: boolean;
  assignee: {
    id: number;
    username: string;
    email: string;
  } | null;
  parent: string | null;
}

export interface Checklist {
  id: string;
  task_id: string;
  name: string;
  date_created?: string;
  orderindex: number;
  /** Number of resolved items in the checklist */
  resolved: number;
  /** Number of unresolved items in the checklist */
  unresolved: number;
  items: ChecklistItem[];
}

export interface CreateChecklistParams {
  name: string;
  // Note: The ClickUp API doesn't support creating items when creating a checklist
  // Items must be created separately using the createChecklistItem method
}

export interface CreateChecklistOptions {
  custom_task_ids?: boolean;
  team_id?: string;
}

export interface UpdateChecklistParams {
  name?: string;
  /** Order of appearance of the checklist on the task; 0 = top */
  position?: number;
}

export interface CreateChecklistItemParams {
  name: string;
  assignee?: number;
  // Note: The Create Checklist Item endpoint does not accept 'resolved';
  // resolve an item via updateChecklistItem after creating it
}

export interface UpdateChecklistItemParams {
  name?: string;
  assignee?: number | string | null;
  resolved?: boolean;
  /** Checklist item ID to nest this item under, or null to un-nest */
  parent?: string | null;
}

export class ChecklistsClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Create a new checklist in a task
   * @param taskId The ID of the task to create the checklist in
   * @param params The checklist parameters
   * @param options Optional custom_task_ids/team_id query params (needed when
   *   taskId is a custom task ID)
   * @returns The created checklist (unwrapped from ClickUp's { checklist } envelope)
   */
  async createChecklist(
    taskId: string,
    params: CreateChecklistParams,
    options?: CreateChecklistOptions
  ): Promise<Checklist> {
    // ClickUpClient.post has no query-param passthrough, so build the query
    // string manually (same approach as tasks.ts getBulkTasksTimeInStatus).
    const search = new URLSearchParams();
    if (options?.custom_task_ids !== undefined) {
      search.set('custom_task_ids', String(options.custom_task_ids));
    }
    if (options?.team_id !== undefined) {
      search.set('team_id', options.team_id);
    }
    const query = search.toString();
    const endpoint = query ? `/task/${taskId}/checklist?${query}` : `/task/${taskId}/checklist`;
    const response = await this.client.post<{ checklist: Checklist }>(endpoint, params);
    return response.checklist;
  }

  /**
   * Update an existing checklist (rename and/or reorder)
   * @param checklistId The ID of the checklist to update
   * @param params The checklist parameters to update (name and/or position)
   * @returns An empty object — ClickUp returns {} for this endpoint; use Get Task
   *   to see the updated checklist state
   */
  async updateChecklist(
    checklistId: string,
    params: UpdateChecklistParams
  ): Promise<Record<string, never>> {
    return this.client.put(`/checklist/${checklistId}`, params);
  }

  /**
   * Delete a checklist
   * @param checklistId The ID of the checklist to delete
   * @returns An empty object — ClickUp returns {} for this endpoint
   */
  async deleteChecklist(checklistId: string): Promise<Record<string, never>> {
    return this.client.delete(`/checklist/${checklistId}`);
  }

  /**
   * Create a new checklist item in a checklist
   * @param checklistId The ID of the checklist to create the item in
   * @param params The checklist item parameters
   * @returns The full parent checklist (including all items), unwrapped from
   *   ClickUp's { checklist } envelope — the API does not return the bare item
   */
  async createChecklistItem(
    checklistId: string,
    params: CreateChecklistItemParams
  ): Promise<Checklist> {
    const response = await this.client.post<{ checklist: Checklist }>(
      `/checklist/${checklistId}/checklist_item`,
      params
    );
    return response.checklist;
  }

  /**
   * Update an existing checklist item
   * @param checklistId The ID of the checklist containing the item
   * @param checklistItemId The ID of the checklist item to update
   * @param params The checklist item parameters to update
   * @returns The full parent checklist (including all items), unwrapped from
   *   ClickUp's { checklist } envelope — the API does not return the bare item
   */
  async updateChecklistItem(
    checklistId: string,
    checklistItemId: string,
    params: UpdateChecklistItemParams
  ): Promise<Checklist> {
    const response = await this.client.put<{ checklist: Checklist }>(
      `/checklist/${checklistId}/checklist_item/${checklistItemId}`,
      params
    );
    return response.checklist;
  }

  /**
   * Delete a checklist item
   * @param checklistId The ID of the checklist containing the item
   * @param checklistItemId The ID of the checklist item to delete
   * @returns An empty object — ClickUp returns {} for this endpoint
   */
  async deleteChecklistItem(
    checklistId: string,
    checklistItemId: string
  ): Promise<Record<string, never>> {
    return this.client.delete(`/checklist/${checklistId}/checklist_item/${checklistItemId}`);
  }
}

export const createChecklistsClient = (client: ClickUpClient): ChecklistsClient => {
  return new ChecklistsClient(client);
};
