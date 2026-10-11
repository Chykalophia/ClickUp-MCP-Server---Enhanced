/**
 * New API-coverage tools: each is driven over MCP with only the HTTP layer
 * faked, and the assertions pin the exact method, path and body that would go
 * to ClickUp (as documented at developer.clickup.com).
 */
jest.mock('marked', () => ({ marked: { setOptions: jest.fn(), parse: (s: string) => s } }));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
const mockAxiosPut = jest.fn();
const mockAxiosDelete = jest.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
  getAxiosInstance: () => ({
    get: mockAxiosGet,
    post: mockAxiosPost,
    put: mockAxiosPut,
    delete: mockAxiosDelete,
  }),
};

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => mockClient,
  getApiToken: () => 'pk_test',
  ClickUpClient: jest.fn().mockImplementation(() => mockClient),
}));

import { setupTaskTools } from '../tools/task-tools';
import { setupListFolderTools } from '../tools/list-folder-tools';
import { setupWorkspaceTools } from '../tools/workspace-tools';
import { setupChatTools } from '../tools/chat-tools';
import { setupTimeTrackingTools } from '../tools/time-tracking-tools';
import { setupCustomFieldTools } from '../tools/custom-field-tools';
import { connectServer, callTool, ConnectedServer } from './mcp-test-harness';

const V3 = 'https://api.clickup.com/api/v3';

let server: ConnectedServer;

beforeEach(async () => {
  for (const mock of [
    mockGet,
    mockPost,
    mockPut,
    mockDelete,
    mockAxiosGet,
    mockAxiosPost,
    mockAxiosPut,
    mockAxiosDelete,
  ]) {
    mock.mockReset();
    mock.mockResolvedValue({});
  }
  server = await connectServer(s => {
    setupTaskTools(s);
    setupListFolderTools(s);
    setupWorkspaceTools(s);
    setupChatTools(s);
    setupTimeTrackingTools(s);
    setupCustomFieldTools(s);
  });
});

afterEach(async () => {
  await server.close();
});

const call = (name: string, args: Record<string, unknown>) => callTool(server.client, name, args);

describe('tasks setup', () => {
  it('clickup_move_task PUTs the v3 home_list route with the mapping body', async () => {
    mockPut.mockResolvedValue({ data: { task_id: 'abc', new_list_id: '900' } });
    const outcome = await call('clickup_move_task', {
      workspace_id: '1',
      task_id: 'abc',
      list_id: '900',
      move_custom_fields: true,
      status_mappings: [{ source_status_id: 's1', destination_status_id: 'd1' }],
    });
    expect(outcome.failed).toBe(false);
    expect(mockPut).toHaveBeenCalledWith(`${V3}/workspaces/1/tasks/abc/home_list/900`, {
      move_custom_fields: true,
      status_mappings: [{ source_status_id: 's1', destination_status_id: 'd1' }],
    });
    expect(JSON.parse(outcome.text)).toEqual({ data: { task_id: 'abc', new_list_id: '900' } });
  });

  it('clickup_move_task rejects custom_fields_to_move without move_custom_fields', async () => {
    const outcome = await call('clickup_move_task', {
      workspace_id: '1',
      task_id: 'abc',
      list_id: '900',
      custom_fields_to_move: ['cf-1'],
    });
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('requires move_custom_fields');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('clickup_move_task rejects an unknown key inside status_mappings', async () => {
    const outcome = await call('clickup_move_task', {
      workspace_id: '1',
      task_id: 'abc',
      list_id: '900',
      status_mappings: [{ source_status_id: 's1', destination_status_id: 'd1', extra: 1 }],
    });
    expect(outcome.failed).toBe(true);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('clickup_get_task_templates sends the required page param (default 0)', async () => {
    mockGet.mockResolvedValue({ templates: [] });
    await call('clickup_get_task_templates', { team_id: '1' });
    expect(mockGet).toHaveBeenCalledWith('/team/1/taskTemplate', { page: 0 });
  });

  it('clickup_get_custom_task_types GETs /team/{id}/custom_item', async () => {
    mockGet.mockResolvedValue({ custom_items: [{ id: 1300, name: 'Bug' }] });
    const outcome = await call('clickup_get_custom_task_types', { team_id: '1' });
    expect(mockGet).toHaveBeenCalledWith('/team/1/custom_item');
    expect(JSON.parse(outcome.text).custom_items[0].name).toBe('Bug');
  });
});

describe('lists setup', () => {
  it('clickup_get_list_templates GETs /team/{id}/list_template', async () => {
    await call('clickup_get_list_templates', { team_id: '1' });
    expect(mockGet).toHaveBeenCalledWith('/team/1/list_template');
  });

  it('clickup_get_shared_hierarchy GETs /team/{id}/shared', async () => {
    mockGet.mockResolvedValue({ shared: { tasks: [], lists: [], folders: [] } });
    const outcome = await call('clickup_get_shared_hierarchy', { team_id: '1' });
    expect(mockGet).toHaveBeenCalledWith('/team/1/shared');
    expect(JSON.parse(outcome.text)).toEqual({ shared: { tasks: [], lists: [], folders: [] } });
  });
});

describe('workspace setup', () => {
  const teams = {
    teams: [
      {
        id: '1',
        members: [
          {
            user: { id: 11, username: 'Jane Doe', email: 'jane@acme.com', color: '#f00' },
            role: 3,
          },
          { user: { id: 12, username: 'Bob', email: 'bob@acme.com' } },
          { user: { id: 13, username: 'Carol', email: 'carol@other.org' } },
        ],
      },
      { id: '2', members: [{ user: { id: 21, username: 'Janet', email: 'j@two.com' } }] },
    ],
  };

  it('clickup_find_member matches username or email case-insensitively across workspaces', async () => {
    mockGet.mockResolvedValue(teams);
    const outcome = await call('clickup_find_member', { query: 'JAN' });
    expect(mockGet).toHaveBeenCalledWith('/team');
    expect(JSON.parse(outcome.text)).toEqual({
      query: 'JAN',
      count: 2,
      members: [
        { id: 11, username: 'Jane Doe', email: 'jane@acme.com', workspace_id: '1', role: 3 },
        { id: 21, username: 'Janet', email: 'j@two.com', workspace_id: '2' },
      ],
    });
  });

  it('clickup_find_member can match on email and narrow to one workspace', async () => {
    mockGet.mockResolvedValue(teams);
    const outcome = await call('clickup_find_member', { query: '@acme.com', workspace_id: '1' });
    expect(JSON.parse(outcome.text).members.map((m: { id: number }) => m.id)).toEqual([11, 12]);
  });

  it('clickup_find_member reports an unknown workspace instead of returning nothing', async () => {
    mockGet.mockResolvedValue(teams);
    const outcome = await call('clickup_find_member', { query: 'xy', workspace_id: '99' });
    expect(outcome.failed).toBe(true);
  });

  it('clickup_find_member rejects one-character queries', async () => {
    mockGet.mockResolvedValue(teams);
    const outcome = await call('clickup_find_member', { query: ' a ' });
    expect(outcome.failed).toBe(true);
  });

  it('clickup_find_member caps the number of matches returned', async () => {
    mockGet.mockResolvedValue({
      teams: [
        {
          id: '1',
          members: Array.from({ length: 60 }, (_, i) => ({
            user: { id: i, username: `user${i}`, email: `u${i}@acme.com` },
          })),
        },
      ],
    });
    const body = JSON.parse((await call('clickup_find_member', { query: 'user' })).text);
    expect(body.count).toBe(60);
    expect(body.members).toHaveLength(50);
    expect(body.truncated).toBe(true);
  });

  it('user group create / update / delete hit the documented routes', async () => {
    await call('clickup_create_user_group', { workspace_id: '1', name: 'Eng', members: [11] });
    expect(mockPost).toHaveBeenCalledWith('/team/1/group', { name: 'Eng', members: [11] });

    await call('clickup_update_user_group', { group_id: 'C9C5', add_members: [12] });
    expect(mockPut).toHaveBeenCalledWith('/group/C9C5', { members: { add: [12], rem: [] } });

    await call('clickup_delete_user_group', { group_id: 'C9C5' });
    expect(mockDelete).toHaveBeenCalledWith('/group/C9C5');
  });

  it('clickup_update_user_group refuses an empty update', async () => {
    const outcome = await call('clickup_update_user_group', { group_id: 'C9C5' });
    expect(outcome.failed).toBe(true);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('guest invite / get / edit / remove hit /team/{id}/guest', async () => {
    await call('clickup_invite_guest', {
      workspace_id: '1',
      email: 'guest@x.com',
      can_edit_tags: false,
    });
    expect(mockPost).toHaveBeenCalledWith('/team/1/guest', {
      email: 'guest@x.com',
      can_edit_tags: false,
    });

    await call('clickup_get_guest', { workspace_id: '1', guest_id: '403' });
    expect(mockGet).toHaveBeenCalledWith('/team/1/guest/403');

    await call('clickup_edit_guest', {
      workspace_id: '1',
      guest_id: '403',
      can_create_views: true,
    });
    expect(mockPut).toHaveBeenCalledWith('/team/1/guest/403', { can_create_views: true });

    await call('clickup_remove_guest', { workspace_id: '1', guest_id: '403' });
    expect(mockDelete).toHaveBeenCalledWith('/team/1/guest/403');
  });

  it('clickup_add_guest_to_item shares a task by custom ID with a permission level', async () => {
    await call('clickup_add_guest_to_item', {
      item_type: 'task',
      item_id: 'PROJ-1',
      guest_id: '403',
      permission_level: 'comment',
      custom_task_ids: true,
      team_id: '1',
    });
    expect(mockPost).toHaveBeenCalledWith('/task/PROJ-1/guest/403?custom_task_ids=true&team_id=1', {
      permission_level: 'comment',
    });
  });

  it('clickup_remove_guest_from_item un-shares a folder', async () => {
    await call('clickup_remove_guest_from_item', {
      item_type: 'folder',
      item_id: '1058',
      guest_id: '403',
      include_shared: false,
    });
    expect(mockDelete).toHaveBeenCalledWith('/folder/1058/guest/403?include_shared=false');
  });

  it('rejects custom_task_ids on a list item', async () => {
    const outcome = await call('clickup_add_guest_to_item', {
      item_type: 'list',
      item_id: '1',
      guest_id: '403',
      permission_level: 'read',
      custom_task_ids: true,
      team_id: '1',
    });
    expect(outcome.failed).toBe(true);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects an unknown permission level', async () => {
    const outcome = await call('clickup_add_guest_to_item', {
      item_type: 'task',
      item_id: 'a',
      guest_id: '403',
      permission_level: 'admin',
    });
    expect(outcome.failed).toBe(true);
  });
});

describe('chat setup', () => {
  it('clickup_delete_chat_channel DELETEs the v3 channel route', async () => {
    const outcome = await call('clickup_delete_chat_channel', {
      workspace_id: '1',
      channel_id: 'ch-1',
    });
    expect(outcome.failed).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith('/workspaces/1/chat/channels/ch-1');
  });
});

describe('time-tracking setup', () => {
  it('clickup_remove_tags_from_time_entries DELETEs with a JSON body', async () => {
    await call('clickup_remove_tags_from_time_entries', {
      team_id: '1',
      time_entry_ids: ['t1', 't2'],
      tag_names: ['billable'],
    });
    expect(mockAxiosDelete).toHaveBeenCalledWith('/team/1/time_entries/tags', {
      data: { time_entry_ids: ['t1', 't2'], tags: [{ name: 'billable' }] },
    });
  });

  it('clickup_rename_time_entry_tag PUTs name, new_name and both colors', async () => {
    await call('clickup_rename_time_entry_tag', {
      team_id: '1',
      name: 'old',
      new_name: 'new',
      tag_bg: '#000000',
      tag_fg: '#FFFFFF',
    });
    expect(mockAxiosPut).toHaveBeenCalledWith('/team/1/time_entries/tags', {
      name: 'old',
      new_name: 'new',
      tag_bg: '#000000',
      tag_fg: '#FFFFFF',
    });
  });

  it('clickup_rename_time_entry_tag requires the colors ClickUp requires', async () => {
    const outcome = await call('clickup_rename_time_entry_tag', {
      team_id: '1',
      name: 'old',
      new_name: 'new',
    });
    expect(outcome.failed).toBe(true);
  });
});

describe('custom-fields setup', () => {
  it('clickup_create_entity_attachment uploads multipart to the v3 custom_fields route', async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 'att-1', title: 'a.txt' } });
    const outcome = await call('clickup_create_entity_attachment', {
      workspace_id: '1',
      custom_field_id: 'cf-1',
      filename: 'a.txt',
      file_data: Buffer.from('hello').toString('base64'),
    });
    expect(outcome.failed).toBe(false);
    const [url, form, config] = mockAxiosPost.mock.calls[0];
    expect(url).toBe(`${V3}/workspaces/1/custom_fields/cf-1/attachments`);
    expect(form).toBeInstanceOf(FormData);
    const file = (form as FormData).get('attachment') as Blob;
    expect(await file.text()).toBe('hello');
    expect((form as FormData).get('filename')).toBe('a.txt');
    expect(config).toEqual({ headers: { 'Content-Type': false } });
    expect(JSON.parse(outcome.text)).toEqual({ id: 'att-1', title: 'a.txt' });
  });

  it('clickup_create_entity_attachment takes no local path input', async () => {
    const outcome = await call('clickup_create_entity_attachment', {
      workspace_id: '1',
      custom_field_id: 'cf-1',
      filename: 'a.txt',
      file_path: '/etc/passwd',
    });
    expect(outcome.failed).toBe(true);
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });
});
