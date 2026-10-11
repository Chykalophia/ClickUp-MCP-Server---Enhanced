/**
 * Task description rich text: reads default to markdown and surface it as the
 * description; writes always use the markdown field (HTML converted first);
 * list descriptions go out as markdown_content; the bulk parallel path reports
 * the index of the task that actually failed.
 */

// `marked` is ESM-only and not on any path asserted here; turndown (CJS) runs for real.
jest.mock('marked', () => ({ marked: { setOptions: jest.fn(), parse: (s: string) => s } }));

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({
    post: mockPost,
    get: mockGet,
    put: mockPut,
    delete: jest.fn(),
    getAxiosInstance: () => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    }),
  }),
}));

import { prepareContentForClickUp, processClickUpResponse, looksLikeHtml } from '../utils/markdown';
import { TasksClient } from '../clickup-client/tasks';
import { ListsClient, toListMarkdownBody } from '../clickup-client/lists';
import { setupTaskTools } from '../tools/task-tools';
import { setupListFolderTools } from '../tools/list-folder-tools';
import { connectServer, callTool, ConnectedServer } from './mcp-test-harness';

const httpStub = () => ({ post: mockPost, get: mockGet, put: mockPut, delete: jest.fn() }) as never;

beforeEach(() => {
  mockPost.mockReset();
  mockGet.mockReset();
  mockPut.mockReset();
});

describe('prepareContentForClickUp', () => {
  it('always sends markdown_description, even for content the old heuristic missed', () => {
    for (const content of [
      'plain words',
      '| a | b |\n|---|---|\n| 1 | 2 |',
      'see https://example.com',
      'above\n\n---\n\nbelow',
    ]) {
      expect(prepareContentForClickUp(content)).toEqual({ markdown_description: content });
    }
  });

  it('converts HTML to markdown before sending', () => {
    const result = prepareContentForClickUp('<h2>Plan</h2><p>Do <strong>this</strong></p>');
    expect(result.markdown_description).toBe('## Plan\n\nDo **this**');
  });

  it('ignores HTML that only appears in fenced or inline code', () => {
    const fenced = 'Example:\n\n```html\n<div class="x">hi</div>\n```\n\nDone.';
    expect(looksLikeHtml(fenced)).toBe(false);
    expect(prepareContentForClickUp(fenced)).toEqual({ markdown_description: fenced });
    expect(looksLikeHtml('~~~\n<p>x</p>\n~~~')).toBe(false);
    expect(looksLikeHtml('Wrap it in `<span>` or ``<br/>``')).toBe(false);
    expect(looksLikeHtml('Unclosed fence\n```\n<div>')).toBe(false);
    // Real markup outside the code still counts.
    expect(looksLikeHtml('`code` and <p>para</p>')).toBe(true);
    expect(looksLikeHtml('`` ` `` then `unclosed <p>para</p>')).toBe(true);
  });

  it('strips inline code in linear time on long backtick runs', () => {
    const start = Date.now();
    expect(looksLikeHtml('`'.repeat(20_000))).toBe(false);
    expect(looksLikeHtml(`${'`a'.repeat(20_000)}<p>x</p>`)).toBe(true);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('recognises common tags beyond the basic set', () => {
    for (const html of ['<section>x</section>', '<details><summary>s</summary></details>', 'H<sub>2</sub>O']) {
      expect(looksLikeHtml(html)).toBe(true);
    }
  });

  it('does not treat angle brackets in prose as HTML', () => {
    expect(looksLikeHtml('Fix Vec<T> bug')).toBe(false);
    expect(prepareContentForClickUp('Fix Vec<T> bug')).toEqual({
      markdown_description: 'Fix Vec<T> bug',
    });
  });
});

describe('processClickUpResponse', () => {
  it('makes markdown_description the description and drops the plain duplicates', () => {
    const processed = processClickUpResponse({
      id: '1',
      description: 'Plan Do this',
      text_content: 'Plan Do this',
      markdown_description: '## Plan\n\nDo **this**',
    });
    expect(processed).toEqual({ id: '1', description: '## Plan\n\nDo **this**' });
  });

  it('leaves a response without markdown_description alone', () => {
    expect(processClickUpResponse({ id: '1', description: 'x', text_content: 'x' })).toEqual({
      id: '1',
      description: 'x',
      text_content: 'x',
    });
  });

  it('applies to subtasks too', () => {
    const processed = processClickUpResponse({
      id: '1',
      subtasks: [{ id: '2', description: 'p', markdown_description: '**p**' }],
    });
    expect(processed.subtasks[0].description).toBe('**p**');
  });
});

describe('TasksClient description writes', () => {
  it('createTask sends plain text as markdown_description, not description', async () => {
    mockPost.mockResolvedValue({ id: 't' });
    await new TasksClient(httpStub()).createTask('L', { name: 'n', description: 'just text' });
    const body = mockPost.mock.calls[0][1];
    expect(body.markdown_description).toBe('just text');
    expect(body).not.toHaveProperty('description');
  });

  it('updateTask converts HTML descriptions to markdown', async () => {
    mockPut.mockResolvedValue({ id: 't' });
    await new TasksClient(httpStub()).updateTask('T', { description: '<p><em>hi</em></p>' });
    const body = mockPut.mock.calls[0][1];
    expect(body.markdown_description).toBe('*hi*');
    expect(body).not.toHaveProperty('description');
  });

  it('markdown_content wins over description and is sent as markdown_description', async () => {
    mockPost.mockResolvedValue({ id: 't' });
    await new TasksClient(httpStub()).createTask('L', {
      name: 'n',
      description: 'ignored',
      markdown_content: '# kept',
    });
    const body = mockPost.mock.calls[0][1];
    expect(body.markdown_description).toBe('# kept');
    expect(body).not.toHaveProperty('description');
    expect(body).not.toHaveProperty('markdown_content');
  });

  it('passes an empty description through so it can clear the field', async () => {
    mockPut.mockResolvedValue({ id: 't' });
    await new TasksClient(httpStub()).updateTask('T', { description: '' });
    expect(mockPut.mock.calls[0][1]).toEqual({ description: '' });
  });
});

describe('bulk parallel failure index', () => {
  it('reports the index of the task that failed, not results.length + chunk start', async () => {
    mockPost.mockImplementation((_url: string, body: { name: string }) =>
      body.name === 'bad' ? Promise.reject(new Error('boom')) : Promise.resolve({ id: body.name })
    );
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'bad', 'h'];
    const result = await new TasksClient(httpStub()).bulkCreateTasks(
      'L',
      names.map(name => ({ name })),
      true
    );
    const failed = result.results.filter(entry => !entry.success);
    expect(failed).toEqual([{ success: false, error: 'boom', index: 6 }]);
    expect(result.results.map(entry => entry.index).sort((x, y) => x - y)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('bulkUpdateTasks reports the failing index too', async () => {
    mockPut.mockImplementation((url: string) =>
      url.startsWith('/task/t2') ? Promise.reject(new Error('nope')) : Promise.resolve({ id: url })
    );
    const result = await new TasksClient(httpStub()).bulkUpdateTasks(
      ['t0', 't1', 't2'].map(task_id => ({ task_id, name: 'x' })),
      true
    );
    expect(result.results.find(entry => !entry.success)?.index).toBe(2);
  });
});

describe('list descriptions', () => {
  it('routes content to markdown_content', () => {
    expect(toListMarkdownBody({ name: 'L', content: '**bold**' })).toEqual({
      name: 'L',
      markdown_content: '**bold**',
    });
  });

  it('keeps an empty content so it can clear the description', () => {
    expect(toListMarkdownBody({ content: '' })).toEqual({ content: '' });
  });

  it('create folderless list, create list in folder and update list all send markdown_content', async () => {
    mockPost.mockResolvedValue({ id: 'l' });
    mockPut.mockResolvedValue({ id: 'l' });
    const lists = new ListsClient(httpStub());
    await lists.createFolderlessList('S', { name: 'a', content: '# x' });
    await lists.createListInFolder('F', { name: 'b', content: '# y' });
    await lists.updateList('L', { content: '# z' });
    expect(mockPost.mock.calls.map(call => call[1].markdown_content)).toEqual(['# x', '# y']);
    expect(mockPut.mock.calls[0][1]).toEqual({ markdown_content: '# z' });
  });
});

describe('task tools over MCP', () => {
  let server: ConnectedServer;

  beforeEach(async () => {
    server = await connectServer(s => {
      setupTaskTools(s);
      setupListFolderTools(s);
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('clickup_get_task_details requests and returns the markdown description by default', async () => {
    mockGet.mockResolvedValue({
      id: 'T',
      description: 'flat',
      text_content: 'flat',
      markdown_description: '# Rich',
    });
    const outcome = await callTool(server.client, 'clickup_get_task_details', { task_id: 'T' });
    expect(mockGet.mock.calls[0][1]).toMatchObject({ include_markdown_description: true });
    expect(JSON.parse(outcome.text)).toEqual({ id: 'T', description: '# Rich' });
  });

  it('clickup_get_tasks defaults include_markdown_description to true', async () => {
    mockGet.mockResolvedValue({ tasks: [] });
    await callTool(server.client, 'clickup_get_tasks', { list_id: 'L' });
    expect(mockGet.mock.calls[0][1]).toMatchObject({ include_markdown_description: true });
  });

  it('clickup_get_filtered_team_tasks defaults include_markdown_description to true', async () => {
    mockGet.mockResolvedValue({ tasks: [] });
    await callTool(server.client, 'clickup_get_filtered_team_tasks', { team_id: '1' });
    expect(mockGet.mock.calls[0][1]).toMatchObject({ include_markdown_description: true });
  });

  it('rejects a priority outside 1-4', async () => {
    const outcome = await callTool(server.client, 'clickup_create_task', {
      list_id: 'L',
      name: 'n',
      priority: 5,
    });
    expect(outcome.failed).toBe(true);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('clickup_update_list sends markdown_content', async () => {
    mockPut.mockResolvedValue({ id: 'L' });
    await callTool(server.client, 'clickup_update_list', { list_id: 'L', content: '## Goals' });
    expect(mockPut.mock.calls[0][1]).toMatchObject({ markdown_content: '## Goals' });
    expect(mockPut.mock.calls[0][1]).not.toHaveProperty('content');
  });
});
