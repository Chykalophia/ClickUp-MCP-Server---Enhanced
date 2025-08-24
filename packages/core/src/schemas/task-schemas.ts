import { z } from 'zod';

/**
 * Schema for individual task creation in bulk operations
 */
export const BulkCreateTaskItemSchema = z.object({
  name: z.string().min(1).describe('The name of the task'),
  description: z.string().optional()
    .describe('The description of the task (supports GitHub Flavored Markdown)'),
  markdown_content: z.string().optional()
    .describe('Raw markdown content for the task description (alternative to description field)'),
  assignees: z.array(z.number()).optional().describe('The IDs of the users to assign to the task'),
  tags: z.array(z.string()).optional().describe('The tags to add to the task'),
  status: z.string().optional().describe('The status of the task'),
  priority: z.number().min(1).max(4).optional().describe('The priority of the task (1-4)'),
  due_date: z.number().optional().describe('The due date of the task (Unix timestamp)'),
  due_date_time: z.boolean().optional().describe('Whether the due date includes a time'),
  time_estimate: z.number().optional().describe('The time estimate for the task (in milliseconds)'),
  start_date: z.number().optional().describe('The start date of the task (Unix timestamp)'),
  start_date_time: z.boolean().optional().describe('Whether the start date includes a time'),
  notify_all: z.boolean().optional().describe('Whether to notify all assignees'),
  parent: z.string().optional().describe('The ID of the parent task'),
  links_to: z.string().optional().describe('The ID of the task to link to'),
  check_required_custom_fields: z.boolean().optional().describe('Whether to check required custom fields'),
  custom_fields: z.array(z.object({
    id: z.string().describe('The ID of the custom field'),
    value: z.any().describe('The value to set')
  })).optional().describe('Custom field values to set')
});

/**
 * Schema for individual task update in bulk operations
 */
export const BulkUpdateTaskItemSchema = z.object({
  task_id: z.string().min(1).describe('The ID of the task to update'),
  name: z.string().optional().describe('The new name of the task'),
  description: z.string().optional()
    .describe('The new description of the task (supports GitHub Flavored Markdown)'),
  markdown_content: z.string().optional()
    .describe('Raw markdown content for the task description (alternative to description field)'),
  assignees: z.array(z.number()).optional().describe('The IDs of the users to assign to the task'),
  status: z.string().optional().describe('The new status of the task'),
  priority: z.number().min(1).max(4).optional().describe('The new priority of the task (1-4)'),
  due_date: z.number().optional().describe('The new due date of the task (Unix timestamp)'),
  due_date_time: z.boolean().optional().describe('Whether the due date includes a time'),
  time_estimate: z.number().optional().describe('The new time estimate for the task (in milliseconds)'),
  start_date: z.number().optional().describe('The new start date of the task (Unix timestamp)'),
  start_date_time: z.boolean().optional().describe('Whether the start date includes a time'),
  notify_all: z.boolean().optional().describe('Whether to notify all assignees')
});

/**
 * Schema for bulk task creation operations
 */
export const BulkCreateTasksSchema = z.object({
  list_id: z.string().min(1).describe('The ID of the list to create tasks in'),
  tasks: z.array(BulkCreateTaskItemSchema).min(1).max(50)
    .describe('Array of tasks to create (maximum 50 tasks per request)'),
  continue_on_error: z.boolean().default(false).describe('Whether to continue creating remaining tasks if one fails')
});

/**
 * Schema for bulk task update operations
 */
export const BulkUpdateTasksSchema = z.object({
  tasks: z.array(BulkUpdateTaskItemSchema).min(1).max(50)
    .describe('Array of task updates to perform (maximum 50 tasks per request)'),
  continue_on_error: z.boolean().default(false).describe('Whether to continue updating remaining tasks if one fails')
});

/**
 * Schema for bulk task operation results
 */
export const BulkTaskResultSchema = z.object({
  success_count: z.number().describe('Number of successful operations'),
  error_count: z.number().describe('Number of failed operations'),
  total_count: z.number().describe('Total number of operations attempted'),
  results: z.array(z.object({
    success: z.boolean().describe('Whether the operation was successful'),
    task_id: z.string().optional().describe('The ID of the created/updated task (if successful)'),
    error: z.string().optional().describe('Error message (if failed)'),
    index: z.number().describe('Index of the task in the original request array')
  })).describe('Detailed results for each task operation'),
  execution_time_ms: z.number().describe('Total execution time in milliseconds')
});

export type BulkCreateTaskItem = z.infer<typeof BulkCreateTaskItemSchema>;
export type BulkUpdateTaskItem = z.infer<typeof BulkUpdateTaskItemSchema>;
export type BulkCreateTasks = z.infer<typeof BulkCreateTasksSchema>;
export type BulkUpdateTasks = z.infer<typeof BulkUpdateTasksSchema>;
export type BulkTaskResult = z.infer<typeof BulkTaskResultSchema>;
