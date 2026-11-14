/**
 * Unit tests for the hosted-mode building blocks: sealed tokens, config
 * validation, and the hosted-mode guards in the ClickUp client layer.
 */
import { Sealer } from '../../remote/sealed';
import { loadRemoteConfig, RemoteConfigError, DEFAULT_REDIRECT_URIS } from '../../remote/config';
import { createAccessPolicy, isAllowed } from '../../remote/access-policy';
import {
  ClickUpClient,
  formatAuthorizationHeader,
  getApiToken,
  resolveClickUpToken,
} from '../../clickup-client/index';
import {
  MissingRequestCredentialsError,
  REMOTE_MODE_ENV,
  REMOTE_PLACEHOLDER_TOKEN,
  runWithClickUpToken,
} from '../../clickup-client/request-context';
import { AttachmentsEnhancedClient } from '../../clickup-client/attachments-enhanced';
import { DocsClient } from '../../clickup-client/docs';

const SECRET = 's'.repeat(40);

describe('Sealer', () => {
  const sealer = new Sealer(SECRET);

  it('round-trips a payload', () => {
    const token = sealer.seal('access', { ck: 'oauth-x', uid: '1' }, 60);
    expect(sealer.open('access', token)).toMatchObject({ ck: 'oauth-x', uid: '1' });
  });

  it('never opens a token as a different kind', () => {
    const code = sealer.seal('code', { ck: 'oauth-x' }, 60);
    expect(sealer.open('access', code)).toBeUndefined();
    // Even with the prefix rewritten, the kind is bound into the GCM tag.
    const relabelled = `cut1${code.slice(code.indexOf('.'))}`;
    expect(sealer.open('access', relabelled)).toBeUndefined();
  });

  it('rejects expired, tampered, foreign and malformed tokens', () => {
    const expired = sealer.seal('access', { ck: 'x' }, -1);
    expect(sealer.open('access', expired)).toBeUndefined();

    const good = sealer.seal('access', { ck: 'x' }, 60);
    const flipped = good.slice(0, -2) + (good.endsWith('AA') ? 'BB' : 'AA');
    expect(sealer.open('access', flipped)).toBeUndefined();

    expect(new Sealer('t'.repeat(40)).open('access', good)).toBeUndefined();
    for (const junk of ['', 'cut1.', 'cut1.abc', 'nope', 42, undefined]) {
      expect(sealer.open('access', junk)).toBeUndefined();
    }
  });

  it('binds tokens to one deployment: same secret, different origin cannot open them', () => {
    const prod = new Sealer(SECRET, 'https://clickup-mcp.example.com');
    const preview = new Sealer(SECRET, 'https://clickup-mcp-git-branch.vercel.app');
    const token = prod.seal('access', { ck: 'oauth-x' }, 60);
    expect(prod.open('access', token)).toBeTruthy();
    expect(preview.open('access', token)).toBeUndefined();
  });

  it('refuses a short secret', () => {
    expect(() => new Sealer('short')).toThrow(/at least 32/);
  });
});

describe('loadRemoteConfig', () => {
  const valid = {
    CLICKUP_MCP_PUBLIC_URL: 'https://clickup-mcp.example.com',
    CLICKUP_OAUTH_CLIENT_ID: 'id',
    CLICKUP_OAUTH_CLIENT_SECRET: 'secret',
    CLICKUP_MCP_TOKEN_SECRET: SECRET,
    CLICKUP_ALLOWED_USER_IDS: '111',
  };

  it('loads a valid config with Claude’s callbacks as the default redirect allowlist', () => {
    const config = loadRemoteConfig(valid);
    expect(config.mcpUrl.href).toBe('https://clickup-mcp.example.com/mcp');
    expect(config.allowedRedirectUris).toEqual(DEFAULT_REDIRECT_URIS);
    expect(config.allowLoopbackRedirects).toBe(true);
  });

  it('refuses to start with no allowlist at all (never open to every ClickUp account)', () => {
    const { CLICKUP_ALLOWED_USER_IDS: _omit, ...rest } = valid;
    expect(() => loadRemoteConfig(rest)).toThrow(RemoteConfigError);
    expect(() => loadRemoteConfig({ ...rest, CLICKUP_ALLOWED_EMAILS: '  \n ' })).toThrow(
      /at least one/
    );
  });

  it('reports every problem at once', () => {
    try {
      loadRemoteConfig({});
      throw new Error('expected a RemoteConfigError');
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteConfigError);
      expect((error as RemoteConfigError).problems.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('trims trailing newlines from pasted secrets and lists', () => {
    const config = loadRemoteConfig({
      ...valid,
      CLICKUP_OAUTH_CLIENT_SECRET: 'secret\n',
      CLICKUP_ALLOWED_USER_IDS: '111\n',
    });
    expect(config.clickUpClientSecret).toBe('secret');
    expect([...config.policy.userIds]).toEqual(['111']);
  });

  it('requires https except on localhost, and a bare origin', () => {
    expect(() =>
      loadRemoteConfig({ ...valid, CLICKUP_MCP_PUBLIC_URL: 'http://example.com' })
    ).toThrow(/https/);
    expect(() =>
      loadRemoteConfig({ ...valid, CLICKUP_MCP_PUBLIC_URL: 'https://example.com/mcp' })
    ).toThrow(/bare origin/);
    expect(() =>
      loadRemoteConfig({ ...valid, CLICKUP_MCP_PUBLIC_URL: 'http://localhost:3000' })
    ).not.toThrow();
  });

  it('falls back to Vercel’s production domain in production', () => {
    const { CLICKUP_MCP_PUBLIC_URL: _omit, ...rest } = valid;
    const config = loadRemoteConfig({
      ...rest,
      VERCEL_ENV: 'production',
      VERCEL_URL: 'clickup-mcp-abc123.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'clickup-mcp.vercel.app',
    });
    expect(config.publicUrl.origin).toBe('https://clickup-mcp.vercel.app');
  });

  it('gives a Vercel preview its own URL, not production’s (previews carry both)', () => {
    const { CLICKUP_MCP_PUBLIC_URL: _omit, ...rest } = valid;
    const config = loadRemoteConfig({
      ...rest,
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'clickup-mcp-git-branch.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'clickup-mcp.vercel.app',
    });
    expect(config.publicUrl.origin).toBe('https://clickup-mcp-git-branch.vercel.app');
  });

  it('a preview sharing the secret AND the public URL still cannot open production tokens', () => {
    // The mis-scoped case: every env var set for all environments.
    const shared = { ...valid, VERCEL: '1' };
    const prod = loadRemoteConfig({ ...shared, VERCEL_ENV: 'production' });
    const preview = loadRemoteConfig({ ...shared, VERCEL_ENV: 'preview' });
    expect(preview.publicUrl.origin).toBe(prod.publicUrl.origin);
    const token = new Sealer(prod.tokenSecret, prod.sealerContext).seal('access', { ck: 'x' }, 60);
    expect(
      new Sealer(preview.tokenSecret, preview.sealerContext).open('access', token)
    ).toBeUndefined();
    expect(new Sealer(prod.tokenSecret, prod.sealerContext).open('access', token)).toEqual(
      expect.objectContaining({ ck: 'x' })
    );
  });
});

describe('access policy', () => {
  const policy = createAccessPolicy({
    userIds: ['1'],
    emails: ['Boss@Example.com'],
    workspaceIds: ['w1'],
  });

  it('admits by user id, case-insensitive email, or any authorized workspace', () => {
    expect(isAllowed(policy, { userId: '1', workspaceIds: [] })).toBe(true);
    expect(isAllowed(policy, { userId: '2', email: 'boss@example.COM', workspaceIds: [] })).toBe(
      true
    );
    expect(isAllowed(policy, { userId: '3', workspaceIds: ['x', 'w1'] })).toBe(true);
  });

  it('refuses everyone else', () => {
    expect(
      isAllowed(policy, { userId: '4', email: 'someone@example.com', workspaceIds: ['x'] })
    ).toBe(false);
  });
});

describe('ClickUp client in hosted mode', () => {
  const sent: string[] = [];
  const makeClient = () => {
    const client = new ClickUpClient({ apiToken: 'pk_constructor_token' });
    client.getAxiosInstance().defaults.adapter = async config => {
      sent.push(String(config.headers?.Authorization));
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    return client;
  };

  beforeEach(() => {
    sent.length = 0;
    process.env[REMOTE_MODE_ENV] = '1';
  });
  afterEach(() => {
    delete process.env[REMOTE_MODE_ENV];
  });

  it('refuses a ClickUp call with no bound token, and sends nothing', async () => {
    await expect(makeClient().get('/team')).rejects.toBeInstanceOf(MissingRequestCredentialsError);
    expect(sent).toEqual([]);
  });

  it('sends the bound token, as Bearer for OAuth tokens and raw for personal tokens', async () => {
    const client = makeClient();
    await runWithClickUpToken('oauth-abc', () => client.get('/team'));
    await runWithClickUpToken('pk_personal', () => client.get('/team'));
    expect(sent).toEqual(['Bearer oauth-abc', 'pk_personal']);
  });

  it('hands out a placeholder instead of CLICKUP_API_TOKEN, and resolves only the bound token', () => {
    expect(getApiToken()).toBe(REMOTE_PLACEHOLDER_TOKEN);
    expect(() => resolveClickUpToken()).toThrow(MissingRequestCredentialsError);
    expect(runWithClickUpToken('oauth-abc', () => resolveClickUpToken())).toBe('oauth-abc');
  });

  it('sends the bound token on the v3 docs reads, through the shared client', async () => {
    const client = new ClickUpClient({ apiToken: 'pk_constructor_token' });
    const sent: Array<{ url: string; auth: string }> = [];
    client.getAxiosInstance().defaults.adapter = async config => {
      sent.push({ url: String(config.url), auth: String(config.headers?.Authorization) });
      return {
        data: { docs: [], next_cursor: '' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    const docs = new DocsClient(client);

    await runWithClickUpToken('oauth-abc', () => docs.getDocsFromWorkspace('w1'));
    await runWithClickUpToken('oauth-abc', () => docs.getDocPages('w1', 'd1'));
    expect(sent).toEqual([
      { url: 'https://api.clickup.com/api/v3/workspaces/w1/docs', auth: 'Bearer oauth-abc' },
      {
        url: 'https://api.clickup.com/api/v3/workspaces/w1/docs/d1/pages',
        auth: 'Bearer oauth-abc',
      },
    ]);

    await expect(docs.getDocsFromWorkspace('w1')).rejects.toBeInstanceOf(
      MissingRequestCredentialsError
    );
    expect(sent).toHaveLength(2);
  });

  it('disables server-side file_path uploads', async () => {
    const client = new AttachmentsEnhancedClient('pk_x');
    await expect(
      runWithClickUpToken('oauth-abc', () =>
        client.uploadAttachment({
          task_id: 't1',
          filename: 'environ',
          file_path: '/proc/self/environ',
        } as never)
      )
    ).rejects.toThrow(/file_path uploads are disabled on the hosted server/);
  });
});

describe('ClickUp client in stdio mode (unchanged behaviour)', () => {
  it('still uses the constructor token when no request token is bound', async () => {
    const sent: string[] = [];
    const client = new ClickUpClient({ apiToken: 'pk_constructor_token' });
    client.getAxiosInstance().defaults.adapter = async config => {
      sent.push(String(config.headers?.Authorization));
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await client.get('/team');
    expect(sent).toEqual(['pk_constructor_token']);
    expect(resolveClickUpToken()).toBe(process.env.CLICKUP_API_TOKEN);
    expect(formatAuthorizationHeader('oauth-x')).toBe('Bearer oauth-x');
  });
});
