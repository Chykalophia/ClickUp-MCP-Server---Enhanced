/* eslint-disable no-console */
import { ClickUpClient } from './index.js';
import { prepareContentForClickUp, processClickUpResponse } from '../utils/markdown.js';
import {
  validateResponse,
  TasksResponseSchema,
  TaskTimeInStatusResponseSchema,
  BulkTasksTimeInStatusResponseSchema
} from '../schemas/response-schemas.js';

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
  // Desired set of assignee user IDs. Translated to ClickUp's `{add, rem}`
  // delta envelope inside updateTask — see comment there for why.
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
    const raw = await this.client.get<unknown>(`/list/${listId}/task`, params);
    const result = validateResponse(TasksResponseSchema, raw, 'getTasksFromList');

    // Process each task's content
    if (result.tasks && Array.isArray(result.tasks)) {
      (result as any).tasks = (result.tasks as any[]).map((task: any) => processClickUpResponse(task));
    }

    return result as { tasks: Task[] };
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
    const processedParams: Record<string, unknown> = { ...params };

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

    // ClickUp's Update Task endpoint takes assignees as a `{add, rem}` delta
    // envelope, NOT a flat array like Create Task does. Sending a flat array
    // returns HTTP 200 but silently routes the IDs into the watcher list
    // instead of assigning them. Translate the desired-set input into a delta
    // by diffing against current state.
    if (params.assignees !== undefined) {
      const current = await this.getTask(taskId);
      const currentIds = (current.assignees ?? []).map(a => a.id);
      const desiredIds = params.assignees;
      const add = desiredIds.filter(id => !currentIds.includes(id));
      const rem = currentIds.filter(id => !desiredIds.includes(id));

      if (add.length === 0 && rem.length === 0) {
        // Idempotent no-op — don't send an empty envelope.
        delete processedParams.assignees;
      } else {
        processedParams.assignees = { add, rem };
      }
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
   * Get time-in-status data for a single task.
   *
   * Calls GET /task/{task_id}/time_in_status. Requires the "Total time in Status"
   * ClickApp to be enabled on the workspace; otherwise ClickUp returns an error
   * which is surfaced to the caller.
   *
   * Response schema is lenient: `orderindex` (and other per-entry fields) are
   * optional because ClickUp legitimately omits them on some history rows.
   */
  async getTaskTimeInStatus(
    taskId: string,
    params?: { custom_task_ids?: boolean; team_id?: string }
  ): Promise<{
    current_status?: Record<string, unknown>;
    status_history?: Array<Record<string, unknown>>;
  }> {
    const raw = await this.client.get<unknown>(`/task/${taskId}/time_in_status`, params);
    return validateResponse(
      TaskTimeInStatusResponseSchema,
      raw,
      'getTaskTimeInStatus'
    ) as {
      current_status?: Record<string, unknown>;
      status_history?: Array<Record<string, unknown>>;
    };
  }

  /**
   * Get time-in-status data for multiple tasks in one call.
   *
   * Calls GET /task/bulk_time_in_status/task_ids?task_ids=...
   * ClickUp's underlying endpoint accepts up to 100 task IDs per call.
   * Returns an object keyed by task_id; missing tasks are simply absent.
   */
  async getBulkTasksTimeInStatus(
    taskIds: string[],
    params?: { custom_task_ids?: boolean; team_id?: string }
  ): Promise<Record<string, {
    current_status?: Record<string, unknown>;
    status_history?: Array<Record<string, unknown>>;
  }>> {
    if (!taskIds || taskIds.length < 2) {
      throw new Error(
        'getBulkTasksTimeInStatus requires at least 2 task IDs (ClickUp API constraint). ' +
          'For a single task, call getTaskTimeInStatus instead.'
      );
    }
    if (taskIds.length > 100) {
      throw new Error(
        `getBulkTasksTimeInStatus accepts at most 100 task IDs per call (received ${taskIds.length}).`
      );
    }

    // ClickUp's bulk endpoint expects repeated `task_ids` query params (e.g.,
    // `?task_ids=a&task_ids=b`). Axios's default array serializer emits
    // `task_ids[]=a&task_ids[]=b` which ClickUp rejects — build the query
    // string manually with URLSearchParams instead.
    const search = new URLSearchParams();
    for (const id of taskIds) {
      search.append('task_ids', id);
    }
    if (params?.custom_task_ids !== undefined) {
      search.set('custom_task_ids', String(params.custom_task_ids));
    }
    if (params?.team_id !== undefined) {
      search.set('team_id', params.team_id);
    }
    const raw = await this.client.get<unknown>(
      `/task/bulk_time_in_status/task_ids?${search.toString()}`
    );

    return validateResponse(
      BulkTasksTimeInStatusResponseSchema,
      raw,
      'getBulkTasksTimeInStatus'
    ) as Record<string, {
      current_status?: Record<string, unknown>;
      status_history?: Array<Record<string, unknown>>;
    }>;
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
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get subtasks for task ${taskId}: ${message}`);
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

    const CONCURRENCY = 5;

    if (!continueOnError) {
      // Sequential mode: stop on first error
      for (let i = 0; i < tasks.length; i++) {
        try {
          const task = await this.createTask(listId, tasks[i]);
          results.push({ success: true, task_id: task.id, index: i });
          successCount++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ success: false, error: errorMessage, index: i });
          errorCount++;
          for (let j = i + 1; j < tasks.length; j++) {
            results.push({ success: false, error: 'Skipped due to previous error', index: j });
            errorCount++;
          }
          break;
        }
      }
    } else {
      // Parallel mode: process in chunks of CONCURRENCY
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const chunk = tasks.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map((task, j) => this.createTask(listId, task).then(t => ({ index: i + j, task: t })))
        );
        for (const result of chunkResults) {
          if (result.status === 'fulfilled') {
            results.push({ success: true, task_id: result.value.task.id, index: result.value.index });
            successCount++;
          } else {
            const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
            const idx = results.length + i;
            results.push({ success: false, error: errorMessage, index: idx });
            errorCount++;
          }
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

    const CONCURRENCY = 5;

    if (!continueOnError) {
      // Sequential mode: stop on first error
      for (let i = 0; i < taskUpdates.length; i++) {
        try {
          const { task_id, ...updateParams } = taskUpdates[i];
          const task = await this.updateTask(task_id, updateParams);
          results.push({ success: true, task_id: task.id, index: i });
          successCount++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ success: false, error: errorMessage, index: i });
          errorCount++;
          for (let j = i + 1; j < taskUpdates.length; j++) {
            results.push({ success: false, error: 'Skipped due to previous error', index: j });
            errorCount++;
          }
          break;
        }
      }
    } else {
      // Parallel mode: process in chunks of CONCURRENCY
      for (let i = 0; i < taskUpdates.length; i += CONCURRENCY) {
        const chunk = taskUpdates.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map((update, j) => {
            const { task_id, ...updateParams } = update;
            return this.updateTask(task_id, updateParams).then(t => ({ index: i + j, task: t }));
          })
        );
        for (const result of chunkResults) {
          if (result.status === 'fulfilled') {
            results.push({ success: true, task_id: result.value.task.id, index: result.value.index });
            successCount++;
          } else {
            const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
            const idx = results.length + i;
            results.push({ success: false, error: errorMessage, index: idx });
            errorCount++;
          }
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
