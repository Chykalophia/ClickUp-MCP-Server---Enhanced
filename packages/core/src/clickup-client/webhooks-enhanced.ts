/* eslint-disable no-console, max-len */
import crypto from 'crypto';
import { ClickUpClient } from './index.js';
import { validateResponse, WebhooksResponseSchema } from '../schemas/response-schemas.js';
import { safeJsonParse } from '../utils/security.js';
import {
  WebhookPayloadSchema,
  type WebhookHistoryItem,
  type CreateWebhookRequest,
  type UpdateWebhookRequest,
  type WebhookFilter,
  type ValidateWebhookSignatureRequest,
  type ProcessWebhookRequest
} from '../schemas/webhook-schemas.js';

// Webhook object as returned by the ClickUp API
export interface Webhook {
  id: string;
  userid: number;
  team_id: number;
  endpoint: string;
  client_id: string | null;
  events: string[];
  task_id: string | null;
  list_id: string | null;
  folder_id: string | null;
  space_id: string | null;
  health?: {
    status: string;
    fail_count: number;
  };
  // The shared secret for HMAC-SHA256 signature verification.
  // Only returned when the webhook is first created — store it; it cannot be retrieved later.
  secret?: string;
}

export interface WebhookResponse {
  id: string;
  webhook: Webhook;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
}

export class WebhooksEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Create a new webhook.
   * The response's webhook.secret (returned only at creation) must be stored
   * by the caller and used later for signature verification.
   */
  async createWebhook(request: CreateWebhookRequest): Promise<WebhookResponse> {
    const body: Record<string, any> = {
      endpoint: request.endpoint,
      events: request.events
    };
    if (request.space_id !== undefined) body.space_id = request.space_id;
    if (request.folder_id !== undefined) body.folder_id = request.folder_id;
    if (request.list_id !== undefined) body.list_id = request.list_id;
    if (request.task_id !== undefined) body.task_id = request.task_id;

    const response = await this.post<WebhookResponse>(`/team/${request.workspace_id}/webhook`, body);
    return response;
  }

  /**
   * Get all webhooks for a workspace.
   * The Get Webhooks endpoint takes no query parameters, so the optional
   * status/event_type filters are applied client-side.
   */
  async getWebhooks(filter: WebhookFilter): Promise<WebhookListResponse> {
    const response = await this.get<unknown>(`/team/${filter.workspace_id}/webhook`);
    const validated = validateResponse(WebhooksResponseSchema, response, 'getWebhooks');
    let webhooks = (validated as unknown as WebhookListResponse).webhooks;

    if (filter.status) {
      webhooks = webhooks.filter(webhook => webhook.health?.status === filter.status);
    }
    if (filter.event_type) {
      const eventType = filter.event_type;
      webhooks = webhooks.filter(
        webhook => webhook.events.includes(eventType) || webhook.events.includes('*')
      );
    }

    return { webhooks };
  }

  /**
   * Get a specific webhook by ID.
   * The ClickUp API has no single-webhook read endpoint, so this lists the
   * workspace's webhooks and finds the matching one.
   */
  async getWebhook(workspaceId: string, webhookId: string): Promise<Webhook> {
    const { webhooks } = await this.getWebhooks({ workspace_id: workspaceId });
    const webhook = webhooks.find(item => item.id === webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found in workspace ${workspaceId}`);
    }
    return webhook;
  }

  /**
   * Update an existing webhook.
   * ClickUp requires the full { endpoint, events, status } body, so the current
   * webhook is fetched from the workspace list and merged with the caller's changes.
   */
  async updateWebhook(request: UpdateWebhookRequest): Promise<WebhookResponse> {
    const current = await this.getWebhook(request.workspace_id, request.webhook_id);

    const updateData = {
      endpoint: request.endpoint ?? current.endpoint,
      events: request.events ?? current.events,
      // Preserve the webhook's effective state on partial updates: a suspended
      // webhook must only be reactivated when the caller explicitly asks.
      status: request.status ?? (current.health?.status === 'suspended' ? 'inactive' : 'active')
    };

    const response = await this.put<WebhookResponse>(`/webhook/${request.webhook_id}`, updateData);
    return response;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    await this.delete(`/webhook/${webhookId}`);
    return { success: true };
  }

  /**
   * Validate webhook signature using HMAC-SHA256.
   * request.payload must be the raw request body string exactly as received —
   * re-serialized JSON is not byte-identical and will fail verification.
   */
  validateWebhookSignature(request: ValidateWebhookSignatureRequest): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', request.secret)
        .update(request.payload)
        .digest('hex');

      // ClickUp's X-Signature header is the bare lowercase hex HMAC-SHA256 digest.
      // Strip a 'sha256=' prefix defensively in case a caller forwards one.
      const receivedSignature = request.signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating webhook signature:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Process an incoming webhook delivery.
   * The signature is verified against the raw body string before parsing,
   * since ClickUp signs the exact bytes it sends.
   */
  async processWebhook(request: ProcessWebhookRequest): Promise<{
    valid: boolean;
    webhookId: string;
    event: string;
    taskId?: string;
    historyItems: WebhookHistoryItem[];
  }> {
    // Validate signature over the raw body before parsing it. Fail closed:
    // requesting validation without the credentials to perform it is an error.
    if (request.validate_signature && (!request.signature || !request.secret)) {
      throw new Error('signature and secret are required when validate_signature is true');
    }
    if (request.validate_signature && request.signature && request.secret) {
      const isValidSignature = this.validateWebhookSignature({
        payload: request.body,
        signature: request.signature,
        secret: request.secret
      });

      if (!isValidSignature) {
        return {
          valid: false,
          webhookId: '',
          event: '',
          historyItems: []
        };
      }
    }

    const payload = WebhookPayloadSchema.parse(safeJsonParse(request.body));

    return {
      valid: true,
      webhookId: payload.webhook_id,
      event: payload.event,
      taskId: payload.task_id,
      historyItems: payload.history_items ?? []
    };
  }
}
