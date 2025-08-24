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
  markdown_content?: string; // Add support for markdown_content field
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
  markdown_content?: string; // Add support for markdown_content field
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
    
    // Handle description field - check if it contains markdown
    if (params.description) {
      const contentData = prepareContentForClickUp(params.description);
      
      // Remove the original description field
      delete processedParams.description;
      
      // Add the appropriate field(s) based on content type
      if (contentData.markdown_content) {
        processedParams.markdown_content = contentData.markdown_content;
      } else if (contentData.description) {
        processedParams.description = contentData.description;
      }
      
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
    
    // Handle description field - check if it contains markdown
    if (params.description) {
      const contentData = prepareContentForClickUp(params.description);
      
      // Remove the original description field
      delete processedParams.description;
      
      // Add the appropriate field(s) based on content type
      if (contentData.markdown_content) {
        processedParams.markdown_content = contentData.markdown_content;
      } else if (contentData.description) {
        processedParams.description = contentData.description;
      }
      
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
  /**
   * Create multiple tasks in a list (bulk operation)
   * @param listId The ID of the list to create tasks in
   * @param tasks Array of task parameters
   * @param continueOnError Whether to continue if one task fails
   * @returns Results of bulk creation operation
   */
  async bulkCreateTasks(
    listId: string, 
    tasks: CreateTaskParams[], 
    continueOnError: boolean = false
  ): Promise<{
    success_count: number;
    error_count: number;
    total_count: number;
    results: Array<{
      success: boolean;
      task_id?: string;
      error?: string;
      index: number;
    }>;
    execution_time_ms: number;
  }> {
    const startTime = Date.now();
    const results: Array<{
      success: boolean;
      task_id?: string;
      error?: string;
      index: number;
    }> = [];
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      try {
        const task = await this.createTask(listId, tasks[i]);
        results.push({
          success: true,
          task_id: task.id,
          index: i
        });
        successCount++;
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error occurred';
        results.push({
          success: false,
          error: errorMessage,
          index: i
        });
        errorCount++;
        
        // If not continuing on error, break the loop
        if (!continueOnError) {
          // Add remaining tasks as failed
          for (let j = i + 1; j < tasks.length; j++) {
            results.push({
              success: false,
              error: 'Skipped due to previous error',
              index: j
            });
            errorCount++;
          }
          break;
        }
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success_count: successCount,
      error_count: errorCount,
      total_count: tasks.length,
      results,
      execution_time_ms: executionTime
    };
  }

  /**
   * Update multiple tasks (bulk operation)
   * @param taskUpdates Array of task updates with task IDs
   * @param continueOnError Whether to continue if one task fails
   * @returns Results of bulk update operation
   */
  async bulkUpdateTasks(
    taskUpdates: Array<{ task_id: string } & UpdateTaskParams>,
    continueOnError: boolean = false
  ): Promise<{
    success_count: number;
    error_count: number;
    total_count: number;
    results: Array<{
      success: boolean;
      task_id?: string;
      error?: string;
      index: number;
    }>;
    execution_time_ms: number;
  }> {
    const startTime = Date.now();
    const results: Array<{
      success: boolean;
      task_id?: string;
      error?: string;
      index: number;
    }> = [];
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < taskUpdates.length; i++) {
      try {
        const { task_id, ...updateParams } = taskUpdates[i];
        const task = await this.updateTask(task_id, updateParams);
        results.push({
          success: true,
          task_id: task.id,
          index: i
        });
        successCount++;
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error occurred';
        results.push({
          success: false,
          error: errorMessage,
          index: i
        });
        errorCount++;
        
        // If not continuing on error, break the loop
        if (!continueOnError) {
          // Add remaining tasks as failed
          for (let j = i + 1; j < taskUpdates.length; j++) {
            results.push({
              success: false,
              error: 'Skipped due to previous error',
              index: j
            });
            errorCount++;
          }
          break;
        }
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success_count: successCount,
      error_count: errorCount,
      total_count: taskUpdates.length,
      results,
      execution_time_ms: executionTime
    };
  }
}

export const createTasksClient = (client: ClickUpClient): TasksClient => {
  return new TasksClient(client);
};
