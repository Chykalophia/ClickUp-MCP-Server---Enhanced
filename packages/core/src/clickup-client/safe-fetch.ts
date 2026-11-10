import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

/**
 * Fetch a URL for an attachment upload without letting it reach this
 * machine's network neighbours (file_url, stdio mode; the hosted server
 * refuses file_url outright).
 *
 * A hostname check is not enough: DNS can resolve a public-looking name to
 * 10.0.0.1 or 169.254.169.254, a public URL can redirect to one, and a name
 * can resolve differently between the check and the connection (DNS
 * rebinding). So the address check runs inside the socket's own DNS lookup,
 * on the address actually connected to; IP literals (which skip DNS) are
 * checked directly; and redirects are followed by hand, each hop re-checked.
 */

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

/** An IPv4 address carried inside an IPv6 one (::ffff:a.b.c.d, 64:ff9b::a.b.c.d). */
function embeddedIpv4(address: string): string | undefined {
  const lower = address.toLowerCase();
  const dotted = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (dotted) return dotted[1];
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return [high >> 8, high & 255, low >> 8, low & 255].join('.');
  }
  return undefined;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIpv4(address);
    if (v4) return !blocked.check(v4, 'ipv4');
    return !blocked.check(address, 'ipv6');
  }
  return false;
}

export interface SafeFetchOptions {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects?: number;
  /** Address policy; defaults to public unicast only. Tests widen it. */
  isAllowedAddress?: (address: string) => boolean;
}

type LookupCallback = (
  error: Error | null,
  address: string | LookupAddress[],
  family?: number
) => void;

/** Returns the body as chunks, so the caller can build one Blob without an extra copy. */
export async function fetchPublicUrl(rawUrl: string, options: SafeFetchOptions): Promise<Buffer[]> {
  const allowed = options.isAllowedAddress ?? isPublicAddress;
  const maxRedirects = options.maxRedirects ?? 5;
  const deadline = Date.now() + options.timeoutMs;
  let url = parseHttpUrl(rawUrl);

  for (let hop = 0; ; hop++) {
    const response = await requestOnce(url, allowed, deadline);
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume();
      if (hop >= maxRedirects) {
        throw new BlockedUrlError(`file_url redirected more than ${maxRedirects} times`);
      }
      url = parseHttpUrl(new URL(response.headers.location, url).href);
      continue;
    }
    if (status < 200 || status >= 300) {
      response.resume();
      throw new Error(`Failed to fetch file from URL (${status} ${response.statusMessage ?? ''})`);
    }
    return readBounded(response, options.maxBytes, deadline);
  }
}

function parseHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError('Invalid file_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError('file_url must use http or https');
  }
  if (url.username || url.password) {
    throw new BlockedUrlError('file_url must not contain credentials');
  }
  return url;
}

function requestOnce(
  url: URL,
  allowed: (address: string) => boolean,
  deadline: number
): Promise<IncomingMessage> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  // IP literals never go through DNS, so the lookup hook would not see them.
  if (isIP(host) && !allowed(host)) {
    return Promise.reject(
      new BlockedUrlError('file_url must not point to a private, loopback or reserved address')
    );
  }
  const lookup = (hostname: string, lookupOptions: LookupOptions, callback: LookupCallback) => {
    dnsLookup(hostname, { ...lookupOptions, all: true }, (error, addresses) => {
      if (error) return callback(error, '');
      const list = addresses as LookupAddress[];
      // All or nothing: one private answer is enough to refuse the name.
      if (list.length === 0 || list.some(entry => !allowed(entry.address))) {
        return callback(
          new BlockedUrlError(
            `file_url host ${hostname} resolves to a private, loopback or reserved address`
          ),
          ''
        );
      }
      if (lookupOptions.all) return callback(null, list);
      return callback(null, list[0].address, list[0].family);
    });
  };
  const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      reject(new Error('file_url fetch timed out'));
      return;
    }
    const req = send(url, { method: 'GET', lookup, timeout: remaining }, resolve);
    req.on('timeout', () => req.destroy(new Error('file_url fetch timed out')));
    req.on('error', reject);
    req.end();
  });
}

function readBounded(
  response: IncomingMessage,
  maxBytes: number,
  deadline: number
): Promise<Buffer[]> {
  const tooLarge = () =>
    new Error(`File exceeds the maximum upload size of ${Math.floor(maxBytes / (1024 * 1024))} MB`);
  const declared = Number(response.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) {
    response.destroy();
    return Promise.reject(tooLarge());
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    const timer = setTimeout(
      () => response.destroy(new Error('file_url fetch timed out')),
      Math.max(0, deadline - Date.now())
    );
    response.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > maxBytes) {
        response.destroy(tooLarge());
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => {
      clearTimeout(timer);
      resolve(chunks);
    });
    response.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
