# ClickUp Webhook Processing Guide

This guide demonstrates how to use the webhook management tools in the ClickUp MCP Server, based on real webhook payload analysis.

## Webhook Payload Structure

ClickUp webhooks follow a standardized structure as shown in your example:

```json
{
  "id": 90110164070264,
  "hist_id": "4697736615798917760",
  "date": 1755803061841,
  "version": {
    "object_type": "comment",
    "object_id": "90110164070264",
    "workspace_id": 14168111,
    "operation": "c",
    "data": {
      "context": {
        "root_parent_type": 1,
        "is_chat": false,
        "audit_context": {
          "userid": 38366580,
          "current_time": 1755803061674,
          "route": "*"
        },
        "originating_service": "publicapi"
      },
      "relationships": [
        {
          "type": "comment-author",
          "object_type": "user",
          "object_id": 38366580,
          "workspace_id": "14168111"
        },
        {
          "type": "comment-parent",
          "object_type": "task",
          "object_id": "868f9p6ad",
          "workspace_id": "14168111"
        }
      ],
      "changes": [
        {
          "field": "date_created",
          "after": 1755803061841
        }
      ]
    }
  }
}
```

## Key Components

### Operation Types
- `"c"` = Create
- `"u"` = Update  
- `"d"` = Delete

### Relationships Array
Shows connections between objects:
- `comment-author`: Links comment to user
- `comment-parent`: Links comment to parent object (task, list, etc.)

### Changes Array
Tracks field modifications:
- `field`: The field that changed
- `before`: Previous value (for updates)
- `after`: New value

### Context Information
- `audit_context`: User ID, timestamp, route
- `originating_service`: Source of the change
- `is_chat`: Whether this is a chat comment

## Available Webhook Tools

### 1. Create Webhook
```javascript
await create_webhook({
  workspace_id: "14168111",
  endpoint: "https://your-app.com/webhooks/clickup",
  events: ["taskCreated", "taskUpdated", "taskCommentPosted"],
  secret: "your-webhook-secret"
});
```

### 2. Process Webhook Payload
```javascript
// Process the webhook payload from your example
const result = await process_webhook({
  payload: {
    "id": 90110164070264,
    "hist_id": "4697736615798917760",
    "date": 1755803061841,
    "version": {
      // ... full payload structure
    }
  },
  validate_signature: true,
  signature: "sha256=abc123...",
  secret: "your-webhook-secret"
});

// Result will be:
{
  "valid": true,
  "objectType": "comment",
  "objectId": "90110164070264",
  "operation": "create",
  "workspaceId": 14168111,
  "userId": 38366580,
  "timestamp": "2025-08-21T19:09:43.428Z",
  "changes": [
    {
      "field": "date_created",
      "after": 1755803061841
    }
  ],
  "relationships": [
    {
      "type": "comment-author",
      "object_type": "user",
      "object_id": 38366580
    },
    {
      "type": "comment-parent",
      "object_type": "task",
      "object_id": "868f9p6ad"
    }
  ]
}
```

### 3. Validate Webhook Signature
```javascript
const isValid = await validate_webhook_signature({
  payload: JSON.stringify(webhookPayload),
  signature: "sha256=abc123...",
  secret: "your-webhook-secret"
});
```

### 4. Get Webhook Statistics
```javascript
const stats = await get_webhook_stats({
  webhook_id: "webhook_123",
  days: 30
});

// Returns:
{
  "total_events": 1250,
  "successful_events": 1200,
  "failed_events": 50,
  "success_rate": 96.0,
  "average_response_time": 150
}
```

## Event Types Available

### Task Events
- `taskCreated` - New task created
- `taskUpdated` - Task properties changed
- `taskDeleted` - Task deleted
- `taskStatusUpdated` - Task status changed
- `taskAssigneeUpdated` - Task assignee changed
- `taskDueDateUpdated` - Task due date changed
- `taskCommentPosted` - Comment added to task
- `taskCommentUpdated` - Task comment modified
- `taskTimeTracked` - Time entry added
- `taskTimeUpdated` - Time entry modified

### List Events
- `listCreated` - New list created
- `listUpdated` - List properties changed
- `listDeleted` - List deleted

### Folder Events
- `folderCreated` - New folder created
- `folderUpdated` - Folder properties changed
- `folderDeleted` - Folder deleted

### Space Events
- `spaceCreated` - New space created
- `spaceUpdated` - Space properties changed
- `spaceDeleted` - Space deleted

### Goal Events
- `goalCreated` - New goal created
- `goalUpdated` - Goal properties changed
- `goalDeleted` - Goal deleted
- `goalTargetUpdated` - Goal target progress updated

## Security Best Practices

### 1. Always Validate Signatures
```javascript
// Always validate webhook signatures in production
const result = await process_webhook({
  payload: webhookPayload,
  validate_signature: true,
  signature: request.headers['x-signature'],
  secret: process.env.WEBHOOK_SECRET
});

if (!result.valid) {
  throw new Error('Invalid webhook signature');
}
```

### 2. Use HTTPS Endpoints
```javascript
await create_webhook({
  workspace_id: "14168111",
  endpoint: "https://your-app.com/webhooks/clickup", // Always HTTPS
  events: ["taskCreated"],
  secret: process.env.WEBHOOK_SECRET
});
```

### 3. Implement Health Checks
```javascript
await create_webhook({
  workspace_id: "14168111",
  endpoint: "https://your-app.com/webhooks/clickup",
  health_check_url: "https://your-app.com/health",
  events: ["taskCreated"],
  secret: process.env.WEBHOOK_SECRET
});
```

## Error Handling and Monitoring

### 1. Monitor Webhook Performance
```javascript
// Check webhook statistics regularly
const stats = await get_webhook_stats({
  webhook_id: "webhook_123",
  days: 7
});

if (stats.success_rate < 95) {
  console.warn('Webhook success rate is low:', stats.success_rate);
}
```

### 2. Retry Failed Events
```javascript
// Retry all failed events
await retry_webhook_events({
  webhook_id: "webhook_123"
});

// Or retry specific events
await retry_webhook_events({
  webhook_id: "webhook_123",
  event_ids: ["event_456", "event_789"]
});
```

### 3. Check Event History
```javascript
const history = await get_webhook_event_history({
  webhook_id: "webhook_123",
  limit: 100
});

// Analyze failed events
const failedEvents = history.events.filter(event => event.status === 'failed');
console.log('Failed events:', failedEvents.length);
```

## Real-World Integration Example

Based on your webhook payload, here's how you might process a comment creation event:

```javascript
// Webhook endpoint handler
app.post('/webhooks/clickup', async (req, res) => {
  try {
    // Process the webhook
    const result = await process_webhook({
      payload: req.body,
      validate_signature: true,
      signature: req.headers['x-signature'],
      secret: process.env.CLICKUP_WEBHOOK_SECRET
    });

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle comment creation
    if (result.objectType === 'comment' && result.operation === 'create') {
      // Find the parent task from relationships
      const taskRelation = result.relationships.find(
        rel => rel.type === 'comment-parent' && rel.object_type === 'task'
      );
      
      if (taskRelation) {
        console.log(`New comment on task ${taskRelation.object_id} by user ${result.userId}`);
        
        // Your business logic here
        await handleNewTaskComment({
          taskId: taskRelation.object_id,
          commentId: result.objectId,
          userId: result.userId,
          timestamp: result.timestamp
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

This comprehensive webhook system enables real-time integration with ClickUp, allowing your applications to respond immediately to changes in your ClickUp workspace.
