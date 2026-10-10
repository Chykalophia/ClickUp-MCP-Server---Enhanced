/**
 * Guards for clickup_upload_attachment's file_path and file_url inputs.
 *
 * The MCP caller is a language model acting on untrusted content (task
 * descriptions, comments, web pages), so both inputs are attack surface:
 *  - file_path could read arbitrary local files (SSH keys, .env) and exfiltrate
 *    them to ClickUp. It is therefore denied unless the operator opts in with
 *    CLICKUP_UPLOAD_DIR, and the canonical (symlink-resolved) target must stay
 *    inside that directory.
 *  - file_url could reach internal services or cloud metadata endpoints
 *    (SSRF). Every hostname is resolved and each address is checked against
 *    private/reserved ranges at connection time (so DNS rebinding cannot swap
 *    in an internal address after validation), and redirects are followed
 *    manually with every hop re-validated.
 */
import { lookup as dnsLookup } from 'node:dns';
import { constants as fsConstants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { isAbsolute, relative, resolve } from 'node:path';

export const UPLOAD_DIR_ENV = 'CLICKUP_UPLOAD_DIR';

// ---------------------------------------------------------------------------
// file_path
// ---------------------------------------------------------------------------

/**
 * Resolve a caller-supplied path to a canonical file path inside the
 * configured upload directory, or throw. Relative paths are resolved against
 * the upload directory.
 */
export async function resolveUploadFilePath(
  filePath: string,
  uploadDir: string | undefined = process.env[UPLOAD_DIR_ENV]
): Promise<string> {
  if (!uploadDir || uploadDir.trim() === '') {
    throw new Error(
      `file_path uploads are disabled. Set ${UPLOAD_DIR_ENV} to a directory to allow uploading ` +
        'local files from it, or use file_data / file_url instead.'
    );
  }
  if (filePath.includes('\0')) {
    throw new Error('Invalid file path');
  }

  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(resolve(uploadDir));
  } catch {
    throw new Error(`${UPLOAD_DIR_ENV} does not exist or is not accessible`);
  }

  const requested = resolve(canonicalRoot, filePath);
  let canonicalTarget: string;
  try {
    // realpath follows every symlink, so a link inside the root that points
    // outside it is caught by the containment check below.
    canonicalTarget = await realpath(requested);
  } catch {
    throw new Error(`File not found inside ${UPLOAD_DIR_ENV}: ${filePath}`);
  }

  if (!isInsideDirectory(canonicalRoot, canonicalTarget)) {
    throw new Error(`file_path is outside the configured ${UPLOAD_DIR_ENV} upload directory`);
  }

  const stats = await stat(canonicalTarget);
  if (!stats.isFile()) {
    throw new Error(`Not a regular file: ${filePath}`);
  }
  return canonicalTarget;
}

/**
 * Resolve file_path as resolveUploadFilePath does, then open it once and
 * verify the opened descriptor is still the validated file before reading.
 * This closes the window in which the path could be swapped for a symlink
 * pointing outside the upload directory between validation and read.
 */
export async function readUploadFile(
  filePath: string,
  options: { maxBytes: number; uploadDir?: string }
): Promise<Buffer> {
  const uploadDir = 'uploadDir' in options ? options.uploadDir : process.env[UPLOAD_DIR_ENV];
  const canonicalTarget = await resolveUploadFilePath(filePath, uploadDir);
  // O_NOFOLLOW refuses a final-component symlink (0 where unsupported).
  const handle = await open(canonicalTarget, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    // Re-validate after opening: the path must still canonicalise to itself
    // and name the same inode as the descriptor we hold. A swapped
    // intermediate directory or replaced file fails one of these checks.
    const [current, onDisk] = await Promise.all([realpath(canonicalTarget), stat(canonicalTarget)]);
    if (current !== canonicalTarget || onDisk.dev !== opened.dev || onDisk.ino !== opened.ino) {
      throw new Error('file_path changed while it was being read; refusing to upload');
    }
    if (!opened.isFile()) {
      throw new Error(`Not a regular file: ${filePath}`);
    }
    if (opened.size > options.maxBytes) {
      throw sizeError(options.maxBytes);
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

// ---------------------------------------------------------------------------
// file_data
// ---------------------------------------------------------------------------

/**
 * Decode base64 file_data, rejecting malformed input (Buffer.from silently
 * skips invalid characters, which would upload different bytes) and anything
 * over maxBytes before allocating. Whitespace is ignored; the URL-safe
 * alphabet is accepted.
 */
export function decodeBase64Upload(data: string, maxBytes: number): Buffer {
  const normalized = data.replace(/\s+/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  if (
    !/^[A-Za-z0-9+/_-]*={0,2}$/.test(normalized) ||
    normalized.length % 4 === 1 ||
    (padding > 0 && normalized.length % 4 !== 0)
  ) {
    throw new Error('file_data must be valid base64-encoded file contents');
  }
  // Exact decoded length: 3 bytes per 4 chars, minus padding.
  const decodedLength = Math.floor((normalized.length * 3) / 4) - padding;
  if (decodedLength > maxBytes) {
    throw sizeError(maxBytes);
  }
  if (decodedLength === 0) {
    throw new Error('file_data decoded to an empty file; it must be base64-encoded file contents');
  }
  return Buffer.from(normalized, 'base64');
}

function isInsideDirectory(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

// ---------------------------------------------------------------------------
// IP classification
// ---------------------------------------------------------------------------

type Cidr = [bigint, number];

function ipv4ToBigInt(ip: string): bigint {
  return ip.split('.').reduce((acc, octet) => (acc << 8n) | BigInt(Number(octet)), 0n);
}

/** Parse a textual IPv6 address (already validated by net.isIP) into a 128-bit integer. */
function ipv6ToBigInt(ip: string): bigint {
  let address = ip.split('%')[0]; // drop zone id
  // Embedded dotted-quad tail (e.g. ::ffff:127.0.0.1)
  const dotted = address.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const v4 = ipv4ToBigInt(dotted[2]);
    address = `${dotted[1]}${(v4 >> 16n).toString(16)}:${(v4 & 0xffffn).toString(16)}`;
  }
  const [head, tail] = address.includes('::') ? address.split('::') : [address, undefined];
  const headParts = head ? head.split(':') : [];
  const tailParts = tail !== undefined && tail !== '' ? tail.split(':') : [];
  const fill = tail !== undefined ? 8 - headParts.length - tailParts.length : 0;
  const words = [...headParts, ...Array<string>(fill).fill('0'), ...tailParts];
  return words.reduce((acc, word) => (acc << 16n) | BigInt(parseInt(word || '0', 16)), 0n);
}

function cidr4(base: string, bits: number): Cidr {
  return [ipv4ToBigInt(base), bits];
}

function cidr6(base: string, bits: number): Cidr {
  return [ipv6ToBigInt(base), bits];
}

function inCidr(value: bigint, [base, bits]: Cidr, width: number): boolean {
  const shift = BigInt(width - bits);
  return value >> shift === base >> shift;
}

// Everything that is not globally routable unicast (RFC 6890 and friends).
const BLOCKED_V4: Cidr[] = [
  cidr4('0.0.0.0', 8), // "this network"
  cidr4('10.0.0.0', 8), // private
  cidr4('100.64.0.0', 10), // CGNAT shared address space
  cidr4('127.0.0.0', 8), // loopback
  cidr4('169.254.0.0', 16), // link-local, incl. cloud metadata 169.254.169.254
  cidr4('172.16.0.0', 12), // private
  cidr4('192.0.0.0', 24), // IETF protocol assignments
  cidr4('192.0.2.0', 24), // TEST-NET-1
  cidr4('192.88.99.0', 24), // 6to4 relay anycast
  cidr4('192.168.0.0', 16), // private
  cidr4('198.18.0.0', 15), // benchmarking
  cidr4('198.51.100.0', 24), // TEST-NET-2
  cidr4('203.0.113.0', 24), // TEST-NET-3
  cidr4('224.0.0.0', 4), // multicast
  cidr4('240.0.0.0', 4), // reserved + broadcast
];

const BLOCKED_V6: Cidr[] = [
  cidr6('::', 96), // unspecified, loopback, deprecated IPv4-compatible
  cidr6('64:ff9b:1::', 48), // local-use NAT64
  cidr6('100::', 64), // discard-only
  cidr6('2001::', 32), // Teredo
  cidr6('2001:db8::', 32), // documentation
  cidr6('fc00::', 7), // unique local (ULA), incl. AWS fd00:ec2::254 metadata
  cidr6('fe80::', 10), // link-local
  cidr6('fec0::', 10), // deprecated site-local
  cidr6('ff00::', 8), // multicast
];

const V4_MAPPED = cidr6('::ffff:0:0', 96);
const NAT64 = cidr6('64:ff9b::', 96);
const SIX_TO_FOUR = cidr6('2002::', 16);

function bigIntToIpv4(value: bigint): string {
  return [24n, 16n, 8n, 0n].map(shift => ((value >> shift) & 0xffn).toString()).join('.');
}

/**
 * True if the address must not be contacted: private, loopback, link-local,
 * ULA, CGNAT, multicast, reserved, cloud metadata, or an IPv6 form embedding
 * such an IPv4 address (IPv4-mapped, NAT64, 6to4). Unparseable input is blocked.
 */
export function isBlockedAddress(address: string): boolean {
  const unbracketed = address.replace(/^\[(.*)\]$/, '$1');
  const family = isIP(unbracketed.split('%')[0]);
  if (family === 4) {
    const value = ipv4ToBigInt(unbracketed);
    return BLOCKED_V4.some(range => inCidr(value, range, 32));
  }
  if (family === 6) {
    const value = ipv6ToBigInt(unbracketed);
    if (inCidr(value, V4_MAPPED, 128) || inCidr(value, NAT64, 128)) {
      return isBlockedAddress(bigIntToIpv4(value & 0xffffffffn));
    }
    if (inCidr(value, SIX_TO_FOUR, 128)) {
      return isBlockedAddress(bigIntToIpv4((value >> 80n) & 0xffffffffn));
    }
    return BLOCKED_V6.some(range => inCidr(value, range, 128));
  }
  return true;
}

// ---------------------------------------------------------------------------
// file_url
// ---------------------------------------------------------------------------

export interface GuardedFetchOptions {
  /** Abort once the body exceeds this many bytes. */
  maxBytes: number;
  /** Redirect hops to follow (each one re-validated). Default 3. */
  maxRedirects?: number;
  /** Wall-clock deadline per request (headers and body) in ms. Default 30s. */
  timeoutMs?: number;
  /** Test hook: decides whether a resolved address may be contacted. */
  isAddressAllowed?: (address: string) => boolean;
}

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

function parseAllowedUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError('Invalid file_url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BlockedUrlError('file_url must use http or https');
  }
  if (parsed.username || parsed.password) {
    throw new BlockedUrlError('file_url must not contain credentials');
  }
  return parsed;
}

/**
 * A dns.lookup replacement that refuses to hand back any blocked address. Used
 * as the socket's lookup so the address checked is the address connected to.
 */
function guardedLookup(isAllowed: (address: string) => boolean): LookupFunction {
  return ((hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
    dnsLookup(hostname, { ...options, all: true, verbatim: true }, (error, addresses) => {
      if (error) {
        callback(error);
        return;
      }
      const list = addresses as Array<{ address: string; family: number }>;
      if (list.length === 0 || list.some(entry => !isAllowed(entry.address))) {
        callback(
          new BlockedUrlError(
            `file_url host ${hostname} resolves to a private, loopback, link-local or reserved address`
          )
        );
        return;
      }
      if (options?.all) {
        callback(null, list);
      } else {
        callback(null, list[0].address, list[0].family);
      }
    });
  }) as LookupFunction;
}

function requestOnce(
  url: URL,
  options: Required<Omit<GuardedFetchOptions, 'maxRedirects'>>
): Promise<{ redirect?: string; body?: Buffer }> {
  const hostname = url.hostname.replace(/^\[(.*)\]$/, '$1');
  // Node skips the lookup function for IP literals, so check them here. The
  // WHATWG URL parser has already normalised decimal/hex/octal IPv4 forms
  // (http://2130706433/, http://0x7f.1/) to dotted quads.
  if (isIP(hostname) && !options.isAddressAllowed(hostname)) {
    return Promise.reject(
      new BlockedUrlError('file_url must not point to a private, loopback, link-local or reserved address')
    );
  }

  const transport = url.protocol === 'https:' ? https : http;
  return new Promise((resolveRaw, rejectRaw) => {
    // The socket `timeout` option only bounds inactivity, so a server that
    // trickles bytes could hold the request open forever; enforce a
    // wall-clock deadline as well.
    const deadline = setTimeout(() => {
      const error = new Error('Timed out fetching file_url');
      rejectPromise(error);
      request.destroy(error);
    }, options.timeoutMs);
    const resolvePromise = (value: { redirect?: string; body?: Buffer }): void => {
      clearTimeout(deadline);
      resolveRaw(value);
    };
    const rejectPromise = (error: Error): void => {
      clearTimeout(deadline);
      rejectRaw(error);
    };
    const request = transport.get(
      url,
      {
        lookup: guardedLookup(options.isAddressAllowed),
        timeout: options.timeoutMs,
        headers: { 'user-agent': 'clickup-mcp-server' },
        // Never reuse pooled sockets: each hop must go through the guarded lookup.
        agent: false,
      },
      response => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          // A malformed Location would throw inside this callback and escape
          // the promise as an uncaught exception, so reject instead.
          let target: string;
          try {
            target = new URL(response.headers.location, url).toString();
          } catch {
            rejectPromise(new BlockedUrlError('file_url redirected to an invalid Location'));
            return;
          }
          resolvePromise({ redirect: target });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          rejectPromise(new Error(`Failed to fetch file from URL (${status} ${response.statusMessage ?? ''})`.trim()));
          return;
        }
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > options.maxBytes) {
          response.destroy();
          rejectPromise(sizeError(options.maxBytes));
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        response.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > options.maxBytes) {
            response.destroy();
            rejectPromise(sizeError(options.maxBytes));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => resolvePromise({ body: Buffer.concat(chunks) }));
        response.on('error', rejectPromise);
      }
    );
    request.on('timeout', () => request.destroy(new Error('Timed out fetching file_url')));
    request.on('error', rejectPromise);
  });
}

function sizeError(maxBytes: number): Error {
  return new Error(`File exceeds the maximum upload size of ${Math.floor(maxBytes / (1024 * 1024))} MB`);
}

/**
 * Fetch a URL for upload with SSRF protection: http/https only, no
 * credentials, every resolved address must be public, redirects re-validated
 * hop by hop, response size capped while streaming.
 */
export async function fetchUploadUrl(rawUrl: string, options: GuardedFetchOptions): Promise<Buffer> {
  const resolved = {
    maxBytes: options.maxBytes,
    timeoutMs: options.timeoutMs ?? 30_000,
    isAddressAllowed: options.isAddressAllowed ?? ((address: string) => !isBlockedAddress(address)),
  };
  const maxRedirects = options.maxRedirects ?? 3;

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const result = await requestOnce(parseAllowedUrl(current), resolved);
    if (result.body) {
      return result.body;
    }
    current = result.redirect as string;
  }
  throw new Error(`file_url redirected more than ${maxRedirects} times`);
}
