/**
 * Boot every BUILT entry point and talk to it. Source-level checks cannot
 * catch a build that compiles and then crashes at startup (an extensionless
 * ESM import, a module-load-order bug); only running the output does.
 *
 * Needs `npm run build` first. CI and `npm install` (prepare) both build
 * before testing, so a missing build is an error here, never a skip.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version as string;
const children: ChildProcess[] = [];

jest.setTimeout(30000);

beforeAll(() => {
  if (!existsSync(join(root, 'build', 'index-enhanced.js'))) {
    throw new Error('build/ is missing: run `npm run build` before these tests');
  }
});

afterAll(() => {
  for (const child of children) child.kill('SIGKILL');
});

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

const HOSTED_ENV = (port: number) => ({
  PATH: process.env.PATH,
  CLICKUP_MCP_PUBLIC_URL: `http://localhost:${port}`,
  CLICKUP_OAUTH_CLIENT_ID: 'fake-client',
  CLICKUP_OAUTH_CLIENT_SECRET: 'fake-secret',
  CLICKUP_MCP_TOKEN_SECRET: 'b'.repeat(48),
  CLICKUP_ALLOWED_USER_IDS: '1',
  PORT: String(port),
  HOST: '127.0.0.1',
});

async function waitForHealth(port: number, child: ChildProcess, output: () => string) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`exited with ${child.exitCode}: ${output()}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) return res.json();
    } catch {
      // not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`never became healthy: ${output()}`);
}

function start(args: string[], env: Record<string, string | undefined>) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'pipe' });
  children.push(child);
  let output = '';
  child.stdout?.on('data', chunk => (output += chunk));
  child.stderr?.on('data', chunk => (output += chunk));
  return { child, output: () => output };
}

/** initialize + tools/list over stdio, newline-delimited JSON-RPC. */
async function stdioHandshake(entry: string, env: Record<string, string | undefined>) {
  const { child, output } = start([entry], env);
  const replies = new Map<number, unknown>();
  let buffer = '';
  child.stdout!.on('data', chunk => {
    buffer += chunk;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      try {
        const message = JSON.parse(line) as { id?: number };
        if (typeof message.id === 'number') replies.set(message.id, message);
      } catch {
        // not JSON-RPC
      }
    }
  });
  const send = (message: unknown) => child.stdin!.write(`${JSON.stringify(message)}\n`);
  const reply = async (id: number) => {
    const deadline = Date.now() + 15000;
    while (!replies.has(id)) {
      if (child.exitCode !== null) throw new Error(`exited: ${output()}`);
      if (Date.now() > deadline) throw new Error(`no reply ${id}: ${output()}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return replies.get(id) as { result: Record<string, unknown> };
  };

  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'built-entries-test', version: '0' },
    },
  });
  const init = await reply(1);
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const list = await reply(2);
  child.kill();
  return {
    serverInfo: init.result.serverInfo as { name: string; version: string },
    tools: (list.result.tools as Array<{ name: string }>).map(tool => tool.name),
  };
}

const STDIO_ENV = { PATH: process.env.PATH, CLICKUP_API_TOKEN: 'pk_fake_token' };

describe('built entry points boot and serve', () => {
  it('stdio (build/index-enhanced.js) reports the package version and serves core tools by default', async () => {
    const core = await stdioHandshake('build/index-enhanced.js', STDIO_ENV);
    const all = await stdioHandshake('build/index-enhanced.js', {
      ...STDIO_ENV,
      CLICKUP_TOOL_MODE: 'all',
    });
    expect(core.serverInfo).toMatchObject({ name: 'clickup-mcp-server', version: pkgVersion });
    expect(core.tools).toContain('clickup_call_tool');
    expect(core.tools).not.toContain('clickup_get_goals');
    expect(all.tools).toContain('clickup_get_goals');
    expect(all.tools.length).toBeGreaterThan(100);
  });

  it('efficiency (build/index-efficiency-simple.js) is the same server and honours CLICKUP_TOOLSETS', async () => {
    const env = { ...STDIO_ENV, CLICKUP_TOOLSETS: 'goals' };
    const stdio = await stdioHandshake('build/index-enhanced.js', env);
    const efficiency = await stdioHandshake('build/index-efficiency-simple.js', env);
    expect(efficiency.serverInfo).toEqual(stdio.serverInfo);
    expect(efficiency.tools.sort()).toEqual(stdio.tools.sort());
    expect(efficiency.tools).toContain('clickup_get_goals');
  });

  it('hosted Node (build/index-http.js) boots, answers health and shows the consent flow', async () => {
    const port = await freePort();
    const { child, output } = start(['build/index-http.js'], HOSTED_ENV(port));
    expect(await waitForHealth(port, child, output)).toEqual({ ok: true });
    const meta = await fetch(`http://127.0.0.1:${port}/.well-known/oauth-authorization-server`);
    expect(meta.status).toBe(200);
    expect(((await meta.json()) as { issuer: string }).issuer).toBe(`http://localhost:${port}/`);
    const unauth = await fetch(`http://127.0.0.1:${port}/mcp`, { method: 'POST' });
    expect(unauth.status).toBe(401);
  });

  it('hosted Node refuses to start without an allowlist, and exits', async () => {
    const port = await freePort();
    const { CLICKUP_ALLOWED_USER_IDS: _omit, ...env } = HOSTED_ENV(port);
    const { child, output } = start(['build/index-http.js'], env);
    const code = await new Promise<number | null>(resolve => child.on('exit', resolve));
    expect(code).toBe(1);
    expect(output()).toMatch(/CLICKUP_ALLOWED_USER_IDS/);
  });

  it('Vercel handler (api/index.js) serves the same app', async () => {
    const port = await freePort();
    const script = `
      const { createServer } = await import('node:http');
      const { default: handler } = await import('./api/index.js');
      createServer(handler).listen(${port}, '127.0.0.1');
    `;
    const { child, output } = start(['--input-type=module', '-e', script], HOSTED_ENV(port));
    expect(await waitForHealth(port, child, output)).toEqual({ ok: true });
  });
});
