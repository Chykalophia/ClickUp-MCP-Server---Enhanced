/**
 * Registers every toolset through enforceStrictParams, which is the only way to
 * validate the alias tables against the whole surface: a PARAM_ALIASES entry
 * naming a tool that does not exist, or a parameter that tool does not declare,
 * throws at registration time. Without this the mistake would only surface when
 * someone enabled that toolset.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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

import { enforceStrictParams } from '../utils/tool-registration.js';
import { PARAM_ALIASES, UNIVERSAL_ALIASES } from '../utils/param-aliases.js';
import { getToolRegistry, UNGROUPED_TOOLSET } from '../utils/tool-registration.js';
import { setupTaskTools } from '../tools/task-tools';
import { setupWorkspaceTools } from '../tools/workspace-tools';
import { setupListFolderTools } from '../tools/list-folder-tools';
import { setupBulkTaskTools } from '../tools/bulk-task-tools';
import { setupEnhancedDocTools } from '../tools/doc-tools-enhanced';
import { setupCustomFieldTools } from '../tools/custom-field-tools';
import { setupTimeTrackingTools } from '../tools/time-tracking-tools';
import { setupGoalsTools } from '../tools/goals-tools';
import { setupWebhookTools } from '../tools/webhook-tools-setup';
import { setupViewsTools } from '../tools/views-tools-setup';
import { setupDependenciesTools } from '../tools/dependencies-tools-setup';
import { setupAttachmentsTools } from '../tools/attachments-tools-setup';
import { setupSpaceTools } from '../tools/space-tools';
import { setupChecklistTools } from '../tools/checklist-tools';
import { setupCommentTools } from '../tools/comment-tools';
import { setupChatTools } from '../tools/chat-tools';

/** Mirrors the registrar table in index-enhanced.ts. */
function registerEverything(server: McpServer): void {
  setupTaskTools(server);
  setupWorkspaceTools(server);
  setupListFolderTools(server);
  setupBulkTaskTools(server);
  setupEnhancedDocTools(server);
  setupCustomFieldTools(server);
  setupTimeTrackingTools(server);
  setupGoalsTools(server);
  setupWebhookTools(server);
  setupViewsTools(server);
  setupDependenciesTools(server);
  setupAttachmentsTools(server);
  setupSpaceTools(server);
  setupChecklistTools(server);
  setupCommentTools(server);
  setupChatTools(server);
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
    server = enforceStrictParams(new McpServer({ name: 'test-server', version: '1.0.0' }));
  });

  it('registers every toolset without a stale alias entry', () => {
    expect(() => registerEverything(server)).not.toThrow();
  });

  it('records every registered tool in the registry', () => {
    registerEverything(server);
    // Counts are derived from the registry, never from a hand-kept table.
    const registry = getToolRegistry(server)!;
    expect(registry.tools.size).toBe(Object.keys(registeredTools(server)).length);
    // Nothing here runs inside withToolset, so everything is ungrouped.
    expect([...registry.byToolset().keys()]).toEqual([UNGROUPED_TOOLSET]);
  });

  it('names only real tools in PARAM_ALIASES', () => {
    registerEverything(server);
    const registered = new Set(Object.keys(registeredTools(server)));

    for (const toolName of Object.keys(PARAM_ALIASES)) {
      expect(registered.has(toolName)).toBe(true);
    }
  });

  it('applies each universal alias somewhere, so no rule is dead', () => {
    registerEverything(server);
    const tools = registeredTools(server);

    for (const alias of Object.keys(UNIVERSAL_ALIASES)) {
      const applied = Object.values(tools).some(tool =>
        Object.prototype.hasOwnProperty.call(tool.inputSchema?.shape ?? {}, alias)
      );
      expect({ alias, applied }).toEqual({ alias, applied: true });
    }
  });
});
