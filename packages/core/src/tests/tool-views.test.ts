/**
 * MCP Apps views: tools that have one carry `_meta.ui.resourceUri`, and the
 * UI resource it points to is served with the MCP Apps MIME type.
 */

import vm from 'node:vm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockAxiosGet = jest.fn();

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({
    post: mockPost,
    get: mockGet,
    put: mockPut,
    delete: mockDelete,
    getAxiosInstance: () => ({
      get: mockAxiosGet,
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    }),
  }),
  // WebhooksEnhancedClient extends this, so the mock has to expose a class.
  ClickUpClient: class {
    post = mockPost;
    get = mockGet;
    put = mockPut;
    delete = mockDelete;
    getAxiosInstance = () => ({
      get: mockAxiosGet,
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    });
  },
  formatAuthorizationHeader: (token: string) => token,
  getApiToken: () => 'pk_test_token_1234567890abcdef',
}));

jest.mock('../utils/markdown', () => ({
  prepareContentForClickUp: jest.fn((content: string) => ({ description: content })),
  processClickUpResponse: jest.fn((task: any) => task),
  markdownToHtml: jest.fn((s: string) => s),
  htmlToMarkdown: jest.fn((s: string) => s),
}));

import { createClickUpServer } from '../create-server';
import { AVATAR_ORIGINS, MCP_APP_MIME_TYPE, TASK_VIEW_URI, TOOL_VIEWS } from '../ui/tool-views';
import { TASK_VIEW_HTML } from '../ui/task-view-html';

async function connect(env: Record<string, string> = {}) {
  const created = createClickUpServer({ env });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([created.server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    created,
    close: async () => {
      await client.close();
      await created.server.close();
    },
  };
}

describe('MCP Apps tool views', () => {
  let harness: Awaited<ReturnType<typeof connect>> | undefined;

  afterEach(async () => {
    await harness?.close();
    harness = undefined;
  });

  it('links task tools to the task view, under both the current and legacy keys', async () => {
    harness = await connect({ CLICKUP_TOOL_MODE: 'all' });
    const { tools } = await harness.client.listTools();
    const byName = new Map(tools.map(t => [t.name, t]));
    for (const name of Object.keys(TOOL_VIEWS)) {
      const meta = byName.get(name)?._meta as Record<string, any> | undefined;
      expect(meta?.ui?.resourceUri).toBe(TASK_VIEW_URI);
      expect(meta?.['ui/resourceUri']).toBe(TASK_VIEW_URI);
    }
    expect(byName.get('clickup_delete_task')?._meta?.ui).toBeUndefined();
  });

  it('only names tools that exist', () => {
    const { registry } = createClickUpServer({ env: { CLICKUP_TOOL_MODE: 'all' } });
    for (const name of Object.keys(TOOL_VIEWS)) {
      expect(registry.tools.has(name)).toBe(true);
    }
  });

  it('serves the view as an MCP App resource', async () => {
    harness = await connect();
    const { contents } = await harness.client.readResource({ uri: TASK_VIEW_URI });
    expect(contents).toHaveLength(1);
    expect(contents[0].mimeType).toBe(MCP_APP_MIME_TYPE);
    expect(contents[0].text).toBe(TASK_VIEW_HTML);
    expect((contents[0]._meta as any)?.ui?.csp?.resourceDomains).toEqual(AVATAR_ORIGINS);
  });

  it('ships a view whose script parses and loads nothing external', () => {
    const scripts = [...TASK_VIEW_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    expect(scripts).toHaveLength(1);
    expect(() => new vm.Script(scripts[0])).not.toThrow();
    expect(TASK_VIEW_HTML).not.toMatch(/<script[^>]+src=|<link[^>]+href=|@import/);
    expect(TASK_VIEW_HTML).not.toMatch(/innerHTML/);
  });
});
