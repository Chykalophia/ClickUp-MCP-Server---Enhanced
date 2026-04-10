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
        .describe('Filter by start date (Unix timestamp)'),
      end_date: z.number().positive().optional().describe('Filter by end date (Unix timestamp)'),
      assignee: z.number().positive().optional().describe('Filter by user ID'),
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
    async ({ team_id, description, start, billable, duration, stop, task_id, assignee, tags }) => {
      try {
        if (duration && stop) {
          return {
            content: [{ type: 'text', text: 'Error: Provide either duration or stop, not both.' }],
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
        .describe('New end time (Unix timestamp in milliseconds). Provide either stop or duration, not both.'),
      billable: z.boolean().optional().describe('Update billable status'),
      task_id: z.string().optional().describe('Change associated task ID'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
            tag_fg: z.string().optional().describe('Tag foreground color'),
            tag_bg: z.string().optional().describe('Tag background color'),
          })
        )
        .optional()
        .describe('Update tags for the time entry'),
    },
    async ({ team_id, timer_id, description, start, duration, stop, billable, task_id, tags }) => {
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
          tags,
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

  // ========================================
  // TIMER OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_running_timers',
    'Get currently running timers for a team. Shows active time tracking sessions.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get running timers for'),
      assignee: z.number().positive().optional().describe('Filter by specific user ID'),
    },
    async ({ team_id, assignee }) => {
      try {
        const runningTimers = await timeTrackingClient.getRunningTimers(team_id, assignee);

        return {
          content: [
            {
              type: 'text',
              text: `Running timers for team ${team_id}:\n\n${JSON.stringify(runningTimers, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting running timers', error);
      }
    }
  );

  server.tool(
    'clickup_start_timer',
    'Start a timer for the authenticated user. Optionally associate with a task.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      task_id: z.string().optional().describe('Task ID to associate with the timer'),
    },
    async ({ team_id, task_id }) => {
      try {
        await timeTrackingClient.startTimer(team_id, task_id);

        return {
          content: [
            {
              type: 'text',
              text: `Timer started successfully in team ${team_id}.`,
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
    'Stop the running timer for the authenticated user.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
    },
    async ({ team_id }) => {
      try {
        await timeTrackingClient.stopTimer(team_id);

        return {
          content: [
            {
              type: 'text',
              text: `Timer stopped successfully in team ${team_id}.`,
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
        .describe('Filter by start date (Unix timestamp)'),
      end_date: z.number().positive().optional().describe('Filter by end date (Unix timestamp)'),
      assignee: z.number().positive().optional().describe('Filter by user ID'),
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
      billable: z.boolean().default(false).describe('Whether the time is billable'),
      tags: z
        .array(
          z.object({
            name: z.string().min(1).describe('Tag name'),
          })
        )
        .optional()
        .describe('Array of tags for the time entry'),
    },
    async ({ team_id, description, task_id, billable, tags }) => {
      try {
        await timeTrackingClient.startTimer(team_id, task_id);

        return {
          content: [
            {
              type: 'text',
              text: `Timer started successfully in team ${team_id}.${task_id ? ` Associated with task ${task_id}.` : ''}\nDescription: ${description}\nBillable: ${billable}`,
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
