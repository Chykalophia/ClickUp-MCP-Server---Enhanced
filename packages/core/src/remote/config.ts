import {
  createAccessPolicy,
  isPolicyEmpty,
  parseList,
  type AccessPolicy,
} from './access-policy.js';
import { MIN_SECRET_LENGTH } from './sealed.js';

/**
 * Hosted-server configuration, read from the environment. Every value is
 * trimmed: a secret pasted with a trailing newline is the classic way a
 * hosted deploy breaks invisibly.
 */
export interface RemoteConfig {
  /** Public origin of this deployment, e.g. https://clickup-mcp.example.com */
  publicUrl: URL;
  /** The MCP endpoint people add as a connector: `${publicUrl}/mcp` */
  mcpUrl: URL;
  /**
   * Key-derivation context for sealed tokens: the origin plus the Vercel
   * environment, so production, preview and development never share a key
   * even when the secret and public URL are the same in all of them.
   */
  sealerContext: string;
  clickUpClientId: string;
  clickUpClientSecret: string;
  tokenSecret: string;
  policy: AccessPolicy;
  /** Exact non-loopback redirect URIs an OAuth client may register. */
  allowedRedirectUris: string[];
  /** Allow http(s)://localhost / 127.0.0.1 / [::1] redirects (native clients such as Claude Code). */
  allowLoopbackRedirects: boolean;
  accessTokenTtlSeconds: number;
  /** Idle limit: a refresh token unused this long stops working. */
  refreshTokenTtlSeconds: number;
  /** Absolute limit: after this long since signing in with ClickUp, sign in again. */
  sessionMaxAgeSeconds: number;
  /** Reverse-proxy hops to trust for the client IP (rate limiting). 0 = none. */
  trustProxyHops: number;
}

/** Hosts treated as this machine (http allowed, native-client redirects). */
export const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Claude's OAuth callbacks (claude.ai and claude.com, which share a backend). */
export const DEFAULT_REDIRECT_URIS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
];

const DEFAULT_ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
const DEFAULT_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days idle
const DEFAULT_SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days absolute

export class RemoteConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Hosted ClickUp MCP server is misconfigured:\n- ${problems.join('\n- ')}`);
    this.name = 'RemoteConfigError';
  }
}

type Env = Record<string, string | undefined>;

const read = (env: Env, name: string): string => (env[name] ?? '').trim();

/** URL.canParse needs Node 19.9+; this package still supports Node 18. */
const isValidUrl = (value: string): boolean => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

const parsePositiveInt = (env: Env, name: string, fallback: number, problems: string[]): number => {
  const raw = read(env, name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    problems.push(`${name} must be a positive whole number of seconds (got "${raw}")`);
    return fallback;
  }
  return value;
};

export function loadRemoteConfig(env: Env = process.env): RemoteConfig {
  const problems: string[] = [];

  // Public URL: explicit, else on Vercel the production domain for the
  // production environment and the deployment's own URL for previews (which
  // also carry VERCEL_PROJECT_PRODUCTION_URL and must not claim production's).
  const vercelEnv = read(env, 'VERCEL_ENV');
  const vercelHost =
    vercelEnv && vercelEnv !== 'production'
      ? read(env, 'VERCEL_URL')
      : read(env, 'VERCEL_PROJECT_PRODUCTION_URL');
  let publicUrl: URL | undefined;
  const rawPublicUrl =
    read(env, 'CLICKUP_MCP_PUBLIC_URL') || (vercelHost ? `https://${vercelHost}` : '');
  if (!rawPublicUrl) {
    problems.push('CLICKUP_MCP_PUBLIC_URL is required (e.g. https://clickup-mcp.example.com)');
  } else {
    try {
      publicUrl = new URL(rawPublicUrl);
      const isLocal = LOOPBACK_HOSTS.has(publicUrl.hostname);
      if (publicUrl.protocol !== 'https:' && !isLocal) {
        problems.push('CLICKUP_MCP_PUBLIC_URL must use https (http is only allowed for localhost)');
      }
      if (publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) {
        problems.push(
          'CLICKUP_MCP_PUBLIC_URL must be a bare origin with no path, query or fragment'
        );
      }
    } catch {
      problems.push(`CLICKUP_MCP_PUBLIC_URL is not a valid URL (got "${rawPublicUrl}")`);
    }
  }

  const clickUpClientId = read(env, 'CLICKUP_OAUTH_CLIENT_ID');
  const clickUpClientSecret = read(env, 'CLICKUP_OAUTH_CLIENT_SECRET');
  if (!clickUpClientId)
    problems.push('CLICKUP_OAUTH_CLIENT_ID is required (from your ClickUp OAuth app)');
  if (!clickUpClientSecret) {
    problems.push('CLICKUP_OAUTH_CLIENT_SECRET is required (from your ClickUp OAuth app)');
  }

  const tokenSecret = read(env, 'CLICKUP_MCP_TOKEN_SECRET');
  if (tokenSecret.length < MIN_SECRET_LENGTH) {
    problems.push(
      `CLICKUP_MCP_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters ` +
        '(generate one with: openssl rand -base64 48)'
    );
  }

  const policy = createAccessPolicy({
    userIds: parseList(env.CLICKUP_ALLOWED_USER_IDS),
    emails: parseList(env.CLICKUP_ALLOWED_EMAILS),
    workspaceIds: parseList(env.CLICKUP_ALLOWED_WORKSPACE_IDS),
  });
  if (isPolicyEmpty(policy)) {
    problems.push(
      'Set at least one of CLICKUP_ALLOWED_USER_IDS, CLICKUP_ALLOWED_EMAILS or ' +
        'CLICKUP_ALLOWED_WORKSPACE_IDS: a hosted server never admits every ClickUp account'
    );
  }

  const allowedRedirectUris = parseList(env.CLICKUP_MCP_REDIRECT_URIS);
  for (const uri of allowedRedirectUris) {
    if (!isValidUrl(uri)) {
      problems.push(`CLICKUP_MCP_REDIRECT_URIS contains an invalid URL: "${uri}"`);
    }
  }
  const loopbackRaw = read(env, 'CLICKUP_MCP_ALLOW_LOOPBACK_REDIRECTS').toLowerCase();

  const accessTokenTtlSeconds = parsePositiveInt(
    env,
    'CLICKUP_MCP_ACCESS_TOKEN_TTL',
    DEFAULT_ACCESS_TTL_SECONDS,
    problems
  );
  const refreshTokenTtlSeconds = parsePositiveInt(
    env,
    'CLICKUP_MCP_REFRESH_TOKEN_TTL',
    DEFAULT_REFRESH_TTL_SECONDS,
    problems
  );

  const sessionMaxAgeSeconds = parsePositiveInt(
    env,
    'CLICKUP_MCP_SESSION_MAX_AGE',
    DEFAULT_SESSION_MAX_AGE_SECONDS,
    problems
  );

  // Vercel always sits behind exactly one proxy hop. Elsewhere, trusting
  // X-Forwarded-For on a directly exposed server would let any client spoof
  // its IP past the OAuth rate limits, so the default is to trust nothing.
  const rawTrustProxy = read(env, 'CLICKUP_MCP_TRUST_PROXY');
  let trustProxyHops = read(env, 'VERCEL') ? 1 : 0;
  if (rawTrustProxy) {
    const hops = Number(rawTrustProxy);
    if (!Number.isInteger(hops) || hops < 0) {
      problems.push(
        `CLICKUP_MCP_TRUST_PROXY must be a whole number of proxy hops (got "${rawTrustProxy}")`
      );
    } else {
      trustProxyHops = hops;
    }
  }

  if (problems.length > 0 || !publicUrl) {
    throw new RemoteConfigError(problems);
  }

  return {
    publicUrl,
    mcpUrl: new URL('/mcp', publicUrl),
    sealerContext: `${publicUrl.origin}|${vercelEnv || 'self-hosted'}`,
    clickUpClientId,
    clickUpClientSecret,
    tokenSecret,
    policy,
    allowedRedirectUris:
      allowedRedirectUris.length > 0 ? allowedRedirectUris : DEFAULT_REDIRECT_URIS,
    allowLoopbackRedirects: !['0', 'false', 'no'].includes(loopbackRaw),
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
    sessionMaxAgeSeconds,
    trustProxyHops,
  };
}
