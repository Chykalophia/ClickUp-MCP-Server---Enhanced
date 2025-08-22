import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedTimeTrackingClient } from '../clickup-client/time-tracking-enhanced.js';
import { 
// TeamIdSchema, 
// TimerIdSchema, 
// CreateTimeEntrySchema,
// UpdateTimeEntrySchema,
// GetTimeEntriesSchema,
// TimeEntryTagSchema
} from '../schemas/time-tracking-schemas.js';

// Create clients
const clickUpClient = createClickUpClient();
const timeTrackingClient = createEnhancedTimeTrackingClient(clickUpClient);

export function setupTimeTrackingTools(server: McpServer): void {

  // ========================================
  // TIME ENTRY MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'get_time_entries',
    'Get time entries for a team with filtering options. Supports filtering by date range, user, task, and project.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get time entries for'),
      start_date: z.number().positive().optional().describe('Filter by start date (Unix timestamp)'),
      end_date: z.number().positive().optional().describe('Filter by end date (Unix timestamp)'),
      assignee: z.number().positive().optional().describe('Filter by user ID'),
      include_task_tags: z.boolean().optional().default(false).describe('Include task tags in response'),
      include_location_names: z.boolean().optional().default(false).describe('Include location names'),
      space_id: z.string().optional().describe('Filter by space ID'),
      folder_id: z.string().optional().describe('Filter by folder ID'),
      list_id: z.string().optional().describe('Filter by list ID'),
      task_id: z.string().optional().describe('Filter by task ID')
    },
    async ({ team_id, start_date, end_date, assignee, include_task_tags, include_location_names, space_id, folder_id, list_id, task_id }) => {
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
          task_id
        };

        const timeEntries = await timeTrackingClient.getTimeEntries(team_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Time entries for team ${team_id}:\n\n${JSON.stringify(timeEntries, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting time entries:', error);
        return {
          content: [{ type: 'text', text: `Error getting time entries: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_time_entry',
    'Create a new time entry for time tracking. Can be used for manual time logging or creating timer-based entries.',
    {
      team_id: z.string().min(1).describe('The ID of the team to create the time entry for'),
      description: z.string().min(1).describe('Description of the time entry'),
      start: z.number().positive().describe('Start time (Unix timestamp in milliseconds)'),
      billable: z.boolean().default(false).describe('Whether the time is billable'),
      end: z.number().positive().optional().describe('End time (Unix timestamp in milliseconds)'),
      task_id: z.string().optional().describe('Associated task ID'),
      assignee: z.number().positive().optional().describe('User ID for the time entry'),
      tags: z.array(z.object({
        name: z.string().min(1).describe('Tag name'),
        tag_fg: z.string().optional().describe('Tag foreground color'),
        tag_bg: z.string().optional().describe('Tag background color')
      })).optional().describe('Array of tags for the time entry')
    },
    async ({ team_id, description, start, billable, end, task_id, assignee, tags }) => {
      try {
        const params = {
          description,
          start,
          billable,
          end,
          task_id,
          assignee,
          tags
        };

        const timeEntry = await timeTrackingClient.createTimeEntry(team_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Time entry created successfully!\n\n${JSON.stringify(timeEntry, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating time entry:', error);
        return {
          content: [{ type: 'text', text: `Error creating time entry: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_time_entry',
    'Update an existing time entry. Can modify description, times, billable status, and associated task.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to update'),
      description: z.string().min(1).optional().describe('New description for the time entry'),
      start: z.number().positive().optional().describe('New start time (Unix timestamp in milliseconds)'),
      end: z.number().positive().optional().describe('New end time (Unix timestamp in milliseconds)'),
      billable: z.boolean().optional().describe('Update billable status'),
      task_id: z.string().optional().describe('Change associated task ID'),
      tags: z.array(z.object({
        name: z.string().min(1).describe('Tag name'),
        tag_fg: z.string().optional().describe('Tag foreground color'),
        tag_bg: z.string().optional().describe('Tag background color')
      })).optional().describe('Update tags for the time entry')
    },
    async ({ team_id, timer_id, description, start, end, billable, task_id, tags }) => {
      try {
        const params = {
          description,
          start,
          end,
          billable,
          task_id,
          tags
        };

        const updatedTimeEntry = await timeTrackingClient.updateTimeEntry(team_id, timer_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Time entry updated successfully!\n\n${JSON.stringify(updatedTimeEntry, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating time entry:', error);
        return {
          content: [{ type: 'text', text: `Error updating time entry: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_time_entry',
    'Delete a time entry from ClickUp. This action cannot be undone.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to delete')
    },
    async ({ team_id, timer_id }) => {
      try {
        await timeTrackingClient.deleteTimeEntry(team_id, timer_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Time entry ${timer_id} deleted successfully from team ${team_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error deleting time entry:', error);
        return {
          content: [{ type: 'text', text: `Error deleting time entry: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // TIMER OPERATIONS
  // ========================================

  server.tool(
    'get_running_timers',
    'Get currently running timers for a team. Shows active time tracking sessions.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get running timers for'),
      assignee: z.number().positive().optional().describe('Filter by specific user ID')
    },
    async ({ team_id, assignee }) => {
      try {
        const runningTimers = await timeTrackingClient.getRunningTimers(team_id, assignee);

        return {
          content: [{ 
            type: 'text', 
            text: `Running timers for team ${team_id}:\n\n${JSON.stringify(runningTimers, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting running timers:', error);
        return {
          content: [{ type: 'text', text: `Error getting running timers: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'start_timer',
    'Start a timer for time tracking. Creates an active time tracking session.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to start timing'),
      start: z.number().positive().optional().describe('Custom start time (Unix timestamp in milliseconds, defaults to current time)')
    },
    async ({ team_id, timer_id, start }) => {
      try {
        await timeTrackingClient.startTimer(team_id, timer_id, start);

        return {
          content: [{ 
            type: 'text', 
            text: `Timer started successfully for time entry ${timer_id} in team ${team_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error starting timer:', error);
        return {
          content: [{ type: 'text', text: `Error starting timer: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'stop_timer',
    'Stop a running timer. Ends the active time tracking session and records the duration.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      timer_id: z.string().min(1).describe('The ID of the time entry to stop timing'),
      end: z.number().positive().optional().describe('Custom end time (Unix timestamp in milliseconds, defaults to current time)')
    },
    async ({ team_id, timer_id, end }) => {
      try {
        await timeTrackingClient.stopTimer(team_id, timer_id, end);

        return {
          content: [{ 
            type: 'text', 
            text: `Timer stopped successfully for time entry ${timer_id} in team ${team_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error stopping timer:', error);
        return {
          content: [{ type: 'text', text: `Error stopping timer: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // TIME ANALYTICS & REPORTING
  // ========================================

  server.tool(
    'get_time_summary',
    'Get time tracking summary and analytics. Provides aggregated time data with breakdowns by user and task.',
    {
      team_id: z.string().min(1).describe('The ID of the team to get time summary for'),
      start_date: z.number().positive().optional().describe('Filter by start date (Unix timestamp)'),
      end_date: z.number().positive().optional().describe('Filter by end date (Unix timestamp)'),
      assignee: z.number().positive().optional().describe('Filter by user ID'),
      task_id: z.string().optional().describe('Filter by task ID'),
      list_id: z.string().optional().describe('Filter by list ID'),
      folder_id: z.string().optional().describe('Filter by folder ID'),
      space_id: z.string().optional().describe('Filter by space ID')
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
          space_id
        };

        const timeSummary = await timeTrackingClient.getTimeSummary(team_id, params);

        // Format durations for better readability
        const formatDuration = (ms: number) => timeTrackingClient.formatDuration(ms);

        const formattedSummary = {
          ...timeSummary,
          total_duration_formatted: formatDuration(timeSummary.total_duration),
          billable_duration_formatted: formatDuration(timeSummary.billable_duration),
          non_billable_duration_formatted: formatDuration(timeSummary.non_billable_duration)
        };

        return {
          content: [{ 
            type: 'text', 
            text: `Time summary for team ${team_id}:\n\n${JSON.stringify(formattedSummary, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting time summary:', error);
        return {
          content: [{ type: 'text', text: `Error getting time summary: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // HELPER TOOLS
  // ========================================

  server.tool(
    'create_timer_entry',
    'Create a new time entry and immediately start the timer. Convenient for starting time tracking in one step.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      description: z.string().min(1).describe('Description of what you are working on'),
      task_id: z.string().optional().describe('Associated task ID'),
      billable: z.boolean().default(false).describe('Whether the time is billable'),
      tags: z.array(z.object({
        name: z.string().min(1).describe('Tag name')
      })).optional().describe('Array of tags for the time entry')
    },
    async ({ team_id, description, task_id, billable, tags }) => {
      try {
        const currentTime = timeTrackingClient.getCurrentTimestamp();
        
        // Create time entry
        const timeEntry = await timeTrackingClient.createTimeEntry(team_id, {
          description,
          start: currentTime,
          billable,
          task_id,
          tags
        });

        // Start the timer
        await timeTrackingClient.startTimer(team_id, timeEntry.id);

        return {
          content: [{ 
            type: 'text', 
            text: `Timer started successfully! Time entry created and timer is now running.\n\nTime Entry: ${JSON.stringify(timeEntry, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating timer entry:', error);
        return {
          content: [{ type: 'text', text: `Error creating timer entry: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'format_duration',
    'Format a duration from milliseconds to human-readable format. Useful for displaying time tracking data.',
    {
      milliseconds: z.number().min(0).describe('Duration in milliseconds'),
      include_seconds: z.boolean().optional().default(true).describe('Whether to include seconds in the formatted output'),
      format: z.enum(['milliseconds', 'seconds', 'minutes', 'hours']).optional().default('milliseconds').describe('Convert to specific time unit')
    },
    async ({ milliseconds, include_seconds, format }) => {
      try {
        const formattedDuration = timeTrackingClient.formatDuration(milliseconds, include_seconds);
        const convertedValue = timeTrackingClient.convertDuration(milliseconds, format);

        return {
          content: [{ 
            type: 'text', 
            text: `Duration formatting:\n\nOriginal: ${milliseconds} milliseconds\nFormatted: ${formattedDuration}\nConverted to ${format}: ${convertedValue}` 
          }]
        };
      } catch (error: any) {
        console.error('Error formatting duration:', error);
        return {
          content: [{ type: 'text', text: `Error formatting duration: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
