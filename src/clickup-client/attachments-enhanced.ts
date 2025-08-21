import { ClickUpClient } from './index.js';
import type {
  UploadAttachmentRequest,
  UpdateAttachmentMetadataRequest,
  GetAttachmentsFilter,
  AttachmentSharingRequest,
  BulkAttachmentOperation,
  AttachmentResponse,
  AttachmentListResponse,
  AttachmentUploadResponse,
  AttachmentStatsResponse
} from '../schemas/attachments-schemas.js';

export class AttachmentsEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Upload a new attachment
   */
  async uploadAttachment(request: UploadAttachmentRequest): Promise<AttachmentUploadResponse> {
    const endpoint = this.getParentEndpoint(request.parent_type, request.parent_id);
    
    const payload: any = {
      filename: request.filename,
      source: request.source,
      description: request.description,
      tags: request.tags
    };

    if (request.file_data) {
      payload.file_data = request.file_data;
    } else if (request.file_url) {
      payload.file_url = request.file_url;
    }

    const response = await this.post<AttachmentUploadResponse>(`${endpoint}/attachment`, payload);
    return response;
  }

  /**
   * Get attachments for a parent object
   */
  async getAttachments(filter: GetAttachmentsFilter): Promise<AttachmentListResponse> {
    const endpoint = this.getParentEndpoint(filter.parent_type, filter.parent_id);
    
    const params = new URLSearchParams();
    if (filter.type) params.append('type', filter.type);
    if (filter.filename_contains) params.append('filename_contains', filter.filename_contains);
    if (filter.tags) params.append('tags', filter.tags.join(','));
    if (filter.date_from) params.append('date_from', filter.date_from.toString());
    if (filter.date_to) params.append('date_to', filter.date_to.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());
    if (filter.offset) params.append('offset', filter.offset.toString());

    const queryString = params.toString();
    const fullEndpoint = `${endpoint}/attachment${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<AttachmentListResponse>(fullEndpoint);
    return response;
  }

  /**
   * Get a specific attachment by ID
   */
  async getAttachment(attachmentId: string): Promise<AttachmentResponse> {
    const response = await this.get<{ attachment: AttachmentResponse }>(`/attachment/${attachmentId}`);
    return response.attachment;
  }

  /**
   * Update attachment metadata
   */
  async updateAttachmentMetadata(request: UpdateAttachmentMetadataRequest): Promise<AttachmentResponse> {
    const updateData: Record<string, any> = {};
    
    if (request.filename) updateData.filename = request.filename;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.tags) updateData.tags = request.tags;

    const response = await this.put<{ attachment: AttachmentResponse }>(
      `/attachment/${request.attachment_id}`,
      updateData
    );
    return response.attachment;
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string): Promise<{ success: boolean }> {
    await this.delete(`/attachment/${attachmentId}`);
    return { success: true };
  }

  /**
   * Download an attachment
   */
  async downloadAttachment(attachmentId: string): Promise<{
    filename: string;
    mimetype: string;
    size: number;
    download_url: string;
    expires_at: string;
  }> {
    const response = await this.get<{
      filename: string;
      mimetype: string;
      size: number;
      download_url: string;
      expires_at: string;
    }>(`/attachment/${attachmentId}/download`);
    
    return response;
  }

  /**
   * Get attachment info without downloading
   */
  async getAttachmentInfo(attachmentId: string): Promise<{
    attachment: AttachmentResponse;
    download_info: {
      can_download: boolean;
      download_url?: string;
      expires_at?: string;
      requires_auth: boolean;
    };
    preview_info: {
      can_preview: boolean;
      preview_url?: string;
      thumbnail_url?: string;
      preview_type?: string;
    };
  }> {
    const response = await this.get<{
      attachment: AttachmentResponse;
      download_info: {
        can_download: boolean;
        download_url?: string;
        expires_at?: string;
        requires_auth: boolean;
      };
      preview_info: {
        can_preview: boolean;
        preview_url?: string;
        thumbnail_url?: string;
        preview_type?: string;
      };
    }>(`/attachment/${attachmentId}/info`);
    
    return response;
  }

  /**
   * Update attachment sharing settings
   */
  async updateAttachmentSharing(request: AttachmentSharingRequest): Promise<AttachmentResponse> {
    const payload = {
      access_level: request.access_level,
      expires_at: request.expires_at ? new Date(request.expires_at * 1000).toISOString() : undefined,
      password: request.password
    };

    const response = await this.put<{ attachment: AttachmentResponse }>(
      `/attachment/${request.attachment_id}/sharing`,
      payload
    );
    return response.attachment;
  }

  /**
   * Perform bulk attachment operations
   */
  async bulkAttachmentOperations(operation: BulkAttachmentOperation): Promise<{
    success: boolean;
    results: Array<{
      attachment_id: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const response = await this.post<{
      success: boolean;
      results: Array<{
        attachment_id: string;
        success: boolean;
        error?: string;
      }>;
    }>('/attachment/bulk', operation);
    
    return response;
  }

  /**
   * Get attachment statistics for a workspace
   */
  async getAttachmentStats(workspaceId: string): Promise<AttachmentStatsResponse> {
    const response = await this.get<AttachmentStatsResponse>(`/team/${workspaceId}/attachment/stats`);
    return response;
  }

  /**
   * Search attachments across workspace
   */
  async searchAttachments(workspaceId: string, query: {
    search_term?: string;
    type?: string;
    parent_type?: string;
    tags?: string[];
    date_from?: number;
    date_to?: number;
    min_size?: number;
    max_size?: number;
    uploaded_by?: number;
    limit?: number;
    offset?: number;
  }): Promise<AttachmentListResponse> {
    const params = new URLSearchParams();
    if (query.search_term) params.append('search_term', query.search_term);
    if (query.type) params.append('type', query.type);
    if (query.parent_type) params.append('parent_type', query.parent_type);
    if (query.tags) params.append('tags', query.tags.join(','));
    if (query.date_from) params.append('date_from', query.date_from.toString());
    if (query.date_to) params.append('date_to', query.date_to.toString());
    if (query.min_size) params.append('min_size', query.min_size.toString());
    if (query.max_size) params.append('max_size', query.max_size.toString());
    if (query.uploaded_by) params.append('uploaded_by', query.uploaded_by.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());

    const queryString = params.toString();
    const endpoint = `/team/${workspaceId}/attachment/search${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<AttachmentListResponse>(endpoint);
    return response;
  }

  /**
   * Generate attachment thumbnail
   */
  async generateAttachmentThumbnail(attachmentId: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }): Promise<{
    thumbnail_url: string;
    expires_at: string;
  }> {
    const params = new URLSearchParams();
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    if (options?.quality) params.append('quality', options.quality.toString());

    const queryString = params.toString();
    const endpoint = `/attachment/${attachmentId}/thumbnail${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.post<{
      thumbnail_url: string;
      expires_at: string;
    }>(endpoint);
    
    return response;
  }

  /**
   * Copy attachment to another parent
   */
  async copyAttachment(attachmentId: string, targetParentId: string, targetParentType: string): Promise<AttachmentResponse> {
    const payload = {
      target_parent_id: targetParentId,
      target_parent_type: targetParentType
    };

    const response = await this.post<{ attachment: AttachmentResponse }>(
      `/attachment/${attachmentId}/copy`,
      payload
    );
    return response.attachment;
  }

  /**
   * Move attachment to another parent
   */
  async moveAttachment(attachmentId: string, targetParentId: string, targetParentType: string): Promise<AttachmentResponse> {
    const payload = {
      target_parent_id: targetParentId,
      target_parent_type: targetParentType
    };

    const response = await this.put<{ attachment: AttachmentResponse }>(
      `/attachment/${attachmentId}/move`,
      payload
    );
    return response.attachment;
  }

  /**
   * Get attachment version history
   */
  async getAttachmentVersions(attachmentId: string): Promise<{
    versions: Array<{
      version_id: string;
      version_number: number;
      filename: string;
      size: number;
      date_created: string;
      uploaded_by: {
        id: number;
        username: string;
      };
      is_current: boolean;
      download_url?: string;
    }>;
  }> {
    const response = await this.get<{
      versions: Array<{
        version_id: string;
        version_number: number;
        filename: string;
        size: number;
        date_created: string;
        uploaded_by: {
          id: number;
          username: string;
        };
        is_current: boolean;
        download_url?: string;
      }>;
    }>(`/attachment/${attachmentId}/versions`);
    
    return response;
  }

  // Helper methods

  private getParentEndpoint(parentType: string, parentId: string): string {
    switch (parentType) {
      case 'task':
        return `/task/${parentId}`;
      case 'comment':
        return `/comment/${parentId}`;
      case 'doc':
        return `/doc/${parentId}`;
      case 'chat':
        return `/chat/${parentId}`;
      default:
        throw new Error(`Invalid parent type: ${parentType}`);
    }
  }
}
