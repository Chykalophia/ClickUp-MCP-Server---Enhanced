/**
 * Covers the consumer-usability fixes from the 2026-09-01 tool-surface audit:
 * name->ID resolution in one call, trimmed discovery payloads, and the
 * confirmation gate that clickup_delete_folder was missing.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  }),
}));

import { enforceStrictParams } from '../utils/tool-registration.js';
import { setupListFolderTools } from '../tools/list-folder-tools';
import { setupWorkspaceTools } from '../tools/workspace-tools';
import { setupSpaceTools } from '../tools/space-tools';

/** A workspace whose raw API shape carries the bulk the audit measured. */
const RAW_TEAM = {
  id: '14168111',
  name: 'Chykalophia',
  color: '#181D21',
  avatar: 'https://attachments.clickup.com/very/long/signed/url'.repeat(8),
  members: Array.from({ length: 40 }, (_, i) => ({
    user: { id: i, username: `user-${i}`, email: `u${i}@example.com`, profilePicture: 'x'.repeat(80) },
  })),
};

const RAW_SPACE = (id: string, name: string) => ({
  id,
  name,
  color: '#000',
  private: false,
  archived: false,
  statuses: Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, status: `status ${i}`, color: '#fff' })),
  features: { due_dates: { enabled: true }, time_tracking: { enabled: true }, tags: { enabled: true } },
  members: [{ user: { id: 1, username: 'a' } }],
});

let client: Client;
let server: McpServer;

async function connect() {
  server = enforceStrictParams(new McpServer({ name: 'test-server', version: '1.0.0' }));
  setupListFolderTools(server);
  setupWorkspaceTools(server);
  setupSpaceTools(server);
  const [ct, st] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(st), client.connect(ct)]);
}

async function call(name: string, args: Record<string, unknown>) {
  const res = (await client.callTool({ name, arguments: args })) as {
    isError?: boolean;
    content?: Array<{ text?: string }>;
  };
  const text = (res.content ?? []).map((c) => c.text ?? '').join('\n');
  return { failed: res.isError === true, text };
}

beforeEach(async () => {
  await connect();
});

afterEach(async () => {
  await client.close();
  await server.close();
});

describe('clickup_get_workspace_hierarchy', () => {
  beforeEach(() => {
    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/space') && endpoint.startsWith('/team/')) {
        return { spaces: [RAW_SPACE('sp1', 'Peter Space'), RAW_SPACE('sp2', 'Operations')] };
      }
      if (endpoint === '/space/sp1/folder') {
        return { folders: [{ id: 'f1', name: 'Client Work', lists: [{ id: 'l9', name: 'Acme Retainer' }] }] };
      }
      if (endpoint === '/space/sp2/folder') return { folders: [] };
      if (endpoint === '/space/sp1/list') return { lists: [{ id: 'l1', name: 'Nerdy Fun' }] };
      if (endpoint === '/space/sp2/list') return { lists: [{ id: 'l2', name: 'Ops Inbox' }] };
      throw new Error(`unexpected endpoint ${endpoint}`);
    });
  });

  it('returns the whole tree as ids and names in one call', async () => {
    const { failed, text } = await call('clickup_get_workspace_hierarchy', {
      workspace_id: '14168111',
    });
    expect(failed).toBe(false);

    const tree = JSON.parse(text);
    expect(tree.spaces).toHaveLength(2);
    expect(tree.spaces[0]).toEqual({
      id: 'sp1',
      name: 'Peter Space',
      lists: [{ id: 'l1', name: 'Nerdy Fun' }],
      folders: [{ id: 'f1', name: 'Client Work', lists: [{ id: 'l9', name: 'Acme Retainer' }] }],
    });
    // The point of the tool: none of the raw bulk comes along.
    expect(text).not.toContain('statuses');
    expect(text).not.toContain('features');
  });

  it('resolves a list name to an id, with its path', async () => {
    const { text } = await call('clickup_get_workspace_hierarchy', {
      workspace_id: '14168111',
      name_filter: 'nerdy',
    });

    expect(JSON.parse(text).matches).toEqual([
      { type: 'list', id: 'l1', name: 'Nerdy Fun', path: 'Peter Space / Nerdy Fun' },
    ]);
  });

  it('finds lists nested inside folders, not just folderless ones', async () => {
    const { text } = await call('clickup_get_workspace_hierarchy', {
      workspace_id: '14168111',
      name_filter: 'acme',
    });

    expect(JSON.parse(text).matches).toEqual([
      { type: 'list', id: 'l9', name: 'Acme Retainer', path: 'Peter Space / Client Work / Acme Retainer' },
    ]);
  });

  it('matches spaces and folders too, and is case-insensitive', async () => {
    const { text } = await call('clickup_get_workspace_hierarchy', {
      workspace_id: '14168111',
      name_filter: 'SPACE',
    });
    const { matches } = JSON.parse(text);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ type: 'space', id: 'sp1' });
  });

  it('accepts team_id as an alias for workspace_id', async () => {
    const { failed } = await call('clickup_get_workspace_hierarchy', { team_id: '14168111' });
    expect(failed).toBe(false);
  });
});

describe('discovery payloads are trimmed by default', () => {
  it('clickup_get_workspaces omits the member roster unless asked', async () => {
    mockGet.mockResolvedValue({ teams: [RAW_TEAM] });

    const lean = await call('clickup_get_workspaces', {});
    expect(lean.failed).toBe(false);
    expect(JSON.parse(lean.text)).toEqual([
      { id: '14168111', name: 'Chykalophia', color: '#181D21' },
    ]);

    const full = await call('clickup_get_workspaces', { include_members: true });
    expect(JSON.parse(full.text)[0].members).toHaveLength(40);
    // The trimmed form must be dramatically cheaper, not marginally.
    expect(full.text.length).toBeGreaterThan(lean.text.length * 10);
  });

  it('clickup_get_spaces omits statuses/features unless asked', async () => {
    mockGet.mockResolvedValue({ spaces: [RAW_SPACE('sp1', 'Peter Space')] });

    const lean = await call('clickup_get_spaces', { workspace_id: '14168111' });
    expect(JSON.parse(lean.text)).toEqual([
      { id: 'sp1', name: 'Peter Space', color: '#000', private: false, archived: false },
    ]);

    const full = await call('clickup_get_spaces', {
      workspace_id: '14168111',
      include_settings: true,
    });
    expect(JSON.parse(full.text)[0].statuses).toHaveLength(8);
    expect(JSON.parse(full.text)[0].features).toBeDefined();
  });

  it('emits compact JSON, not pretty-printed', async () => {
    mockGet.mockResolvedValue({ teams: [RAW_TEAM] });
    const { text } = await call('clickup_get_workspaces', {});
    // Pretty-printing added ~40-65% to every response in the server for no
    // benefit to the caller.
    expect(text).not.toContain('\n  ');
  });
});

describe('clickup_delete_folder', () => {
  it('refuses without confirm_deletion and does not call the API', async () => {
    const { failed, text } = await call('clickup_delete_folder', {
      folder_id: 'f1',
      confirm_deletion: false,
    });

    expect(failed).toBe(true);
    expect(text).toContain('confirm_deletion');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('requires confirm_deletion to be supplied at all', async () => {
    const { failed } = await call('clickup_delete_folder', { folder_id: 'f1' });
    expect(failed).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes and names the folder when confirmed', async () => {
    mockGet.mockResolvedValue({ id: 'f1', name: 'Client Work' });
    mockDelete.mockResolvedValue({ success: true });

    const { failed, text } = await call('clickup_delete_folder', {
      folder_id: 'f1',
      confirm_deletion: true,
    });

    expect(failed).toBe(false);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(JSON.parse(text)).toMatchObject({ deleted: true, folder_id: 'f1', name: 'Client Work' });
  });

  it('still deletes when the name lookup fails', async () => {
    mockGet.mockRejectedValue(new Error('404'));
    mockDelete.mockResolvedValue({ success: true });

    const { failed } = await call('clickup_delete_folder', {
      folder_id: 'f1',
      confirm_deletion: true,
    });

    expect(failed).toBe(false);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
