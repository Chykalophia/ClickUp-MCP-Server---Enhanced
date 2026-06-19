import { describe, it, expect, beforeEach } from '@jest/globals';

import { ViewsEnhancedClient } from '../clickup-client/views-enhanced.js';

class TestViewsClient extends ViewsEnhancedClient {
  postCalls: Array<{ endpoint: string; data: any }> = [];
  putCalls: Array<{ endpoint: string; data: any }> = [];

  constructor() {
    super('test-token');
  }

  async post<T = unknown>(endpoint: string, data?: any): Promise<T> {
    this.postCalls.push({ endpoint, data });
    return { view: { id: 'view-1' } } as T;
  }

  async put<T = unknown>(endpoint: string, data?: any): Promise<T> {
    this.putCalls.push({ endpoint, data });
    return { view: { id: 'view-1' } } as T;
  }
}

describe('ViewsEnhancedClient filter payloads', () => {
  let client: TestViewsClient;

  beforeEach(() => {
    client = new TestViewsClient();
  });

  it('creates views with ClickUp filter field keys and values arrays', async () => {
    await client.createView({
      parent_id: 'list-1',
      parent_type: 'list',
      name: 'Filtered tasks',
      type: 'list',
      access: 'private',
      filters: [
        { field: 'status', operator: 'equals', value: 'in progress' },
        { field: 'tag', operator: 'in', values: ['bug', 'urgent'] },
        { field: 'priority', operator: 'greater_than_or_equal', value: 0 }
      ]
    });

    expect(client.postCalls).toHaveLength(1);
    expect(client.postCalls[0].endpoint).toBe('/list/list-1/view');
    expect(client.postCalls[0].data.filters).toEqual({
      op: 'AND',
      fields: [
        { field: 'status', op: 'EQ', values: ['in progress'] },
        { field: 'tag', op: 'ANY', values: ['bug', 'urgent'] },
        { field: 'priority', op: 'GTE', values: [0] }
      ],
      search: '',
      show_closed: false
    });

    for (const field of client.postCalls[0].data.filters.fields) {
      expect(field).not.toHaveProperty('operator');
      expect(field).not.toHaveProperty('value');
    }
  });

  it('sets view filters using API operator names and normalized values', async () => {
    await client.setViewFilters({
      view_id: 'view-1',
      filters: [
        { field: 'assignee', operator: 'not_in', value: [123, 456] },
        { field: 'dateClosed', operator: 'is_not_set' }
      ]
    });

    expect(client.putCalls).toHaveLength(1);
    expect(client.putCalls[0].endpoint).toBe('/view/view-1');
    expect(client.putCalls[0].data.filters.fields).toEqual([
      { field: 'assignee', op: 'NOT ANY', values: [123, 456] },
      { field: 'dateClosed', op: 'IS NOT SET', values: [null] }
    ]);
  });
});
