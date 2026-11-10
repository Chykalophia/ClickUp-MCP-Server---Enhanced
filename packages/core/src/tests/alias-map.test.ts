/**
 * Registers every toolset through enforceStrictParams, which is the only way to
 * validate the alias tables against the whole surface: a PARAM_ALIASES entry
 * naming a tool that does not exist, or a parameter that tool does not declare,
 * throws at registration time. Without this the mistake would only surface when
 * someone enabled that toolset.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const noop = jest.fn();

const fakeHttp = () => ({
  post: noop,
  get: noop,
  put: noop,
  delete: noop,
  getAxiosInstance: () => ({ get: noop, post: noop, put: noop, delete: noop }),
});

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: fakeHttp,
  // WebhooksEnhancedClient extends this, so the mock has to expose a class.
  ClickUpClient: class {
    post = noop;
    get = noop;
    put = noop;
    delete = noop;
    getAxiosInstance = () => ({ get: noop, post: noop, put: noop, delete: noop });
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

import { PARAM_ALIASES, UNIVERSAL_ALIASES } from '../utils/param-aliases.js';
import { TOTAL_TOOL_COUNT } from '../tools/toolsets.js';
import { createClickUpMcpServer } from '../server-factory';

jest.mock('../version', () => ({ VERSION: '0.0.0-test' }));

/**
 * The real composition root every entry point uses, so this test cannot drift
 * from what is actually served. CLICKUP_TOOLSETS unset = every toolset.
 */
function buildServer(): McpServer {
  delete process.env.CLICKUP_TOOLSETS;
  delete process.env.CLICKUP_DEBUG_TOOLS;
  return createClickUpMcpServer().server;
}

interface RegisteredToolShape {
  inputSchema?: { shape?: Record<string, unknown> };
}

function registeredTools(server: McpServer): Record<string, RegisteredToolShape> {
  return (server as unknown as { _registeredTools: Record<string, RegisteredToolShape> })
    ._registeredTools;
}

describe('alias tables', () => {
  let server: McpServer;

  beforeEach(() => {
    server = buildServer();
  });

  it('registers every toolset without a stale alias entry', () => {
    expect(() => buildServer()).not.toThrow();
  });

  it('registers the tool count the toolset table advertises', () => {
    // The comments toolset's count already excludes the debug-only
    // clickup_create_task_comment_raw_test, which is not registered here.
    expect(Object.keys(registeredTools(server))).toHaveLength(TOTAL_TOOL_COUNT);
  });

  it('names only real tools in PARAM_ALIASES', () => {
    const registered = new Set(Object.keys(registeredTools(server)));

    for (const toolName of Object.keys(PARAM_ALIASES)) {
      expect(registered.has(toolName)).toBe(true);
    }
  });

  it('applies each universal alias somewhere, so no rule is dead', () => {
    const tools = registeredTools(server);

    for (const alias of Object.keys(UNIVERSAL_ALIASES)) {
      const applied = Object.values(tools).some(tool =>
        Object.prototype.hasOwnProperty.call(tool.inputSchema?.shape ?? {}, alias)
      );
      expect({ alias, applied }).toEqual({ alias, applied: true });
    }
  });
});
