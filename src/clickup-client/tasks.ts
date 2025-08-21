import { ClickUpClient } from './index.js';
import { prepareContentForClickUp, processClickUpResponse } from '../utils/markdown.js';

export interface Task {
  id: string;
  name: string;
  description?: string;
  text_content?: string; // Plain text version of description
  description_markdown?: string; // Markdown version for display
  status?: {
    status: string;
    color: string;
  };
  date_created?: string;
  date_updated?: string;
  date_closed?: string;
  creator?: {
    id: number;
    username: string;
    email: string;
  };
  assignees?: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  priority?: {
    id: string;
    priority: string;
    color: string;
  };
  due_date?: string | null;
  start_date?: string | null;
  time_estimate?: number | null;
  time_spent?: number | null;
  custom_fields?: Array<any>;
  list?: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  space?: {
    id: string;
    name: string;
  };
  url: string;
  subtasks?: Task[]; // Add subtasks property
  parent?: string; // Add parent property
  top_level_parent?: string; // Add top_level_parent property
}

export interface CreateTaskParams {
  name: string;
  description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  time_estimate?: number;
  start_date?: number;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string;
  links_to?: string;
  check_required_custom_fields?: boolean;
  custom_fields?: Array<{
    id: string;
    value: any;
  }>;
}

export interface UpdateTaskParams {
  name?: string;
  description?: string;
  assignees?: number[];
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  time_estimate?: number;
  start_date?: number;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string;
  custom_fields?: Array<{
    id: string;
    value: any;
  }>;
}

export interface GetTasksParams {
  page?: number;
  order_by?: string;
  reverse?: boolean;
  subtasks?: boolean;
  statuses?: string[];
  include_closed?: boolean;
  assignees?: number[];
  due_date_gt?: number;
  due_date_lt?: number;
  date_created_gt?: number;
  date_created_lt?: number;
  date_updated_gt?: number;
  date_updated_lt?: number;
  custom_fields?: Array<{
    field_id: string;
    operator: string;
    value: any;
  }>;
}

export class TasksClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  /**
   * Get tasks from a specific list
   * @param listId The ID of the list to get tasks from
   * @param params Optional parameters for filtering tasks
   * @returns A list of tasks with processed content
   */
  async getTasksFromList(listId: string, params?: GetTasksParams): Promise<{ tasks: Task[] }> {
    const result = await this.client.get(`/list/${listId}/task`, params);
    
    // Process each task's content
    if (result.tasks && Array.isArray(result.tasks)) {
      result.tasks = result.tasks.map((task: any) => processClickUpResponse(task));
    }
    
    return result;
  }

  // Removed pseudo endpoints for getting tasks from spaces and folders

  /**
   * Get a specific task by ID
   * @param taskId The ID of the task to get
   * @param params Optional parameters (include_subtasks)
   * @returns The task details with processed content
   */
  async getTask(taskId: string, params?: { include_subtasks?: boolean }): Promise<Task> {
    const result = await this.client.get(`/task/${taskId}`, params);
    return processClickUpResponse(result);
  }

  /**
   * Create a new task in a list
   * @param listId The ID of the list to create the task in
   * @param params The task parameters (supports markdown in description)
   * @returns The created task with processed content
   */
  async createTask(listId: string, params: CreateTaskParams): Promise<Task> {
    // Process description for markdown support
    const processedParams = { ...params };
    if (params.description) {
      const contentData = prepareContentForClickUp(params.description);
      processedParams.description = contentData.description;
      // Note: ClickUp API doesn't accept text_content on create, it generates it
    }
    
    const result = await this.client.post(`/list/${listId}/task`, processedParams);
    return processClickUpResponse(result);
  }

  /**
   * Update an existing task
   * @param taskId The ID of the task to update
   * @param params The task parameters to update (supports markdown in description)
   * @returns The updated task with processed content
   */
  async updateTask(taskId: string, params: UpdateTaskParams): Promise<Task> {
    // Process description for markdown support
    const processedParams = { ...params };
    if (params.description) {
      const contentData = prepareContentForClickUp(params.description);
      processedParams.description = contentData.description;
      // Note: ClickUp API doesn't accept text_content on update, it generates it
    }
    
    const result = await this.client.put(`/task/${taskId}`, processedParams);
    return processClickUpResponse(result);
  }

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @returns Success message
   */
  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/task/${taskId}`);
  }

  /**
   * Get subtasks of a specific task
   * @param taskId The ID of the task to get subtasks for
   * @returns A list of subtasks
   */
  async getSubtasks(taskId: string): Promise<Task[]> {
    try {
      // First, we need to get the task to find its list ID
      const task = await this.getTask(taskId);
      if (!task.list || !task.list.id) {
        throw new Error('Task does not have a list ID');
      }
      
      // Then, get all tasks from the list with subtasks included
      const result = await this.getTasksFromList(task.list.id, { subtasks: true });
      
      // Filter tasks to find those that have the specified task as parent
      return result.tasks.filter(task => task.parent === taskId);
    } catch (error) {
      console.error(`Error getting subtasks for task ${taskId}:`, error);
      return [];
    }
  }
}

export const createTasksClient = (client: ClickUpClient): TasksClient => {
  return new TasksClient(client);
};
