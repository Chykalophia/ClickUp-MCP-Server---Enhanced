import { z } from 'zod';

// ========================================
// SHARED ENUMS (ClickUp Chat API v3)
// ========================================

export const ChannelVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);

export const ChannelTypeSchema = z.enum(['CHANNEL', 'DM', 'GROUP_DM']);

export const ChannelLocationTypeSchema = z.enum(['space', 'folder', 'list']);

export const ContentFormatSchema = z.enum(['text/md', 'text/plain']);

export const MessageTypeSchema = z.enum(['message', 'post']);

// ========================================
// CHAT CHANNEL REQUEST SCHEMAS
// ========================================

export const GetChannelsFilterSchema = z.object({
  workspace_id: z.string().min(1),
  description_format: z.enum(['text/md', 'text/plain']).optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  is_follower: z.boolean().optional(),
  include_closed: z.boolean().optional(),
  with_message_since: z.number().optional(),
  channel_types: z.array(ChannelTypeSchema).optional(),
});

export const CreateChannelSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  topic: z.string().optional(),
  user_ids: z.array(z.string()).max(100).optional(),
  visibility: ChannelVisibilitySchema.optional(),
});

export const CreateChannelOnParentSchema = z.object({
  workspace_id: z.string().min(1),
  parent_id: z.string().min(1),
  parent_type: ChannelLocationTypeSchema,
  description: z.string().optional(),
  topic: z.string().optional(),
  user_ids: z.array(z.string()).max(100).optional(),
  visibility: ChannelVisibilitySchema.optional(),
});

export const CreateDirectMessageSchema = z.object({
  workspace_id: z.string().min(1),
  user_ids: z.array(z.string()).max(15).optional(),
});

export const UpdateChannelSchema = z.object({
  workspace_id: z.string().min(1),
  channel_id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  visibility: ChannelVisibilitySchema.optional(),
  location: z
    .object({
      id: z.string().min(1),
      type: ChannelLocationTypeSchema,
    })
    .optional(),
});

export const GetChannelUsersFilterSchema = z.object({
  workspace_id: z.string().min(1),
  channel_id: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

// ========================================
// CHAT MESSAGE REQUEST SCHEMAS
// ========================================

export const GetMessagesFilterSchema = z.object({
  workspace_id: z.string().min(1),
  channel_id: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  content_format: ContentFormatSchema.optional(),
});

export const SendMessageSchema = z.object({
  workspace_id: z.string().min(1),
  channel_id: z.string().min(1),
  type: MessageTypeSchema.default('message'),
  content: z.string().min(1),
  content_format: ContentFormatSchema.optional(),
  assignee: z.string().optional(),
  group_assignee: z.string().optional(),
  followers: z.array(z.string()).optional(),
  post_data: z
    .object({
      title: z.string().max(255),
      subtype: z.object({ id: z.string() }).passthrough(),
    })
    .passthrough()
    .optional(),
});

export const UpdateMessageSchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  content: z.string().min(1).optional(),
  content_format: ContentFormatSchema.optional(),
  assignee: z.string().optional(),
  group_assignee: z.string().optional(),
  resolved: z.boolean().optional(),
  post_data: z
    .object({
      title: z.string().max(255),
      subtype: z.object({ id: z.string() }).passthrough(),
    })
    .passthrough()
    .optional(),
});

export const GetRepliesFilterSchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  content_format: ContentFormatSchema.optional(),
});

export const CreateReplySchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  type: MessageTypeSchema.default('message'),
  content: z.string().min(1),
  content_format: ContentFormatSchema.optional(),
  assignee: z.string().optional(),
  group_assignee: z.string().optional(),
  followers: z.array(z.string()).optional(),
  post_data: z
    .object({
      title: z.string().max(255),
      subtype: z.object({ id: z.string() }).passthrough(),
    })
    .passthrough()
    .optional(),
});

// ========================================
// CHAT REACTION REQUEST SCHEMAS
// ========================================

export const GetReactionsFilterSchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const CreateReactionSchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  reaction: z.string().min(1),
});

export const DeleteReactionSchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  reaction: z.string().min(1),
});

// ========================================
// TAGGED USERS REQUEST SCHEMAS
// ========================================

export const GetTaggedUsersFilterSchema = z.object({
  workspace_id: z.string().min(1),
  message_id: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

// ========================================
// RESPONSE TYPE SCHEMAS (v3 shapes)
// ========================================

export const ChatSimpleUserSchema = z
  .object({
    id: z.string(),
    email: z.string().optional(),
    initials: z.string().optional(),
    name: z.string().optional(),
    username: z.string().optional(),
  })
  .passthrough();

export const ChatChannelSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    topic: z.string().optional(),
    type: z.string().optional(),
    visibility: ChannelVisibilitySchema.optional(),
    parent: z
      .object({
        id: z.string(),
        type: z.union([z.string(), z.number()]),
      })
      .passthrough()
      .optional(),
    creator: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_follower: z.boolean().optional(),
    counts: z.record(z.any()).optional(),
    latest_comment_at: z.union([z.string(), z.number()]).nullable().optional(),
    links: z.record(z.any()).optional(),
  })
  .passthrough();

export const ChatMessageSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    content: z.string().optional(),
    user_id: z.string().optional(),
    date: z.number().optional(),
    date_updated: z.number().nullable().optional(),
    parent_channel: z.string().optional(),
    parent_message: z.string().nullable().optional(),
    resolved: z.boolean().optional(),
    replies_count: z.number().optional(),
    assignee: z.string().nullable().optional(),
    group_assignee: z.string().nullable().optional(),
    post_data: z
    .object({
      title: z.string().max(255),
      subtype: z.object({ id: z.string() }).passthrough().optional(),
    })
    .passthrough()
    .optional(),
    links: z.record(z.any()).optional(),
  })
  .passthrough();

export const ChatReactionSchema = z
  .object({
    date: z.number(),
    reaction: z.string(),
    user_id: z.string(),
  })
  .passthrough();

// ========================================
// TYPE EXPORTS
// ========================================

export type ChannelVisibility = z.infer<typeof ChannelVisibilitySchema>;
export type ChannelType = z.infer<typeof ChannelTypeSchema>;
export type ContentFormat = z.infer<typeof ContentFormatSchema>;
export type GetChannelsFilter = z.infer<typeof GetChannelsFilterSchema>;
export type CreateChannelRequest = z.infer<typeof CreateChannelSchema>;
export type CreateChannelOnParentRequest = z.infer<typeof CreateChannelOnParentSchema>;
export type CreateDirectMessageRequest = z.infer<typeof CreateDirectMessageSchema>;
export type UpdateChannelRequest = z.infer<typeof UpdateChannelSchema>;
export type GetChannelUsersFilter = z.infer<typeof GetChannelUsersFilterSchema>;
export type GetMessagesFilter = z.infer<typeof GetMessagesFilterSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageSchema>;
export type UpdateMessageRequest = z.infer<typeof UpdateMessageSchema>;
export type GetRepliesFilter = z.infer<typeof GetRepliesFilterSchema>;
export type CreateReplyRequest = z.infer<typeof CreateReplySchema>;
export type GetReactionsFilter = z.infer<typeof GetReactionsFilterSchema>;
export type CreateReactionRequest = z.infer<typeof CreateReactionSchema>;
export type DeleteReactionRequest = z.infer<typeof DeleteReactionSchema>;
export type GetTaggedUsersFilter = z.infer<typeof GetTaggedUsersFilterSchema>;
export type ChatSimpleUser = z.infer<typeof ChatSimpleUserSchema>;
export type ChatChannel = z.infer<typeof ChatChannelSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatReaction = z.infer<typeof ChatReactionSchema>;
