/**
 * Regression tests for the defect in HANDOFF-comment-api-and-silent-param-drop.md:
 * a misspelled parameter was silently discarded and the write went through
 * anyway, returning a success response for a half-populated object.
 *
 * These drive a real McpServer over InMemoryTransport with a real Client, so
 * they exercise the actual JSON-RPC validation path rather than calling handlers
 * directly — the bug lived in the SDK's schema wrapping, which a direct handler
 * call would skip entirely.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Mock functions must be declared before jest.mock hoisting can reference them
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
// EnhancedDocsClient bypasses the wrapper methods and talks to the shared axios
// instance directly, so it needs its own spy.
const mockAxiosGet = jest.fn();

// Only the HTTP layer is faked: the real TasksClient runs, so these tests also
// cover its markdown_content -> markdown_description translation.
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
}));

// `marked` is ESM-only and unrelated to what these tests assert.
jest.mock('../utils/markdown', () => ({
  prepareContentForClickUp: jest.fn((content: string) => ({ description: content })),
  processClickUpResponse: jest.fn((task: any) => task),
  markdownToHtml: jest.fn((s: string) => s),
  htmlToMarkdown: jest.fn((s: string) => s),
}));

// Imported after the mocks so the tool modules pick them up at load time.
import { enforceStrictParams, unknownParamMessage } from '../utils/tool-registration.js';
import { PARAM_ALIASES } from '../utils/param-aliases.js';
import { setupTaskTools } from '../tools/task-tools';
import { setupWorkspaceTools } from '../tools/workspace-tools';
import { setupSpaceTools } from '../tools/space-tools';
import { setupEnhancedDocTools } from '../tools/doc-tools-enhanced';

interface ToolCallOutcome {
  failed: boolean;
  text: string;
}

/**
 * Call a tool and normalise how a rejection arrives. Depending on the SDK
 * version a validation failure comes back either as a CallToolResult with
 * isError set or as a thrown McpError; the assertions here care that the call
 * failed and what it said, not which envelope carried it.
 */
async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallOutcome> {
  try {
    const result = (await client.callTool({ name, arguments: args })) as {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
    return {
      failed: result.isError === true,
      text: (result.content ?? []).map((entry) => entry.text ?? '').join('\n'),
    };
  } catch (error: unknown) {
    return { failed: true, text: error instanceof Error ? error.message : String(error) };
  }
}

async function connectServer(
  register: (server: McpServer) => void
): Promise<{ client: Client; close: () => Promise<void> }> {
  const server = enforceStrictParams(new McpServer({ name: 'test-server', version: '1.0.0' }));
  register(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe('strict tool parameters', () => {
  let client: Client;
  let close: () => Promise<void>;

  beforeEach(async () => {
    mockPost.mockResolvedValue({ id: 'task-1', name: 'Created', description: 'body' });
    mockPut.mockResolvedValue({ id: 'task-1', name: 'Updated' });
    mockGet.mockResolvedValue({ id: 'task-1', name: 'Existing', assignees: [] });
    ({ client, close } = await connectServer((server) => {
      setupTaskTools(server);
      setupWorkspaceTools(server);
      setupSpaceTools(server);
      setupEnhancedDocTools(server);
    }));
  });

  afterEach(async () => {
    await close();
  });

  describe('clickup_create_task', () => {
    it('rejects an unknown parameter instead of silently dropping it', async () => {
      const outcome = await callTool(client, 'clickup_create_task', {
        list_id: '901114091484',
        name: 'DESIGN: CTA copy says customer, link says retailer',
        totally_not_a_param: '## The mismatch',
      });

      expect(outcome.failed).toBe(true);
      expect(outcome.text).toContain('Unknown parameter(s)');
      expect(outcome.text).toContain('totally_not_a_param');
      // The caller has to be able to discover the right spelling from the error.
      expect(outcome.text).toContain('markdown_content');
      // The defining symptom of the bug: no task was created.
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('suggests the closest valid name for a near-miss typo', async () => {
      const outcome = await callTool(client, 'clickup_create_task', {
        list_id: '901114091484',
        name: 'Typo',
        markdown_contnet: 'body',
      });

      expect(outcome.failed).toBe(true);
      expect(outcome.text).toContain('did you mean "markdown_content"');
    });

    it('accepts a valid call and persists a non-empty description', async () => {
      const outcome = await callTool(client, 'clickup_create_task', {
        list_id: '901114091484',
        name: 'Valid',
        markdown_content: '## The mismatch',
      });

      expect(outcome.failed).toBe(false);
      expect(mockPost).toHaveBeenCalledTimes(1);
      const [endpoint, body] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
      expect(endpoint).toContain('/list/901114091484/task');
      expect(body.markdown_description).toBe('## The mismatch');
    });

    it('accepts markdown_description, the ClickUp API and first-party MCP name', async () => {
      const outcome = await callTool(client, 'clickup_create_task', {
        list_id: '901114091484',
        name: 'Alias',
        markdown_description: '## The mismatch',
      });

      expect(outcome.failed).toBe(false);
      const [, body] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
      expect(body.markdown_description).toBe('## The mismatch');
      // The alias is renamed before the handler, so it never reaches the wire twice.
      expect(body.markdown_content).toBeUndefined();
    });
  });

  describe('clickup_update_task', () => {
    it('rejects an unknown parameter', async () => {
      const outcome = await callTool(client, 'clickup_update_task', {
        task_id: '868kzc4c3',
        markdown_descriptions: 'body',
      });

      expect(outcome.failed).toBe(true);
      expect(outcome.text).toContain('Unknown parameter(s)');
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('accepts markdown_description and sends it to the API', async () => {
      const outcome = await callTool(client, 'clickup_update_task', {
        task_id: '868kzc4c3',
        markdown_description: '## Updated body',
      });

      expect(outcome.failed).toBe(false);
      expect(mockPut).toHaveBeenCalledTimes(1);
      const [, body] = mockPut.mock.calls[0] as [string, Record<string, unknown>];
      expect(body.markdown_description).toBe('## Updated body');
      expect(body.markdown_content).toBeUndefined();
    });
  });

  describe('zero-parameter tools', () => {
    it('still runs when called with no arguments', async () => {
      mockGet.mockResolvedValue({ teams: [] });
      const outcome = await callTool(client, 'clickup_get_workspaces', {});
      expect(outcome.failed).toBe(false);
    });

    it('rejects a stray argument', async () => {
      const outcome = await callTool(client, 'clickup_get_authorized_user', { workspace_id: '123' });
      expect(outcome.failed).toBe(true);
      expect(outcome.text).toContain('Unknown parameter(s)');
      // No parameter list to print, so say that rather than "Valid parameters: ."
      expect(outcome.text).toContain('This tool takes no parameters.');
      expect(outcome.text).not.toContain('Valid parameters: .');
    });
  });

  describe('published tool schemas', () => {
    it('advertises additionalProperties: false, matching the runtime', async () => {
      const { tools } = await client.listTools();
      const createTask = tools.find((tool) => tool.name === 'clickup_create_task');

      expect(createTask).toBeDefined();
      expect(createTask?.inputSchema.additionalProperties).toBe(false);
    });

    it('publishes a non-empty schema for every tool', async () => {
      const { tools } = await client.listTools();

      // Guards the ZodEffects trap: a top-level z.preprocess/superRefine makes
      // the SDK's normalizeObjectSchema return undefined and publish an empty
      // schema, which would blind every client to the whole parameter list.
      for (const tool of tools) {
        expect(tool.inputSchema.type).toBe('object');
      }
      const createTask = tools.find((tool) => tool.name === 'clickup_create_task');
      expect(Object.keys(createTask?.inputSchema.properties ?? {})).toEqual(
        expect.arrayContaining(['list_id', 'name', 'markdown_content', 'markdown_description'])
      );
      expect(createTask?.inputSchema.required).toEqual(expect.arrayContaining(['list_id', 'name']));
    });
  });

  describe('universal aliases', () => {
    it('accepts workspace_id on a tool that calls it team_id', async () => {
      mockGet.mockResolvedValue({ id: 'task-1', name: 'Existing' });

      const outcome = await callTool(client, 'clickup_get_task_details', {
        task_id: 'PROJ-123',
        custom_task_ids: true,
        workspace_id: '14168111',
      });

      expect(outcome.failed).toBe(false);
      const [, params] = mockGet.mock.calls[0] as [string, Record<string, unknown>];
      expect(params.team_id).toBe('14168111');
      expect(params.workspace_id).toBeUndefined();
    });

    it('accepts team_id on a tool that calls it workspace_id', async () => {
      mockGet.mockResolvedValue({ spaces: [] });

      const outcome = await callTool(client, 'clickup_get_spaces', {
        team_id: '14168111',
      });

      expect(outcome.failed).toBe(false);
      const [endpoint] = mockGet.mock.calls[0] as [string];
      expect(endpoint).toContain('14168111');
    });

    it('accepts document_id on the doc tools, which call it doc_id', async () => {
      mockAxiosGet.mockResolvedValue({ data: { pages: [] } });

      const outcome = await callTool(client, 'clickup_list_doc_pages', {
        workspace_id: '14168111',
        document_id: 'ad-909705',
      });

      expect(outcome.failed).toBe(false);
      const [endpoint] = mockAxiosGet.mock.calls[0] as [string];
      expect(endpoint).toContain('ad-909705');
    });

    it('relaxes a required canonical to either/or and says so in the schema', async () => {
      const { tools } = await client.listTools();
      const getSpaces = tools.find((tool) => tool.name === 'clickup_get_spaces');
      const properties = getSpaces?.inputSchema.properties as Record<
        string,
        { description?: string }
      >;

      expect(properties.workspace_id).toBeDefined();
      expect(properties.team_id).toBeDefined();
      // Zod validates before the handler renames the alias, so a canonical that
      // stayed `required` would reject an alias-only call. It is enforced after
      // the rename instead — the schema has to advertise that.
      expect(getSpaces?.inputSchema.required ?? []).not.toContain('workspace_id');
      expect(properties.workspace_id.description).toContain('Required unless');
      expect(properties.workspace_id.description).toContain('team_id');
    });

    it('still fails loudly when neither the canonical nor its alias is given', async () => {
      const outcome = await callTool(client, 'clickup_get_spaces', {});

      expect(outcome.failed).toBe(true);
      expect(outcome.text).toContain('workspace_id');
      expect(outcome.text).toContain('team_id');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('leaves required parameters alone when no alias applies to them', async () => {
      const { tools } = await client.listTools();
      const createTask = tools.find((tool) => tool.name === 'clickup_create_task');

      // list_id and name have no aliases, so they must stay required.
      expect(createTask?.inputSchema.required).toEqual(
        expect.arrayContaining(['list_id', 'name'])
      );
    });
  });

  describe('PARAM_ALIASES integrity', () => {
    it('only references tools this server actually registers', async () => {
      const { tools } = await client.listTools();
      const registered = new Set(tools.map((tool) => tool.name));
      // Tools from toolsets this suite does not register are skipped here; the
      // canonical-parameter check is enforced at registration time by
      // enforceStrictParams, which throws on a stale entry.
      const covered = Object.keys(PARAM_ALIASES).filter((name) => registered.has(name));

      expect(covered).toEqual(
        expect.arrayContaining(['clickup_create_task', 'clickup_update_task'])
      );
    });
  });
});

describe('unknownParamMessage', () => {
  it('names the bad key, the suggestion, and the full valid set', () => {
    const message = unknownParamMessage('demo_tool', ['naem'], ['name', 'list_id']);

    expect(message).toContain('demo_tool');
    expect(message).toContain('naem');
    expect(message).toContain('did you mean "name"');
    expect(message).toContain('Valid parameters: name, list_id.');
  });

  it('omits a suggestion when nothing is close', () => {
    const message = unknownParamMessage('demo_tool', ['zzzzzzzzzzzz'], ['name', 'list_id']);

    expect(message).not.toContain('did you mean');
    expect(message).toContain('Valid parameters: name, list_id.');
  });
});
