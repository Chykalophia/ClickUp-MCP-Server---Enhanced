/**
 * Zod response schemas for ClickUp API endpoints.
 *
 * These validate the top-level shape of API responses so that property
 * access (e.g., response.tasks, response.goal) fails fast with a clear
 * validation error rather than silently returning undefined.
 *
 * Inner objects use z.record(z.string(), z.unknown()) or z.unknown(): only the envelope
 * is validated, not every nested field.
 */
import { z } from 'zod';

/** Generic success response from DELETE operations */
export const SuccessResponseSchema = z.object({}).passthrough();

/** Wrapper with a single entity */
const entityResponse = (key: string) => z.object({ [key]: z.record(z.string(), z.unknown()) }).passthrough();

/** Wrapper with an array of entities */
const listResponse = (key: string) => z.object({ [key]: z.array(z.unknown()) }).passthrough();

export const UserResponseSchema = z
  .object({
    user: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const TeamsResponseSchema = z
  .object({
    teams: z.array(z.unknown()),
  })
  .passthrough();

export const TasksResponseSchema = listResponse('tasks');
export const TaskResponseSchema = z.record(z.string(), z.unknown()); // direct object

export const SpacesResponseSchema = listResponse('spaces');
export const SpaceResponseSchema = z.record(z.string(), z.unknown());

export const ListsResponseSchema = listResponse('lists');
export const ListResponseSchema = z.record(z.string(), z.unknown());

export const FoldersResponseSchema = listResponse('folders');
export const FolderResponseSchema = z.record(z.string(), z.unknown());

export const CommentsResponseSchema = listResponse('comments');
export const CommentResponseSchema = z.record(z.string(), z.unknown());

export const GoalsResponseSchema = z
  .object({
    goals: z.array(z.unknown()),
  })
  .passthrough();

export const GoalResponseSchema = z
  .object({
    goal: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const GoalTargetResponseSchema = z
  .object({
    key_result: z.record(z.string(), z.unknown()),
  })
  .passthrough();

/**
 * A single status_history entry. ClickUp's API legitimately omits `orderindex`
 * on some entries (observed across many tasks in real workspaces). All fields
 * are optional to surface partial data rather than rejecting the whole response.
 */
const StatusHistoryEntrySchema = z
  .object({
    status: z.string().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    total_time: z
      .object({
        by_minute: z.number().optional(),
        since: z.string().optional(),
      })
      .passthrough()
      .optional(),
    orderindex: z.union([z.number(), z.string()]).optional(),
    // ClickUp may emit additional fields per status (e.g., custom-status edges)
  })
  .passthrough();

const CurrentStatusSchema = z
  .object({
    status: z.string().optional(),
    color: z.string().optional(),
    total_time: z
      .object({
        by_minute: z.number().optional(),
        since: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Response shape for GET /task/{task_id}/time_in_status */
export const TaskTimeInStatusResponseSchema = z
  .object({
    current_status: CurrentStatusSchema.optional(),
    status_history: z.array(StatusHistoryEntrySchema).optional(),
  })
  .passthrough();

/**
 * Response shape for GET /task/bulk_time_in_status/task_ids
 * Maps task_id -> { current_status, status_history }.
 * Each task entry uses the same lenient schema.
 */
export const BulkTasksTimeInStatusResponseSchema = z.record(
  z.string(),
  z
    .object({
      current_status: CurrentStatusSchema.optional(),
      status_history: z.array(StatusHistoryEntrySchema).optional(),
    })
    .passthrough()
);

export const TimeEntriesResponseSchema = z
  .object({
    data: z.array(z.unknown()),
  })
  .passthrough();

export const TimeEntryResponseSchema = z
  .object({
    data: z.union([z.array(z.unknown()).min(1), z.record(z.string(), z.unknown())]),
  })
  .passthrough();

/**
 * Response shape for GET /team/{team_id}/time_entries/current.
 * Returns { data: <TimeEntry object> } when a timer is running,
 * or { data: null } when no timer is running (a single entry, never an array).
 */
export const CurrentTimeEntryResponseSchema = z
  .object({
    // `data` is required (nullable): a null means "no running timer", whereas a
    // missing `data` indicates a malformed response and should fail validation.
    data: z.record(z.string(), z.unknown()).nullable(),
  })
  .passthrough();

export const ViewsResponseSchema = listResponse('views');
export const ViewResponseSchema = entityResponse('view');

export const WebhooksResponseSchema = listResponse('webhooks');
export const WebhookResponseSchema = entityResponse('webhook');

export const DependenciesResponseSchema = listResponse('dependencies');
export const DependencyResponseSchema = entityResponse('dependency');

export const CustomFieldsResponseSchema = listResponse('fields');
export const CustomFieldResponseSchema = z.record(z.string(), z.unknown());

export const DocsResponseSchema = z
  .object({
    docs: z.array(z.unknown()),
  })
  .passthrough();

export const DocResponseSchema = z.record(z.string(), z.unknown());

export const AttachmentResponseSchema = entityResponse('attachment');
export const AttachmentsResponseSchema = z.record(z.string(), z.unknown()); // varies by endpoint

export const ChecklistsResponseSchema = listResponse('checklists');
export const ChecklistResponseSchema = z.record(z.string(), z.unknown());

/**
 * Validate an API response against a schema.
 * On success, returns the typed data.
 * On failure, throws a descriptive error instead of silently returning undefined.
 */
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  const rawKeys = data !== null && typeof data === 'object' ? Object.keys(data).join(', ') : typeof data;
  throw new Error(
    `Unexpected API response shape for ${context}: ${issues}. ` +
      `This may indicate a ClickUp API change. Raw keys: [${rawKeys}]`
  );
}
