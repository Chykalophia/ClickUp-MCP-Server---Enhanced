/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiToken } from '../clickup-client/index.js';
import { AttachmentsEnhancedClient } from '../clickup-client/attachments-enhanced.js';
import {
  UploadAttachmentSchema,
  GetAttachmentsSchema,
  AttachmentEntityTypeSchema,
} from '../schemas/attachments-schemas.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const attachmentsClient = new AttachmentsEnhancedClient(getApiToken());

export function setupAttachmentsTools(server: McpServer): void {
  // ========================================
  // ATTACHMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_upload_attachment',
    'Upload a file to a ClickUp task as an attachment. Provide the file as base64 data (file_data), a local file path (file_path), or a URL to fetch (file_url). Files stored in the cloud must be fetched first; ClickUp only accepts the binary upload.',
    {
      task_id: z.string().min(1).describe('The ID of the task to attach the file to'),
      filename: z.string().min(1).describe('The name of the file, including its extension'),
      file_data: z.string().optional().describe('Base64 encoded file contents for direct upload'),
      file_path: z.string().optional().describe('Path to a local file to upload'),
      file_url: z.string().url().optional().describe('URL to download the file from before uploading'),
      custom_task_ids: z.boolean().optional().describe('Set to true if task_id is a custom task ID'),
      team_id: z.string().optional().describe('Workspace ID (required when custom_task_ids is true)'),
    },
    async args => {
      try {
        const request = UploadAttachmentSchema.parse(args);
        const result = await attachmentsClient.uploadAttachment(request);

        return {
          content: [
            {
              type: 'text',
              text: `Attachment uploaded successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('uploading attachment', error);
      }
    }
  );

  server.tool(
    'clickup_get_attachments',
    'List attachments for a task or a File custom field using the ClickUp v3 API. Results are cursor-paginated; pass next_cursor from a previous response to fetch the next page.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace (team)'),
      entity_type: AttachmentEntityTypeSchema.describe('The type of entity the attachments belong to (task or custom_field)'),
      entity_id: z.string().min(1).describe('The ID of the task or File custom field to list attachments for'),
      limit: z.number().positive().optional().describe('Maximum number of attachments to return'),
      next_cursor: z.string().optional().describe('Cursor from a previous response to fetch the next page'),
    },
    async args => {
      try {
        const request = GetAttachmentsSchema.parse(args);
        const result = await attachmentsClient.getAttachments(request);

        return {
          content: [
            {
              type: 'text',
              text: `Attachments for ${args.entity_type} ${args.entity_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting attachments', error);
      }
    }
  );
}
