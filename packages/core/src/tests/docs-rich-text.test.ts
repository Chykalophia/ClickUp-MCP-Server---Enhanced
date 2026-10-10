/**
 * Docs: only text/md and text/plain exist as page content formats; doc content
 * includes nested sub-pages; name search follows next_cursor; single-page read.
 */
const mockAxiosGet = jest.fn();

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    getAxiosInstance: () => ({
      get: mockAxiosGet,
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    }),
  }),
}));

import { flattenDocPages, normalizeContentFormat } from '../clickup-client/docs-enhanced';
import { setupEnhancedDocTools } from '../tools/doc-tools-enhanced';
import { connectServer, callTool, ConnectedServer } from './mcp-test-harness';

const V3 = 'https://api.clickup.com/api/v3/workspaces/1';

describe('normalizeContentFormat', () => {
  it('only ever produces text/md or text/plain', () => {
    expect(normalizeContentFormat('text/plain')).toBe('text/plain');
    expect(normalizeContentFormat('text/md')).toBe('text/md');
    expect(normalizeContentFormat('markdown')).toBe('text/md');
    expect(normalizeContentFormat('text/html')).toBe('text/md');
    expect(normalizeContentFormat(undefined)).toBe('text/md');
  });
});

describe('flattenDocPages', () => {
  it('includes nested sub-pages with depth-based headings', () => {
    const markdown = flattenDocPages([
      {
        name: 'Top',
        content: 'top body',
        pages: [
          {
            name: 'Child',
            content: 'child body',
            pages: [{ name: 'Grandchild', content: 'deep body' }],
          },
        ],
      },
      { name: 'Second', content: 'second body' },
    ] as never);
    expect(markdown).toBe(
      '# Top\n\ntop body\n\n## Child\n\nchild body\n\n### Grandchild\n\ndeep body\n\n# Second\n\nsecond body\n\n'
    );
  });

  it('keeps the heading of an empty parent page that has children', () => {
    expect(
      flattenDocPages([
        { name: 'Folder', content: '', pages: [{ name: 'Leaf', content: 'x' }] },
      ] as never)
    ).toBe('# Folder\n\n## Leaf\n\nx\n\n');
  });
});

describe('doc tools over MCP', () => {
  let server: ConnectedServer;

  beforeEach(async () => {
    mockAxiosGet.mockReset();
    server = await connectServer(setupEnhancedDocTools);
  });

  afterEach(async () => {
    await server.close();
  });

  it('rejects content_format text/html', async () => {
    const outcome = await callTool(server.client, 'clickup_get_doc_pages', {
      workspace_id: '1',
      doc_id: 'd',
      content_format: 'text/html',
    });
    expect(outcome.failed).toBe(true);
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('clickup_get_doc_content returns sub-page content too', async () => {
    mockAxiosGet.mockResolvedValue({
      data: [{ name: 'Top', content: 'a', pages: [{ name: 'Sub', content: 'b' }] }],
    });
    const outcome = await callTool(server.client, 'clickup_get_doc_content', {
      workspace_id: '1',
      doc_id: 'd',
    });
    expect(outcome.text).toContain('## Sub\n\nb');
  });

  it('clickup_get_doc_page reads one page in markdown by default', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 'p', name: 'Page', content: '# hi' } });
    const outcome = await callTool(server.client, 'clickup_get_doc_page', {
      workspace_id: '1',
      doc_id: 'd',
      page_id: 'p',
    });
    expect(outcome.failed).toBe(false);
    expect(mockAxiosGet).toHaveBeenCalledWith(`${V3}/docs/d/pages/p`, {
      params: { content_format: 'text/md' },
    });
    expect(JSON.parse(outcome.text)).toEqual({ id: 'p', name: 'Page', content: '# hi' });
  });

  it('clickup_search_docs follows next_cursor until it finds matches', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({ data: { docs: [{ id: '1', name: 'Other' }], next_cursor: 'c1' } })
      .mockResolvedValueOnce({
        data: { docs: [{ id: '2', name: 'Roadmap Q3' }], next_cursor: 'c2' },
      })
      .mockResolvedValueOnce({ data: { docs: [{ id: '3', name: 'roadmap q4' }] } });

    const outcome = await callTool(server.client, 'clickup_search_docs', {
      workspace_id: '1',
      query: 'ROADMAP',
    });
    const result = JSON.parse(outcome.text);
    expect(result.docs.map((doc: { id: string }) => doc.id)).toEqual(['2', '3']);
    expect(result.pages_scanned).toBe(3);
    expect(result).not.toHaveProperty('next_cursor');
    expect(mockAxiosGet.mock.calls.map(call => call[1].params.cursor)).toEqual([
      undefined,
      'c1',
      'c2',
    ]);
  });

  it('clickup_search_docs stops at max_pages and returns the resume cursor', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { docs: [{ id: 'x', name: 'nope' }], next_cursor: 'more' },
    });
    const outcome = await callTool(server.client, 'clickup_search_docs', {
      workspace_id: '1',
      query: 'roadmap',
      max_pages: 2,
    });
    const result = JSON.parse(outcome.text);
    expect(result).toEqual({ docs: [], next_cursor: 'more', pages_scanned: 2 });
  });

  it('clickup_search_docs without query passes one page and its next_cursor through', async () => {
    mockAxiosGet.mockResolvedValue({ data: { docs: [{ id: '1', name: 'A' }], next_cursor: 'n' } });
    const outcome = await callTool(server.client, 'clickup_search_docs', {
      workspace_id: '1',
      cursor: 'start',
    });
    expect(JSON.parse(outcome.text)).toEqual({ docs: [{ id: '1', name: 'A' }], next_cursor: 'n' });
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(mockAxiosGet.mock.calls[0][1].params.cursor).toBe('start');
  });
});
