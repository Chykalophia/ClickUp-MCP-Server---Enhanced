/**
 * End-to-end tests for the hosted (HTTP + OAuth) server.
 *
 * Drives the real Express app over real HTTP: dynamic client registration,
 * /authorize, the ClickUp callback (ClickUp itself is faked), PKCE token
 * exchange, refresh, and MCP tool calls. Outbound ClickUp API calls are
 * captured at the axios adapter, AFTER every interceptor has run, so the
 * assertions are about the Authorization header that would really be sent.
 */
import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// `marked` is ESM-only and Jest can't load it here; markdown conversion is
// unrelated to what these tests assert (same workaround as the other suites).
jest.mock('../../utils/markdown', () => ({
  markdownToHtml: (markdown: string) => markdown,
  htmlToMarkdown: (html: string) => html,
  markdownToPlainText: (markdown: string) => markdown,
  processClickUpResponse: (value: unknown) => value,
  prepareContentForClickUp: (content: string) => ({ content }),
}));

// version.ts uses import.meta, a syntax error under this suite's CommonJS
// transpile (see version.test.ts); the server name/version is not under test.
jest.mock('../../version', () => ({ VERSION: '0.0.0-test' }));

// Hosted mode must be on before any tool module loads (their clients are
// built at import), so every src import below is dynamic.
process.env.CLICKUP_MCP_REMOTE = '1';

const CLAUDE_CALLBACK = 'https://claude.ai/api/mcp/auth_callback';

interface FakeUser {
  token: string;
  userId: string;
  email: string;
  workspaceIds: string[];
}

const USERS: Record<string, FakeUser> = {
  'code-peter': {
    token: 'oauth-peter',
    userId: '111',
    email: 'peter@example.com',
    workspaceIds: ['9001'],
  },
  'code-teammate': {
    token: 'oauth-teammate',
    userId: '222',
    email: 'mate@example.com',
    workspaceIds: ['9001'],
  },
  'code-wsmember': {
    token: 'oauth-wsmember',
    userId: '444',
    email: 'ws@example.com',
    workspaceIds: ['7777'],
  },
  'code-stranger': {
    token: 'oauth-stranger',
    userId: '333',
    email: 'who@example.com',
    workspaceIds: ['5555'],
  },
};

let httpServer: Server;
let base: string;
let config: import('../../remote/config.js').RemoteConfig;
/** Authorization header of every outbound ClickUp API call, in order. */
const outbound: string[] = [];
/** ClickUp tokens the fake ClickUp treats as revoked (the person removed the app). */
const revokedTokens = new Set<string>();

beforeAll(async () => {
  const { loadRemoteConfig } = await import('../../remote/config.js');
  const { createRemoteApp } = await import('../../remote/app.js');
  const { createClickUpMcpServer } = await import('../../server-factory.js');
  const { createClickUpClient } = await import('../../clickup-client/index.js');

  // Capture outbound calls on the shared client the workspace tools use. The
  // fake echoes the header back as the workspace name, so a tool result shows
  // whose token served it.
  createClickUpClient().getAxiosInstance().defaults.adapter = async requestConfig => {
    const auth = String(requestConfig.headers?.Authorization ?? '');
    outbound.push(auth);
    await new Promise(resolve => setTimeout(resolve, 20)); // let concurrent calls interleave
    return {
      data: { teams: [{ id: 't1', name: auth, color: '#000' }] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: requestConfig,
    };
  };

  // The app needs the listening port for its public URL, so it is attached after listen().
  const handler: { app?: import('express').Express } = {};
  httpServer = createServer((req, res) => handler.app!(req, res));
  await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;

  config = loadRemoteConfig({
    CLICKUP_MCP_PUBLIC_URL: base,
    CLICKUP_OAUTH_CLIENT_ID: 'fake-client',
    CLICKUP_OAUTH_CLIENT_SECRET: 'fake-secret',
    CLICKUP_MCP_TOKEN_SECRET: 'a'.repeat(48),
    CLICKUP_ALLOWED_USER_IDS: '111,222',
    CLICKUP_ALLOWED_WORKSPACE_IDS: '7777',
  });
  handler.app = createRemoteApp({
    config,
    createServer: () => createClickUpMcpServer().server,
    clickUpOAuth: {
      authorizeUrl: ({ redirectUri, state }) =>
        `https://app.clickup.com/api?client_id=fake-client&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      exchangeCode: async code => {
        const user = USERS[code];
        if (!user) throw new Error('bad code');
        return user.token;
      },
      fetchIdentity: async token => {
        if (revokedTokens.has(token)) {
          const { ClickUpOAuthError } = await import('../../remote/clickup-oauth.js');
          throw new ClickUpOAuthError('ClickUp /user returned HTTP 401', 401);
        }
        const user = Object.values(USERS).find(u => u.token === token)!;
        return { userId: user.userId, email: user.email, workspaceIds: user.workspaceIds };
      },
    },
  });
});

afterAll(async () => {
  await new Promise(resolve => httpServer.close(resolve));
});

beforeEach(() => {
  outbound.length = 0;
});

// ------------------------------------------------------------------ helpers

const pkce = () => {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};

async function register(redirectUris: string[] = [CLAUDE_CALLBACK]) {
  return fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'test client',
    }),
  });
}

/** /register + GET /authorize: returns the consent page and the sealed login it carries. */
// Claude registers a client once and reuses it; so do these tests, which also
// keeps them under the SDK's real registration rate limit (20/hour per IP).
const registeredClients = new Map<string, string>();

async function registeredClientId(clientName: string): Promise<string> {
  const cached = registeredClients.get(clientName);
  if (cached) return cached;
  const reg = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [CLAUDE_CALLBACK],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: clientName,
    }),
  });
  expect(reg.status).toBe(201);
  const { client_id } = (await reg.json()) as { client_id: string };
  registeredClients.set(clientName, client_id);
  return client_id;
}

/** GET /authorize: returns the consent page and the sealed login it carries. */
async function openConsent(clientName = 'test client') {
  const client = { client_id: await registeredClientId(clientName) };
  const { verifier, challenge } = pkce();
  const authorize = new URL(`${base}/authorize`);
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: CLAUDE_CALLBACK,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'client-state-1',
    resource: config.mcpUrl.href,
  }).toString();
  const res = await fetch(authorize, { redirect: 'manual' });
  expect(res.status).toBe(200);
  const html = await res.text();
  const login = /name="login" value="([^"]+)"/.exec(html)?.[1];
  expect(login).toBeTruthy();
  return { clientId: client.client_id, verifier, html, login: login!, headers: res.headers };
}

/**
 * The headers a real browser puts on the consent page's own form POST. It is
 * a same-origin navigation, so Sec-Fetch-Site is same-origin; the Origin
 * depends on the page's Referrer-Policy (Fetch spec, "append a request Origin
 * header"): under no-referrer a POST carries `Origin: null`. Derived from the
 * served header, never hand-written, so the two cannot drift apart again.
 */
function browserFormHeaders(pageHeaders: Headers): Record<string, string> {
  const policy = (pageHeaders.get('referrer-policy') ?? '').trim().toLowerCase();
  return {
    origin: policy === 'no-referrer' ? 'null' : base,
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'navigate',
  };
}

type ConsentPage = { login: string; headers: Headers };

async function consent(
  page: ConsentPage,
  decision: string,
  headers: Record<string, string> = browserFormHeaders(page.headers)
) {
  const login = page.login;
  return fetch(`${base}/oauth/consent`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams({ login, decision }).toString(),
  });
}

/** Register, authorize and approve consent: returns what the browser would hold at ClickUp. */
async function startLogin() {
  const page = await openConsent();
  const res = await consent(page, 'approve');
  expect(res.status).toBe(302);
  const clickUpUrl = new URL(res.headers.get('location')!);
  expect(clickUpUrl.origin).toBe('https://app.clickup.com');
  const cookie = res.headers.getSetCookie()[0].split(';')[0];
  return {
    clientId: page.clientId,
    verifier: page.verifier,
    clickUpUrl,
    cookie,
    nonce: clickUpUrl.searchParams.get('state')!,
  };
}

async function callback(code: string, cookie: string | undefined, state: string | undefined) {
  const url = new URL(`${base}/oauth/clickup/callback`);
  url.searchParams.set('code', code);
  if (state !== undefined) url.searchParams.set('state', state);
  return fetch(url, { redirect: 'manual', headers: cookie ? { cookie } : {} });
}

async function tokenRaw(params: Record<string, string>) {
  return fetch(`${base}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
}

const token = tokenRaw;

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** The whole sign-in, as Claude would perform it. */
async function signIn(clickUpCode: string): Promise<Tokens & { clientId: string }> {
  const login = await startLogin();
  const cb = await callback(clickUpCode, login.cookie, login.nonce);
  expect(cb.status).toBe(302);
  const back = new URL(cb.headers.get('location')!);
  expect(back.origin + back.pathname).toBe(CLAUDE_CALLBACK);
  expect(back.searchParams.get('state')).toBe('client-state-1');
  const res = await token({
    grant_type: 'authorization_code',
    code: back.searchParams.get('code')!,
    code_verifier: login.verifier,
    client_id: login.clientId,
    redirect_uri: CLAUDE_CALLBACK,
    resource: config.mcpUrl.href,
  });
  expect(res.status).toBe(200);
  return { ...((await res.json()) as Tokens), clientId: login.clientId };
}

let rpcId = 0;
async function mcp(
  accessToken: string | undefined,
  method: string,
  params: Record<string, unknown> = {}
) {
  return fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
}

async function getWorkspacesAs(accessToken: string): Promise<string> {
  const res = await mcp(accessToken, 'tools/call', {
    name: 'clickup_get_workspaces',
    arguments: {},
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    result?: { content: Array<{ text: string }>; isError?: boolean };
  };
  expect(body.result?.isError).toBeFalsy();
  return body.result!.content[0].text;
}

// ------------------------------------------------------------------ tests

describe('hosted server: sign-in and tool calls', () => {
  it('runs a tool as the signed-in ClickUp user, with that user’s own token', async () => {
    const { access_token } = await signIn('code-peter');
    const text = await getWorkspacesAs(access_token);

    expect(outbound).toEqual(['Bearer oauth-peter']);
    expect(text).toContain('Bearer oauth-peter');
  });

  it('never sends the process-wide CLICKUP_API_TOKEN or the placeholder', async () => {
    const { REMOTE_PLACEHOLDER_TOKEN } = await import('../../clickup-client/request-context.js');
    const { access_token } = await signIn('code-peter');
    await getWorkspacesAs(access_token);

    expect(process.env.CLICKUP_API_TOKEN).toBeTruthy(); // setup.ts sets one; it must be ignored
    expect(outbound).toHaveLength(1);
    for (const header of outbound) {
      expect(header).not.toContain(process.env.CLICKUP_API_TOKEN!);
      expect(header).not.toContain(REMOTE_PLACEHOLDER_TOKEN);
    }
  });

  it('keeps concurrent users’ credentials apart', async () => {
    const [peter, mate] = await Promise.all([signIn('code-peter'), signIn('code-teammate')]);
    const results = await Promise.all([
      getWorkspacesAs(peter.access_token),
      getWorkspacesAs(mate.access_token),
      getWorkspacesAs(peter.access_token),
      getWorkspacesAs(mate.access_token),
    ]);

    expect(results[0]).toContain('oauth-peter');
    expect(results[1]).toContain('oauth-teammate');
    expect(results[2]).toContain('oauth-peter');
    expect(results[3]).toContain('oauth-teammate');
    expect(results[0]).not.toContain('oauth-teammate');
    expect(results[1]).not.toContain('oauth-peter');
    expect(outbound.sort()).toEqual([
      'Bearer oauth-peter',
      'Bearer oauth-peter',
      'Bearer oauth-teammate',
      'Bearer oauth-teammate',
    ]);
  });

  it('lists the full tool surface', async () => {
    const { access_token } = await signIn('code-peter');
    const res = await mcp(access_token, 'tools/list');
    const body = (await res.json()) as { result: { tools: Array<{ name: string }> } };
    const names = body.result.tools.map(t => t.name);
    expect(names).toContain('clickup_get_workspaces');
    expect(names).toContain('clickup_create_task_comment');
    expect(names.length).toBeGreaterThan(100);
  });
});

describe('hosted server: who gets in', () => {
  it('refuses a ClickUp account that is not on the allowlist, and issues no code', async () => {
    const login = await startLogin();
    const cb = await callback('code-stranger', login.cookie, login.nonce);
    expect(cb.status).toBe(302);
    const back = new URL(cb.headers.get('location')!);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('code')).toBeNull();
    expect(back.searchParams.get('state')).toBe('client-state-1');
  });

  it('revokes access on the next request once a user is removed from the allowlist', async () => {
    const mate = await signIn('code-teammate');
    await getWorkspacesAs(mate.access_token);

    const userIds = config.policy.userIds as Set<string>;
    userIds.delete('222');
    try {
      const call = await mcp(mate.access_token, 'tools/list');
      expect(call.status).toBe(401);

      const refresh = await token({
        grant_type: 'refresh_token',
        refresh_token: mate.refresh_token,
        client_id: mate.clientId,
      });
      expect(refresh.status).toBe(400);
      expect(((await refresh.json()) as { error: string }).error).toBe('invalid_grant');
    } finally {
      userIds.add('222');
    }
  });

  it('refuses to register a client whose redirect_uri is not allowlisted', async () => {
    const res = await register(['https://evil.example.com/callback']);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('invalid_client_metadata');
  });

  it('accepts loopback redirect URIs for native clients such as Claude Code', async () => {
    const res = await register(['http://localhost:53682/callback']);
    expect(res.status).toBe(201);
  });
});

describe('hosted server: the OAuth flow cannot be short-circuited', () => {
  it('rejects the ClickUp callback without the login cookie from the same browser', async () => {
    const login = await startLogin();
    const res = await callback('code-peter', undefined, login.nonce);
    expect(res.status).toBe(400);
  });

  it('rejects the ClickUp callback when state does not match', async () => {
    const login = await startLogin();
    const res = await callback('code-peter', login.cookie, 'not-the-nonce');
    expect(res.status).toBe(400);
  });

  it('rejects a repeated state parameter instead of treating it as absent', async () => {
    const login = await startLogin();
    const url = new URL(`${base}/oauth/clickup/callback`);
    url.search = `code=code-peter&state=${login.nonce}&state=other`;
    const res = await fetch(url, { redirect: 'manual', headers: { cookie: login.cookie } });
    expect(res.status).toBe(400);
  });

  it('rejects a token exchange for a different resource than was authorized', async () => {
    const login = await startLogin();
    const cb = await callback('code-peter', login.cookie, login.nonce);
    const code = new URL(cb.headers.get('location')!).searchParams.get('code')!;
    const res = await token({
      grant_type: 'authorization_code',
      code,
      code_verifier: login.verifier,
      client_id: login.clientId,
      redirect_uri: CLAUDE_CALLBACK,
      resource: base, // authorized for /mcp; the bare origin is served, but not what was asked for
    });
    expect(res.status).toBe(400);
  });

  it('answers malformed JSON with an OAuth-shaped error, never a stack trace', async () => {
    const res = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    });
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/node_modules|at \w+ \(|<pre>/);
    expect(JSON.parse(text).error).toBe('invalid_request');
  });

  it('refuses a callback with no state, and the real sign-in survives it', async () => {
    // A page sends the victim here mid-sign-in with someone else's ClickUp
    // code and no state: the browser cookie alone must not be enough.
    const login = await startLogin();
    const forged = await callback('code-teammate', login.cookie, undefined);
    expect(forged.status).toBe(400);
    expect(forged.headers.get('location')).toBeNull();
    expect(forged.headers.getSetCookie()).toEqual([]);
    // The victim's own callback (cookie still held) then completes as them.
    const real = await callback('code-peter', login.cookie, login.nonce);
    expect(real.status).toBe(302);
    expect(new URL(real.headers.get('location')!).searchParams.get('code')).toBeTruthy();
  });

  it('a wrong state does not clear the login cookie either', async () => {
    const login = await startLogin();
    const forged = await callback('code-teammate', login.cookie, 'not-the-nonce');
    expect(forged.status).toBe(400);
    expect(forged.headers.getSetCookie()).toEqual([]);
  });

  it('rejects a token exchange with the wrong PKCE verifier', async () => {
    const login = await startLogin();
    const cb = await callback('code-peter', login.cookie, login.nonce);
    const code = new URL(cb.headers.get('location')!).searchParams.get('code')!;
    const res = await token({
      grant_type: 'authorization_code',
      code,
      code_verifier: pkce().verifier,
      client_id: login.clientId,
      redirect_uri: CLAUDE_CALLBACK,
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('invalid_grant');
  });

  it('rejects an authorization code redeemed by a different client', async () => {
    const login = await startLogin();
    const cb = await callback('code-peter', login.cookie, login.nonce);
    const code = new URL(cb.headers.get('location')!).searchParams.get('code')!;
    const other = { client_id: await registeredClientId('another client') };
    const res = await token({
      grant_type: 'authorization_code',
      code,
      code_verifier: login.verifier,
      client_id: other.client_id,
      redirect_uri: CLAUDE_CALLBACK,
    });
    expect(res.status).toBe(400);
  });

  it('does not accept an authorization code, refresh token or tampered token as a bearer token', async () => {
    const tokens = await signIn('code-peter');
    const login = await startLogin();
    const cb = await callback('code-peter', login.cookie, login.nonce);
    const code = new URL(cb.headers.get('location')!).searchParams.get('code')!;
    const tampered =
      tokens.access_token.slice(0, -4) + (tokens.access_token.endsWith('AAAA') ? 'BBBB' : 'AAAA');

    for (const bad of [code, tokens.refresh_token, tampered, 'pk_123_personal_token']) {
      const res = await mcp(bad, 'tools/list');
      expect(res.status).toBe(401);
    }
    expect(outbound).toEqual([]);
  });

  it('answers an unauthenticated MCP request with 401 and points at the resource metadata', async () => {
    const res = await mcp(undefined, 'tools/list');
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain(
      `resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`
    );
  });

  it('refreshes into a working access token', async () => {
    const first = await signIn('code-peter');
    const res = await token({
      grant_type: 'refresh_token',
      refresh_token: first.refresh_token,
      client_id: first.clientId,
    });
    expect(res.status).toBe(200);
    const refreshed = (await res.json()) as Tokens;
    expect(refreshed.access_token).not.toBe(first.access_token);
    await getWorkspacesAs(refreshed.access_token);
    expect(outbound).toEqual(['Bearer oauth-peter']);
  });
});

describe('hosted server: consent before ClickUp', () => {
  it('shows a consent page naming where access goes, and does not redirect to ClickUp yet', async () => {
    const page = await openConsent();
    expect(page.html).toContain('claude.ai');
    expect(page.html).toContain('Continue to ClickUp');
    expect(page.headers.get('x-frame-options')).toBe('DENY');
    expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(page.headers.get('set-cookie')).toBeNull();
  });

  it('escapes the self-declared client name', async () => {
    const page = await openConsent('<script>alert(1)</script>');
    expect(page.html).not.toContain('<script>alert(1)</script>');
    expect(page.html).toContain('&lt;script&gt;');
  });

  it('refuses a consent POST from another origin, or with no origin information', async () => {
    const page = await openConsent();
    const refused = async (headers: Record<string, string>) =>
      expect((await consent(page, 'approve', headers)).status).toBe(403);
    await refused({ origin: 'https://evil.example.com', 'sec-fetch-site': 'cross-site' });
    // A real cross-site Origin wins even if Fetch Metadata were forged.
    await refused({ origin: 'https://evil.example.com', 'sec-fetch-site': 'same-origin' });
    await refused({});
    await refused({ 'sec-fetch-site': 'cross-site' });
    // An opaque Origin is no information: it needs Fetch Metadata to pass.
    await refused({ origin: 'null' });
    await refused({ origin: 'null', 'sec-fetch-site': 'cross-site' });
  });

  it('accepts the page’s own form POST as browsers send it, under any Referrer-Policy', async () => {
    // What the page is served with today (same-origin: the real Origin).
    expect((await consent(await openConsent(), 'approve')).status).toBe(302);
    // Origin: null (no-referrer, privacy modes) with Fetch Metadata same-origin.
    const page = await openConsent();
    const res = await consent(page, 'approve', {
      origin: 'null',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'navigate',
    });
    expect(res.status).toBe(302);
    // Fetch Metadata alone (browsers that omit Origin).
    const bare = await openConsent();
    expect((await consent(bare, 'approve', { 'sec-fetch-site': 'same-origin' })).status).toBe(302);
  });

  it('serves the consent page with a Referrer-Policy that keeps the real Origin on its form POST', async () => {
    const page = await openConsent();
    expect(page.headers.get('referrer-policy')).toBe('same-origin');
  });

  it('sends a declined consent back to the client as access_denied, with no code', async () => {
    const page = await openConsent();
    const res = await consent(page, 'deny');
    expect(res.status).toBe(302);
    const back = new URL(res.headers.get('location')!);
    expect(back.origin + back.pathname).toBe(CLAUDE_CALLBACK);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('code')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a forged login blob', async () => {
    const page = await openConsent();
    expect((await consent({ ...page, login: 'cul1.not-a-real-login' }, 'approve')).status).toBe(
      400
    );
  });
});

describe('hosted server: sessions end when they should', () => {
  it('admits by workspace, and a refresh fails once the person leaves that workspace', async () => {
    const member = await signIn('code-wsmember');
    await getWorkspacesAs(member.access_token);

    USERS['code-wsmember'].workspaceIds = ['1234'];
    try {
      const res = await token({
        grant_type: 'refresh_token',
        refresh_token: member.refresh_token,
        client_id: member.clientId,
      });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('invalid_grant');
    } finally {
      USERS['code-wsmember'].workspaceIds = ['7777'];
    }
  });

  it('fails a refresh once the person revokes the app in ClickUp', async () => {
    const peter = await signIn('code-peter');
    revokedTokens.add('oauth-peter');
    try {
      const res = await token({
        grant_type: 'refresh_token',
        refresh_token: peter.refresh_token,
        client_id: peter.clientId,
      });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('invalid_grant');
    } finally {
      revokedTokens.delete('oauth-peter');
    }
  });

  it('stops refreshing after the absolute session cap, however often it was refreshed', async () => {
    const peter = await signIn('code-peter');
    const refreshed = (await (
      await token({
        grant_type: 'refresh_token',
        refresh_token: peter.refresh_token,
        client_id: peter.clientId,
      })
    ).json()) as Tokens;

    const original = config.sessionMaxAgeSeconds;
    config.sessionMaxAgeSeconds = 0;
    try {
      await new Promise(resolve => setTimeout(resolve, 1100));
      const res = await token({
        grant_type: 'refresh_token',
        refresh_token: refreshed.refresh_token,
        client_id: peter.clientId,
      });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error_description: string }).error_description).toMatch(
        /Session expired/
      );
    } finally {
      config.sessionMaxAgeSeconds = original;
    }
  });

  it('never issues an access token that outlives the session cap', async () => {
    const original = config.sessionMaxAgeSeconds;
    config.sessionMaxAgeSeconds = 120; // shorter than the 1 hour access-token TTL
    try {
      const peter = await signIn('code-peter');
      expect(peter.expires_in).toBeGreaterThan(0);
      expect(peter.expires_in).toBeLessThanOrEqual(120);
    } finally {
      config.sessionMaxAgeSeconds = original;
    }
  });

  it('refuses a still-unexpired access token once the session cap has passed', async () => {
    const peter = await signIn('code-peter');
    expect((await mcp(peter.access_token, 'tools/list')).status).toBe(200);
    const original = config.sessionMaxAgeSeconds;
    config.sessionMaxAgeSeconds = 0;
    try {
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect((await mcp(peter.access_token, 'tools/list')).status).toBe(401);
    } finally {
      config.sessionMaxAgeSeconds = original;
    }
  });

  it('retires an old client_id when its redirect URI is no longer allowed', async () => {
    const reg = (await (await register(['http://localhost:53682/callback'])).json()) as {
      client_id: string;
    };
    config.allowLoopbackRedirects = false;
    try {
      const authorize = new URL(`${base}/authorize`);
      authorize.search = new URLSearchParams({
        response_type: 'code',
        client_id: reg.client_id,
        redirect_uri: 'http://localhost:53682/callback',
        code_challenge: pkce().challenge,
        code_challenge_method: 'S256',
      }).toString();
      const res = await fetch(authorize, { redirect: 'manual' });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('invalid_client');
    } finally {
      config.allowLoopbackRedirects = true;
    }
  });
});

describe('hosted server: discovery and plumbing', () => {
  it('publishes protected-resource and authorization-server metadata', async () => {
    const resource = (await (
      await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)
    ).json()) as {
      resource: string;
      authorization_servers: string[];
    };
    expect(resource.resource).toBe(config.mcpUrl.href);
    expect(resource.authorization_servers.map(s => s.replace(/\/$/, ''))).toContain(base);

    const as = (await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json()) as {
      registration_endpoint: string;
      code_challenge_methods_supported: string[];
    };
    expect(as.registration_endpoint).toBe(`${base}/register`);
    expect(as.code_challenge_methods_supported).toContain('S256');
  });

  it('answers GET /mcp with 405 (stateless server, no server-initiated stream)', async () => {
    const res = await fetch(`${base}/mcp`);
    expect(res.status).toBe(405);
  });
});

describe('hosted server: sign-in routes are rate limited', () => {
  it('throttles the ClickUp callback and the consent POST per client', async () => {
    // A separate app instance, so its limiter counts only these requests.
    const { createRemoteApp } = await import('../../remote/app.js');
    const { createClickUpMcpServer } = await import('../../server-factory.js');
    let exchanges = 0;
    const handler: { app?: import('express').Express } = {};
    const server = createServer((req, res) => handler.app!(req, res));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const own = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    handler.app = createRemoteApp({
      config: { ...config, publicUrl: new URL(own), mcpUrl: new URL('/mcp', own) },
      createServer: () => createClickUpMcpServer().server,
      clickUpOAuth: {
        authorizeUrl: () => 'https://app.clickup.com/api',
        exchangeCode: async () => {
          exchanges++;
          return 'x';
        },
        fetchIdentity: async () => ({ userId: '111', workspaceIds: [] }),
      },
    });
    try {
      const hit = (path: string, init?: NonNullable<Parameters<typeof fetch>[1]>) =>
        fetch(`${own}${path}`, { redirect: 'manual', ...init }).then(r => r.status);
      const callbacks = await Promise.all(
        Array.from({ length: 101 }, () => hit('/oauth/clickup/callback?code=c&state=s'))
      );
      expect(callbacks.filter(status => status === 429)).toHaveLength(1);
      const consents = await Promise.all(
        Array.from({ length: 101 }, () =>
          hit('/oauth/consent', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: 'login=x&decision=approve',
          })
        )
      );
      expect(consents.filter(status => status === 429)).toHaveLength(1);
      expect(exchanges).toBe(0);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
