/**
 * Comment read tools used to return every comment body four times: ClickUp's
 * raw block array, its flattened comment_text, the client's comment_markdown,
 * and an ANSI-coloured styled_preview. These pin the slim default (one
 * markdown body) and the include_raw escape hatch.
 */
const mockGet = jest.fn();

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({
    get: mockGet,
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

import { setupCommentTools, slimCommentsResponse } from '../tools/comment-tools';
import { connectServer, callTool, ConnectedServer } from './mcp-test-harness';

const rawComment = {
  id: '90',
  comment: [
    { text: 'Ship it', attributes: { bold: true } },
    { text: ' see ' },
    { text: 'docs', attributes: { link: 'https://d.example' } },
    { text: '\n', attributes: {} },
  ],
  comment_text: 'Ship it see docs',
  user: {
    id: 7,
    username: 'Jane',
    email: 'jane@example.com',
    color: '#fff',
    profilePicture: 'https://img.example/x.png',
    initials: 'J',
  },
  resolved: false,
  reply_count: 2,
  reactions: [],
  date: '1700000000000',
};

describe('comment read tools', () => {
  let server: ConnectedServer;

  beforeEach(async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ comments: [rawComment] });
    server = await connectServer(setupCommentTools);
  });

  afterEach(async () => {
    await server.close();
  });

  it.each([
    ['clickup_get_task_comments', { task_id: 'abc' }],
    ['clickup_get_list_comments', { list_id: '1' }],
    ['clickup_get_chat_view_comments', { view_id: 'v' }],
    ['clickup_get_threaded_comments', { comment_id: '90' }],
  ])('%s returns one markdown body and no ANSI preview by default', async (name, args) => {
    const outcome = await callTool(server.client, name, args);
    expect(outcome.failed).toBe(false);
    expect(outcome.text).not.toContain('\u001b');
    expect(outcome.text).not.toContain('styled_preview');

    const parsed = JSON.parse(outcome.text);
    expect(parsed.comments).toEqual([
      {
        id: '90',
        user: { id: 7, username: 'Jane', email: 'jane@example.com' },
        date: '1700000000000',
        comment_markdown: '**Ship it** see [docs](https://d.example)',
        resolved: false,
        reply_count: 2,
      },
    ]);
  });

  it('adds the raw blocks and comment_text only with include_raw', async () => {
    const outcome = await callTool(server.client, 'clickup_get_task_comments', {
      task_id: 'abc',
      include_raw: true,
    });
    const [comment] = JSON.parse(outcome.text).comments;
    expect(comment.comment).toEqual(rawComment.comment);
    expect(comment.comment_text).toBe('Ship it see docs');
    expect(comment.comment_markdown).toBe('**Ship it** see [docs](https://d.example)');
  });

  it('does not forward include_raw to the ClickUp API', async () => {
    await callTool(server.client, 'clickup_get_task_comments', {
      task_id: 'abc',
      include_raw: true,
    });
    const [, params] = mockGet.mock.calls[0];
    expect(params).not.toHaveProperty('include_raw');
  });
});

describe('slimCommentsResponse', () => {
  it('falls back to comment_text when no markdown is available', () => {
    expect(
      slimCommentsResponse({ comments: [{ id: '1', comment_text: 'plain', date: '1' }] })
        .comments[0].comment_markdown
    ).toBe('plain');
  });

  it('tolerates a missing comments array', () => {
    expect(slimCommentsResponse(undefined)).toEqual({ comments: [] });
  });
});
