/**
 * The real ClickUp OAuth adapter, with only `fetch` stubbed. Every other
 * hosted test replaces the whole adapter, so this is what pins the wire
 * format ClickUp documents (developer.clickup.com/reference/getaccesstoken:
 * a JSON body of client_id, client_secret and code) and the identity parsing
 * that drives the access policy and revocation.
 */
import { ClickUpOAuthError, createClickUpOAuthAdapter } from '../../remote/clickup-oauth';

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;
type Call = { url: string; init: FetchInit };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

let calls: Call[];
let respond: (call: Call) => Response;
const realFetch = global.fetch;

beforeEach(() => {
  calls = [];
  global.fetch = (async (input: Parameters<typeof fetch>[0], init: FetchInit = {}) => {
    const call = { url: String(input), init };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});

const adapter = createClickUpOAuthAdapter({ clientId: 'app-id', clientSecret: 'app-secret' });

describe('ClickUp OAuth adapter: authorize URL', () => {
  it('sends client_id, redirect_uri and state to app.clickup.com/api', () => {
    const url = new URL(
      adapter.authorizeUrl({
        redirectUri: 'https://mcp.example.com/oauth/clickup/callback',
        state: 'nonce&x=1',
      })
    );
    expect(url.origin + url.pathname).toBe('https://app.clickup.com/api');
    expect(url.searchParams.get('client_id')).toBe('app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://mcp.example.com/oauth/clickup/callback'
    );
    // Encoded, not spliced: a state value cannot add parameters.
    expect(url.searchParams.get('state')).toBe('nonce&x=1');
    expect(url.searchParams.get('x')).toBeNull();
  });
});

describe('ClickUp OAuth adapter: code exchange', () => {
  it('POSTs a JSON body of client_id, client_secret and code, and returns the token', async () => {
    respond = () => json(200, { access_token: 'cu-oauth-token' });
    await expect(adapter.exchangeCode('the-code', 'ignored')).resolves.toBe('cu-oauth-token');
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.url).toBe('https://api.clickup.com/api/v2/oauth/token');
    expect(call.init.method).toBe('POST');
    expect(new Headers(call.init.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(String(call.init.body))).toEqual({
      client_id: 'app-id',
      client_secret: 'app-secret',
      code: 'the-code',
    });
    // The secret never rides in the URL, where proxies and logs keep it.
    expect(call.url).not.toContain('app-secret');
    expect(call.init.signal).toBeDefined();
  });

  it('turns an HTTP failure into a ClickUpOAuthError carrying the status', async () => {
    respond = () => json(400, { err: 'Code already used', ECODE: 'OAUTH_014' });
    const error = await adapter.exchangeCode('used', '').catch(e => e);
    expect(error).toBeInstanceOf(ClickUpOAuthError);
    expect(error.status).toBe(400);
    // ClickUp's error body is not echoed into the message (it reaches logs).
    expect(error.message).not.toContain('OAUTH_014');
  });

  it('refuses a 200 without a usable access_token', async () => {
    for (const body of [{}, { access_token: '' }, { access_token: 42 }]) {
      respond = () => json(200, body);
      await expect(adapter.exchangeCode('c', '')).rejects.toBeInstanceOf(ClickUpOAuthError);
    }
  });
});

describe('ClickUp OAuth adapter: identity', () => {
  const identityResponses = (user: unknown, teams: unknown) => (call: Call) =>
    call.url.endsWith('/user') ? json(200, user) : json(200, teams);

  it('reads the user and every workspace with the OAuth token as a Bearer credential', async () => {
    respond = identityResponses(
      { user: { id: 111, email: 'peter@example.com', username: 'peter' } },
      { teams: [{ id: 9001 }, { id: '9002' }] }
    );
    await expect(adapter.fetchIdentity('cu-oauth-token')).resolves.toEqual({
      userId: '111',
      email: 'peter@example.com',
      username: 'peter',
      workspaceIds: ['9001', '9002'],
    });
    expect(calls.map(c => c.url).sort()).toEqual([
      'https://api.clickup.com/api/v2/team',
      'https://api.clickup.com/api/v2/user',
    ]);
    for (const call of calls) {
      expect(new Headers(call.init.headers).get('authorization')).toBe('Bearer cu-oauth-token');
    }
  });

  it('drops workspaces without an id instead of admitting an empty one', async () => {
    respond = identityResponses({ user: { id: 1 } }, { teams: [{ id: null }, {}, { id: 5 }] });
    expect((await adapter.fetchIdentity('t')).workspaceIds).toEqual(['5']);
  });

  it('treats a missing teams list as no workspaces', async () => {
    respond = identityResponses({ user: { id: 1 } }, {});
    expect((await adapter.fetchIdentity('t')).workspaceIds).toEqual([]);
  });

  it('refuses a /user response with no id', async () => {
    respond = identityResponses({ user: { email: 'x@example.com' } }, { teams: [] });
    await expect(adapter.fetchIdentity('t')).rejects.toBeInstanceOf(ClickUpOAuthError);
  });

  it('reports a revoked token as a 401 ClickUpOAuthError, which refresh turns into invalid_grant', async () => {
    respond = () => json(401, { err: 'Token invalid', ECODE: 'OAUTH_025' });
    const error = await adapter.fetchIdentity('revoked').catch(e => e);
    expect(error).toBeInstanceOf(ClickUpOAuthError);
    expect(error.status).toBe(401);
  });
});
