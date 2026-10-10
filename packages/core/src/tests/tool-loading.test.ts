/**
 * Tool loading (7.0.0): core vs all mode, CLICKUP_TOOLSETS, the catalog tools,
 * central annotations, and elicitation for destructive tools.
 *
 * Builds the real server through createClickUpServer and talks to it with a
 * real Client over InMemoryTransport, so tools/list, list_changed, and
 * tools/call go through the SDK exactly as they would over stdio. Only the
 * HTTP layer is faked; nothing touches the network.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  ElicitRequestSchema,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';

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
    getAxiosInstance = () => ({ get: mockAxiosGet, post: jest.fn(), put: jest.fn(), delete: jest.fn() });
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

import { createClickUpServer, SERVER_INSTRUCTIONS } from '../create-server';
import { CORE_TOOLS } from '../tools/toolsets';

/**
 * Core-mode tools/list budget. Measured at 24.2 KB (15 tools) when this was
 * written, versus ~194 KB for all tools; the headroom is for core tools added
 * later (clickup_find_member, clickup_move_task).
 */
const CORE_BYTE_BUDGET = 32 * 1024;

const CATALOG = ['clickup_list_toolsets', 'clickup_enable_toolset', 'clickup_call_tool'];

type Env = Record<string, string | undefined>;

interface Harness {
  client: Client;
  created: ReturnType<typeof createClickUpServer>;
  listChanged: jest.Mock;
  close: () => Promise<void>;
}

async function connect(
  env: Env = {},
  clientOptions: {
    elicitation?: (request: any) => any;
  } = {}
): Promise<Harness> {
  const created = createClickUpServer({ env });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: clientOptions.elicitation ? { elicitation: {} } : {} }
  );
  const listChanged = jest.fn();
  client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    listChanged();
  });
  if (clientOptions.elicitation) {
    client.setRequestHandler(ElicitRequestSchema, clientOptions.elicitation);
  }
  await Promise.all([created.server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    created,
    listChanged,
    close: async () => {
      await client.close();
      await created.server.close();
    },
  };
}

async function listTools(client: Client) {
  const result = await client.listTools();
  return { tools: result.tools, bytes: Buffer.byteLength(JSON.stringify(result)) };
}

const names = (tools: Array<{ name: string }>) => tools.map(t => t.name).sort();

function textOf(result: any): string {
  return (result.content ?? []).map((c: any) => c.text ?? '').join('\n');
}

const flush = () => new Promise(resolve => setTimeout(resolve, 10));

describe('tool loading', () => {
  let harness: Harness | undefined;

  afterEach(async () => {
    await harness?.close();
    harness = undefined;
  });

  describe('core mode (default)', () => {
    it('publishes exactly the core tools that exist plus the catalog tools', async () => {
      harness = await connect();
      const { tools } = await listTools(harness.client);
      const registered = harness.created.registry.tools;
      const expected = [...CORE_TOOLS.filter(n => registered.has(n)), ...CATALOG].sort();
      expect(names(tools)).toEqual(expected);
      // Sanity: the core set really is mostly present.
      expect(tools.length).toBeGreaterThanOrEqual(12);
    });

    it('stays under the tools/list byte budget', async () => {
      harness = await connect();
      const { bytes } = await listTools(harness.client);
      expect(bytes).toBeLessThan(CORE_BYTE_BUDGET);
    });

    it('still registers every tool, so the rest is reachable', async () => {
      harness = await connect();
      expect(harness.created.registry.tools.size).toBeGreaterThan(150);
      expect(harness.created.counts.enabled).toBe((await listTools(harness.client)).tools.length);
    });

    it('sends instructions and serverInfo on initialize', async () => {
      harness = await connect();
      expect(harness.client.getInstructions()).toBe(SERVER_INSTRUCTIONS);
      expect(SERVER_INSTRUCTIONS).toContain('clickup_get_workspace_hierarchy');
      expect(SERVER_INSTRUCTIONS).toContain('clickup_enable_toolset');
      const info = harness.client.getServerVersion();
      expect(info?.name).toBe('clickup-mcp-server');
      expect((info as any)?.title).toBe('ClickUp MCP Server');
    });
  });

  describe('all mode', () => {
    it.each([{ CLICKUP_TOOL_MODE: 'all' }, { CLICKUP_TOOLSETS: 'all' }, { CLICKUP_TOOL_MODE: 'ALL' }])(
      'publishes every registered tool for %p',
      async env => {
        harness = await connect(env);
        const { tools } = await listTools(harness.client);
        expect(tools.length).toBe(harness.created.registry.tools.size);
        expect(names(tools)).toEqual(expect.arrayContaining([...CATALOG, 'clickup_create_goal']));
      }
    );
  });

  describe('CLICKUP_TOOLSETS', () => {
    it('adds named toolsets on top of core', async () => {
      harness = await connect({ CLICKUP_TOOLSETS: 'goals' });
      const listed = names((await listTools(harness.client)).tools);
      const goals = harness.created.registry.byToolset().get('goals')!;
      expect(listed).toEqual(expect.arrayContaining([...goals, 'clickup_create_task', ...CATALOG]));
      expect(listed).not.toContain('clickup_create_view');
    });

    it('expands profiles', async () => {
      harness = await connect({ CLICKUP_TOOLSETS: 'admin time' });
      const listed = names((await listTools(harness.client)).tools);
      for (const toolset of ['spaces', 'views', 'webhooks', 'goals', 'workspace', 'time-tracking']) {
        expect(listed).toEqual(
          expect.arrayContaining(harness.created.registry.byToolset().get(toolset)!)
        );
      }
      expect(listed).not.toContain('clickup_create_checklist');
    });

    it('falls back to core (not all) when nothing resolves', async () => {
      harness = await connect({ CLICKUP_TOOLSETS: 'bogus,alsobogus' });
      expect(harness.created.resolved.fellBack).toBe(true);
      expect(harness.created.resolved.unknown).toEqual(['bogus', 'alsobogus']);
      const { tools } = await listTools(harness.client);
      expect(tools.length).toBeLessThan(30);
    });

    it('with CLICKUP_TOOL_MODE=all, narrows to exactly the named toolsets (pre-7.0 behaviour)', async () => {
      harness = await connect({ CLICKUP_TOOL_MODE: 'all', CLICKUP_TOOLSETS: 'goals' });
      const goals = harness.created.registry.byToolset().get('goals')!;
      expect(names((await listTools(harness.client)).tools)).toEqual([...goals, ...CATALOG].sort());
    });
  });

  describe('clickup_list_toolsets', () => {
    it('lists toolsets with tool names, enabled flags, and unique markers', async () => {
      harness = await connect();
      const result = await harness.client.callTool({ name: 'clickup_list_toolsets', arguments: {} });
      const body = JSON.parse(textOf(result));
      const goals = body.toolsets.find((t: any) => t.name === 'goals');
      expect(goals).toMatchObject({ enabled: false, unique: true, enabled_tools: 0 });
      expect(goals.tools).toContain('clickup_create_goal');
      const tasks = body.toolsets.find((t: any) => t.name === 'tasks');
      expect(tasks.unique).toBe(false);
      expect(tasks.enabled_tools).toBeGreaterThan(0);
      expect(body.toolsets.map((t: any) => t.name)).not.toContain('catalog');
      expect(body.profiles.pm).toContain('tasks');
    });

    it('returns JSON schemas for one toolset on request', async () => {
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_list_toolsets',
        arguments: { toolset: 'goals', include_schemas: true },
      });
      const body = JSON.parse(textOf(result));
      expect(body.toolsets).toHaveLength(1);
      const getGoals = body.toolsets[0].tools.find((t: any) => t.name === 'clickup_get_goals');
      expect(getGoals.inputSchema.properties.team_id).toBeDefined();
      expect(getGoals.inputSchema.additionalProperties).toBe(false);
    });

    it('suggests the closest toolset for a typo', async () => {
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_list_toolsets',
        arguments: { toolset: 'goal' },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('"goals"');
    });
  });

  describe('clickup_enable_toolset', () => {
    it('enables a toolset, emits list_changed, and the tools appear', async () => {
      harness = await connect();
      expect(names((await listTools(harness.client)).tools)).not.toContain('clickup_create_goal');

      const result = await harness.client.callTool({
        name: 'clickup_enable_toolset',
        arguments: { toolsets: ['goals'] },
      });
      expect(result.isError).toBeFalsy();
      await flush();
      expect(harness.listChanged).toHaveBeenCalledTimes(1);
      expect(names((await listTools(harness.client)).tools)).toContain('clickup_create_goal');
    });

    it('disables a toolset but never core or catalog tools', async () => {
      harness = await connect({ CLICKUP_TOOLSETS: 'tasks' });
      expect(names((await listTools(harness.client)).tools)).toContain('clickup_delete_task');

      const result = await harness.client.callTool({
        name: 'clickup_enable_toolset',
        arguments: { toolsets: ['tasks', 'catalog'], disable: true },
      });
      await flush();
      expect(harness.listChanged).toHaveBeenCalled();
      const listed = names((await listTools(harness.client)).tools);
      expect(listed).not.toContain('clickup_delete_task');
      expect(listed).toEqual(expect.arrayContaining(['clickup_create_task', ...CATALOG]));
      expect(textOf(result)).toContain('Kept enabled (core)');
    });

    it('rejects names that resolve to nothing', async () => {
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_enable_toolset',
        arguments: { toolsets: ['goalz'] },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('goals');
    });
  });

  describe('clickup_call_tool', () => {
    it('runs a disabled tool and returns its result unchanged', async () => {
      mockAxiosGet.mockResolvedValue({ data: { goals: [] } });
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_call_tool',
        arguments: { tool: 'clickup_get_goals', arguments: { team_id: '123' } },
      });
      expect(result.isError).toBeFalsy();
      expect(textOf(result)).toBe('Goals for team 123:\n\n[]');
      expect(mockAxiosGet).toHaveBeenCalled();
    });

    it("validates arguments with the tool's strict schema", async () => {
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_call_tool',
        arguments: {
          tool: 'clickup_get_goals',
          arguments: { team_id: '123', not_a_param: true },
        },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('Unknown parameter(s) for clickup_get_goals: not_a_param');
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('suggests the closest name for an unknown tool', async () => {
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_call_tool',
        arguments: { tool: 'clickup_get_goal_summery' },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('clickup_get_goal_summary');
    });

    it('refuses to call catalog tools recursively', async () => {
      harness = await connect();
      const result = await harness.client.callTool({
        name: 'clickup_call_tool',
        arguments: { tool: 'clickup_call_tool', arguments: { tool: 'clickup_get_goals' } },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('catalog tool');
    });
  });

  describe('annotations', () => {
    it('gives every tool a title and the four hints that apply', async () => {
      harness = await connect({ CLICKUP_TOOL_MODE: 'all' });
      const { tools } = await listTools(harness.client);
      for (const tool of tools) {
        expect(tool.annotations?.title).toEqual(expect.any(String));
        expect(tool.annotations?.readOnlyHint).toEqual(expect.any(Boolean));
        expect(tool.annotations?.openWorldHint).toEqual(expect.any(Boolean));
        if (!tool.annotations?.readOnlyHint) {
          expect(tool.annotations?.destructiveHint).toEqual(expect.any(Boolean));
        }
      }
      const byName = Object.fromEntries(tools.map(t => [t.name, t.annotations]));
      expect(byName.clickup_get_task_details).toMatchObject({
        title: 'Get Task Details',
        readOnlyHint: true,
        openWorldHint: true,
      });
      expect(byName.clickup_delete_task).toMatchObject({ readOnlyHint: false, destructiveHint: true });
      expect(byName.clickup_bulk_delete_tasks).toMatchObject({ destructiveHint: true });
      expect(byName.clickup_merge_tasks).toMatchObject({ destructiveHint: true });
      expect(byName.clickup_update_task).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      });
      expect(byName.clickup_create_task).toMatchObject({ destructiveHint: false, idempotentHint: false });
      expect(byName.clickup_format_duration).toMatchObject({ readOnlyHint: true, openWorldHint: false });
    });
  });

  describe('registry', () => {
    it('attributes tools to the toolset whose setup function registered them', () => {
      const { McpServer } = jest.requireActual('@modelcontextprotocol/sdk/server/mcp.js');
      const { z } = jest.requireActual('zod');
      const { enforceStrictParams, getToolRegistry, withToolset } = jest.requireActual(
        '../utils/tool-registration'
      );
      const server = enforceStrictParams(new McpServer({ name: 't', version: '1' }));
      // A tool added later inside an existing setup function needs no table entry.
      withToolset(server, 'tasks', () => {
        server.tool('clickup_brand_new_tool', 'x', { id: z.string() }, async () => ({ content: [] }));
        server.tool(
          'clickup_delete_with_own_hints',
          'x',
          { id: z.string() },
          { destructiveHint: false, title: 'Custom' },
          async () => ({ content: [] })
        );
      });
      const registry = getToolRegistry(server);
      expect(registry.byToolset().get('tasks')).toEqual([
        'clickup_brand_new_tool',
        'clickup_delete_with_own_hints',
      ]);
      // Call-site annotations win over inferred ones.
      expect(registry.tools.get('clickup_delete_with_own_hints').handle.annotations).toMatchObject({
        destructiveHint: false,
        title: 'Custom',
        openWorldHint: true,
      });
    });
  });

  describe('destructive-tool confirmation', () => {
    const deleteArgs = { task_id: 'abc', confirm_deletion: true };

    beforeEach(() => {
      mockGet.mockResolvedValue({ id: 'abc', name: 'Doomed' });
      mockDelete.mockResolvedValue({});
    });

    it('runs unchanged when the client has no elicitation support', async () => {
      harness = await connect({ CLICKUP_TOOLSETS: 'tasks' });
      const result = await harness.client.callTool({ name: 'clickup_delete_task', arguments: deleteArgs });
      expect(result.isError).toBeFalsy();
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('cancels when the user declines', async () => {
      const elicitation = jest.fn().mockResolvedValue({ action: 'decline' });
      harness = await connect({ CLICKUP_TOOLSETS: 'tasks' }, { elicitation });
      const result = await harness.client.callTool({ name: 'clickup_delete_task', arguments: deleteArgs });
      expect(elicitation).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('cancelled');
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('proceeds when the user confirms, including through clickup_call_tool', async () => {
      const elicitation = jest
        .fn()
        .mockResolvedValue({ action: 'accept', content: { confirm: true } });
      harness = await connect({}, { elicitation });
      const result = await harness.client.callTool({
        name: 'clickup_call_tool',
        arguments: { tool: 'clickup_delete_task', arguments: deleteArgs },
      });
      expect(elicitation).toHaveBeenCalledTimes(1);
      expect(elicitation.mock.calls[0][0].params.message).toContain('clickup_delete_task');
      expect(result.isError).toBeFalsy();
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('does not prompt for non-destructive tools', async () => {
      const elicitation = jest.fn();
      mockAxiosGet.mockResolvedValue({ data: { goals: [] } });
      harness = await connect({}, { elicitation });
      await harness.client.callTool({
        name: 'clickup_call_tool',
        arguments: { tool: 'clickup_get_goals', arguments: { team_id: '1' } },
      });
      expect(elicitation).not.toHaveBeenCalled();
    });
  });
});
