import { z } from 'zod';
import { idSchema } from './common.js';

// The 27 webhook events supported by the ClickUp API, plus the '*' wildcard
// which subscribes a webhook to all events.
export const WEBHOOK_EVENTS = [
  'taskCreated',
  'taskUpdated',
  'taskDeleted',
  'taskPriorityUpdated',
  'taskStatusUpdated',
  'taskAssigneeUpdated',
  'taskDueDateUpdated',
  'taskTagUpdated',
  'taskMoved',
  'taskCommentPosted',
  'taskCommentUpdated',
  'taskTimeEstimateUpdated',
  'taskTimeTrackedUpdated',
  'listCreated',
  'listUpdated',
  'listDeleted',
  'folderCreated',
  'folderUpdated',
  'folderDeleted',
  'spaceCreated',
  'spaceUpdated',
  'spaceDeleted',
  'goalCreated',
  'goalUpdated',
  'goalDeleted',
  'keyResultCreated',
  'keyResultUpdated',
  'keyResultDeleted',
  '*',
] as const;

export const WebhookEventSchema = z.enum(WEBHOOK_EVENTS);

// A single history item from a ClickUp webhook delivery payload
export const WebhookHistoryItemSchema = z
  .object({
    id: z.string(),
    type: z.number(),
    date: z.string(),
    field: z.string(),
    parent_id: z.string(),
    data: z.record(z.any()),
    source: z.string().nullable(),
    user: z.record(z.any()),
    before: z.any(),
    after: z.any(),
  })
  .partial()
  .passthrough();

// ClickUp webhook delivery payload:
// { webhook_id, event, task_id?, history_items? }
export const WebhookPayloadSchema = z
  .object({
    webhook_id: z.string(),
    event: z.string(),
    task_id: z.string().optional(),
    history_items: z.array(WebhookHistoryItemSchema).optional(),
  })
  .passthrough();

// Webhook configuration schemas
export const CreateWebhookSchema = z.object({
  workspace_id: z.string(),
  endpoint: z.string().url(),
  events: z.array(WebhookEventSchema),
  space_id: z.number().optional(),
  folder_id: z.number().optional(),
  list_id: z.number().optional(),
  task_id: z.string().optional(),
});

// ClickUp's Update Webhook endpoint requires the full { endpoint, events, status }
// body; workspace_id is required so the current webhook can be fetched (via the
// list endpoint) and merged with the caller's changes before sending the PUT.
export const UpdateWebhookSchema = z.object({
  webhook_id: idSchema(),
  workspace_id: idSchema(),
  endpoint: z.string().url().optional(),
  events: z.array(WebhookEventSchema).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Filter options for listing webhooks. The Get Webhooks endpoint accepts no
// query parameters, so status/event_type are applied client-side. The status
// filter matches ClickUp's webhook health states.
export const WebhookFilterSchema = z.object({
  workspace_id: z.string(),
  status: z.enum(['active', 'failing', 'suspended']).optional(),
  event_type: WebhookEventSchema.optional(),
});

// Webhook signature validation schema.
// payload must be the raw request body string exactly as received.
export const ValidateWebhookSignatureSchema = z.object({
  payload: z.string(),
  signature: z.string(),
  secret: z.string(),
});

// Webhook processing schema.
// body is the raw request body string; the signature is verified over these
// exact bytes before the body is parsed.
export const ProcessWebhookSchema = z.object({
  body: z.string(),
  validate_signature: z.boolean().default(true),
  signature: z.string().optional(),
  secret: z.string().optional(),
}).refine(
  data => !data.validate_signature || (!!data.signature && !!data.secret),
  { message: 'signature and secret are required when validate_signature is true' }
);

// Type exports
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type WebhookHistoryItem = z.infer<typeof WebhookHistoryItemSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type CreateWebhookRequest = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookRequest = z.infer<typeof UpdateWebhookSchema>;
export type WebhookFilter = z.infer<typeof WebhookFilterSchema>;
export type ValidateWebhookSignatureRequest = z.infer<typeof ValidateWebhookSignatureSchema>;
export type ProcessWebhookRequest = z.infer<typeof ProcessWebhookSchema>;

// Utility function for webhook processing
export const extractWebhookObjectInfo = (payload: WebhookPayload) => {
  return {
    webhookId: payload.webhook_id,
    event: payload.event,
    taskId: payload.task_id,
    historyItems: payload.history_items ?? [],
  };
};
