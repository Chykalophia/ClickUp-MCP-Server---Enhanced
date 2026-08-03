import { readFile, stat } from 'fs/promises';
import { realpathSync } from 'fs';
import { resolve, sep } from 'path';
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
    // Wrap in a plain Uint8Array view so it is a valid BlobPart under the DOM types.
    form.append('attachment', new Blob([new Uint8Array(fileBytes)]), request.filename);
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
      const resolvedPath = this.resolveAllowedFilePath(request.file_path);
      const stats = await stat(resolvedPath);
      if (!stats.isFile()) {
        throw new Error(`Not a regular file: ${request.file_path}`);
      }
      this.assertWithinSizeLimit(stats.size);
      return readFile(resolvedPath);
    }
    if (request.file_url) {
      this.assertAllowedUploadUrl(request.file_url);
      const response = await fetch(request.file_url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from URL (${response.status} ${response.statusText})`
        );
      }
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > 0) {
        this.assertWithinSizeLimit(contentLength);
      }
      // Stream with a running byte limit: Content-Length is advisory and may
      // be absent or wrong, so never buffer the whole response unchecked.
      const chunks: Buffer[] = [];
      let received = 0;
      if (response.body) {
        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > MAX_UPLOAD_SIZE_BYTES) {
            await reader.cancel();
            this.assertWithinSizeLimit(received);
          }
          chunks.push(Buffer.from(value));
        }
      }
      return Buffer.concat(chunks);
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

  /**
   * When CLICKUP_UPLOAD_DIR is set, restrict file_path uploads to that
   * directory (rejecting traversal). Without it, any path readable by this
   * process is allowed — the MCP caller already runs with these privileges.
   */
  private resolveAllowedFilePath(filePath: string): string {
    if (filePath.includes('\0')) {
      throw new Error('Invalid file path');
    }
    const resolved = resolve(filePath);
    const uploadRoot = process.env.CLICKUP_UPLOAD_DIR;
    if (uploadRoot) {
      // Canonicalize both sides so symlinks inside the root cannot escape it
      const canonicalTarget = realpathSync(resolved);
      const canonicalRoot = realpathSync(resolve(uploadRoot));
      if (canonicalTarget !== canonicalRoot && !canonicalTarget.startsWith(canonicalRoot + sep)) {
        throw new Error('file_path is outside the configured CLICKUP_UPLOAD_DIR upload root');
      }
      return canonicalTarget;
    }
    return resolved;
  }

  /** Basic SSRF guard: only http(s) URLs to public hosts may be fetched. */
  private assertAllowedUploadUrl(fileUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(fileUrl);
    } catch {
      throw new Error('Invalid file_url');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('file_url must use http or https');
    }
    const host = parsed.hostname.toLowerCase();
    const isPrivateIpv4 =
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host === '0.0.0.0';
    if (host === 'localhost' || host === '::1' || host === '[::1]' || isPrivateIpv4) {
      throw new Error('file_url must not point to a private or loopback address');
    }
  }
}
