import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { /* createClickUpClient */ } from '../clickup-client/index.js';
import { WebhooksEnhancedClient } from '../clickup-client/webhooks-enhanced.js';
import {
  CreateWebhookSchema,
  UpdateWebhookSchema,
  WebhookFilterSchema,
  ValidateWebhookSignatureSchema,
  ProcessWebhookSchema,
  WebhookPayloadSchema
} from '../schemas/webhook-schemas.js';

// Create clients
// const clickUpClient = createClickUpClient();
const webhooksClient = new WebhooksEnhancedClient(process.env.CLICKUP_API_TOKEN!);

export function setupWebhookTools(server: McpServer): void {

  // ========================================
  // WEBHOOK MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'create_webhook',
    'Create a new webhook in a ClickUp workspace. Webhooks allow real-time notifications when events occur.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to create the webhook in'),
      endpoint: z.string().url().describe('The URL endpoint that will receive webhook notifications'),
      events: z.array(z.enum([
        'taskCreated', 'taskUpdated', 'taskDeleted', 'taskStatusUpdated',
        'taskAssigneeUpdated', 'taskDueDateUpdated', 'taskCommentPosted',
        'taskCommentUpdated', 'taskTimeTracked', 'taskTimeUpdated',
        'listCreated', 'listUpdated', 'listDeleted',
        'folderCreated', 'folderUpdated', 'folderDeleted',
        'spaceCreated', 'spaceUpdated', 'spaceDeleted',
        'goalCreated', 'goalUpdated', 'goalDeleted', 'goalTargetUpdated'
      ])).describe('Array of events to subscribe to'),
      health_check_url: z.string().url().optional().describe('Optional URL for webhook health checks'),
      secret: z.string().optional().describe('Optional secret for HMAC signature validation')
    },
    async (args) => {
      try {
        const request = CreateWebhookSchema.parse(args);
        const result = await webhooksClient.createWebhook(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook created successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_webhooks',
    'Get all webhooks for a workspace with optional filtering by status or event type.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to get webhooks from'),
      status: z.enum(['active', 'inactive']).optional().describe('Filter webhooks by status'),
      event_type: z.string().optional().describe('Filter webhooks by event type')
    },
    async (args) => {
      try {
        const filter = WebhookFilterSchema.parse(args);
        const result = await webhooksClient.getWebhooks(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhooks for workspace ${args.workspace_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting webhooks: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_webhook',
    'Get detailed information about a specific webhook by its ID.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to get')
    },
    async (args) => {
      try {
        const result = await webhooksClient.getWebhook(args.webhook_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook details:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_webhook',
    'Update an existing webhook\'s configuration including endpoint, events, and status.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to update'),
      endpoint: z.string().url().optional().describe('The new URL endpoint for webhook notifications'),
      events: z.array(z.enum([
        'taskCreated', 'taskUpdated', 'taskDeleted', 'taskStatusUpdated',
        'taskAssigneeUpdated', 'taskDueDateUpdated', 'taskCommentPosted',
        'taskCommentUpdated', 'taskTimeTracked', 'taskTimeUpdated',
        'listCreated', 'listUpdated', 'listDeleted',
        'folderCreated', 'folderUpdated', 'folderDeleted',
        'spaceCreated', 'spaceUpdated', 'spaceDeleted',
        'goalCreated', 'goalUpdated', 'goalDeleted', 'goalTargetUpdated'
      ])).optional().describe('New array of events to subscribe to'),
      health_check_url: z.string().url().optional().describe('New URL for webhook health checks'),
      secret: z.string().optional().describe('New secret for HMAC signature validation'),
      status: z.enum(['active', 'inactive']).optional().describe('New status for the webhook')
    },
    async (args) => {
      try {
        const request = UpdateWebhookSchema.parse(args);
        const result = await webhooksClient.updateWebhook(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_webhook',
    'Delete a webhook from ClickUp. This will stop all notifications to the webhook endpoint.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to delete')
    },
    async (args) => {
      try {
        const result = await webhooksClient.deleteWebhook(args.webhook_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook deleted successfully: ${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_webhook_event_history',
    'Get the event history for a webhook including delivery status and response codes.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to get event history for'),
      limit: z.number().positive().optional().describe('Maximum number of events to return')
    },
    async (args) => {
      try {
        const result = await webhooksClient.getWebhookEventHistory(args.webhook_id, args.limit);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook event history:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting webhook event history: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'ping_webhook',
    'Send a test ping to a webhook endpoint to verify it\'s working correctly.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to ping')
    },
    async (args) => {
      try {
        const result = await webhooksClient.pingWebhook(args.webhook_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook ping result:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error pinging webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'validate_webhook_signature',
    'Validate the HMAC signature of a webhook payload to ensure authenticity.',
    {
      payload: z.string().describe('The raw webhook payload as a string'),
      signature: z.string().describe('The signature header from the webhook request'),
      secret: z.string().describe('The webhook secret used for signature generation')
    },
    async (args) => {
      try {
        const request = ValidateWebhookSignatureSchema.parse(args);
        const isValid = webhooksClient.validateWebhookSignature(request);
        const result = { valid: isValid };
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook signature validation result:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error validating webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'process_webhook',
    'Process an incoming webhook payload and extract structured information about the event.',
    {
      payload: z.any().describe('The webhook payload object'),
      validate_signature: z.boolean().default(true).describe('Whether to validate the webhook signature'),
      signature: z.string().optional().describe('The signature header for validation'),
      secret: z.string().optional().describe('The webhook secret for signature validation')
    },
    async (args) => {
      try {
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
        const result = await webhooksClient.processWebhook(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook processing result:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_webhook_stats',
    'Get statistics about webhook performance including success rate and response times.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to get statistics for'),
      days: z.number().positive().optional().describe('Number of days to include in statistics (default: 30)')
    },
    async (args) => {
      try {
        const result = await webhooksClient.getWebhookStats(args.webhook_id, args.days);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook statistics:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting webhook statistics: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'retry_webhook_events',
    'Retry failed webhook events for a specific webhook.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to retry events for'),
      event_ids: z.array(z.string()).optional().describe('Optional array of specific event IDs to retry. If not provided, all failed events will be retried.')
    },
    async (args) => {
      try {
        const result = await webhooksClient.retryWebhookEvents(args.webhook_id, args.event_ids);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Webhook events retry result:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error retrying webhook events: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
}
