# Processing Rule Manager

**Tool Name**: `clickup_add_processing_rule`

## Overview

Add custom event processing rules to the real-time engine. Define JavaScript-based conditions and actions for automated webhook event processing with priority handling.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier for the processing rule |
| `eventType` | enum | Event type to process: `task_update`, `task_created`, `task_deleted`, `comment_added`, `status_changed` |
| `condition` | string | JavaScript condition function as string |
| `action` | string | JavaScript action function as string |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `priority` | number | `1` | Rule priority (higher numbers = higher priority) |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Rule creation confirmation
    }
  ]
}
```

## Example Usage

### Basic Rule Creation

```typescript
const result = await callTool({
  name: 'clickup_add_processing_rule',
  arguments: {
    id: 'high-priority-task-alert',
    eventType: 'task_created',
    condition: 'event.priority === "urgent"',
    action: 'console.log("Urgent task created:", event.task_name)'
  }
});
```

### Advanced Rule with Priority

```typescript
const result = await callTool({
  name: 'clickup_add_processing_rule',
  arguments: {
    id: 'status-change-notification',
    eventType: 'status_changed',
    condition: 'event.new_status === "completed" && event.assignee_count > 1',
    action: `
      const notification = {
        type: 'task_completed',
        task_id: event.task_id,
        assignees: event.assignees,
        completion_time: new Date().toISOString()
      };
      this.broadcast('notifications', notification);
    `,
    priority: 5
  }
});
```

## Sample Response

```markdown
# ✅ PROCESSING RULE ADDED

## Rule Details
- **Rule ID**: status-change-notification
- **Event Type**: status_changed
- **Priority**: 5 (High)
- **Status**: ✅ Active

## Condition
```javascript
event.new_status === "completed" && event.assignee_count > 1
```

## Action
```javascript
const notification = {
  type: 'task_completed',
  task_id: event.task_id,
  assignees: event.assignees,
  completion_time: new Date().toISOString()
};
this.broadcast('notifications', notification);
```

## Rule Configuration
- **Execution Context**: Real-time processing engine
- **Available Variables**: `event`, `this` (engine context)
- **Available Methods**: `this.broadcast()`, `this.cache()`, `this.log()`

## Next Steps
1. Rule will be applied to incoming webhook events
2. Monitor rule execution with `clickup_get_realtime_metrics`
3. Update or remove rule as needed
```

## Event Types

### task_update
- **Triggers**: Any task property change
- **Event Data**: `task_id`, `changes`, `assignees`, `status`, `priority`
- **Use Cases**: Property change notifications, audit logging

### task_created
- **Triggers**: New task creation
- **Event Data**: `task_id`, `task_name`, `assignees`, `priority`, `list_id`
- **Use Cases**: Welcome notifications, auto-assignment rules

### task_deleted
- **Triggers**: Task deletion
- **Event Data**: `task_id`, `task_name`, `deleted_by`, `deletion_time`
- **Use Cases**: Cleanup actions, deletion logging

### comment_added
- **Triggers**: New comment on task
- **Event Data**: `task_id`, `comment_id`, `author`, `comment_text`
- **Use Cases**: Mention notifications, comment analysis

### status_changed
- **Triggers**: Task status modification
- **Event Data**: `task_id`, `old_status`, `new_status`, `changed_by`
- **Use Cases**: Workflow automation, progress tracking

## Condition Functions

### Available Event Properties
```javascript
// Common properties available in all events
event.workspace_id    // ClickUp workspace ID
event.user_id        // User who triggered the event
event.timestamp      // Event timestamp
event.event_type     // Type of event

// Task-specific properties
event.task_id        // Task identifier
event.task_name      // Task title
event.assignees      // Array of assignee IDs
event.priority       // Task priority
event.status         // Current task status
event.list_id        // Parent list ID
```

### Condition Examples
```javascript
// High priority tasks only
'event.priority === "urgent" || event.priority === "high"'

// Specific assignee
'event.assignees.includes("user_12345")'

// Multiple conditions
'event.status === "completed" && event.assignees.length > 2'

// Time-based conditions
'new Date(event.timestamp).getHours() >= 9 && new Date(event.timestamp).getHours() <= 17'
```

## Action Functions

### Available Context Methods
```javascript
// Broadcast to WebSocket clients
this.broadcast(channel, data)

// Cache data for later use
this.cache(key, value, ttl)

// Log information
this.log(level, message, data)

// Get cached data
this.getCached(key)
```

### Action Examples
```javascript
// Simple notification
'this.broadcast("alerts", {type: "urgent_task", task_id: event.task_id})'

// Cache task data
'this.cache(`task_${event.task_id}`, event, 3600)'

// Complex processing
`
const taskData = {
  id: event.task_id,
  status: event.new_status,
  completed_at: new Date().toISOString()
};
this.broadcast('task_updates', taskData);
this.log('info', 'Task completed', taskData);
`
```

## Rule Priority

### Priority Levels
- **1-3**: Low priority - Background processing
- **4-6**: Medium priority - Standard business logic
- **7-9**: High priority - Critical notifications
- **10+**: Urgent priority - System alerts

### Execution Order
- Rules are executed in priority order (highest first)
- Rules with same priority execute in creation order
- Failed rules don't block lower priority rules

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Rule ID already exists` | Duplicate rule identifier | Use unique ID or update existing rule |
| `Invalid condition syntax` | JavaScript syntax error in condition | Fix JavaScript syntax |
| `Invalid action syntax` | JavaScript syntax error in action | Fix JavaScript syntax |
| `Engine not running` | Real-time engine not started | Start engine with `clickup_start_realtime_engine` |

## Performance Characteristics

- **Rule Execution**: <10ms per rule
- **Memory Usage**: ~1KB per rule
- **Maximum Rules**: 100 rules per engine
- **Condition Evaluation**: Optimized JavaScript execution

## Security Considerations

- **Sandboxed Execution**: Rules run in isolated context
- **Limited API Access**: Only engine methods available
- **No File System Access**: Rules cannot access local files
- **Memory Limits**: Rules have execution time and memory limits

## Related Tools

- [`clickup_start_realtime_engine`](./realtime-engine-start.md) - Start engine to use rules
- [`clickup_get_realtime_metrics`](./realtime-metrics.md) - Monitor rule execution
- [`clickup_process_webhook`](./webhook-processor.md) - Generate events for rules
