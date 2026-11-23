/**
 * Uploads reach ClickUp as multipart/form-data with the boundary the body uses, checked on the wire
 * because a mocked post() only sees the request config.
 *
 * The real clients run unchanged, safety interceptor included. A custom adapter, called after every
 * interceptor, hands the final request to axios's http adapter aimed at a local server. It uses the
 * axios module the clients import: a second copy (the CJS build) treats the header object
 * differently and does not show a missing Content-Type.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { ClickUpClient } from '../clickup-client/index.js';
import { AttachmentsEnhancedClient } from '../clickup-client/attachments-enhanced.js';
import { EnhancedCustomFieldsClient } from '../clickup-client/custom-fields-enhanced.js';

interface Seen {
  path: string;
  contentType: string | undefined;
  body: Buffer;
}

let server: http.Server;
let local = '';
const seen: Seen[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c as Buffer));
    req.on('end', () => {
      seen.push({ path: req.url ?? '', contentType: req.headers['content-type'], body: Buffer.concat(chunks) });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"id":"att-1"}');
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  local = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

/** Send this instance's requests to the local server, after all interceptors have run. */
function toLocal(instance: AxiosInstance): void {
  const httpAdapter = axios.getAdapter('http');
  instance.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    const target = new URL(axios.getUri(config));
    return httpAdapter({ ...config, baseURL: undefined, url: local + target.pathname + target.search });
  };
}

/** The request the server saw last must be multipart with the boundary its body actually uses. */
function expectMultipart(last: Seen, path: string, fileText: string, filename: string): void {
  expect(last.path).toBe(path);
  expect(last.contentType).toMatch(/^multipart\/form-data; boundary=\S+$/);
  const boundary = /boundary=(\S+)$/.exec(last.contentType ?? '')?.[1] ?? '';
  const body = last.body.toString('latin1');
  expect(body.startsWith(`--${boundary}\r\n`)).toBe(true);
  expect(body).toContain(`name="attachment"; filename="${filename}"`);
  expect(body).toContain(fileText);
  expect(body).toContain('name="filename"');
}

describe('multipart uploads on the wire', () => {
  it('task attachment upload sends multipart/form-data with the body boundary', async () => {
    const client = new AttachmentsEnhancedClient('test-token-not-real');
    toLocal(client.getAxiosInstance());
    await client.uploadAttachment({
      task_id: 'abc123',
      filename: 'notes.md',
      file_data: Buffer.from('# wire test\n').toString('base64'),
    });
    expectMultipart(seen[seen.length - 1], '/api/v2/task/abc123/attachment', '# wire test', 'notes.md');
  });

  it('custom field file upload sends multipart/form-data with the body boundary', async () => {
    const base = new ClickUpClient({ apiToken: 'test-token-not-real' });
    toLocal(base.getAxiosInstance());
    const fields = new EnhancedCustomFieldsClient(base);
    await fields.uploadFieldAttachment({
      workspace_id: '1',
      custom_field_id: 'cf-1',
      filename: 'a.txt',
      file_data: Buffer.from('field bytes').toString('base64'),
    });
    expectMultipart(seen[seen.length - 1], '/api/v3/workspaces/1/custom_fields/cf-1/attachments', 'field bytes', 'a.txt');
  });

  it('negative control: the old `Content-Type: false` setting sends no Content-Type at all', async () => {
    // Proves this harness catches the bug shape, so a green run above means something.
    const base = new ClickUpClient({ apiToken: 'test-token-not-real' });
    toLocal(base.getAxiosInstance());
    const form = new FormData();
    form.append('attachment', new Blob([new Uint8Array([104, 105])]), 'x.txt');
    await base.getAxiosInstance().post('/task/abc123/attachment', form, { headers: { 'Content-Type': false } });
    expect(seen[seen.length - 1].contentType).toBeUndefined();
  });
});
