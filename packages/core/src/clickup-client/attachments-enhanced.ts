import { readFile, stat } from 'fs/promises';
import { ClickUpClient } from './index.js';
import { fetchUploadUrl, resolveUploadFilePath } from '../utils/upload-guards.js';
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

// ClickUp's documented attachment limit is 1 GB; cap below it to bound memory use.
const MAX_UPLOAD_SIZE_BYTES = 512 * 1024 * 1024;

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
    // Wrap the Buffer in a Uint8Array view over the same memory (no copy) so it
    // is a valid BlobPart under the DOM types without duplicating the payload.
    // A Node Buffer is always backed by a real ArrayBuffer (never a
    // SharedArrayBuffer), so the cast is sound and satisfies the DOM BlobPart type.
    const bytesView = new Uint8Array(
      fileBytes.buffer as ArrayBuffer,
      fileBytes.byteOffset,
      fileBytes.byteLength
    );
    form.append('attachment', new Blob([bytesView]), request.filename);
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
        // content type with the correct boundary. Axios treats `false`
        // as an explicit opt-out; `undefined` can leave the default.
        headers: { 'Content-Type': false },
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
      // Estimate the decoded size before allocating (4 base64 chars -> 3 bytes)
      this.assertWithinSizeLimit(Math.floor(request.file_data.length * 0.75));
      const bytes = Buffer.from(request.file_data, 'base64');
      this.assertWithinSizeLimit(bytes.length);
      return bytes;
    }
    if (request.file_path) {
      // Denied unless CLICKUP_UPLOAD_DIR is set; the realpath must stay inside it.
      const resolvedPath = await resolveUploadFilePath(request.file_path);
      const stats = await stat(resolvedPath);
      this.assertWithinSizeLimit(stats.size);
      return readFile(resolvedPath);
    }
    if (request.file_url) {
      // SSRF-guarded: public addresses only, redirects re-validated, size capped.
      return fetchUploadUrl(request.file_url, { maxBytes: MAX_UPLOAD_SIZE_BYTES });
    }
    throw new Error('One of file_data, file_path, or file_url must be provided');
  }

  /** ClickUp caps attachments at 1 GB; a lower cap avoids exhausting process memory. */
  private assertWithinSizeLimit(sizeBytes: number): void {
    if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(
        `File exceeds the maximum upload size of ${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB`
      );
    }
  }
}
