import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Stateless, encrypted, tamper-proof tokens (AES-256-GCM).
 *
 * The hosted server keeps no database: a registered OAuth client, an in-flight
 * login, an authorization code and an access/refresh token are each a sealed
 * payload that only this server can open. The kind is bound into the GCM
 * additional data, so a token of one kind can never be opened as another
 * (an authorization code is not an access token, a client id is not a refresh
 * token), even though they share a key.
 *
 * Trade-off of having no state: a sealed token cannot be revoked one by one
 * before it expires. Revocation is the access policy (re-checked on every
 * request — see access-policy.ts) or rotating CLICKUP_MCP_TOKEN_SECRET, which
 * signs everyone out.
 */
export type SealedKind = 'client' | 'login' | 'code' | 'access' | 'refresh';

const PREFIX: Record<SealedKind, string> = {
  client: 'cuc1',
  login: 'cul1',
  code: 'cua1',
  access: 'cut1',
  refresh: 'cur1',
};

const IV_BYTES = 12;
const TAG_BYTES = 16;
export const MIN_SECRET_LENGTH = 32;

export class Sealer {
  private readonly key: Buffer;

  /**
   * @param context Binds the key to one deployment (its public origin), so a
   *   second deployment or preview build that shares the secret cannot open
   *   this one's tokens.
   */
  constructor(secret: string, context = '') {
    if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`Token secret must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    this.key = Buffer.from(
      hkdfSync('sha256', secret, `clickup-mcp-server|${context}`, 'sealed-token-v1', 32)
    );
  }

  /** Seal `payload`. With `ttlSeconds`, the token stops opening after that long. */
  seal(kind: SealedKind, payload: Record<string, unknown>, ttlSeconds?: number): string {
    const body: Record<string, unknown> = { ...payload };
    if (ttlSeconds !== undefined) {
      body.exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(kind, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(body), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX[kind]}.${Buffer.concat([iv, tag, ciphertext]).toString('base64url')}`;
  }

  /**
   * Open a token of `kind`. Returns undefined for anything that is not a valid,
   * unexpired token of exactly that kind sealed with this secret.
   */
  open<T extends Record<string, unknown>>(
    kind: SealedKind,
    token: unknown
  ): (T & { exp?: number }) | undefined {
    if (typeof token !== 'string') return undefined;
    const dot = token.indexOf('.');
    if (dot < 0 || token.slice(0, dot) !== PREFIX[kind]) return undefined;

    const raw = Buffer.from(token.slice(dot + 1), 'base64url');
    if (raw.length <= IV_BYTES + TAG_BYTES) return undefined;

    let parsed: unknown;
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0, IV_BYTES));
      decipher.setAAD(Buffer.from(kind, 'utf8'));
      decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
      const plaintext = Buffer.concat([
        decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
        decipher.final(),
      ]);
      parsed = JSON.parse(plaintext.toString('utf8'));
    } catch {
      return undefined;
    }

    if (!parsed || typeof parsed !== 'object') return undefined;
    const body = parsed as T & { exp?: number };
    if (body.exp !== undefined && (typeof body.exp !== 'number' || body.exp <= Date.now() / 1000)) {
      return undefined;
    }
    return body;
  }
}
