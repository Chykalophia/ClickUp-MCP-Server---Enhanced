# Webhook Processor

**Tool Name**: `clickup_process_webhook`

## Overview

Process ClickUp webhooks with HMAC validation, event analysis, and structured data extraction. Provides real-time event processing with relationship mapping and change detection.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | object | Raw webhook payload from ClickUp |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `validateSignature` | boolean | `false` | Enable HMAC signature validation |
| `signature` | string | - | HMAC signature from webhook headers |
| `secret` | string | - | Webhook secret for signature validation |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Structured webhook analysis
    }
  ]
}
```

## Example Usage

### Basic Webhook Processing

```typescript
const result = await callTool({
  name: 'clickup_process_webhook',
  arguments: {
    payload: webhookPayload
  }
});
```

### Secure Webhook Processing with Validation

```typescript
const result = await callTool({
  name: 'clickup_process_webhook',
  arguments: {
    payload: webhookPayload,
    validateSignature: true,
    signature: request.headers['x-signature'],
    secret: process.env.WEBHOOK_SECRET
  }
});
```

## Sample Response

```markdown
# 🔔 WEBHOOK EVENT PROCESSED

## Event Summary
- **Type**: Task Status Changed
- **Object**: Task #868f9p3bg
- **Workspace**: 14168111
- **Timestamp**: 2025-09-01T20:30:32.201Z
- **User**: Peter Krzyzek (38366580)

## Event Details
- **Operation**: Update
- **Object Type**: Task
- **Object ID**: 868f9p3bg
- **Validation**: ✅ Signature Valid

## Changes Detected
1. **Status Change**: "in progress" → "completed"
2. **Date Updated**: 1756758602699
3. **Completion Date**: 1756758602699

## Relationships
- **Task Parent**: Project "ClickUp MCP Server Enhancement"
- **Assignees**: Peter Krzyzek
- **Watchers**: 1 user
- **Dependencies**: None

## Processing Actions
- ✅ Event validated and parsed
- ✅ Relationships mapped
- ✅ Changes extracted
- ✅ Ready for downstream processing

## Recommended Actions
1. Update project health metrics
2. Trigger completion notifications
3. Update sprint progress tracking
4. Log completion in analytics
```

## Supported Event Types

### Task Events
- `taskCreated` - New task created
- `taskUpdated` - Task properties changed
- `taskDeleted` - Task removed
- `taskStatusUpdated` - Status changed
- `taskAssigneeUpdated` - Assignee changed
- `taskDueDateUpdated` - Due date modified

### Comment Events
- `taskCommentPosted` - New comment added
- `taskCommentUpdated` - Comment modified
- `taskCommentDeleted` - Comment removed

### Time Tracking Events
- `taskTimeTracked` - Time entry added
- `taskTimeUpdated` - Time entry modified

### Project Events
- `listCreated` - New list created
- `listUpdated` - List properties changed
- `folderCreated` - New folder created
- `spaceCreated` - New space created

## HMAC Signature Validation

When `validateSignature` is enabled:

1. **Header Extraction**: Gets signature from `x-signature` header
2. **Secret Validation**: Uses provided secret for HMAC calculation
3. **Timing-Safe Comparison**: Prevents timing attacks
4. **Error Handling**: Returns validation errors if signature invalid

### Security Best Practices
- Always validate signatures in production
- Store webhook secrets securely
- Use HTTPS endpoints only
- Implement rate limiting
- Log validation failures

## Event Processing Pipeline

1. **Payload Validation**: Verify JSON structure
2. **Signature Check**: HMAC validation if enabled
3. **Event Classification**: Determine event type and operation
4. **Relationship Mapping**: Extract object relationships
5. **Change Detection**: Identify what changed
6. **Structured Output**: Format for downstream processing

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invalid payload` | Malformed JSON | Check webhook payload format |
| `Signature validation failed` | Invalid HMAC signature | Verify webhook secret and signature |
| `Unknown event type` | Unsupported webhook event | Check ClickUp webhook configuration |
| `Missing required fields` | Incomplete webhook data | Verify webhook is properly configured |

## Performance Characteristics

- **Response Time**: <500ms for standard events
- **Memory Usage**: ~2MB per webhook processing
- **Throughput**: 100 webhooks/minute
- **Concurrent Processing**: 10 webhooks simultaneously

## Integration Points

- **Real-Time Engine**: Feeds processed events to real-time processing
- **Analytics**: Provides structured data for metrics
- **Notifications**: Triggers downstream notification systems
- **Caching**: Updates cached task data with changes

## Related Tools

- [`clickup_start_realtime_engine`](./realtime-engine-start.md) - Start real-time processing
- [`clickup_add_processing_rule`](./processing-rule-manager.md) - Add custom processing rules
- [`clickup_get_realtime_metrics`](./realtime-metrics.md) - Monitor webhook processing performance
