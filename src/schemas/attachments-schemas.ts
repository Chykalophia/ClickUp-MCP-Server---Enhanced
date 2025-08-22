import { z } from 'zod';

// Attachment types
export const AttachmentTypeSchema = z.enum([
  'file',
  'image',
  'video',
  'audio',
  'document',
  'spreadsheet',
  'presentation',
  'archive',
  'other'
]);

// Upload source types
export const UploadSourceSchema = z.enum([
  'local',
  'url',
  'google_drive',
  'dropbox',
  'onedrive',
  'box'
]);

// Attachment parent types
export const AttachmentParentSchema = z.enum([
  'task',
  'comment',
  'doc',
  'chat'
]);

// Upload attachment schema
export const UploadAttachmentSchema = z.object({
  parent_id: z.string().min(1).describe('The ID of the parent (task, comment, etc.)'),
  parent_type: AttachmentParentSchema.describe('The type of parent object'),
  filename: z.string().min(1).describe('The name of the file'),
  file_data: z.string().optional().describe('Base64 encoded file data for direct upload'),
  file_url: z.string().url().optional().describe('URL to download file from'),
  source: UploadSourceSchema.default('local').describe('Source of the file upload'),
  description: z.string().optional().describe('Description of the attachment'),
  tags: z.array(z.string()).optional().describe('Tags to associate with the attachment')
});

// Update attachment metadata schema
export const UpdateAttachmentMetadataSchema = z.object({
  attachment_id: z.string().min(1).describe('The ID of the attachment to update'),
  filename: z.string().optional().describe('New filename'),
  description: z.string().optional().describe('New description'),
  tags: z.array(z.string()).optional().describe('New tags for the attachment')
});

// Get attachments filter schema
export const GetAttachmentsFilterSchema = z.object({
  parent_id: z.string().min(1).describe('The ID of the parent object'),
  parent_type: AttachmentParentSchema.describe('The type of parent object'),
  type: AttachmentTypeSchema.optional().describe('Filter by attachment type'),
  filename_contains: z.string().optional().describe('Filter by filename containing text'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  date_from: z.number().optional().describe('Filter attachments created after this date (Unix timestamp)'),
  date_to: z.number().optional().describe('Filter attachments created before this date (Unix timestamp)'),
  limit: z.number().positive().optional().describe('Maximum number of attachments to return'),
  offset: z.number().min(0).optional().describe('Number of attachments to skip for pagination')
});

// Attachment sharing schema
export const AttachmentSharingSchema = z.object({
  attachment_id: z.string().min(1).describe('The ID of the attachment to share'),
  access_level: z.enum(['private', 'team', 'public']).describe('Access level for the attachment'),
  expires_at: z.number().optional().describe('Expiration timestamp for public links (Unix timestamp)'),
  password: z.string().optional().describe('Password protection for public links')
});

// Bulk attachment operations schema
export const BulkAttachmentOperationSchema = z.object({
  operation: z.enum(['delete', 'move', 'copy', 'update_tags']).describe('The bulk operation to perform'),
  attachment_ids: z.array(z.string()).describe('Array of attachment IDs to operate on'),
  target_parent_id: z.string().optional().describe('Target parent ID for move/copy operations'),
  target_parent_type: AttachmentParentSchema.optional().describe('Target parent type for move/copy operations'),
  tags: z.array(z.string()).optional().describe('Tags for bulk tag update operations')
});

// Type exports
export type AttachmentType = z.infer<typeof AttachmentTypeSchema>;
export type UploadSource = z.infer<typeof UploadSourceSchema>;
export type AttachmentParent = z.infer<typeof AttachmentParentSchema>;
export type UploadAttachmentRequest = z.infer<typeof UploadAttachmentSchema>;
export type UpdateAttachmentMetadataRequest = z.infer<typeof UpdateAttachmentMetadataSchema>;
export type GetAttachmentsFilter = z.infer<typeof GetAttachmentsFilterSchema>;
export type AttachmentSharingRequest = z.infer<typeof AttachmentSharingSchema>;
export type BulkAttachmentOperation = z.infer<typeof BulkAttachmentOperationSchema>;

// Attachment response interfaces
export interface AttachmentResponse {
  id: string;
  filename: string;
  url: string;
  parent: {
    id: string;
    type: AttachmentParent;
  };
  size: number;
  mimetype: string;
  type: AttachmentType;
  extension: string;
  is_folder: boolean;
  date_created: string;
  date_updated: string;
  uploaded_by: {
    id: number;
    username: string;
    email: string;
    profilePicture?: string;
  };
  description?: string;
  tags: string[];
  thumbnail_url?: string;
  preview_url?: string;
  download_count: number;
  sharing: {
    access_level: 'private' | 'team' | 'public';
    public_url?: string;
    expires_at?: string;
    password_protected: boolean;
  };
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    [key: string]: any;
  };
}

export interface AttachmentListResponse {
  attachments: AttachmentResponse[];
  total_count: number;
  has_more: boolean;
}

export interface AttachmentUploadResponse {
  attachment: AttachmentResponse;
  upload_url?: string;
  upload_fields?: Record<string, string>;
}

export interface AttachmentStatsResponse {
  total_attachments: number;
  total_size_bytes: number;
  total_size_formatted: string;
  by_type: Record<AttachmentType, {
    count: number;
    size_bytes: number;
    size_formatted: string;
  }>;
  by_parent_type: Record<AttachmentParent, {
    count: number;
    size_bytes: number;
  }>;
  recent_uploads: AttachmentResponse[];
  largest_files: AttachmentResponse[];
  most_downloaded: AttachmentResponse[];
}

// Utility functions
export const getAttachmentTypeFromMimetype = (mimetype: string): AttachmentType => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf'
  ];
  if (documentTypes.includes(mimetype)) return 'document';
  
  const spreadsheetTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];
  if (spreadsheetTypes.includes(mimetype)) return 'spreadsheet';
  
  const presentationTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  if (presentationTypes.includes(mimetype)) return 'presentation';
  
  const archiveTypes = [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar'
  ];
  if (archiveTypes.includes(mimetype)) return 'archive';
  
  return 'other';
};

export const getAttachmentTypeFromExtension = (filename: string): AttachmentType => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return 'other';
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  if (imageExtensions.includes(extension)) return 'image';
  
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  if (videoExtensions.includes(extension)) return 'video';
  
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
  if (audioExtensions.includes(extension)) return 'audio';
  
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  if (documentExtensions.includes(extension)) return 'document';
  
  const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods'];
  if (spreadsheetExtensions.includes(extension)) return 'spreadsheet';
  
  const presentationExtensions = ['ppt', 'pptx', 'odp'];
  if (presentationExtensions.includes(extension)) return 'presentation';
  
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
  if (archiveExtensions.includes(extension)) return 'archive';
  
  return 'other';
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const validateFileUpload = (request: UploadAttachmentRequest): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check if either file_data or file_url is provided
  if (!request.file_data && !request.file_url) {
    errors.push('Either file_data or file_url must be provided');
  }
  
  // Check if both are provided (not allowed)
  if (request.file_data && request.file_url) {
    errors.push('Cannot provide both file_data and file_url');
  }
  
  // Validate filename
  if (request.filename.length > 255) {
    errors.push('Filename cannot exceed 255 characters');
  }
  
  // Check for invalid characters in filename
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(request.filename)) {
    errors.push('Filename contains invalid characters');
  }
  
  // Validate file_url format if provided
  if (request.file_url) {
    try {
      const url = new URL(request.file_url);
      // URL is valid if we can create it
      if (!url) throw new Error('Invalid URL');
    } catch {
      errors.push('Invalid file_url format');
    }
  }
  
  // Validate description length
  if (request.description && request.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }
  
  // Validate tags
  if (request.tags) {
    if (request.tags.length > 10) {
      errors.push('Cannot have more than 10 tags');
    }
    
    for (const tag of request.tags) {
      if (tag.length > 50) {
        errors.push('Tag cannot exceed 50 characters');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const generateAttachmentPreview = (attachment: AttachmentResponse): {
  canPreview: boolean;
  previewType: 'image' | 'video' | 'audio' | 'document' | 'text' | 'none';
  previewUrl?: string;
} => {
  const previewableImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const previewableVideos = ['video/mp4', 'video/webm'];
  const previewableAudio = ['audio/mp3', 'audio/wav', 'audio/ogg'];
  const previewableDocuments = ['application/pdf'];
  const previewableText = ['text/plain', 'text/csv'];
  
  if (previewableImages.includes(attachment.mimetype)) {
    return {
      canPreview: true,
      previewType: 'image',
      previewUrl: attachment.preview_url || attachment.url
    };
  }
  
  if (previewableVideos.includes(attachment.mimetype)) {
    return {
      canPreview: true,
      previewType: 'video',
      previewUrl: attachment.preview_url || attachment.url
    };
  }
  
  if (previewableAudio.includes(attachment.mimetype)) {
    return {
      canPreview: true,
      previewType: 'audio',
      previewUrl: attachment.url
    };
  }
  
  if (previewableDocuments.includes(attachment.mimetype)) {
    return {
      canPreview: true,
      previewType: 'document',
      previewUrl: attachment.preview_url
    };
  }
  
  if (previewableText.includes(attachment.mimetype)) {
    return {
      canPreview: true,
      previewType: 'text',
      previewUrl: attachment.url
    };
  }
  
  return {
    canPreview: false,
    previewType: 'none'
  };
};
