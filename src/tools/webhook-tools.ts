import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WebhooksEnhancedClient } from '../clickup-client/webhooks-enhanced.js';
import {
  CreateWebhookSchema,
  UpdateWebhookSchema,
  WebhookFilterSchema,
  ValidateWebhookSignatureSchema,
  ProcessWebhookSchema,
  WebhookPayloadSchema
} from '../schemas/webhook-schemas.js';

export function createWebhookTools(_client: WebhooksEnhancedClient): Tool[] {
  return [
    // Create webhook
    {
      name: 'create_webhook',
      description: 'Create a new webhook in a ClickUp workspace. Webhooks allow real-time notifications when events occur.',
      inputSchema: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'The ID of the workspace to create the webhook in'
          },
          endpoint: {
            type: 'string',
            description: 'The URL endpoint that will receive webhook notifications'
          },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'taskCreated', 'taskUpdated', 'taskDeleted', 'taskStatusUpdated',
                'taskAssigneeUpdated', 'taskDueDateUpdated', 'taskCommentPosted',
                'taskCommentUpdated', 'taskTimeTracked', 'taskTimeUpdated',
                'listCreated', 'listUpdated', 'listDeleted',
                'folderCreated', 'folderUpdated', 'folderDeleted',
                'spaceCreated', 'spaceUpdated', 'spaceDeleted',
                'goalCreated', 'goalUpdated', 'goalDeleted', 'goalTargetUpdated'
              ]
            },
            description: 'Array of events to subscribe to'
          },
          health_check_url: {
            type: 'string',
            description: 'Optional URL for webhook health checks'
          },
          secret: {
            type: 'string',
            description: 'Optional secret for HMAC signature validation'
          }
        },
        required: ['workspace_id', 'endpoint', 'events']
      }
    },

    // Get webhooks
    {
      name: 'get_webhooks',
      description: 'Get all webhooks for a workspace with optional filtering by status or event type.',
      inputSchema: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'The ID of the workspace to get webhooks from'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive'],
            description: 'Filter webhooks by status'
          },
          event_type: {
            type: 'string',
            description: 'Filter webhooks by event type'
          }
        },
        required: ['workspace_id']
      }
    },

    // Get webhook
    {
      name: 'get_webhook',
      description: 'Get detailed information about a specific webhook by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to get'
          }
        },
        required: ['webhook_id']
      }
    },

    // Update webhook
    {
      name: 'update_webhook',
      description: 'Update an existing webhook\'s configuration including endpoint, events, and status.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to update'
          },
          endpoint: {
            type: 'string',
            description: 'The new URL endpoint for webhook notifications'
          },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'taskCreated', 'taskUpdated', 'taskDeleted', 'taskStatusUpdated',
                'taskAssigneeUpdated', 'taskDueDateUpdated', 'taskCommentPosted',
                'taskCommentUpdated', 'taskTimeTracked', 'taskTimeUpdated',
                'listCreated', 'listUpdated', 'listDeleted',
                'folderCreated', 'folderUpdated', 'folderDeleted',
                'spaceCreated', 'spaceUpdated', 'spaceDeleted',
                'goalCreated', 'goalUpdated', 'goalDeleted', 'goalTargetUpdated'
              ]
            },
            description: 'New array of events to subscribe to'
          },
          health_check_url: {
            type: 'string',
            description: 'New URL for webhook health checks'
          },
          secret: {
            type: 'string',
            description: 'New secret for HMAC signature validation'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive'],
            description: 'New status for the webhook'
          }
        },
        required: ['webhook_id']
      }
    },

    // Delete webhook
    {
      name: 'delete_webhook',
      description: 'Delete a webhook from ClickUp. This will stop all notifications to the webhook endpoint.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to delete'
          }
        },
        required: ['webhook_id']
      }
    },

    // Get webhook event history
    {
      name: 'get_webhook_event_history',
      description: 'Get the event history for a webhook including delivery status and response codes.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to get event history for'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of events to return'
          }
        },
        required: ['webhook_id']
      }
    },

    // Ping webhook
    {
      name: 'ping_webhook',
      description: 'Send a test ping to a webhook endpoint to verify it\'s working correctly.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to ping'
          }
        },
        required: ['webhook_id']
      }
    },

    // Validate webhook signature
    {
      name: 'validate_webhook_signature',
      description: 'Validate the HMAC signature of a webhook payload to ensure authenticity.',
      inputSchema: {
        type: 'object',
        properties: {
          payload: {
            type: 'string',
            description: 'The raw webhook payload as a string'
          },
          signature: {
            type: 'string',
            description: 'The signature header from the webhook request'
          },
          secret: {
            type: 'string',
            description: 'The webhook secret used for signature generation'
          }
        },
        required: ['payload', 'signature', 'secret']
      }
    },

    // Process webhook
    {
      name: 'process_webhook',
      description: 'Process an incoming webhook payload and extract structured information about the event.',
      inputSchema: {
        type: 'object',
        properties: {
          payload: {
            type: 'object',
            description: 'The webhook payload object'
          },
          validate_signature: {
            type: 'boolean',
            description: 'Whether to validate the webhook signature',
            default: true
          },
          signature: {
            type: 'string',
            description: 'The signature header for validation'
          },
          secret: {
            type: 'string',
            description: 'The webhook secret for signature validation'
          }
        },
        required: ['payload']
      }
    },

    // Get webhook statistics
    {
      name: 'get_webhook_stats',
      description: 'Get statistics about webhook performance including success rate and response times.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to get statistics for'
          },
          days: {
            type: 'number',
            description: 'Number of days to include in statistics (default: 30)'
          }
        },
        required: ['webhook_id']
      }
    },

    // Retry webhook events
    {
      name: 'retry_webhook_events',
      description: 'Retry failed webhook events for a specific webhook.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_id: {
            type: 'string',
            description: 'The ID of the webhook to retry events for'
          },
          event_ids: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Optional array of specific event IDs to retry. If not provided, all failed events will be retried.'
          }
        },
        required: ['webhook_id']
      }
    }
  ];
}

export async function handleWebhookTool(
  name: string,
  args: any,
  client: WebhooksEnhancedClient
): Promise<any> {
  try {
    switch (name) {
    case 'create_webhook': {
      const request = CreateWebhookSchema.parse(args);
      return await client.createWebhook(request);
    }

    case 'get_webhooks': {
      const filter = WebhookFilterSchema.parse(args);
      return await client.getWebhooks(filter);
    }

    case 'get_webhook': {
      const { webhook_id } = args;
      return await client.getWebhook(webhook_id);
    }

    case 'update_webhook': {
      const request = UpdateWebhookSchema.parse(args);
      return await client.updateWebhook(request);
    }

    case 'delete_webhook': {
      const { webhook_id } = args;
      return await client.deleteWebhook(webhook_id);
    }

    case 'get_webhook_event_history': {
      const { webhook_id, limit } = args;
      return await client.getWebhookEventHistory(webhook_id, limit);
    }

    case 'ping_webhook': {
      const { webhook_id } = args;
      return await client.pingWebhook(webhook_id);
    }

    case 'validate_webhook_signature': {
      const request = ValidateWebhookSignatureSchema.parse(args);
      const isValid = client.validateWebhookSignature(request);
      return { valid: isValid };
    }

    case 'process_webhook': {
      // Parse the payload if it's a string
      let payload = args.payload;
      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }
        
      const parsedPayload = WebhookPayloadSchema.parse(payload);
      const request = ProcessWebhookSchema.parse({
        ...args,
        payload: parsedPayload
      });
      return await client.processWebhook(request);
    }

    case 'get_webhook_stats': {
      const { webhook_id, days } = args;
      return await client.getWebhookStats(webhook_id, days);
    }

    case 'retry_webhook_events': {
      const { webhook_id, event_ids } = args;
      return await client.retryWebhookEvents(webhook_id, event_ids);
    }

    default:
      throw new Error(`Unknown webhook tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Webhook tool error: ${error.message}`);
    }
    throw error;
  }
}
