/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import {
  createEnhancedTimeTrackingClient,
  CreateTimeEntryParams,
  UpdateTimeEntryParams,
} from '../clickup-client/time-tracking-enhanced.js';
import { mcpError } from '../utils/error-handling.js';
// Schemas imported from time-tracking-schemas if needed:
// TeamIdSchema, TimerIdSchema, CreateTimeEntrySchema,
// UpdateTimeEntrySchema, GetTimeEntriesSchema, TimeEntryTagSchema

// Create clients
const clickUpClient = createClickUpClient();
const timeTrackingClient = createEnhancedTimeTrackingClient(clickUpClient);

export function setupTimeTrackingTools(server: McpServer): void {
  // ========================================
  // TIME ENTRY MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_time_entries',
    'Get time entries for a team with filtering options. Supports filtering by date range, user, task, and project.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get time entries for'),
      start_date: z
        .number()
        .positive()
        .optional()
        .describe('Filter by start date (Unix timestamp in milliseconds)'),
      end_date: z
        .number()
        .positive()
        .optional()
        .describe('Filter by end date (Unix timestamp in milliseconds)'),
      assignee: z
        .union([z.number().positive(), z.string().min(1)])
        .optional()
        .describe(
          'Filter by user ID. For multiple users, pass a comma-separated string of user IDs (e.g. "1234,9876")'
        ),
      include_task_tags: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include task tags in response'),
      include_location_names: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include location names'),
      space_id: z.string().optional().describe('Filter by space ID'),
      folder_id: z.string().optional().describe('Filter by folder ID'),
      list_id: z.string().optional().describe('Filter by list ID'),
      task_id: z.string().optional().describe('Filter by task ID'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "PROJ-123")'),
    },
    async ({
      team_id,
      start_date,
      end_date,
      assignee,
      include_task_tags,
      include_location_names,
      space_id,
      folder_id,
      list_id,
      task_id,
      custom_task_ids,
    }) => {
      try {
        const params = {
          start_date,
          end_date,
          assignee,
          include_task_tags,
          include_location_names,
          space_id,
          folder_id,
          list_id,
          task_id,
          custom_task_ids,
        };

        const timeEntries = await timeTrackingClient.getTimeEntries(team_id, params);

        return {
          content: [
            {
              type: 'text',
              text: `Time entries for team ${team_id}:\n\n${JSON.stringify(timeEntries, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting time entries', error);
      }
    }
  );

  server.tool(
    'clickup_create_time_entry',
    'Create a new time entry for time tracking. Can be used for manual time logging or creating timer-based entries.',
    {
      team_id: z.string().min(1).describe('The ID of the team to create the time entry for'),
      description: z.string().min(1).describe('Description of the time entry'),
      start: z.number().positive().describe('Start time (Unix timestamp in milliseconds)'),
      billable: z.boolean().default(false).describe('Whether the time is billable'),
      duration: z.number().positive().optional().describe('Duration in milliseconds. Provide either duration or stop, not both.'),
      stop: z.number().positive().optional().describe('End time (Unix timestamp in milliseconds). Provide either stop or duration, not both.'),
      task_id: z.string().optional().describe('Associated task ID'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "PROJ-123")'),
      assignee: z.number().positive().optional().describe('User ID for the time entry'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
            tag_fg: z.string().optional().describe('Tag foreground color'),
            tag_bg: z.string().optional().describe('Tag background color'),
          })
        )
        .optional()
        .describe('Array of tags for the time entry'),
    },
    async ({
      team_id,
      description,
      start,
      billable,
      duration,
      stop,
      task_id,
      custom_task_ids,
      assignee,
      tags,
    }) => {
      try {
        if (duration && stop) {
          return {
            content: [{ type: 'text', text: 'Error: Provide either duration or stop, not both.' }],
            isError: true
          };
        }

        if (!duration && !stop) {
          return {
            content: [{ type: 'text', text: 'Error: Provide either duration or stop to define the time entry length.' }],
            isError: true
          };
        }

        const params: CreateTimeEntryParams = {
          description,
          start,
          billable,
          ...(duration ? { duration } : {}),
          ...(stop ? { stop } : {}),
          tid: task_id,
          custom_task_ids,
          assignee,
          tags,
        };

        const timeEntry = await timeTrackingClient.createTimeEntry(team_id, params);

        return {
          content: [
            {
              type: 'text',
              text: `Time entry created successfully!\n\n${JSON.stringify(timeEntry, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating time entry', error);
      }
    }
  );

  server.tool(
    'clickup_update_time_entry',
    'Update an existing time entry. Can modify description, times, billable status, and associated task.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to update'),
      description: z.string().min(1).optional().describe('New description for the time entry'),
      start: z
        .number()
        .positive()
        .optional()
        .describe('New start time (Unix timestamp in milliseconds)'),
      duration: z
        .number()
        .positive()
        .optional()
        .describe('New duration in milliseconds. Provide either duration or stop, not both.'),
      stop: z
        .number()
        .positive()
        .optional()
        .describe(
          'New end time (Unix timestamp in milliseconds); sent to the API as the "end" body field. Provide either stop or duration, not both.'
        ),
      billable: z.boolean().optional().describe('Update billable status'),
      task_id: z.string().optional().describe('Change associated task ID'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "PROJ-123")'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
            tag_fg: z.string().optional().describe('Tag foreground color'),
            tag_bg: z.string().optional().describe('Tag background color'),
          })
        )
        .optional()
        .describe('Tags to add to or remove from the time entry (see tag_action)'),
      tag_action: z
        .enum(['replace', 'add', 'remove'])
        .optional()
        .describe('Whether to replace, add, or remove the supplied tags. Defaults to "add" when tags are provided.'),
    },
    async ({
      team_id,
      timer_id,
      description,
      start,
      duration,
      stop,
      billable,
      task_id,
      custom_task_ids,
      tags,
      tag_action,
    }) => {
      try {
        if (duration && stop) {
          return {
            content: [{ type: 'text', text: 'Error: Provide either duration or stop, not both.' }],
            isError: true
          };
        }

        const params: UpdateTimeEntryParams = {
          description,
          start,
          billable,
          ...(duration ? { duration } : {}),
          ...(stop ? { stop } : {}),
          tid: task_id,
          custom_task_ids,
          tags,
          tag_action,
        };

        const updatedTimeEntry = await timeTrackingClient.updateTimeEntry(
          team_id,
          timer_id,
          params
        );

        return {
          content: [
            {
              type: 'text',
              text: `Time entry updated successfully!\n\n${JSON.stringify(updatedTimeEntry, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating time entry', error);
      }
    }
  );

  server.tool(
    'clickup_delete_time_entry',
    'Delete a time entry from ClickUp. This action cannot be undone.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to delete'),
    },
    async ({ team_id, timer_id }) => {
      try {
        await timeTrackingClient.deleteTimeEntry(team_id, timer_id);

        return {
          content: [
            {
              type: 'text',
              text: `Time entry ${timer_id} deleted successfully from team ${team_id}.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting time entry', error);
      }
    }
  );

  server.tool(
    'clickup_get_time_entry',
    'Get a single time entry by its ID.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to retrieve'),
    },
    async ({ team_id, timer_id }) => {
      try {
        const timeEntry = await timeTrackingClient.getTimeEntry(team_id, timer_id);

        return {
          content: [
            {
              type: 'text',
              text: `Time entry ${timer_id}:\n\n${JSON.stringify(timeEntry, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting time entry', error);
      }
    }
  );

  server.tool(
    'clickup_get_time_entry_history',
    'Get the change history of a time entry. Useful for auditing who edited tracked time.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to get history for'),
    },
    async ({ team_id, timer_id }) => {
      try {
        const history = await timeTrackingClient.getTimeEntryHistory(team_id, timer_id);

        return {
          content: [
            {
              type: 'text',
              text: `History for time entry ${timer_id}:\n\n${JSON.stringify(history, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting time entry history', error);
      }
    }
  );

  // ========================================
  // TIME ENTRY TAGS
  // ========================================

  server.tool(
    'clickup_get_time_entry_tags',
    'Get all tags that have been used on time entries in a Workspace.',
    {
      team_id: z.string().min(1).describe('The ID of the team (Workspace)'),
    },
    async ({ team_id }) => {
      try {
        const tags = await timeTrackingClient.getTimeEntryTags(team_id);

        return {
          content: [
            {
              type: 'text',
              text: `Time entry tags for team ${team_id}:\n\n${JSON.stringify(tags, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting time entry tags', error);
      }
    }
  );

  server.tool(
    'clickup_add_tags_to_time_entries',
    'Add tags to one or more time entries in bulk.',
    {
      team_id: z.string().min(1).describe('The ID of the team (Workspace)'),
      time_entry_ids: z
        .array(z.string().min(1))
        .min(1)
        .describe('Array of time entry IDs to add the tags to'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
            tag_fg: z.string().optional().describe('Tag foreground color'),
            tag_bg: z.string().optional().describe('Tag background color'),
          })
        )
        .min(1)
        .describe('Array of tags to add to the time entries'),
    },
    async ({ team_id, time_entry_ids, tags }) => {
      try {
        await timeTrackingClient.addTagsToTimeEntries(team_id, time_entry_ids, tags);

        return {
          content: [
            {
              type: 'text',
              text: `Tags added successfully to ${time_entry_ids.length} time entr${time_entry_ids.length === 1 ? 'y' : 'ies'} in team ${team_id}.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('adding tags to time entries', error);
      }
    }
  );

  // ========================================
  // TIMER OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_running_timers',
    'Get the currently running time entry (timer) for the authenticated user, or for a specific user via assignee. The ClickUp API returns at most one running timer per user.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get the running timer for'),
      assignee: z
        .number()
        .positive()
        .optional()
        .describe('User ID to get the running timer for (defaults to the authenticated user)'),
    },
    async ({ team_id, assignee }) => {
      try {
        const runningTimer = await timeTrackingClient.getRunningTimer(team_id, assignee);

        if (!runningTimer) {
          return {
            content: [
              {
                type: 'text',
                text: `No running timer found in team ${team_id}.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Running timer for team ${team_id}:\n\n${JSON.stringify(runningTimer, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting running timer', error);
      }
    }
  );

  server.tool(
    'clickup_start_timer',
    'Start a timer for the authenticated user. Optionally associate with a task and set description, billable status, and tags.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      task_id: z.string().optional().describe('Task ID to associate with the timer'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "PROJ-123")'),
      description: z.string().optional().describe('Description for the time entry'),
      billable: z.boolean().optional().describe('Whether the time is billable'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
            tag_fg: z.string().optional().describe('Tag foreground color'),
            tag_bg: z.string().optional().describe('Tag background color'),
          })
        )
        .optional()
        .describe('Array of tags for the time entry'),
    },
    async ({ team_id, task_id, custom_task_ids, description, billable, tags }) => {
      try {
        const timeEntry = await timeTrackingClient.startTimer(team_id, {
          tid: task_id,
          custom_task_ids,
          description,
          billable,
          tags,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Timer started successfully in team ${team_id}.\n\n${JSON.stringify(timeEntry, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('starting timer', error);
      }
    }
  );

  server.tool(
    'clickup_stop_timer',
    'Stop the running timer for the authenticated user. Returns the stopped time entry.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
    },
    async ({ team_id }) => {
      try {
        const timeEntry = await timeTrackingClient.stopTimer(team_id);

        return {
          content: [
            {
              type: 'text',
              text: `Timer stopped successfully in team ${team_id}.\n\n${JSON.stringify(timeEntry, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('stopping timer', error);
      }
    }
  );

  // ========================================
  // TIME ANALYTICS & REPORTING
  // ========================================

  server.tool(
    'clickup_get_time_summary',
    'Get time tracking summary and analytics. Provides aggregated time data with breakdowns by user and task.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get time summary for'),
      start_date: z
        .number()
        .positive()
        .optional()
        .describe('Filter by start date (Unix timestamp in milliseconds)'),
      end_date: z
        .number()
        .positive()
        .optional()
        .describe('Filter by end date (Unix timestamp in milliseconds)'),
      assignee: z
        .union([z.number().positive(), z.string().min(1)])
        .optional()
        .describe(
          'Filter by user ID. For multiple users, pass a comma-separated string of user IDs (e.g. "1234,9876")'
        ),
      task_id: z.string().optional().describe('Filter by task ID'),
      list_id: z.string().optional().describe('Filter by list ID'),
      folder_id: z.string().optional().describe('Filter by folder ID'),
      space_id: z.string().optional().describe('Filter by space ID'),
    },
    async ({ team_id, start_date, end_date, assignee, task_id, list_id, folder_id, space_id }) => {
      try {
        const params = {
          start_date,
          end_date,
          assignee,
          task_id,
          list_id,
          folder_id,
          space_id,
        };

        const timeSummary = await timeTrackingClient.getTimeSummary(team_id, params);

        // Format durations for better readability
        const formatDuration = (ms: number) => timeTrackingClient.formatDuration(ms);

        const formattedSummary = {
          ...timeSummary,
          total_duration_formatted: formatDuration(timeSummary.total_duration),
          billable_duration_formatted: formatDuration(timeSummary.billable_duration),
          non_billable_duration_formatted: formatDuration(timeSummary.non_billable_duration),
        };

        return {
          content: [
            {
              type: 'text',
              text: `Time summary for team ${team_id}:\n\n${JSON.stringify(formattedSummary, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting time summary', error);
      }
    }
  );

  // ========================================
  // HELPER TOOLS
  // ========================================

  server.tool(
    'clickup_create_timer_entry',
    'Create a new time entry and immediately start the timer. Convenient for starting time tracking in one step.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      description: z.string().min(1).describe('Description of what you are working on'),
      task_id: z.string().optional().describe('Associated task ID'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "PROJ-123")'),
      billable: z.boolean().default(false).describe('Whether the time is billable'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
            tag_fg: z.string().optional().describe('Tag foreground color'),
            tag_bg: z.string().optional().describe('Tag background color'),
          })
        )
        .optional()
        .describe('Array of tags for the time entry'),
    },
    async ({ team_id, description, task_id, custom_task_ids, billable, tags }) => {
      try {
        const timeEntry = await timeTrackingClient.startTimer(team_id, {
          tid: task_id,
          custom_task_ids,
          description,
          billable,
          tags,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Timer started successfully in team ${team_id}.${task_id ? ` Associated with task ${task_id}.` : ''}\n\n${JSON.stringify(timeEntry, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating timer entry', error);
      }
    }
  );

  server.tool(
    'clickup_format_duration',
    'Format a duration from milliseconds to human-readable format. Useful for displaying time tracking data.',
    {
      milliseconds: z.number().min(0).describe('Duration in milliseconds'),
      include_seconds: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include seconds in the formatted output'),
      format: z
        .enum(['milliseconds', 'seconds', 'minutes', 'hours'])
        .optional()
        .default('milliseconds')
        .describe('Convert to specific time unit'),
    },
    async ({ milliseconds, include_seconds, format }) => {
      try {
        const formattedDuration = timeTrackingClient.formatDuration(milliseconds, include_seconds);
        const convertedValue = timeTrackingClient.convertDuration(milliseconds, format);

        return {
          content: [
            {
              type: 'text',
              text: `Duration formatting:\n\nOriginal: ${milliseconds} milliseconds\nFormatted: ${formattedDuration}\nConverted to ${format}: ${convertedValue}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('formatting duration', error);
      }
    }
  );
}
