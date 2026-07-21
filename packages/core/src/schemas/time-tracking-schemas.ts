/* eslint-disable max-len */
import { z } from 'zod';

// ========================================
// TIME TRACKING VALIDATION SCHEMAS
// ========================================

// Team ID validation
export const TeamIdSchema = z.string().min(1, 'Team ID is required');

// Timer ID validation
export const TimerIdSchema = z.string().min(1, 'Timer ID is required');

// Task ID validation (optional for time entries)
export const TaskIdSchema = z.string().min(1, 'Task ID is required');

// User ID validation
export const UserIdSchema = z.number().positive('User ID must be positive');

// ========================================
// TIME ENTRY SCHEMAS
// ========================================

// Time entry tag schema
export const TimeEntryTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  tag_fg: z.string().optional(),
  tag_bg: z.string().optional(),
  creator: z.number().optional(),
});

// Create time entry schema.
// The API requires 'start' plus a length: either 'duration' (milliseconds) or
// 'stop' (end timestamp, from which duration is derived) — exactly one of them.
export const CreateTimeEntrySchema = z
  .object({
    team_id: TeamIdSchema,
    description: z.string().min(1, 'Description is required'),
    start: z.number().positive('Start time must be a positive Unix timestamp in milliseconds'),
    billable: z.boolean().default(false),
    duration: z.number().positive().optional(),
    stop: z.number().positive().optional(),
    task_id: z.string().optional(),
    custom_task_ids: z.boolean().optional(),
    assignee: UserIdSchema.optional(),
    tags: z.array(TimeEntryTagSchema).optional(),
  })
  .refine(
    (data) =>
      (data.duration === undefined) !== (data.stop === undefined) &&
      (data.stop === undefined || data.stop > data.start),
    { message: 'Provide either a positive duration or a stop time after start' }
  );

// Update time entry schema.
// 'stop' is mapped to the API's 'end' body field (the update endpoint has no
// 'stop' field); 'tag_action' says what to do with the supplied tags.
export const UpdateTimeEntrySchema = z.object({
  team_id: TeamIdSchema,
  timer_id: TimerIdSchema,
  description: z.string().min(1).optional(),
  start: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  stop: z.number().positive().optional(),
  billable: z.boolean().optional(),
  task_id: z.string().optional(),
  custom_task_ids: z.boolean().optional(),
  tags: z.array(TimeEntryTagSchema).optional(),
  tag_action: z.enum(['replace', 'add', 'remove']).optional(),
}).refine((data) => data.duration === undefined || data.stop === undefined, {
  message: 'Provide either duration or stop on update, not both',
});

// Delete time entry schema
export const DeleteTimeEntrySchema = z.object({
  team_id: TeamIdSchema,
  timer_id: TimerIdSchema,
});

// Get single time entry schema
export const GetTimeEntrySchema = z.object({
  team_id: TeamIdSchema,
  timer_id: TimerIdSchema,
});

// Get time entry history schema
export const GetTimeEntryHistorySchema = z.object({
  team_id: TeamIdSchema,
  timer_id: TimerIdSchema,
});

// Get time entries schema
export const GetTimeEntriesSchema = z.object({
  team_id: TeamIdSchema,
  start_date: z.number().positive().optional(),
  end_date: z.number().positive().optional(),
  // Single user ID, or a comma-separated list of user IDs (e.g. '1234,9876')
  assignee: z.union([UserIdSchema, z.string().min(1)]).optional(),
  include_task_tags: z.boolean().optional().default(false),
  include_location_names: z.boolean().optional().default(false),
  space_id: z.string().optional(),
  folder_id: z.string().optional(),
  list_id: z.string().optional(),
  task_id: z.string().optional(),
  custom_task_ids: z.boolean().optional(),
});

// ========================================
// TIMER OPERATION SCHEMAS
// ========================================

// Start timer schema (POST /team/{team_id}/time_entries/start takes no timer_id)
export const StartTimerSchema = z.object({
  team_id: TeamIdSchema,
  task_id: z.string().optional(),
  custom_task_ids: z.boolean().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
  tags: z.array(TimeEntryTagSchema).optional(),
});

// Stop timer schema (stops the authenticated user's running timer; no timer_id)
export const StopTimerSchema = z.object({
  team_id: TeamIdSchema,
});

// ========================================
// TIME ENTRY TAG SCHEMAS
// ========================================

// Get all time entry tags schema
export const GetTimeEntryTagsSchema = z.object({
  team_id: TeamIdSchema,
});

// Bulk add tags to time entries schema
export const AddTagsToTimeEntriesSchema = z.object({
  team_id: TeamIdSchema,
  time_entry_ids: z.array(z.string().min(1)).min(1),
  tags: z.array(TimeEntryTagSchema).min(1),
});

// Get running timers schema
export const GetRunningTimersSchema = z.object({
  team_id: TeamIdSchema,
  assignee: UserIdSchema.optional(),
});

// ========================================
// TIME SUMMARY SCHEMAS
// ========================================

// Get time summary schema
export const GetTimeSummarySchema = z.object({
  team_id: TeamIdSchema,
  start_date: z.number().positive().optional(),
  end_date: z.number().positive().optional(),
  assignee: UserIdSchema.optional(),
  task_id: z.string().optional(),
  list_id: z.string().optional(),
  folder_id: z.string().optional(),
  space_id: z.string().optional(),
  billable_only: z.boolean().optional().default(false),
});

// ========================================
// HELPER SCHEMAS
// ========================================

// Duration format schema
export const DurationFormatSchema = z.enum(['milliseconds', 'seconds', 'minutes', 'hours']);

// Time format validation
export const TimeFormatSchema = z.object({
  format: DurationFormatSchema.optional().default('milliseconds'),
  include_seconds: z.boolean().optional().default(true),
});

// Billable time filter schema
export const BillableFilterSchema = z.enum(['all', 'billable', 'non_billable']);

// ========================================
// RESPONSE TYPE SCHEMAS
// ========================================

// Time entry response schema
export const TimeEntryResponseSchema = z.object({
  id: z.string(),
  task: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.object({
        status: z.string(),
        color: z.string(),
        type: z.string(),
        orderindex: z.number(),
      }),
      custom_type: z.string().nullable(),
    })
    .nullable(),
  wid: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    initials: z.string(),
    profilePicture: z.string(),
  }),
  billable: z.boolean(),
  start: z.string(),
  end: z.string().nullable(),
  duration: z.string(),
  description: z.string(),
  tags: z.array(TimeEntryTagSchema),
  source: z.string(),
  at: z.string(),
});

// Running timer response schema
export const RunningTimerResponseSchema = z.object({
  id: z.string(),
  task: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
  }),
  start: z.string(),
  description: z.string(),
  billable: z.boolean(),
  tags: z.array(TimeEntryTagSchema),
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert duration from milliseconds to specified format
 */
export function convertDuration(
  milliseconds: number,
  format: 'milliseconds' | 'seconds' | 'minutes' | 'hours'
): number {
  switch (format) {
    case 'milliseconds':
      return milliseconds;
    case 'seconds':
      return Math.floor(milliseconds / 1000);
    case 'minutes':
      return Math.floor(milliseconds / (1000 * 60));
    case 'hours':
      return Math.floor(milliseconds / (1000 * 60 * 60));
    default:
      return milliseconds;
  }
}

/**
 * Format duration for human-readable display
 */
export function formatDuration(milliseconds: number, includeSeconds: boolean = true): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (hours > 0) {
    return includeSeconds ? `${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return includeSeconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return includeSeconds ? `${seconds}s` : '0m';
}

/**
 * Validate time range (start must be before end)
 */
export function validateTimeRange(start: number, end?: number): boolean {
  if (end === undefined) return true;
  return start < end;
}

/**
 * Get current Unix timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

// ========================================
// COMBINED TOOL SCHEMAS
// ========================================

export const TimeTrackingToolSchemas = {
  // Time entry operations
  createTimeEntry: CreateTimeEntrySchema,
  updateTimeEntry: UpdateTimeEntrySchema,
  deleteTimeEntry: DeleteTimeEntrySchema,
  getTimeEntry: GetTimeEntrySchema,
  getTimeEntryHistory: GetTimeEntryHistorySchema,
  getTimeEntries: GetTimeEntriesSchema,

  // Time entry tags
  getTimeEntryTags: GetTimeEntryTagsSchema,
  addTagsToTimeEntries: AddTagsToTimeEntriesSchema,

  // Timer operations
  startTimer: StartTimerSchema,
  stopTimer: StopTimerSchema,
  getRunningTimers: GetRunningTimersSchema,

  // Time analytics
  getTimeSummary: GetTimeSummarySchema,

  // Utility schemas
  timeFormat: TimeFormatSchema,
  billableFilter: BillableFilterSchema,
};
