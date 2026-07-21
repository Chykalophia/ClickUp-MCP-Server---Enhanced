/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiToken } from '../clickup-client/index.js';
import { WebhooksEnhancedClient } from '../clickup-client/webhooks-enhanced.js';
import {
  WEBHOOK_EVENTS,
  CreateWebhookSchema,
  UpdateWebhookSchema,
  WebhookFilterSchema,
  ValidateWebhookSignatureSchema,
  ProcessWebhookSchema,
} from '../schemas/webhook-schemas.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const webhooksClient = new WebhooksEnhancedClient(getApiToken());

export function setupWebhookTools(server: McpServer): void {
  // ========================================
  // WEBHOOK MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_create_webhook',
    'Create a new webhook in a ClickUp workspace. Webhooks allow real-time notifications when events occur. The response includes the webhook secret (returned only at creation) — store it for signature verification.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to create the webhook in'),
      endpoint: z
        .string()
        .url()
        .describe('The URL endpoint that will receive webhook notifications'),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .describe("Array of events to subscribe to. Use '*' to subscribe to all events"),
      space_id: z
        .number()
        .optional()
        .describe('Optional space ID to scope webhook events to a specific space'),
      folder_id: z
        .number()
        .optional()
        .describe('Optional folder ID to scope webhook events to a specific folder'),
      list_id: z
        .number()
        .optional()
        .describe('Optional list ID to scope webhook events to a specific list'),
      task_id: z
        .string()
        .optional()
        .describe('Optional task ID to scope webhook events to a specific task'),
    },
    async args => {
      try {
        const request = CreateWebhookSchema.parse(args);
        const result = await webhooksClient.createWebhook(request);

        return {
          content: [
            {
              type: 'text',
              text: `Webhook created successfully. Store the returned secret — it is only returned at creation and is required for signature verification:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating webhook', error);
      }
    }
  );

  server.tool(
    'clickup_get_webhooks',
    'Get all webhooks for a workspace, including per-webhook health info (status, fail_count). Optional status/event type filters are applied client-side (the ClickUp API does not support filtering).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to get webhooks from'),
      status: z
        .enum(['active', 'failing', 'suspended'])
        .optional()
        .describe('Filter webhooks by health status (applied client-side)'),
      event_type: z
        .enum(WEBHOOK_EVENTS)
        .optional()
        .describe('Filter webhooks by subscribed event type (applied client-side)'),
    },
    async args => {
      try {
        const filter = WebhookFilterSchema.parse(args);
        const result = await webhooksClient.getWebhooks(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Webhooks for workspace ${args.workspace_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting webhooks', error);
      }
    }
  );

  server.tool(
    'clickup_get_webhook',
    'Get detailed information about a specific webhook by its ID, including health info (status, fail_count). The ClickUp API has no single-webhook endpoint, so this looks the webhook up in the workspace list.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace the webhook belongs to'),
      webhook_id: z.string().min(1).describe('The ID of the webhook to get'),
    },
    async args => {
      try {
        const result = await webhooksClient.getWebhook(args.workspace_id, args.webhook_id);

        return {
          content: [
            {
              type: 'text',
              text: `Webhook details:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting webhook', error);
      }
    }
  );

  server.tool(
    'clickup_update_webhook',
    "Update an existing webhook's configuration including endpoint, events, and status. ClickUp requires the full endpoint/events/status body, so unspecified fields are filled in from the webhook's current configuration.",
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to update'),
      workspace_id: z
        .string()
        .min(1)
        .describe("The ID of the workspace the webhook belongs to (used to fetch the webhook's current configuration)"),
      endpoint: z
        .string()
        .url()
        .optional()
        .describe('The new URL endpoint for webhook notifications'),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .optional()
        .describe("New array of events to subscribe to. Use '*' to subscribe to all events"),
      status: z.enum(['active', 'inactive']).optional().describe('New status for the webhook'),
    },
    async args => {
      try {
        const request = UpdateWebhookSchema.parse(args);
        const result = await webhooksClient.updateWebhook(request);

        return {
          content: [
            {
              type: 'text',
              text: `Webhook updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating webhook', error);
      }
    }
  );

  server.tool(
    'clickup_delete_webhook',
    'Delete a webhook from ClickUp. This will stop all notifications to the webhook endpoint.',
    {
      webhook_id: z.string().min(1).describe('The ID of the webhook to delete'),
    },
    async args => {
      try {
        const result = await webhooksClient.deleteWebhook(args.webhook_id);

        return {
          content: [
            {
              type: 'text',
              text: `Webhook deleted successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting webhook', error);
      }
    }
  );

  server.tool(
    'clickup_validate_webhook_signature',
    "Validate the HMAC-SHA256 signature of a webhook payload to ensure authenticity. The payload must be the raw request body string exactly as received; the signature is the bare hex digest from ClickUp's X-Signature header.",
    {
      payload: z.string().describe('The raw webhook request body as a string, exactly as received'),
      signature: z
        .string()
        .describe('The X-Signature header value from the webhook request (bare hex HMAC-SHA256 digest)'),
      secret: z
        .string()
        .describe('The webhook secret returned by ClickUp when the webhook was created'),
    },
    async args => {
      try {
        const request = ValidateWebhookSignatureSchema.parse(args);
        const isValid = webhooksClient.validateWebhookSignature(request);
        const result = { valid: isValid };

        return {
          content: [
            {
              type: 'text',
              text: `Webhook signature validation result:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('validating webhook signature', error);
      }
    }
  );

  server.tool(
    'clickup_process_webhook',
    'Process an incoming ClickUp webhook delivery ({webhook_id, event, task_id, history_items}) and extract structured information about the event. The signature is verified against the raw body string before parsing.',
    {
      body: z
        .string()
        .describe('The raw webhook request body as a string, exactly as received (required for signature verification)'),
      validate_signature: z
        .boolean()
        .default(true)
        .describe('Whether to validate the webhook signature'),
      signature: z
        .string()
        .optional()
        .describe('The X-Signature header value from the webhook request'),
      secret: z
        .string()
        .optional()
        .describe('The webhook secret returned by ClickUp when the webhook was created'),
    },
    async args => {
      try {
        const request = ProcessWebhookSchema.parse(args);
        const result = await webhooksClient.processWebhook(request);

        return {
          content: [
            {
              type: 'text',
              text: `Webhook processing result:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('processing webhook', error);
      }
    }
  );
}
