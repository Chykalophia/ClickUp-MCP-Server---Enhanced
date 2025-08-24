import { z } from 'zod';

// Base webhook relationship schema
export const WebhookRelationshipSchema = z.object({
  type: z.string(),
  object_type: z.string(),
  object_id: z.union([z.string(), z.number()]),
  workspace_id: z.string()
});

// Webhook change schema
export const WebhookChangeSchema = z.object({
  field: z.string(),
  before: z.any().optional(),
  after: z.any().optional()
});

// Audit context schema
export const AuditContextSchema = z.object({
  userid: z.number(),
  current_time: z.number(),
  route: z.string()
});

// Webhook context schema
export const WebhookContextSchema = z.object({
  root_parent_type: z.number(),
  is_chat: z.boolean(),
  audit_context: AuditContextSchema,
  originating_service: z.string()
});

// Webhook version data schema
export const WebhookVersionDataSchema = z.object({
  context: WebhookContextSchema,
  relationships: z.array(WebhookRelationshipSchema),
  changes: z.array(WebhookChangeSchema)
});

// Webhook version schema
export const WebhookVersionSchema = z.object({
  object_type: z.string(),
  object_id: z.union([z.string(), z.number()]),
  workspace_id: z.number(),
  operation: z.enum(['c', 'u', 'd']), // create, update, delete
  data: WebhookVersionDataSchema,
  master_id: z.number(),
  version: z.number(),
  deleted: z.boolean(),
  traceparent: z.string(),
  date_created: z.number(),
  date_updated: z.number(),
  event_publish_time: z.number()
});

// Main webhook payload schema
export const WebhookPayloadSchema = z.object({
  id: z.number(),
  hist_id: z.string(),
  date: z.number(),
  version: WebhookVersionSchema
});

// Webhook configuration schemas
export const WebhookEventSchema = z.enum([
  'taskCreated',
  'taskUpdated',
  'taskDeleted',
  'taskStatusUpdated',
  'taskAssigneeUpdated',
  'taskDueDateUpdated',
  'taskCommentPosted',
  'taskCommentUpdated',
  'taskTimeTracked',
  'taskTimeUpdated',
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
  'goalTargetUpdated'
]);

export const CreateWebhookSchema = z.object({
  workspace_id: z.string(),
  endpoint: z.string().url(),
  events: z.array(WebhookEventSchema),
  health_check_url: z.string().url().optional(),
  secret: z.string().optional()
});

export const UpdateWebhookSchema = z.object({
  webhook_id: z.string(),
  endpoint: z.string().url().optional(),
  events: z.array(WebhookEventSchema).optional(),
  health_check_url: z.string().url().optional(),
  secret: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export const WebhookFilterSchema = z.object({
  workspace_id: z.string(),
  status: z.enum(['active', 'inactive']).optional(),
  event_type: WebhookEventSchema.optional()
});

// Webhook signature validation schema
export const ValidateWebhookSignatureSchema = z.object({
  payload: z.string(),
  signature: z.string(),
  secret: z.string()
});

// Webhook processing schemas
export const ProcessWebhookSchema = z.object({
  payload: WebhookPayloadSchema,
  validate_signature: z.boolean().default(true),
  signature: z.string().optional(),
  secret: z.string().optional()
});

// Type exports
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type WebhookRelationship = z.infer<typeof WebhookRelationshipSchema>;
export type WebhookChange = z.infer<typeof WebhookChangeSchema>;
export type WebhookContext = z.infer<typeof WebhookContextSchema>;
export type WebhookVersionData = z.infer<typeof WebhookVersionDataSchema>;
export type WebhookVersion = z.infer<typeof WebhookVersionSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type CreateWebhookRequest = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookRequest = z.infer<typeof UpdateWebhookSchema>;
export type WebhookFilter = z.infer<typeof WebhookFilterSchema>;
export type ValidateWebhookSignatureRequest = z.infer<typeof ValidateWebhookSignatureSchema>;
export type ProcessWebhookRequest = z.infer<typeof ProcessWebhookSchema>;

// Utility functions for webhook processing
export const parseWebhookTimestamp = (timestamp: number): Date => {
  return new Date(timestamp);
};

export const getWebhookOperationType = (operation: string): string => {
  const operationMap: Record<string, string> = {
    'c': 'create',
    'u': 'update',
    'd': 'delete'
  };
  return operationMap[operation] || operation;
};

export const extractWebhookObjectInfo = (payload: WebhookPayload) => {
  return {
    objectType: payload.version.object_type,
    objectId: payload.version.object_id,
    workspaceId: payload.version.workspace_id,
    operation: getWebhookOperationType(payload.version.operation),
    timestamp: parseWebhookTimestamp(payload.date),
    userId: payload.version.data.context.audit_context.userid
  };
};
