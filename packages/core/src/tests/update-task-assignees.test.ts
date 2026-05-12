import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the markdown utilities — `marked` is ESM-only and Jest can't transform
// it under ts-jest's default ESM preset. We don't exercise markdown logic here.
jest.mock('../utils/markdown', () => ({
  prepareContentForClickUp: jest.fn((content: string) => ({ description: content })),
  processClickUpResponse: jest.fn((task: any) => task),
  markdownToHtml: jest.fn((s: string) => s),
  htmlToMarkdown: jest.fn((s: string) => s)
}));

import { TasksClient } from '../clickup-client/tasks.js';
import type { ClickUpClient } from '../clickup-client/index.js';

/**
 * Regression tests for ClickUp update-task assignees handling.
 *
 * The ClickUp v2 API uses different shapes for `assignees` on
 * POST /list/{list_id}/task (flat array of IDs) vs.
 * PUT /task/{task_id}    (`{ add: number[], rem: number[] }` delta envelope).
 *
 * Sending a flat array on update returns HTTP 200 but silently routes the
 * users into the task's watchers list instead of assignees. These tests pin
 * the PUT body shape so that regression cannot recur.
 */
describe('TasksClient.updateTask — assignees delta envelope', () => {
  let getCalls: Array<{ endpoint: string }>;
  let putCalls: Array<{ endpoint: string; data: any }>;
  let currentAssigneeIds: number[];
  let client: TasksClient;

  beforeEach(() => {
    getCalls = [];
    putCalls = [];
    currentAssigneeIds = [];

    const fakeHttp: Partial<ClickUpClient> = {
      get: jest.fn(async (endpoint: string) => {
        getCalls.push({ endpoint });
        return {
          id: 'task-1',
          name: 'Existing task',
          url: 'https://app.clickup.com/t/task-1',
          assignees: currentAssigneeIds.map(id => ({
            id,
            username: `user-${id}`,
            email: `u${id}@example.com`
          }))
        };
      }) as any,
      put: jest.fn(async (endpoint: string, data: any) => {
        putCalls.push({ endpoint, data });
        return {
          id: 'task-1',
          name: data?.name ?? 'Existing task',
          url: 'https://app.clickup.com/t/task-1'
        };
      }) as any
    };

    client = new TasksClient(fakeHttp as ClickUpClient);
  });

  it('assigns a user to a task with no current assignees (add-only delta)', async () => {
    currentAssigneeIds = [];

    await client.updateTask('task-1', { assignees: [78711738] });

    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].endpoint).toBe('/task/task-1');
    expect(putCalls[0].data.assignees).toEqual({ add: [78711738], rem: [] });
  });

  it('adds a user while preserving existing assignees', async () => {
    currentAssigneeIds = [100];

    await client.updateTask('task-1', { assignees: [100, 200] });

    expect(putCalls[0].data.assignees).toEqual({ add: [200], rem: [] });
  });

  it('replaces assignees (both add and rem)', async () => {
    currentAssigneeIds = [100];

    await client.updateTask('task-1', { assignees: [200] });

    expect(putCalls[0].data.assignees).toEqual({ add: [200], rem: [100] });
  });

  it('unassigns everyone when an empty array is passed', async () => {
    currentAssigneeIds = [100];

    await client.updateTask('task-1', { assignees: [] });

    expect(putCalls[0].data.assignees).toEqual({ add: [], rem: [100] });
  });

  it('is idempotent: no-op delta is not sent in the PUT body', async () => {
    currentAssigneeIds = [100];

    await client.updateTask('task-1', { assignees: [100] });

    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].data).not.toHaveProperty('assignees');
  });

  it('omits the read-before-write when `assignees` is not in the params', async () => {
    currentAssigneeIds = [100];

    await client.updateTask('task-1', { name: 'Renamed' });

    expect(getCalls).toHaveLength(0);
    expect(putCalls[0].data).not.toHaveProperty('assignees');
    expect(putCalls[0].data.name).toBe('Renamed');
  });

  it('never sends a flat array (would route IDs to watchers)', async () => {
    currentAssigneeIds = [];

    await client.updateTask('task-1', { assignees: [1, 2, 3] });

    const sent = putCalls[0].data.assignees;
    expect(Array.isArray(sent)).toBe(false);
    expect(sent).toMatchObject({ add: expect.any(Array), rem: expect.any(Array) });
  });
});
