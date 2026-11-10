/**
 * One ClickUp transport, and a dependency check that never answers
 * "no conflicts" from a graph it could not fully read.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { AxiosRequestConfig } from 'axios';
import { DependenciesEnhancedClient } from '../clickup-client/dependencies-enhanced';

describe('every ClickUp API call goes through ClickUpClient', () => {
  const srcRoot = join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== 'tests') walk(full);
      } else if (entry.endsWith('.ts')) {
        files.push(full);
      }
    }
  };
  walk(srcRoot);

  // ClickUpClient itself, and the OAuth adapter (it holds explicit per-person
  // tokens during sign-in, before any request context exists).
  const allowed = new Set(['clickup-client/index.ts', 'remote/clickup-oauth.ts']);
  const rogue =
    /axios\.create\(|\baxios\.(get|post|put|delete|patch|request)\(|\bfetch\(|process\.env\.CLICKUP_API_TOKEN\b/;

  it('has no second axios instance, raw axios/fetch call or direct token read', () => {
    const offenders = files
      .map(file => relative(srcRoot, file))
      .filter(file => !allowed.has(file))
      .filter(file =>
        readFileSync(join(srcRoot, file), 'utf8')
          .split('\n')
          .some(line => !/^\s*(\/\/|\*)/.test(line) && rogue.test(line))
      );
    // A second transport skips the per-request credential binding, the path
    // backstop, timeouts and 429 handling all at once.
    expect(offenders).toEqual([]);
  });
});

describe('checkDependencyConflicts fails closed', () => {
  type Reply = { status: number; data?: unknown };

  function clientWith(replies: Record<string, Reply>) {
    const client = new DependenciesEnhancedClient('pk_test');
    client.getAxiosInstance().defaults.adapter = async (config: AxiosRequestConfig) => {
      const id = String(config.url).split('/').pop()!;
      const reply = replies[id] ?? { status: 404, data: { err: 'Task not found' } };
      if (reply.status >= 400) {
        const error = Object.assign(new Error(`HTTP ${reply.status}`), {
          isAxiosError: true,
          config,
          response: { status: reply.status, data: reply.data ?? {}, headers: {}, config },
        });
        throw error;
      }
      return { data: reply.data, status: 200, statusText: 'OK', headers: {}, config } as never;
    };
    return client;
  }

  const task = (id: string, dependsOn: string[] = []) => ({
    status: 200,
    data: {
      id,
      name: id,
      dependencies: dependsOn.map(other => ({ task_id: id, depends_on: other, type: 1 })),
    },
  });

  it('refuses to report no conflicts when a task in the graph could not be read', async () => {
    const client = clientWith({ A: task('A', ['B']), B: { status: 500, data: { err: 'boom' } } });
    await expect(
      client.checkDependencyConflicts({
        task_id: 'A',
        proposed_dependencies: [{ depends_on: 'D' }],
      } as never)
    ).rejects.toThrow(/Could not check every dependency.*B/);
  });

  it('treats a deleted task (404) as having no edges, and answers', async () => {
    const client = clientWith({ A: task('A', ['B']) }); // B is 404
    await expect(
      client.checkDependencyConflicts({ task_id: 'A', proposed_dependencies: [] } as never)
    ).resolves.toEqual({ has_conflicts: false, conflicts: [] });
  });

  it('still reports a cycle it found even when another part of the graph failed', async () => {
    const client = clientWith({
      A: task('A', ['B', 'C']),
      B: task('B', ['A']),
      C: { status: 503, data: { err: 'unavailable' } },
    });
    const result = await client.checkDependencyConflicts({ task_id: 'A' } as never);
    expect(result.has_conflicts).toBe(true);
    expect(result.conflicts.some(conflict => conflict.type === 'circular')).toBe(true);
  });

  it('fails outright, with ClickUp’s own error, when the root task cannot be read', async () => {
    const client = clientWith({ A: { status: 401, data: { err: 'Token invalid' } } });
    // Not an empty "incomplete" graph: there is no graph without its root.
    await expect(client.getDependencyGraph({ task_id: 'A' })).rejects.toThrow(/401|Token invalid/);
    await expect(client.checkDependencyConflicts({ task_id: 'A' } as never)).rejects.toThrow(
      /401|Token invalid/
    );
  });

  it('marks a graph cut off by the depth limit as incomplete', async () => {
    const client = clientWith({ A: task('A', ['B']), B: task('B', ['C']), C: task('C') });
    const graph = await client.getDependencyGraph({ task_id: 'A', depth: 0 });
    expect(graph.complete).toBe(false);
    expect(graph.truncated_at_depth).toEqual(['B']);
    const full = await client.getDependencyGraph({ task_id: 'A', depth: 5 });
    expect(full.complete).toBe(true);
    expect(full.unfetched_tasks).toEqual([]);
  });
});
