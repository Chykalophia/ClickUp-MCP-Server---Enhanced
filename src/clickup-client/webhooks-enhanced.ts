import crypto from 'crypto';
import { ClickUpClient } from './index.js';
import type {
  WebhookPayload,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookFilter,
  ValidateWebhookSignatureRequest,
  ProcessWebhookRequest
} from '../schemas/webhook-schemas.js';

export interface WebhookResponse {
  id: string;
  webhook: {
    id: string;
    userid: number;
    team_id: number;
    endpoint: string;
    client_id: string;
    events: string[];
    task_events: string[];
    list_events: string[];
    folder_events: string[];
    space_events: string[];
    goal_events: string[];
    health_check_url?: string;
    secret?: string;
    status: 'active' | 'inactive';
    date_created: string;
    date_updated: string;
  };
}

export interface WebhookListResponse {
  webhooks: WebhookResponse['webhook'][];
}

export interface WebhookEventHistory {
  id: string;
  webhook_id: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending';
  response_code?: number;
  response_body?: string;
  attempts: number;
  date_created: string;
  date_updated: string;
}

export interface WebhookEventHistoryResponse {
  events: WebhookEventHistory[];
}

export class WebhooksEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Create a new webhook
   */
  async createWebhook(request: CreateWebhookRequest): Promise<WebhookResponse> {
    const response = await this.post<WebhookResponse>(
      `/team/${request.workspace_id}/webhook`,
      {
        endpoint: request.endpoint,
        events: request.events,
        health_check_url: request.health_check_url,
        secret: request.secret
      }
    );
    return response;
  }

  /**
   * Get all webhooks for a workspace
   */
  async getWebhooks(filter: WebhookFilter): Promise<WebhookListResponse> {
    const params = new URLSearchParams();
    if (filter.status) {
      params.append('status', filter.status);
    }
    if (filter.event_type) {
      params.append('event_type', filter.event_type);
    }

    const queryString = params.toString();
    const endpoint = `/team/${filter.workspace_id}/webhook${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<WebhookListResponse>(endpoint);
    return response;
  }

  /**
   * Get a specific webhook by ID
   */
  async getWebhook(webhookId: string): Promise<WebhookResponse> {
    const response = await this.get<WebhookResponse>(`/webhook/${webhookId}`);
    return response;
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(request: UpdateWebhookRequest): Promise<WebhookResponse> {
    const updateData: Record<string, any> = {};
    
    if (request.endpoint) updateData.endpoint = request.endpoint;
    if (request.events) updateData.events = request.events;
    if (request.health_check_url) updateData.health_check_url = request.health_check_url;
    if (request.secret) updateData.secret = request.secret;
    if (request.status) updateData.status = request.status;

    const response = await this.put<WebhookResponse>(
      `/webhook/${request.webhook_id}`,
      updateData
    );
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
   * Get webhook event history
   */
  async getWebhookEventHistory(webhookId: string, limit?: number): Promise<WebhookEventHistoryResponse> {
    const params = new URLSearchParams();
    if (limit) {
      params.append('limit', limit.toString());
    }

    const queryString = params.toString();
    const endpoint = `/webhook/${webhookId}/events${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<WebhookEventHistoryResponse>(endpoint);
    return response;
  }

  /**
   * Ping a webhook (test endpoint)
   */
  async pingWebhook(webhookId: string): Promise<{ success: boolean; response_code?: number }> {
    const response = await this.post<{ success: boolean; response_code?: number }>(
      `/webhook/${webhookId}/ping`
    );
    return response;
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   */
  validateWebhookSignature(request: ValidateWebhookSignatureRequest): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', request.secret)
        .update(request.payload)
        .digest('hex');
      
      // ClickUp sends signature as 'sha256=<hash>'
      const receivedSignature = request.signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(request: ProcessWebhookRequest): Promise<{
    valid: boolean;
    objectType: string;
    objectId: string | number;
    operation: string;
    workspaceId: number;
    userId: number;
    timestamp: Date;
    changes: Array<{ field: string; before?: any; after?: any }>;
    relationships: Array<{ type: string; object_type: string; object_id: string | number }>;
  }> {
    // Validate signature if required
    if (request.validate_signature && request.signature && request.secret) {
      const isValidSignature = this.validateWebhookSignature({
        payload: JSON.stringify(request.payload),
        signature: request.signature,
        secret: request.secret
      });

      if (!isValidSignature) {
        return {
          valid: false,
          objectType: '',
          objectId: '',
          operation: '',
          workspaceId: 0,
          userId: 0,
          timestamp: new Date(),
          changes: [],
          relationships: []
        };
      }
    }

    const payload = request.payload;
    const operationMap: Record<string, string> = {
      'c': 'create',
      'u': 'update',
      'd': 'delete'
    };

    return {
      valid: true,
      objectType: payload.version.object_type,
      objectId: payload.version.object_id,
      operation: operationMap[payload.version.operation] || payload.version.operation,
      workspaceId: payload.version.workspace_id,
      userId: payload.version.data.context.audit_context.userid,
      timestamp: new Date(payload.date),
      changes: payload.version.data.changes,
      relationships: payload.version.data.relationships
    };
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string, days?: number): Promise<{
    total_events: number;
    successful_events: number;
    failed_events: number;
    success_rate: number;
    average_response_time: number;
  }> {
    const params = new URLSearchParams();
    if (days) {
      params.append('days', days.toString());
    }

    const queryString = params.toString();
    const endpoint = `/webhook/${webhookId}/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<{
      total_events: number;
      successful_events: number;
      failed_events: number;
      success_rate: number;
      average_response_time: number;
    }>(endpoint);
    
    return response;
  }

  /**
   * Retry failed webhook events
   */
  async retryWebhookEvents(webhookId: string, eventIds?: string[]): Promise<{ success: boolean; retried_count: number }> {
    const response = await this.post<{ success: boolean; retried_count: number }>(
      `/webhook/${webhookId}/retry`,
      eventIds ? { event_ids: eventIds } : {}
    );
    return response;
  }
}
