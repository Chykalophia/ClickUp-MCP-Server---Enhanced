import { open } from 'fs/promises';
import { constants as fsConstants, realpathSync } from 'fs';
import { resolve, sep } from 'path';
import { ClickUpClient } from './index.js';
import { isRemoteMode } from './request-context.js';
import { fetchPublicUrl } from './safe-fetch.js';
import type {
  UploadAttachmentRequest,
  GetAttachmentsRequest,
  AttachmentEntityType,
  AttachmentResponse,
  AttachmentListResponse,
} from '../schemas/attachments-schemas.js';
import { seg } from './path.js';

// The list attachments endpoint only exists in the v3 API; the shared client
// is bound to the v2 base URL, so v3 calls use absolute URLs (axios ignores
// baseURL when the request URL is absolute).
const V3_API_BASE_URL = 'https://api.clickup.com/api/v3';

// ClickUp's documented attachment limit is 1 GB; cap below it to bound memory use.
const MAX_UPLOAD_SIZE_BYTES = 512 * 1024 * 1024;
/** A stalled file_url server must not hold the tool call open forever. */
const FILE_URL_TIMEOUT_MS = 60_000;

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
    const form = new FormData();
    // new Blob() copies its parts once; handing it the chunks as read (rather
    // than a concatenated Buffer) keeps that the only copy. The chunks are
    // dropped right after, so peak memory is about twice the file, not three times.
    // Node Buffers are never backed by a SharedArrayBuffer, so the cast is sound.
    const parts = (await this.resolveFileParts(request)) as NonNullable<
      ConstructorParameters<typeof Blob>[0]
    >;
    form.append('attachment', new Blob(parts), request.filename);
    form.append('filename', request.filename);

    const params: Record<string, string> = {};
    if (request.custom_task_ids) params.custom_task_ids = 'true';
    if (request.team_id) params.team_id = request.team_id;

    const response = await this.getAxiosInstance().post<AttachmentResponse>(
      `/task/${seg(request.task_id)}/attachment`,
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
      `${V3_API_BASE_URL}/workspaces/${seg(request.workspace_id)}/${seg(entitySegment)}/${seg(request.entity_id)}/attachments`,
      { params }
    );
    return response.data;
  }

  // Helper methods

  private async resolveFileParts(request: UploadAttachmentRequest): Promise<Uint8Array[]> {
    if (request.file_data) {
      // Estimate the decoded size before allocating (4 base64 chars -> 3 bytes)
      this.assertWithinSizeLimit(Math.floor(request.file_data.length * 0.75));
      const bytes = decodeBase64Strict(request.file_data);
      this.assertWithinSizeLimit(bytes.length);
      return [bytes];
    }
    if (request.file_path) {
      const { path: resolvedPath, noFollow } = this.resolveAllowedFilePath(request.file_path);
      return this.readFileBounded(resolvedPath, noFollow, request.file_path);
    }
    if (request.file_url) {
      // Hosted mode: fetching an arbitrary URL from the server is a server-side
      // request forgery primitive. The hostname-string guard below misses
      // IPv4-mapped IPv6, redirects and DNS that resolves to private ranges, and
      // the fetched bytes land in ClickUp where the caller can read them back —
      // cloud metadata credentials, the host runtime API, internal services.
      if (isRemoteMode()) {
        throw new Error(
          'file_url uploads are disabled on the hosted server (the server would fetch the URL ' +
            'from its own network). Send the file as file_data (base64) instead.'
        );
      }
      // Private, loopback and metadata addresses are refused on every hop,
      // checked on the address actually connected to (safe-fetch.ts).
      return fetchPublicUrl(request.file_url, {
        timeoutMs: FILE_URL_TIMEOUT_MS,
        maxBytes: MAX_UPLOAD_SIZE_BYTES,
      });
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
   * One open, then a bounded read from that same handle: a separate stat()
   * then readFile() lets a file grow past the cap in between, and procfs-style
   * files report size 0 while producing data.
   */
  private async readFileBounded(
    path: string,
    noFollow: boolean,
    displayPath: string
  ): Promise<Uint8Array[]> {
    const handle = await open(path, fsConstants.O_RDONLY | (noFollow ? fsConstants.O_NOFOLLOW : 0));
    try {
      const stats = await handle.stat();
      if (!stats.isFile()) {
        throw new Error(`Not a regular file: ${displayPath}`);
      }
      this.assertWithinSizeLimit(stats.size);
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const chunk = Buffer.allocUnsafe(1024 * 1024);
        const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        received += bytesRead;
        this.assertWithinSizeLimit(received);
        chunks.push(chunk.subarray(0, bytesRead));
      }
      return chunks;
    } finally {
      await handle.close();
    }
  }

  /**
   * When CLICKUP_UPLOAD_DIR is set, restrict file_path uploads to that
   * directory (rejecting traversal). Without it, any path readable by this
   * process is allowed — the MCP caller already runs with these privileges.
   */
  private resolveAllowedFilePath(filePath: string): { path: string; noFollow: boolean } {
    // Hosted mode: the path would be read from the server, not the caller's
    // machine, and the server's own files (e.g. /proc/self/environ, which holds
    // its OAuth and token-sealing secrets) must never be uploadable.
    if (isRemoteMode()) {
      throw new Error(
        'file_path uploads are disabled on the hosted server: the path would be read from the ' +
          'server, not your machine. Send the file as file_data (base64) instead.'
      );
    }
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
      // Canonical, so a symlink swapped in after the check is refused at open().
      return { path: canonicalTarget, noFollow: true };
    }
    return { path: resolved, noFollow: false };
  }
}

/**
 * Decode file_data strictly. Buffer.from(x, 'base64') silently skips
 * anything outside the alphabet, so a data: URL or plain text "uploaded" as a
 * corrupted file and was reported as a success. A data:<mime>;base64, prefix
 * is accepted on purpose; base64url and line breaks are accepted too.
 */
export function decodeBase64Strict(input: string): Buffer {
  const withoutPrefix = input.replace(/^data:[^,]*;base64,/i, '');
  const compact = withoutPrefix.replace(/\s+/g, '');
  const standard = compact.replace(/-/g, '+').replace(/_/g, '/');
  const padded = /=+$/.test(standard);
  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(standard) ||
    (padded ? standard.length % 4 !== 0 : standard.length % 4 === 1)
  ) {
    throw new Error(
      'file_data is not valid base64. Send the raw file bytes base64-encoded ' +
        '(a data:<type>;base64, prefix is fine).'
    );
  }
  return Buffer.from(standard, 'base64');
}
