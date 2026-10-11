import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import http, { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  decodeBase64Upload,
  fetchUploadUrl,
  isBlockedAddress,
  readUploadFile,
  resolveUploadFilePath,
} from '../utils/upload-guards';

describe('isBlockedAddress', () => {
  it.each([
    '0.0.0.0',
    '0.1.2.3',
    '10.0.0.1',
    '100.64.0.1',
    '100.127.255.254',
    '127.0.0.1',
    '127.255.255.255',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '192.0.0.170',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '[::1]',
    '::127.0.0.1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::ffff:a9fe:a9fe',
    '::ffff:10.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
    'fc00::1',
    'fd00:ec2::254',
    'fe80::1',
    'fe80::1%eth0',
    'fec0::1',
    'ff02::1',
    '2001:db8::1',
    'not-an-ip',
  ])('blocks %s', address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    '1.1.1.1',
    '8.8.8.8',
    '100.63.255.255',
    '100.128.0.0',
    '172.15.255.255',
    '172.32.0.0',
    '93.184.216.34',
    '2606:4700:4700::1111',
    '::ffff:8.8.8.8',
    '64:ff9b::808:808',
    '2002:808:808::',
  ])('allows public %s', address => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe('resolveUploadFilePath', () => {
  let base: string;
  let uploadDir: string;
  let outsideFile: string;

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'upload-guard-'));
    uploadDir = join(base, 'uploads');
    mkdirSync(join(uploadDir, 'nested'), { recursive: true });
    writeFileSync(join(uploadDir, 'ok.txt'), 'ok');
    writeFileSync(join(uploadDir, 'nested', 'deep.txt'), 'deep');
    outsideFile = join(base, 'secret.txt');
    writeFileSync(outsideFile, 'secret');
    symlinkSync(outsideFile, join(uploadDir, 'escape-link.txt'));
    symlinkSync(base, join(uploadDir, 'escape-dir'));
    symlinkSync(join(uploadDir, 'ok.txt'), join(uploadDir, 'inner-link.txt'));
  });

  afterAll(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it('denies every file_path when CLICKUP_UPLOAD_DIR is unset', async () => {
    await expect(resolveUploadFilePath(join(uploadDir, 'ok.txt'), undefined)).rejects.toThrow(
      /CLICKUP_UPLOAD_DIR/
    );
    await expect(resolveUploadFilePath('/etc/passwd', '')).rejects.toThrow(/disabled/);
  });

  it('allows files inside the upload dir (absolute, relative, nested, internal symlink)', async () => {
    await expect(resolveUploadFilePath(join(uploadDir, 'ok.txt'), uploadDir)).resolves.toMatch(/ok\.txt$/);
    await expect(resolveUploadFilePath('ok.txt', uploadDir)).resolves.toMatch(/ok\.txt$/);
    await expect(resolveUploadFilePath('nested/deep.txt', uploadDir)).resolves.toMatch(/deep\.txt$/);
    await expect(resolveUploadFilePath('inner-link.txt', uploadDir)).resolves.toMatch(/ok\.txt$/);
  });

  it('rejects traversal outside the upload dir', async () => {
    await expect(resolveUploadFilePath('../secret.txt', uploadDir)).rejects.toThrow(/outside/);
    await expect(resolveUploadFilePath(outsideFile, uploadDir)).rejects.toThrow(/outside/);
  });

  it('rejects symlinks that escape the upload dir', async () => {
    await expect(resolveUploadFilePath('escape-link.txt', uploadDir)).rejects.toThrow(/outside/);
    await expect(resolveUploadFilePath('escape-dir/secret.txt', uploadDir)).rejects.toThrow(/outside/);
  });

  it('rejects the directory itself, missing files and NUL bytes', async () => {
    await expect(resolveUploadFilePath('.', uploadDir)).rejects.toThrow(/outside/);
    await expect(resolveUploadFilePath('nested', uploadDir)).rejects.toThrow(/Not a regular file/);
    await expect(resolveUploadFilePath('missing.txt', uploadDir)).rejects.toThrow(/not found/i);
    await expect(resolveUploadFilePath('ok.txt\0', uploadDir)).rejects.toThrow(/Invalid/);
  });

  it('readUploadFile reads through one validated descriptor', async () => {
    await expect(readUploadFile('ok.txt', { maxBytes: 10, uploadDir })).resolves.toEqual(Buffer.from('ok'));
    await expect(readUploadFile('inner-link.txt', { maxBytes: 10, uploadDir })).resolves.toEqual(
      Buffer.from('ok')
    );
    await expect(readUploadFile('escape-link.txt', { maxBytes: 10, uploadDir })).rejects.toThrow(/outside/);
    await expect(readUploadFile('ok.txt', { maxBytes: 1, uploadDir })).rejects.toThrow(/maximum upload size/);
    await expect(readUploadFile('ok.txt', { maxBytes: 10, uploadDir: undefined })).rejects.toThrow(/disabled/);
  });
});

describe('decodeBase64Upload', () => {
  it('decodes standard, unpadded, URL-safe and whitespace-wrapped base64', () => {
    expect(decodeBase64Upload('aGVsbG8=', 10).toString()).toBe('hello');
    expect(decodeBase64Upload('aGVsbG8', 10).toString()).toBe('hello');
    expect(decodeBase64Upload('aGVs\nbG8=', 10).toString()).toBe('hello');
    expect(decodeBase64Upload('-_8=', 10)).toEqual(Buffer.from([0xfb, 0xff]));
  });

  it('rejects malformed input instead of silently decoding part of it', () => {
    for (const bad of ['hello!', 'aGVsbG8=x', 'a', 'aGVsb=', '====', 'aGVsbG8===']) {
      expect(() => decodeBase64Upload(bad, 100)).toThrow(/valid base64/);
    }
    expect(() => decodeBase64Upload('', 100)).toThrow(/empty/);
  });

  it('accounts for padding so a file exactly at the limit is accepted', () => {
    const atLimit = Buffer.alloc(4).toString('base64'); // 'AAAAAA==' -> 4 bytes
    expect(decodeBase64Upload(atLimit, 4)).toHaveLength(4);
    expect(() => decodeBase64Upload(atLimit, 3)).toThrow(/maximum upload size/);
  });

  it('rejects oversized input before normalising it', () => {
    const replace = jest.spyOn(String.prototype, 'replace');
    try {
      expect(() => decodeBase64Upload('A'.repeat(10_000), 300)).toThrow(/maximum upload size/);
      expect(replace).not.toHaveBeenCalled();
    } finally {
      replace.mockRestore();
    }
    // Line-wrapped input at the limit still fits within the allowed slack.
    const wrapped = (Buffer.alloc(570).toString('base64').match(/.{1,76}/g) as string[]).join('\r\n');
    expect(decodeBase64Upload(wrapped, 570)).toHaveLength(570);
  });
});

describe('fetchUploadUrl', () => {
  const MAX = 1024;

  it.each([
    'ftp://example.com/file',
    'file:///etc/passwd',
    'http://user:pass@example.com/file',
    'not a url',
  ])('rejects disallowed URL %s', async url => {
    await expect(fetchUploadUrl(url, { maxBytes: MAX })).rejects.toThrow(/file_url/);
  });

  it.each([
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://2130706433/',
    'http://0x7f000001/',
    'http://0177.0.0.1/',
    'http://127.1/',
    'http://0/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:a9fe:a9fe]/',
    'http://[fd00:ec2::254]/',
  ])('rejects private/loopback/metadata literal %s', async url => {
    await expect(fetchUploadUrl(url, { maxBytes: MAX })).rejects.toThrow(/private|loopback/);
  });

  it('rejects cleanly, leaving no timer behind, when the request cannot be created', async () => {
    jest.useFakeTimers();
    const get = jest.spyOn(http, 'get').mockImplementation(() => {
      throw new Error('boom');
    });
    try {
      await expect(fetchUploadUrl('http://example.com/f', { maxBytes: MAX })).rejects.toThrow('boom');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      get.mockRestore();
      jest.useRealTimers();
    }
  });

  it('rejects hostnames that resolve to loopback (checked after DNS resolution)', async () => {
    await expect(fetchUploadUrl('http://localhost/', { maxBytes: MAX })).rejects.toThrow(
      /resolves to a private/
    );
  });

  describe('against a local server', () => {
    let server: Server;
    let origin: string;
    // Treat this test server (127.0.0.1) as "public"; everything else keeps the
    // real policy, so redirects to other internal addresses are still refused.
    const allowLocalServer = (address: string): boolean =>
      address === '127.0.0.1' || !isBlockedAddress(address);

    beforeAll(async () => {
      server = createServer((req, res) => {
        if (req.url === '/file') {
          res.end('hello');
        } else if (req.url === '/big') {
          res.end('x'.repeat(MAX + 1));
        } else if (req.url === '/redirect-ok') {
          res.writeHead(302, { location: '/file' }).end();
        } else if (req.url === '/redirect-metadata') {
          res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' }).end();
        } else if (req.url === '/redirect-ipv6-loopback') {
          res.writeHead(302, { location: 'http://[::ffff:10.0.0.1]:1/' }).end();
        } else if (req.url === '/redirect-bad-location') {
          res.writeHead(302, { location: 'http://[bad' }).end();
        } else if (req.url === '/trickle') {
          res.writeHead(200);
          const timer = setInterval(() => res.write('x'), 10);
          res.on('close', () => clearInterval(timer));
        } else if (req.url === '/redirect-loop') {
          res.writeHead(302, { location: '/redirect-loop' }).end();
        } else {
          res.writeHead(404).end();
        }
      });
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
      await new Promise(resolve => server.close(resolve));
    });

    it('downloads the body', async () => {
      const body = await fetchUploadUrl(`${origin}/file`, { maxBytes: MAX, isAddressAllowed: allowLocalServer });
      expect(body.toString()).toBe('hello');
    });

    it('follows a redirect after re-validating it', async () => {
      const body = await fetchUploadUrl(`${origin}/redirect-ok`, {
        maxBytes: MAX,
        isAddressAllowed: allowLocalServer,
      });
      expect(body.toString()).toBe('hello');
    });

    it('refuses redirects to metadata or private addresses', async () => {
      await expect(
        fetchUploadUrl(`${origin}/redirect-metadata`, { maxBytes: MAX, isAddressAllowed: allowLocalServer })
      ).rejects.toThrow(/private|loopback/);
      await expect(
        fetchUploadUrl(`${origin}/redirect-ipv6-loopback`, { maxBytes: MAX, isAddressAllowed: allowLocalServer })
      ).rejects.toThrow(/private|loopback/);
    });

    it('rejects a malformed redirect Location instead of throwing out of the callback', async () => {
      await expect(
        fetchUploadUrl(`${origin}/redirect-bad-location`, { maxBytes: MAX, isAddressAllowed: allowLocalServer })
      ).rejects.toThrow(/invalid Location/);
    });

    it('enforces a wall-clock deadline even while bytes keep trickling in', async () => {
      await expect(
        fetchUploadUrl(`${origin}/trickle`, {
          maxBytes: MAX * 100,
          timeoutMs: 150,
          isAddressAllowed: allowLocalServer,
        })
      ).rejects.toThrow(/Timed out/);
    });

    it('caps the number of redirects', async () => {
      await expect(
        fetchUploadUrl(`${origin}/redirect-loop`, {
          maxBytes: MAX,
          maxRedirects: 2,
          isAddressAllowed: allowLocalServer,
        })
      ).rejects.toThrow(/redirected more than 2 times/);
    });

    it('enforces the size cap and reports HTTP errors', async () => {
      await expect(
        fetchUploadUrl(`${origin}/big`, { maxBytes: MAX, isAddressAllowed: allowLocalServer })
      ).rejects.toThrow(/maximum upload size/);
      await expect(
        fetchUploadUrl(`${origin}/missing`, { maxBytes: MAX, isAddressAllowed: allowLocalServer })
      ).rejects.toThrow(/404/);
    });

    it('refuses the local server itself under the default policy', async () => {
      await expect(fetchUploadUrl(`${origin}/file`, { maxBytes: MAX })).rejects.toThrow(/private|loopback/);
    });
  });
});
