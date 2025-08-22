# Real Webhook Processing Example

This example demonstrates how to process the actual webhook payload you provided using the ClickUp MCP Server - Enhanced webhook tools.

## Your Webhook Payload

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
    },
    "master_id": 13,
    "version": 1755803061879000,
    "deleted": false,
    "traceparent": "6041334444293036127",
    "date_created": 1755803061879,
    "date_updated": 1755803061879,
    "event_publish_time": 1755803061900
  }
}
```

## Processing This Webhook

### Step 1: Process the Webhook Payload

Using the `process_webhook` tool:

```javascript
const result = await process_webhook({
  payload: {
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
      },
      "master_id": 13,
      "version": 1755803061879000,
      "deleted": false,
      "traceparent": "6041334444293036127",
      "date_created": 1755803061879,
      "date_updated": 1755803061879,
      "event_publish_time": 1755803061900
    }
  },
  validate_signature: false  // Set to true in production with signature and secret
});
```

### Expected Processing Result

```json
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

## Key Insights from Your Payload

### 1. Event Type
- **Operation**: `"c"` (create) → Comment was created
- **Object Type**: `"comment"` → This is a comment creation event
- **Object ID**: `"90110164070264"` → The new comment's ID

### 2. Context Information
- **User**: `38366580` created the comment
- **Workspace**: `14168111`
- **Timestamp**: `1755803061841` (Unix timestamp)
- **Source**: `"publicapi"` (created via API)

### 3. Relationships
- **Author**: User `38366580` is the comment author
- **Parent**: Comment belongs to task `"868f9p6ad"`

### 4. Changes Tracked
- **Field**: `"date_created"` was set
- **Value**: `1755803061841` (creation timestamp)

## Practical Integration Example

Here's how you might handle this webhook in a real application:

```javascript
// Webhook endpoint handler
app.post('/clickup-webhook', async (req, res) => {
  try {
    // Process the webhook using MCP server
    const result = await process_webhook({
      payload: req.body,
      validate_signature: true,
      signature: req.headers['x-signature'],
      secret: process.env.CLICKUP_WEBHOOK_SECRET
    });

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Handle comment creation specifically
    if (result.objectType === 'comment' && result.operation === 'create') {
      // Extract task information from relationships
      const taskRelation = result.relationships.find(
        rel => rel.type === 'comment-parent' && rel.object_type === 'task'
      );
      
      if (taskRelation) {
        console.log(`New comment created:`);
        console.log(`- Comment ID: ${result.objectId}`);
        console.log(`- Task ID: ${taskRelation.object_id}`);
        console.log(`- Author: User ${result.userId}`);
        console.log(`- Timestamp: ${result.timestamp}`);
        
        // Your business logic here
        await handleNewTaskComment({
          commentId: result.objectId,
          taskId: taskRelation.object_id,
          authorId: result.userId,
          workspaceId: result.workspaceId,
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

// Business logic handler
async function handleNewTaskComment({ commentId, taskId, authorId, workspaceId, timestamp }) {
  // Example: Send notification to team
  await sendTeamNotification({
    message: `New comment on task ${taskId}`,
    author: authorId,
    timestamp: timestamp
  });
  
  // Example: Update task activity log
  await updateTaskActivity({
    taskId: taskId,
    activity: 'comment_added',
    commentId: commentId,
    timestamp: timestamp
  });
  
  // Example: Trigger automation rules
  await checkAutomationRules({
    event: 'comment_created',
    taskId: taskId,
    workspaceId: workspaceId
  });
}
```

## Setting Up Webhooks for This Event Type

To receive comment creation events like this one:

```javascript
// Create webhook for comment events
await create_webhook({
  workspace_id: "14168111",
  endpoint: "https://your-app.com/clickup-webhook",
  events: [
    "taskCommentPosted",
    "taskCommentUpdated"
  ],
  secret: "your-secure-webhook-secret"
});
```

## Security Validation

In production, always validate webhook signatures:

```javascript
// Validate the signature
const isValid = await validate_webhook_signature({
  payload: JSON.stringify(req.body),
  signature: req.headers['x-signature'],
  secret: process.env.CLICKUP_WEBHOOK_SECRET
});

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

This comprehensive webhook processing system enables real-time integration with ClickUp, allowing your applications to respond immediately to events like the comment creation shown in your example payload.
