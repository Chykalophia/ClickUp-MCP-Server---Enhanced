import { describe, it, expect } from '@jest/globals';
import {
  TaskTimeInStatusResponseSchema,
  BulkTasksTimeInStatusResponseSchema
} from '../schemas/response-schemas.js';

/**
 * Regression tests for the v5.0.2 fix that added the two time-in-status endpoints
 * and made `status_history[i].orderindex` optional. Prior wrappers required this
 * field, which caused 100% rejection on real ClickUp responses where `orderindex`
 * is legitimately omitted on some history rows.
 */

describe('TaskTimeInStatusResponseSchema', () => {
  it('accepts a fully-populated response', () => {
    const response = {
      current_status: {
        status: 'in progress',
        color: '#4194f6',
        total_time: { by_minute: 1234, since: '1700000000000' }
      },
      status_history: [
        {
          status: 'open',
          color: '#d3d3d3',
          type: 'open',
          total_time: { by_minute: 500, since: '1699000000000' },
          orderindex: 0
        },
        {
          status: 'in progress',
          color: '#4194f6',
          type: 'custom',
          total_time: { by_minute: 734, since: '1699500000000' },
          orderindex: 1
        }
      ]
    };

    expect(() => TaskTimeInStatusResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts a status_history entry with no orderindex', () => {
    const response = {
      current_status: { status: 'in review' },
      status_history: [
        { status: 'open', total_time: { by_minute: 100 } },
        { status: 'in progress', total_time: { by_minute: 200 } },
        { status: 'in review', total_time: { by_minute: 300 } }
      ]
    };

    expect(() => TaskTimeInStatusResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts orderindex as a string (ClickUp emits both number and string forms)', () => {
    const response = {
      status_history: [
        { status: 'open', orderindex: '0' },
        { status: 'closed', orderindex: 1 }
      ]
    };

    expect(() => TaskTimeInStatusResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts a missing current_status or status_history', () => {
    expect(() => TaskTimeInStatusResponseSchema.parse({})).not.toThrow();
    expect(() =>
      TaskTimeInStatusResponseSchema.parse({ status_history: [] })
    ).not.toThrow();
  });

  it('preserves unknown forward-compat fields via passthrough', () => {
    const parsed = TaskTimeInStatusResponseSchema.parse({
      status_history: [{ status: 'open', new_field: 'value' }],
      extra_top_level: 'also kept'
    });

    expect((parsed as any).extra_top_level).toBe('also kept');
    expect((parsed.status_history as any[])[0].new_field).toBe('value');
  });
});

describe('BulkTasksTimeInStatusResponseSchema', () => {
  it('accepts the documented map shape', () => {
    const response = {
      '868j7a1xu': {
        current_status: { status: 'in progress' },
        status_history: [
          { status: 'open', orderindex: 0 },
          { status: 'in progress', orderindex: 1 }
        ]
      },
      '868jfqmqf': {
        current_status: { status: 'closed' },
        status_history: [{ status: 'open' }, { status: 'closed' }]
      }
    };

    expect(() => BulkTasksTimeInStatusResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts entries with missing orderindex on individual rows (the bug-fix case)', () => {
    const response = {
      '868gw5ad1': {
        status_history: [
          { status: 'open' },
          { status: 'in progress' },
          // Notably: no orderindex on this row. The pre-fix wrapper rejected here.
          { status: 'in review' }
        ]
      },
      '868gw8b31': {
        status_history: [{ status: 'open' }, { status: 'closed' }]
      }
    };

    expect(() => BulkTasksTimeInStatusResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts an empty map (no tasks resolved)', () => {
    expect(() => BulkTasksTimeInStatusResponseSchema.parse({})).not.toThrow();
  });
});
