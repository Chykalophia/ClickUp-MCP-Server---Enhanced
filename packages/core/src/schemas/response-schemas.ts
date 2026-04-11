/**
 * Zod response schemas for ClickUp API endpoints.
 *
 * These validate the top-level shape of API responses so that property
 * access (e.g., response.tasks, response.goal) fails fast with a clear
 * validation error rather than silently returning undefined.
 *
 * Inner objects use z.record(z.unknown()) or z.unknown() — we validate
 * the envelope, not every nested field.
 */
import { z } from 'zod';

// ========================================
// PRIMITIVE RESPONSE SHAPES
// ========================================

/** Generic success response from DELETE operations */
export const SuccessResponseSchema = z.object({}).passthrough();

/** Wrapper with a single entity */
const entityResponse = (key: string) =>
  z.object({ [key]: z.record(z.unknown()) }).passthrough();

/** Wrapper with an array of entities */
const listResponse = (key: string) =>
  z.object({ [key]: z.array(z.unknown()) }).passthrough();

// ========================================
// AUTH / WORKSPACE
// ========================================

export const UserResponseSchema = z.object({
  user: z.record(z.unknown())
}).passthrough();

export const TeamsResponseSchema = z.object({
  teams: z.array(z.unknown())
}).passthrough();

// ========================================
// TASKS
// ========================================

export const TasksResponseSchema = listResponse('tasks');
export const TaskResponseSchema = z.record(z.unknown()); // direct object

// ========================================
// SPACES
// ========================================

export const SpacesResponseSchema = listResponse('spaces');
export const SpaceResponseSchema = z.record(z.unknown());

// ========================================
// LISTS
// ========================================

export const ListsResponseSchema = listResponse('lists');
export const ListResponseSchema = z.record(z.unknown());

// ========================================
// FOLDERS
// ========================================

export const FoldersResponseSchema = listResponse('folders');
export const FolderResponseSchema = z.record(z.unknown());

// ========================================
// COMMENTS
// ========================================

export const CommentsResponseSchema = listResponse('comments');
export const CommentResponseSchema = z.record(z.unknown());

// ========================================
// GOALS
// ========================================

export const GoalsResponseSchema = z.object({
  goals: z.array(z.unknown())
}).passthrough();

export const GoalResponseSchema = z.object({
  goal: z.record(z.unknown())
}).passthrough();

export const GoalTargetResponseSchema = z.object({
  target: z.record(z.unknown())
}).passthrough();

// ========================================
// TIME TRACKING
// ========================================

export const TimeEntriesResponseSchema = z.object({
  data: z.array(z.unknown())
}).passthrough();

export const TimeEntryResponseSchema = z.object({
  data: z.union([
    z.array(z.unknown()).min(1),
    z.record(z.unknown())
  ])
}).passthrough();

// ========================================
// VIEWS
// ========================================

export const ViewsResponseSchema = listResponse('views');
export const ViewResponseSchema = entityResponse('view');

// ========================================
// WEBHOOKS
// ========================================

export const WebhooksResponseSchema = listResponse('webhooks');
export const WebhookResponseSchema = entityResponse('webhook');

// ========================================
// DEPENDENCIES
// ========================================

export const DependenciesResponseSchema = listResponse('dependencies');
export const DependencyResponseSchema = entityResponse('dependency');

// ========================================
// CUSTOM FIELDS
// ========================================

export const CustomFieldsResponseSchema = listResponse('fields');
export const CustomFieldResponseSchema = z.record(z.unknown());

// ========================================
// DOCS (v3 API)
// ========================================

export const DocsResponseSchema = z.object({
  docs: z.array(z.unknown())
}).passthrough();

export const DocResponseSchema = z.record(z.unknown());

// ========================================
// ATTACHMENTS
// ========================================

export const AttachmentResponseSchema = entityResponse('attachment');
export const AttachmentsResponseSchema = z.record(z.unknown()); // varies by endpoint

// ========================================
// CHECKLISTS
// ========================================

export const ChecklistsResponseSchema = listResponse('checklists');
export const ChecklistResponseSchema = z.record(z.unknown());

// ========================================
// VALIDATION UTILITY
// ========================================

/**
 * Validate an API response against a schema.
 * On success, returns the typed data.
 * On failure, throws a descriptive error instead of silently returning undefined.
 */
export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(
    `Unexpected API response shape for ${context}: ${issues}. ` +
    `This may indicate a ClickUp API change. Raw keys: [${Object.keys(data as Record<string, unknown>).join(', ')}]`
  );
}
