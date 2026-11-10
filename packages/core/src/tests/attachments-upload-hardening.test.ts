/**
 * Attachment upload hardening for stdio mode (the hosted server refuses
 * file_url and file_path outright; see tests/remote/).
 *
 * file_url runs against a real local HTTP server. Its address is loopback,
 * which the default policy refuses, so "success" cases widen the policy to
 * 127.0.0.1 alone and everything else stays blocked.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AxiosRequestConfig } from 'axios';
import { BlockedUrlError, fetchPublicUrl, isPublicAddress } from '../clickup-client/safe-fetch';
import {
  AttachmentsEnhancedClient,
  decodeBase64Strict,
} from '../clickup-client/attachments-enhanced';

let server: Server;
let origin: string;
let hits: string[];

beforeAll(async () => {
  server = createServer((req, res) => {
    hits.push(req.url ?? '');
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/file') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end('file-bytes');
    } else if (url.pathname === '/to-metadata') {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' }).end();
    } else if (url.pathname === '/to-private') {
      res.writeHead(301, { location: 'http://10.0.0.1/secret' }).end();
    } else if (url.pathname === '/to-localhost-name') {
      res
        .writeHead(302, { location: `http://localhost:${url.searchParams.get('port')}/file` })
        .end();
    } else if (url.pathname === '/to-file') {
      res.writeHead(302, { location: '/file' }).end();
    } else if (url.pathname === '/to-file-scheme') {
      res.writeHead(302, { location: 'file:///etc/passwd' }).end();
    } else if (url.pathname === '/to-credentials') {
      res
        .writeHead(302, { location: `${origin}/file`.replace('http://', 'http://user:pw@') })
        .end();
    } else if (url.pathname === '/loop') {
      res.writeHead(302, { location: '/loop' }).end();
    } else if (url.pathname === '/big-declared') {
      res.writeHead(200, { 'content-length': '5000' }).end('x'.repeat(5000));
    } else if (url.pathname === '/big-chunked') {
      res.writeHead(200);
      for (let i = 0; i < 10; i++) res.write('y'.repeat(1000));
      res.end();
    } else if (url.pathname === '/stall') {
      res.writeHead(200);
      res.write('partial');
      // never ends
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

beforeEach(() => {
  hits = [];
});

const loopbackOnly = (address: string) => address === '127.0.0.1';
const opts = { timeoutMs: 2000, maxBytes: 1024 * 1024, isAllowedAddress: loopbackOnly };
const text = (chunks: Buffer[]) => Buffer.concat(chunks).toString();

describe('isPublicAddress', () => {
  it('refuses private, loopback, link-local, metadata and reserved ranges, mapped forms included', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      '::',
      'fe80::1',
      'fd00::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:a9fe:a9fe',
      '64:ff9b::169.254.169.254',
      'not-an-ip',
    ]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
      expect(isPublicAddress(address)).toBe(true);
    }
  });
});

describe('fetchPublicUrl', () => {
  it('refuses loopback by IP literal and by hostname (the DNS answer is checked)', async () => {
    const port = (server.address() as AddressInfo).port;
    for (const url of [
      `${origin}/file`,
      `http://localhost:${port}/file`,
      `http://[::ffff:127.0.0.1]:${port}/file`,
    ]) {
      await expect(fetchPublicUrl(url, { timeoutMs: 2000, maxBytes: 1024 })).rejects.toBeInstanceOf(
        BlockedUrlError
      );
    }
    expect(hits).toEqual([]);
  });

  it('fetches an allowed URL', async () => {
    expect(text(await fetchPublicUrl(`${origin}/file`, opts))).toBe('file-bytes');
  });

  it('re-checks every redirect hop: to metadata, to a private IP, to a hostname', async () => {
    const port = (server.address() as AddressInfo).port;
    for (const path of ['/to-metadata', '/to-private', `/to-localhost-name?port=${port}`]) {
      await expect(fetchPublicUrl(`${origin}${path}`, opts)).rejects.toBeInstanceOf(
        BlockedUrlError
      );
    }
    // Only the first hop ever reached the server; /file behind localhost was not fetched.
    expect(hits.every(hit => !hit.startsWith('/file'))).toBe(true);
  });

  it('applies the scheme and credential rules to redirect targets too', async () => {
    for (const path of ['/to-file-scheme', '/to-credentials']) {
      await expect(fetchPublicUrl(`${origin}${path}`, opts)).rejects.toBeInstanceOf(
        BlockedUrlError
      );
    }
    expect(hits.filter(hit => hit === '/file')).toEqual([]);
  });

  it('follows an allowed redirect', async () => {
    expect(text(await fetchPublicUrl(`${origin}/to-file`, opts))).toBe('file-bytes');
  });

  it('caps redirects', async () => {
    await expect(fetchPublicUrl(`${origin}/loop`, { ...opts, maxRedirects: 3 })).rejects.toThrow(
      /redirected more than 3 times/
    );
    expect(hits).toHaveLength(4);
  });

  it('refuses non-http schemes and embedded credentials', async () => {
    for (const url of [
      'file:///etc/passwd',
      'ftp://example.com/x',
      'http://user:pw@example.com/',
    ]) {
      await expect(fetchPublicUrl(url, opts)).rejects.toBeInstanceOf(BlockedUrlError);
    }
  });

  it('enforces the size cap whether or not Content-Length is declared', async () => {
    const small = { ...opts, maxBytes: 2048 };
    await expect(fetchPublicUrl(`${origin}/big-declared`, small)).rejects.toThrow(
      /maximum upload size/
    );
    await expect(fetchPublicUrl(`${origin}/big-chunked`, small)).rejects.toThrow(
      /maximum upload size/
    );
  });

  it('gives up on a server that stalls mid-body', async () => {
    const started = Date.now();
    await expect(fetchPublicUrl(`${origin}/stall`, { ...opts, timeoutMs: 300 })).rejects.toThrow(
      /timed out/
    );
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe('uploadAttachment', () => {
  const originalMode = process.env.CLICKUP_MCP_REMOTE;
  beforeAll(() => {
    delete process.env.CLICKUP_MCP_REMOTE;
  });
  afterAll(() => {
    if (originalMode !== undefined) process.env.CLICKUP_MCP_REMOTE = originalMode;
  });

  /** Capture the uploaded attachment's bytes at the HTTP layer. */
  function capture(client: AttachmentsEnhancedClient): string[] {
    const uploaded: string[] = [];
    client.getAxiosInstance().defaults.adapter = async (config: AxiosRequestConfig) => {
      const blob = (config.data as FormData).get('attachment') as Blob;
      uploaded.push(await blob.text());
      return { data: { id: 'a1' }, status: 200, statusText: 'OK', headers: {}, config } as never;
    };
    return uploaded;
  }

  it('refuses a loopback file_url before any upload or fetch', async () => {
    const client = new AttachmentsEnhancedClient('pk_test');
    const uploaded = capture(client);
    await expect(
      client.uploadAttachment({
        task_id: 't1',
        filename: 'x.txt',
        file_url: `${origin}/file`,
      } as never)
    ).rejects.toBeInstanceOf(BlockedUrlError);
    expect(uploaded).toEqual([]);
    expect(hits).toEqual([]);
  });

  it('uploads strict base64, with or without a data: prefix', async () => {
    const client = new AttachmentsEnhancedClient('pk_test');
    const uploaded = capture(client);
    for (const file_data of ['aGVsbG8=', 'data:text/plain;base64,aGVsbG8=', 'aGVs\nbG8=']) {
      await client.uploadAttachment({ task_id: 't1', filename: 'h.txt', file_data } as never);
    }
    expect(uploaded).toEqual(['hello', 'hello', 'hello']);
  });

  it('refuses file_data that is not base64 instead of uploading garbage', async () => {
    const client = new AttachmentsEnhancedClient('pk_test');
    const uploaded = capture(client);
    for (const file_data of [
      'hello world, not base64!',
      'data:text/plain,hello',
      'aGVs=bG8=',
      'ab!d',
      '****',
      'not base64!!',
    ]) {
      await expect(
        client.uploadAttachment({ task_id: 't1', filename: 'h.txt', file_data } as never)
      ).rejects.toThrow(/not valid base64/);
    }
    expect(uploaded).toEqual([]);
  });

  it('uploads a local file_path from a single bounded read', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cu-upload-'));
    const file = join(dir, 'notes.txt');
    writeFileSync(file, 'local-file-bytes'.repeat(100000)); // spans several read chunks
    const client = new AttachmentsEnhancedClient('pk_test');
    const uploaded = capture(client);
    await client.uploadAttachment({
      task_id: 't1',
      filename: 'notes.txt',
      file_path: file,
    } as never);
    expect(uploaded).toEqual(['local-file-bytes'.repeat(100000)]);
  });
});

describe('decodeBase64Strict', () => {
  it('accepts base64url and rejects impossible lengths', () => {
    expect(decodeBase64Strict('-_8').equals(Buffer.from([0xfb, 0xff]))).toBe(true);
    expect(() => decodeBase64Strict('abcde')).toThrow(/not valid base64/);
  });
});
