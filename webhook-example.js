// Example webhook processing
const webhookPayload = {
  "id": 90110166493663,
  "hist_id": "4713788664990822381",
  "date": 1756759838535,
  "version": {
    "object_type": "comment",
    "object_id": "90110166493663",
    "workspace_id": 14168111,
    "operation": "c",
    "data": {
      "context": {
        "root_parent_type": 1,
        "is_chat": false,
        "audit_context": {
          "userid": 38366580,
          "current_time": 1756759838404,
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
          "object_id": "868f9p3bg",
          "workspace_id": "14168111"
        }
      ],
      "changes": [
        {
          "field": "date_created",
          "after": 1756759838535
        }
      ]
    }
  }
};

// Process with MCP server
console.log('Event:', {
  type: 'comment_created',
  comment_id: webhookPayload.version.object_id,
  task_id: webhookPayload.version.data.relationships.find(r => r.type === 'comment-parent')?.object_id,
  author_id: webhookPayload.version.data.relationships.find(r => r.type === 'comment-author')?.object_id,
  timestamp: new Date(webhookPayload.date).toISOString()
});
