import { z } from 'zod';

// Entity types supported by the v3 attachments list endpoint.
// 'task' maps to the 'attachments' path segment, 'custom_field' to 'custom_fields'.
export const AttachmentEntityTypeSchema = z.enum(['task', 'custom_field']);

// Upload attachment schema (POST /api/v2/task/{task_id}/attachment).
// Exactly one of file_data, file_path, or file_url must be provided.
export const UploadAttachmentSchema = z.object({
  task_id: z.string().min(1).describe('The ID of the task to attach the file to'),
  filename: z.string().min(1).describe('The name of the file, including its extension'),
  file_data: z.string().optional().describe('Base64 encoded file contents for direct upload'),
  file_path: z.string().optional().describe('Path to a local file to upload'),
  file_url: z
    .string()
    .url()
    .optional()
    .describe('URL to download the file from before uploading'),
  custom_task_ids: z
    .boolean()
    .optional()
    .describe('Set to true if task_id is a custom task ID'),
  team_id: z
    .string()
    .optional()
    .describe('Workspace ID (required when custom_task_ids is true)'),
}).refine(
  d => [d.file_data, d.file_path, d.file_url].filter(v => v !== undefined).length === 1,
  { message: 'Provide exactly one of file_data, file_path, or file_url' }
).refine(
  d => !d.custom_task_ids || !!d.team_id,
  { message: 'team_id is required when custom_task_ids is true' }
);

// Get attachments schema
// (GET /api/v3/workspaces/{workspace_id}/{entity_type}/{entity_id}/attachments)
export const GetAttachmentsSchema = z.object({
  workspace_id: z.string().min(1).describe('The ID of the workspace (team)'),
  entity_type: AttachmentEntityTypeSchema.describe(
    'The type of entity the attachments belong to'
  ),
  entity_id: z
    .string()
    .min(1)
    .describe('The ID of the task or File custom field to list attachments for'),
  limit: z.number().positive().optional().describe('Maximum number of attachments to return'),
  next_cursor: z
    .string()
    .optional()
    .describe('Cursor from a previous response to fetch the next page'),
});

// Type exports
export type AttachmentEntityType = z.infer<typeof AttachmentEntityTypeSchema>;
export type UploadAttachmentRequest = z.infer<typeof UploadAttachmentSchema>;
export type GetAttachmentsRequest = z.infer<typeof GetAttachmentsSchema>;

// Attachment object as returned by the ClickUp API
export interface AttachmentResponse {
  id: string;
  version: string;
  date: number | string;
  title: string;
  extension: string;
  thumbnail_small: string | null;
  thumbnail_large: string | null;
  url: string;
  [key: string]: unknown;
}

// Cursor-paginated response from the v3 list attachments endpoint
export interface AttachmentListResponse {
  attachments: AttachmentResponse[];
  next_cursor?: string | null;
  [key: string]: unknown;
}
