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
  orderindex: number;
  items: ChecklistItem[];
}

export interface CreateChecklistParams {
  name: string;
  // Note: The ClickUp API doesn't support creating items when creating a checklist
  // Items must be created separately using the createChecklistItem method
}

export interface UpdateChecklistParams {
  name: string;
}

export interface CreateChecklistItemParams {
  name: string;
  assignee?: number;
  resolved?: boolean;
}

export interface UpdateChecklistItemParams {
  name?: string;
  assignee?: number;
  resolved?: boolean;
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
   * @returns The created checklist
   */
  async createChecklist(taskId: string, params: CreateChecklistParams): Promise<Checklist> {
    return this.client.post(`/task/${taskId}/checklist`, params);
  }

  /**
   * Update an existing checklist
   * @param checklistId The ID of the checklist to update
   * @param params The checklist parameters to update
   * @returns The updated checklist
   */
  async updateChecklist(checklistId: string, params: UpdateChecklistParams): Promise<Checklist> {
    return this.client.put(`/checklist/${checklistId}`, params);
  }

  /**
   * Delete a checklist
   * @param checklistId The ID of the checklist to delete
   * @returns Success message
   */
  async deleteChecklist(checklistId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/checklist/${checklistId}`);
  }

  /**
   * Create a new checklist item in a checklist
   * @param checklistId The ID of the checklist to create the item in
   * @param params The checklist item parameters
   * @returns The created checklist item
   */
  async createChecklistItem(checklistId: string, params: CreateChecklistItemParams): Promise<ChecklistItem> {
    return this.client.post(`/checklist/${checklistId}/checklist_item`, params);
  }

  /**
   * Update an existing checklist item
   * @param checklistId The ID of the checklist containing the item
   * @param checklistItemId The ID of the checklist item to update
   * @param params The checklist item parameters to update
   * @returns The updated checklist item
   */
  async updateChecklistItem(checklistId: string, checklistItemId: string, params: UpdateChecklistItemParams): Promise<ChecklistItem> {
    return this.client.put(`/checklist/${checklistId}/checklist_item/${checklistItemId}`, params);
  }

  /**
   * Delete a checklist item
   * @param checklistId The ID of the checklist containing the item
   * @param checklistItemId The ID of the checklist item to delete
   * @returns Success message
   */
  async deleteChecklistItem(checklistId: string, checklistItemId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/checklist/${checklistId}/checklist_item/${checklistItemId}`);
  }
}

export const createChecklistsClient = (client: ClickUpClient): ChecklistsClient => {
  return new ChecklistsClient(client);
};
