import { readFile } from 'fs/promises';
import { ClickUpClient } from './index.js';
import type {
  UploadAttachmentRequest,
  GetAttachmentsRequest,
  AttachmentEntityType,
  AttachmentResponse,
  AttachmentListResponse,
} from '../schemas/attachments-schemas.js';

// The list attachments endpoint only exists in the v3 API; the shared client
// is bound to the v2 base URL, so v3 calls use absolute URLs (axios ignores
// baseURL when the request URL is absolute).
const V3_API_BASE_URL = 'https://api.clickup.com/api/v3';

// Maps our entity types to the v3 endpoint's path segment values
const ENTITY_TYPE_PATH_SEGMENTS: Record<AttachmentEntityType, string> = {
  task: 'attachments',
  custom_field: 'custom_fields',
};

export class AttachmentsEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Upload a file to a task (POST /api/v2/task/{task_id}/attachment).
   * The file is sent as multipart/form-data with the binary in the
   * 'attachment' form field. Returns the created attachment object.
   */
  async uploadAttachment(request: UploadAttachmentRequest): Promise<AttachmentResponse> {
    const fileBytes = await this.resolveFileBytes(request);

    const form = new FormData();
    form.append('attachment', new Blob([fileBytes]), request.filename);
    form.append('filename', request.filename);

    const params: Record<string, string> = {};
    if (request.custom_task_ids) params.custom_task_ids = 'true';
    if (request.team_id) params.team_id = request.team_id;

    const response = await this.getAxiosInstance().post<AttachmentResponse>(
      `/task/${request.task_id}/attachment`,
      form,
      {
        params,
        // Clear the instance-level 'application/json' default so axios
        // serializes the FormData and sets the multipart/form-data
        // content type with the correct boundary.
        headers: { 'Content-Type': undefined },
      }
    );
    return response.data;
  }

  /**
   * List attachments for a task or File custom field
   * (GET /api/v3/workspaces/{workspace_id}/{entity_type}/{entity_id}/attachments).
   * Results are cursor-paginated via limit + next_cursor.
   */
  async getAttachments(request: GetAttachmentsRequest): Promise<AttachmentListResponse> {
    const params: Record<string, string | number> = {};
    if (request.limit !== undefined) params.limit = request.limit;
    if (request.next_cursor) params.cursor = request.next_cursor;

    const entitySegment = ENTITY_TYPE_PATH_SEGMENTS[request.entity_type];
    const response = await this.getAxiosInstance().get<AttachmentListResponse>(
      `${V3_API_BASE_URL}/workspaces/${request.workspace_id}/${entitySegment}/${request.entity_id}/attachments`,
      { params }
    );
    return response.data;
  }

  // Helper methods

  private async resolveFileBytes(request: UploadAttachmentRequest): Promise<Buffer> {
    if (request.file_data) {
      return Buffer.from(request.file_data, 'base64');
    }
    if (request.file_path) {
      return readFile(request.file_path);
    }
    if (request.file_url) {
      const response = await fetch(request.file_url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from URL (${response.status} ${response.statusText})`
        );
      }
      return Buffer.from(await response.arrayBuffer());
    }
    throw new Error('One of file_data, file_path, or file_url must be provided');
  }
}
