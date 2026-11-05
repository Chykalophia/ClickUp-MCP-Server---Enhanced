# Processing Rule Manager

**Tool Name**: `clickup_add_processing_rule`

## Overview

Add a rule to the real-time engine that fires when an event of a given type matches a condition. Rules are declarative: the server never evaluates code supplied in the arguments. (Before intelligence 6.0.0, `condition` and `action` were JavaScript strings; that form is now rejected.)

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | string | yes | | Unique identifier for the rule |
| `eventType` | enum | yes | | `task_update`, `task_created`, `task_deleted`, `comment_added`, `status_changed` |
| `condition` | object | no | fire on every event | When the rule fires (see below) |
| `action` | object | no | `{ "type": "log" }` | What happens when it fires (see below) |
| `priority` | number | no | `1` | Higher numbers run first |

Unknown parameters, including misspelled keys inside `condition` or `action`, are rejected.

### `condition`

| Key | Type | Description |
|-----|------|-------------|
| `field` | string | Dot path into the event's data, e.g. `priority.priority` or `status.status` |
| `operator` | enum | `equals`, `not_equals`, `contains`, `exists` |
| `value` | string, number or boolean | Required for every operator except `exists` |

- `equals` / `not_equals` compare with strict equality.
- `contains` matches a substring of a string field or an element of an array field.
- `exists` is true when the field is present and not null.
- Only the data's own properties are followed; inherited ones such as `constructor` are ignored unless the payload itself defines that key.

### `action`

| Key | Type | Description |
|-----|------|-------------|
| `type` | `"log"` | Writes one line to the server log (stderr) |
| `message` | string, max 500 | Optional text appended to the log line; control characters are replaced with spaces |

## Example

```typescript
await callTool({
  name: 'clickup_add_processing_rule',
  arguments: {
    id: 'urgent-update',
    eventType: 'task_update',
    condition: { field: 'priority.priority', operator: 'equals', value: 'urgent' },
    action: { type: 'log', message: 'Urgent task changed' },
    priority: 5,
  },
});
```

When an urgent task changes, the server logs:

```
[Real-Time Engine] Rule urgent-update fired for task abc123: Urgent task changed
```

## Response

The JSON below is the string in `content[0].text` of the MCP tool result. Errors come back with `isError: true` and a plain-text message.

```json
{
  "status": "rule_added",
  "ruleId": "urgent-update",
  "eventType": "task_update",
  "priority": 5,
  "timestamp": "2026-11-05T16:00:00.000Z"
}
```

## Event data

Each event carries `type`, `taskId`, `timestamp`, `source` and `data`. `condition.field` is resolved against `data`, which holds the ClickUp task or webhook payload for the event (for example `status.status`, `priority.priority`, `assignees`, `tags`).

## Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invalid arguments for clickup_add_processing_rule` | Wrong shape, unknown key, or missing `value` | Fix the arguments as described above |
| `Real-time processing engine is not running` | Engine not started | Start it with `clickup_start_realtime_engine` |

## Related Tools

- [`clickup_start_realtime_engine`](./realtime-engine-start.md) - Start the engine before adding rules
- [`clickup_get_realtime_metrics`](./realtime-metrics.md) - Monitor processing
- [`clickup_process_webhook`](./webhook-processor.md) - Feed webhook events to the engine
