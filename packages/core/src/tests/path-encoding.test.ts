/**
 * Caller-supplied IDs must not change the structure of the ClickUp endpoint
 * they are placed in. Each attack below was reproduced by the 2026-11-10
 * audit: axios normalizes `../`, and `?` / `#` cut the rest of a path off, so
 * a crafted ID turned a narrowly named delete into a delete on another
 * resource, using the caller's own token.
 *
 * Asserted on what actually reaches the network (the axios adapter), not on
 * the presence of an encoding call.
 */
import type { AxiosRequestConfig } from 'axios';
import { ClickUpClient } from '../clickup-client/index';
import { WebhooksEnhancedClient } from '../clickup-client/webhooks-enhanced';
import { ViewsEnhancedClient } from '../clickup-client/views-enhanced';
import { DependenciesEnhancedClient } from '../clickup-client/dependencies-enhanced';
import { ChatEnhancedClient } from '../clickup-client/chat-enhanced';
import { assertSafeEndpoint, InvalidPathSegmentError, seg } from '../clickup-client/path';
import { idSchema } from '../schemas/common';

type Sent = { method: string; pathname: string; search: string };

/** Point a client's axios instance at a recorder and return what it receives. */
function record(client: ClickUpClient): Sent[] {
  const sent: Sent[] = [];
  client.getAxiosInstance().defaults.adapter = async (config: AxiosRequestConfig) => {
    // axios's http adapter resolves the URL with new URL(); do the same.
    const url = new URL(
      /^https?:/.test(config.url ?? '') ? config.url! : `${config.baseURL}${config.url}`
    );
    sent.push({
      method: String(config.method).toUpperCase(),
      pathname: url.pathname,
      search: url.search,
    });
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config } as never;
  };
  return sent;
}

describe('seg()', () => {
  it('encodes structure characters so an ID stays one path segment', () => {
    expect(seg('x/../../view/abc')).toBe('x%2F..%2F..%2Fview%2Fabc');
    expect(seg('abc?x=')).toBe('abc%3Fx%3D');
    expect(seg('abc#')).toBe('abc%23');
    expect(seg(900100)).toBe('900100');
    expect(seg('DEV-123')).toBe('DEV-123');
  });

  it('refuses dot segments and empty values, which encoding cannot neutralize', () => {
    for (const bad of ['.', '..', '']) {
      expect(() => seg(bad)).toThrow(InvalidPathSegmentError);
    }
  });
});

describe('crafted IDs stay on the resource the tool names', () => {
  it('delete_webhook with a traversal ID still deletes a webhook path, not a view', async () => {
    const client = new WebhooksEnhancedClient('pk_test');
    const sent = record(client);
    await client.deleteWebhook('x/../../view/abc');
    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe('DELETE');
    expect(sent[0].pathname).toBe('/api/v2/webhook/x%2F..%2F..%2Fview%2Fabc');
  });

  it('delete_view with a traversal ID does not reach a task', async () => {
    const client = new ViewsEnhancedClient('pk_test');
    const sent = record(client);
    await client.deleteView('../task/abc');
    expect(sent[0].pathname).toBe('/api/v2/view/..%2Ftask%2Fabc');
  });

  it('a dependency delete with "?" in the task ID keeps its /dependency suffix', async () => {
    const client = new DependenciesEnhancedClient('pk_test');
    const sent = record(client);
    await client.deleteDependency({ task_id: 'abc?x=', depends_on: 'def' } as never);
    expect(sent[0].method).toBe('DELETE');
    expect(sent[0].pathname).toBe('/api/v2/task/abc%3Fx%3D/dependency');
  });

  it('a dependency create with "#" in the task ID cannot drop /dependency', async () => {
    const client = new DependenciesEnhancedClient('pk_test');
    const sent = record(client);
    await client.createDependency({ task_id: 'abc#', depends_on: 'def' } as never);
    expect(sent[0].pathname).toBe('/api/v2/task/abc%23/dependency');
  });

  it('delete_chat_message cannot leave the v3 chat API for a v2 resource', async () => {
    const client = new ChatEnhancedClient('pk_test');
    const sent = record((client as unknown as { client: ClickUpClient }).client);
    await client.deleteMessage('123', '../../../v2/team');
    expect(sent[0].pathname.startsWith('/api/v3/workspaces/123/chat/messages/')).toBe(true);
    expect(sent[0].pathname).not.toContain('/v2/');
  });
});

describe('the HTTP layer refuses a path a missed call site would let through', () => {
  it('never sends a raw traversal, fragment or off-host URL', async () => {
    const client = new ClickUpClient({ apiToken: 'pk_test' });
    const sent = record(client);
    const http = client.getAxiosInstance();
    for (const url of [
      '/webhook/x/../../view/abc',
      '/webhook/x/%2e%2e/view/abc',
      '/task/abc#/dependency',
      '/task\\..\\view',
      'https://evil.example.com/api/v2/team',
      'https://api.clickup.com/oauth/token',
    ]) {
      await expect(http.delete(url)).rejects.toBeInstanceOf(InvalidPathSegmentError);
    }
    expect(sent).toEqual([]);
  });

  it('lets ordinary endpoints through, with or without a query string', () => {
    const base = 'https://api.clickup.com/api/v2';
    expect(() =>
      assertSafeEndpoint('/task/abc/dependency?custom_task_ids=true', base)
    ).not.toThrow();
    expect(() => assertSafeEndpoint('/team/9001/time_entries?start_date=1', base)).not.toThrow();
    expect(() =>
      assertSafeEndpoint('https://api.clickup.com/api/v3/workspaces/1/docs', base)
    ).not.toThrow();
    // A literal "." inside an ID is fine; only whole dot segments are refused.
    expect(() => assertSafeEndpoint('/task/a.b/comment', base)).not.toThrow();
  });
});

describe('idSchema rejects path-structure characters at the tool boundary', () => {
  const schema = idSchema();

  it('refuses traversal, query, fragment and whitespace', () => {
    for (const bad of ['x/../../view/abc', '1?a=b', 'abc#', '..', '.', 'a b', 'a\\b', '100%']) {
      expect(schema.safeParse(bad).success).toBe(false);
    }
  });

  it('still accepts every real ClickUp ID shape', () => {
    for (const good of [
      '86b1abcd',
      'DEV-123',
      '900100',
      900100,
      '3v-abc12-345',
      '8cdu4u5-1234',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      't-7162342',
      'a.b',
    ]) {
      expect(schema.safeParse(good).success).toBe(true);
    }
  });
});
