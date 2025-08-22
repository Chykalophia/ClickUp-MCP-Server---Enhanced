import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { /* createClickUpClient */ } from '../clickup-client/index.js';
import { AttachmentsEnhancedClient } from '../clickup-client/attachments-enhanced.js';
import {
  UploadAttachmentSchema,
  UpdateAttachmentMetadataSchema,
  GetAttachmentsFilterSchema,
  AttachmentSharingSchema,
  BulkAttachmentOperationSchema,
  AttachmentTypeSchema,
  UploadSourceSchema,
  AttachmentParentSchema
} from '../schemas/attachments-schemas.js';

// Create clients
// const clickUpClient = createClickUpClient();
const attachmentsClient = new AttachmentsEnhancedClient(process.env.CLICKUP_API_TOKEN!);

export function setupAttachmentsTools(server: McpServer): void {

  // ========================================
  // ATTACHMENT MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_upload_attachment',
    'Upload a new attachment to a task, comment, doc, or chat. Supports direct file upload or URL-based upload.',
    {
      parent_id: z.string().min(1).describe('The ID of the parent (task, comment, doc, or chat)'),
      parent_type: AttachmentParentSchema.describe('The type of parent object'),
      filename: z.string().min(1).describe('The name of the file'),
      file_data: z.string().optional().describe('Base64 encoded file data for direct upload'),
      file_url: z.string().url().optional().describe('URL to download file from'),
      source: UploadSourceSchema.default('local').describe('Source of the file upload'),
      description: z.string().optional().describe('Description of the attachment'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the attachment')
    },
    async (args) => {
      try {
        const request = UploadAttachmentSchema.parse(args);
        const result = await attachmentsClient.uploadAttachment(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment uploaded successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error uploading attachment: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_attachments',
    'Get all attachments for a parent object with filtering and pagination options.',
    {
      parent_id: z.string().min(1).describe('The ID of the parent object'),
      parent_type: AttachmentParentSchema.describe('The type of parent object'),
      type: AttachmentTypeSchema.optional().describe('Filter by attachment type'),
      filename_contains: z.string().optional().describe('Filter by filename containing text'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      date_from: z.number().optional().describe('Filter attachments created after this date (Unix timestamp)'),
      date_to: z.number().optional().describe('Filter attachments created before this date (Unix timestamp)'),
      limit: z.number().positive().optional().describe('Maximum number of attachments to return'),
      offset: z.number().min(0).optional().describe('Number of attachments to skip for pagination')
    },
    async (args) => {
      try {
        const filter = GetAttachmentsFilterSchema.parse(args);
        const result = await attachmentsClient.getAttachments(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachments for ${args.parent_type} ${args.parent_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting attachments: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_attachment_info',
    'Get detailed information about a specific attachment including download and preview capabilities.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to get info for')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.getAttachmentInfo(args.attachment_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment information:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting attachment info: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_attachment_metadata',
    'Update attachment metadata including filename, description, and tags.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to update'),
      filename: z.string().optional().describe('New filename'),
      description: z.string().optional().describe('New description'),
      tags: z.array(z.string()).optional().describe('New tags for the attachment')
    },
    async (args) => {
      try {
        const request = UpdateAttachmentMetadataSchema.parse(args);
        const result = await attachmentsClient.updateAttachmentMetadata(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment metadata updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating attachment metadata: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_attachment',
    'Delete an attachment from ClickUp. This action cannot be undone.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to delete')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.deleteAttachment(args.attachment_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment deleted successfully: ${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting attachment: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_download_attachment',
    'Get download information for an attachment including temporary download URL.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to download')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.downloadAttachment(args.attachment_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment download information:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting download information: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // ADVANCED ATTACHMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_search_attachments',
    'Search for attachments across a workspace with advanced filtering options.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to search in'),
      search_term: z.string().optional().describe('Search term to match against filename and description'),
      type: AttachmentTypeSchema.optional().describe('Filter by attachment type'),
      parent_type: AttachmentParentSchema.optional().describe('Filter by parent type'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      date_from: z.number().optional().describe('Filter attachments created after this date (Unix timestamp)'),
      date_to: z.number().optional().describe('Filter attachments created before this date (Unix timestamp)'),
      min_size: z.number().optional().describe('Minimum file size in bytes'),
      max_size: z.number().optional().describe('Maximum file size in bytes'),
      uploaded_by: z.number().optional().describe('Filter by user ID who uploaded the attachment'),
      limit: z.number().positive().optional().describe('Maximum number of attachments to return'),
      offset: z.number().min(0).optional().describe('Number of attachments to skip for pagination')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.searchAttachments(args.workspace_id, {
          search_term: args.search_term,
          type: args.type,
          parent_type: args.parent_type,
          tags: args.tags,
          date_from: args.date_from,
          date_to: args.date_to,
          min_size: args.min_size,
          max_size: args.max_size,
          uploaded_by: args.uploaded_by,
          limit: args.limit,
          offset: args.offset
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment search results:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error searching attachments: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_attachment_stats',
    'Get comprehensive statistics about attachments in a workspace.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.getAttachmentStats(args.workspace_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment statistics for workspace ${args.workspace_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting attachment statistics: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_attachment_sharing',
    'Update sharing settings for an attachment including access level and password protection.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to update sharing for'),
      access_level: z.enum(['private', 'team', 'public']).describe('Access level for the attachment'),
      expires_at: z.number().optional().describe('Expiration timestamp for public links (Unix timestamp)'),
      password: z.string().optional().describe('Password protection for public links')
    },
    async (args) => {
      try {
        const request = AttachmentSharingSchema.parse(args);
        const result = await attachmentsClient.updateAttachmentSharing(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment sharing updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating attachment sharing: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_copy_attachment',
    'Copy an attachment to another parent object (task, comment, doc, or chat).',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to copy'),
      target_parent_id: z.string().min(1).describe('The ID of the target parent'),
      target_parent_type: AttachmentParentSchema.describe('The type of the target parent')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.copyAttachment(
          args.attachment_id,
          args.target_parent_id,
          args.target_parent_type
        );
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment copied successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error copying attachment: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_move_attachment',
    'Move an attachment to another parent object (task, comment, doc, or chat).',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to move'),
      target_parent_id: z.string().min(1).describe('The ID of the target parent'),
      target_parent_type: AttachmentParentSchema.describe('The type of the target parent')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.moveAttachment(
          args.attachment_id,
          args.target_parent_id,
          args.target_parent_type
        );
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment moved successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error moving attachment: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_generate_attachment_thumbnail',
    'Generate a thumbnail for an image or video attachment with custom dimensions.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to generate thumbnail for'),
      width: z.number().positive().optional().describe('Thumbnail width in pixels'),
      height: z.number().positive().optional().describe('Thumbnail height in pixels'),
      quality: z.number().min(1).max(100).optional().describe('Thumbnail quality (1-100)')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.generateAttachmentThumbnail(args.attachment_id, {
          width: args.width,
          height: args.height,
          quality: args.quality
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Thumbnail generated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_attachment_versions',
    'Get version history for an attachment showing all uploaded versions.',
    {
      attachment_id: z.string().min(1).describe('The ID of the attachment to get versions for')
    },
    async (args) => {
      try {
        const result = await attachmentsClient.getAttachmentVersions(args.attachment_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Attachment version history:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting attachment versions: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_bulk_attachment_operations',
    'Perform bulk operations on multiple attachments for efficiency.',
    {
      operation: z.enum(['delete', 'move', 'copy', 'update_tags']).describe('The bulk operation to perform'),
      attachment_ids: z.array(z.string()).describe('Array of attachment IDs to operate on'),
      target_parent_id: z.string().optional().describe('Target parent ID for move/copy operations'),
      target_parent_type: AttachmentParentSchema.optional().describe('Target parent type for move/copy operations'),
      tags: z.array(z.string()).optional().describe('Tags for bulk tag update operations')
    },
    async (args) => {
      try {
        const operation = BulkAttachmentOperationSchema.parse(args);
        const result = await attachmentsClient.bulkAttachmentOperations(operation);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Bulk attachment operations results:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error performing bulk attachment operations: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
}
