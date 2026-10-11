/**
 * Regression tests for the second defect in
 * HANDOFF-comment-api-and-silent-param-drop.md: clickup_create_task_comment
 * accepted only a structured block array, so posting an ordinary markdown
 * comment was impossible without hand-building blocks first. Its sibling
 * clickup_create_chat_view_comment already accepted plain text; this pins the
 * two to the same shape.
 *
 * Only the HTTP layer is faked, so the real CommentsEnhancedClient and the real
 * markdown -> block conversion run and the assertions are about the exact body
 * that would go to ClickUp.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({
    post: mockPost,
    get: mockGet,
    put: mockPut,
    delete: mockDelete,
  }),
}));

import { enforceStrictParams } from '../utils/tool-registration.js';
import { setupCommentTools } from '../tools/comment-tools';

interface CommentBlock {
  text?: string;
  type?: string;
  user?: { id: number };
  attributes?: Record<string, unknown>;
}

interface CommentPayload {
  comment?: CommentBlock[];
  comment_text?: string;
  notify_all?: boolean;
  assignee?: number;
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<{ failed: boolean; text: string }> {
  try {
    const result = (await client.callTool({ name, arguments: args })) as {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
    return {
      failed: result.isError === true,
      text: (result.content ?? []).map(entry => entry.text ?? '').join('\n'),
    };
  } catch (error: unknown) {
    return { failed: true, text: error instanceof Error ? error.message : String(error) };
  }
}

function lastPostBody(): CommentPayload {
  const call = mockPost.mock.calls[mockPost.mock.calls.length - 1] as [string, CommentPayload];
  return call[1];
}

describe('clickup_create_task_comment', () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    mockPost.mockResolvedValue({ id: 'comment-1', hist_id: 'hist-1', date: 1 });

    server = enforceStrictParams(new McpServer({ name: 'test-server', version: '1.0.0' }));
    setupCommentTools(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it('accepts plain text via comment_text', async () => {
    const outcome = await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_text: 'Closing this out — the code work is done.',
    });

    expect(outcome.failed).toBe(false);
    expect(mockPost).toHaveBeenCalledTimes(1);

    const [endpoint, body] = mockPost.mock.calls[0] as [string, CommentPayload];
    expect(endpoint).toContain('/task/868kzbrwy/comment');
    expect(Array.isArray(body.comment)).toBe(true);
    expect(body.comment?.map(block => block.text).join('')).toContain('Closing this out');
    // ClickUp duplicates the body when both are sent, so only the array goes out.
    expect(body.comment_text).toBeUndefined();
  });

  it('converts markdown in comment_text into styled blocks rather than literal syntax', async () => {
    await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_text: 'The **mismatch** is fixed.',
    });

    const blocks = lastPostBody().comment ?? [];
    const rendered = blocks.map(block => block.text ?? '').join('');
    expect(rendered).not.toContain('**');
    expect(blocks.some(block => block.text === 'mismatch' && block.attributes?.bold === true)).toBe(
      true
    );
  });

  it('still accepts structured blocks via comment', async () => {
    const outcome = await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment: [{ text: 'Plain block' }],
    });

    expect(outcome.failed).toBe(false);
    expect(lastPostBody().comment?.[0]?.text).toBe('Plain block');
  });

  it('preserves tag blocks so @mentions still notify', async () => {
    await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment: [{ type: 'tag', user: { id: 38366580 } }, { text: ' please review' }],
    });

    const blocks = lastPostBody().comment ?? [];
    expect(blocks[0]).toMatchObject({ type: 'tag', user: { id: 38366580 } });
    // Tag blocks must not pick up an attributes bag; the API spec has none.
    expect(blocks[0].attributes).toBeUndefined();
  });

  it('lets comment win when both are supplied', async () => {
    await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_text: 'ignored text',
      comment: [{ text: 'block wins' }],
    });

    const body = lastPostBody();
    expect(body.comment?.[0]?.text).toBe('block wins');
    expect(body.comment_text).toBeUndefined();
  });

  it('refuses when neither is supplied, naming both options', async () => {
    const outcome = await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
    });

    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('comment_text');
    expect(outcome.text).toContain('comment');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects an unknown parameter', async () => {
    const outcome = await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_txt: 'typo',
    });

    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('Unknown parameter(s)');
    expect(outcome.text).toContain('did you mean "comment_text"');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('passes assignee and notify_all through to the API', async () => {
    await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_text: 'Assigned comment',
      assignee: 38366580,
      notify_all: true,
    });

    const body = lastPostBody();
    expect(body.assignee).toBe(38366580);
    expect(body.notify_all).toBe(true);
  });

  it('accepts a numeric team_id as well as a string one', async () => {
    const outcome = await callTool(client, 'clickup_create_task_comment', {
      task_id: 'PROJ-123',
      comment_text: 'Custom ID comment',
      custom_task_ids: true,
      team_id: 14168111,
    });

    expect(outcome.failed).toBe(false);
    const [endpoint] = mockPost.mock.calls[0] as [string, CommentPayload];
    expect(endpoint).toContain('custom_task_ids=true');
    expect(endpoint).toContain('team_id=14168111');
  });

  it('refuses a custom task ID without a team_id', async () => {
    const outcome = await callTool(client, 'clickup_create_task_comment', {
      task_id: 'PROJ-123',
      comment_text: 'Custom ID comment',
      custom_task_ids: true,
    });

    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('team_id is required');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('turns an inline @[Name](id) mention in comment_text into a tag block', async () => {
    await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_text: 'Hey @[Jane](81344), please review',
    });

    const blocks = lastPostBody().comment ?? [];
    expect(blocks).toContainEqual({ type: 'tag', text: '@Jane', user: { id: 81344 } });
    // The mention must not survive as literal syntax anywhere in the body.
    expect(blocks.map(block => block.text ?? '').join('')).not.toContain('@[Jane]');
  });

  it('keeps markdown formatting in a comment that also mentions someone', async () => {
    await callTool(client, 'clickup_create_task_comment', {
      task_id: '868kzbrwy',
      comment_text: '## Findings\n\nThe **mismatch** is fixed — over to @[Jane](81344)',
    });

    const blocks = lastPostBody().comment ?? [];
    expect(blocks).toContainEqual({ type: 'tag', text: '@Jane', user: { id: 81344 } });
    expect(blocks.some(block => block.text === 'mismatch' && block.attributes?.bold === true)).toBe(
      true
    );
    // The heading rides on the line's terminating newline, not on its text.
    expect(blocks.some(block => block.text === 'Findings')).toBe(true);
    expect(blocks).toContainEqual({ text: '\n', attributes: { header: 2 } });
  });
});
