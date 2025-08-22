import { z } from 'zod';

// ========================================
// CHAT CHANNEL SCHEMAS
// ========================================

export const ChannelTypeSchema = z.enum(['public', 'private', 'direct']);

export const CreateChannelSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: ChannelTypeSchema.default('public'),
  members: z.array(z.number()).optional(),
  is_private: z.boolean().optional()
});

export const CreateChannelOnParentSchema = z.object({
  parent_id: z.string().min(1),
  parent_type: z.enum(['space', 'folder', 'list']),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: ChannelTypeSchema.default('public'),
  members: z.array(z.number()).optional(),
  is_private: z.boolean().optional()
});

export const CreateDirectMessageSchema = z.object({
  workspace_id: z.string().min(1),
  members: z.array(z.number()).min(2),
  name: z.string().optional()
});

export const UpdateChannelSchema = z.object({
  channel_id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  is_private: z.boolean().optional()
});

export const GetChannelsFilterSchema = z.object({
  workspace_id: z.string().min(1),
  archived: z.boolean().optional(),
  type: ChannelTypeSchema.optional()
});

// ========================================
// CHAT MESSAGE SCHEMAS
// ========================================

export const MessageContentSchema = z.object({
  text: z.string().min(1),
  mentions: z.array(z.number()).optional(),
  attachments: z.array(z.string()).optional()
});

export const SendMessageSchema = z.object({
  channel_id: z.string().min(1),
  text: z.string().min(1),
  mentions: z.array(z.number()).optional(),
  attachments: z.array(z.string()).optional(),
  reply_to: z.string().optional()
});

export const UpdateMessageSchema = z.object({
  channel_id: z.string().min(1),
  message_id: z.string().min(1),
  text: z.string().min(1),
  mentions: z.array(z.number()).optional()
});

export const CreateReplySchema = z.object({
  channel_id: z.string().min(1),
  message_id: z.string().min(1),
  text: z.string().min(1),
  mentions: z.array(z.number()).optional(),
  attachments: z.array(z.string()).optional()
});

export const GetMessagesFilterSchema = z.object({
  channel_id: z.string().min(1),
  limit: z.number().min(1).max(100).optional(),
  before: z.string().optional(),
  after: z.string().optional()
});

export const GetRepliesFilterSchema = z.object({
  channel_id: z.string().min(1),
  message_id: z.string().min(1),
  limit: z.number().min(1).max(100).optional(),
  before: z.string().optional(),
  after: z.string().optional()
});

// ========================================
// CHAT REACTION SCHEMAS
// ========================================

export const ReactionTypeSchema = z.enum([
  'thumbs_up', 'thumbs_down', 'heart', 'laugh', 'surprised', 'sad', 'angry',
  'fire', 'party', 'rocket', 'eyes', 'thinking', 'clap', 'pray'
]);

export const CreateReactionSchema = z.object({
  channel_id: z.string().min(1),
  message_id: z.string().min(1),
  reaction: ReactionTypeSchema
});

export const DeleteReactionSchema = z.object({
  channel_id: z.string().min(1),
  message_id: z.string().min(1),
  reaction: ReactionTypeSchema
});

// ========================================
// CHAT MEMBER SCHEMAS
// ========================================

export const AddChannelMemberSchema = z.object({
  channel_id: z.string().min(1),
  user_id: z.number()
});

export const RemoveChannelMemberSchema = z.object({
  channel_id: z.string().min(1),
  user_id: z.number()
});

// ========================================
// RESPONSE TYPE SCHEMAS
// ========================================

export const ChatChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: ChannelTypeSchema,
  is_private: z.boolean(),
  workspace_id: z.string(),
  parent_id: z.string().optional(),
  parent_type: z.enum(['space', 'folder', 'list']).optional(),
  created_by: z.number(),
  date_created: z.string(),
  date_updated: z.string(),
  member_count: z.number(),
  unread_count: z.number().optional()
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  channel_id: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    profilePicture: z.string().optional()
  }),
  date_created: z.string(),
  date_updated: z.string().optional(),
  reply_to: z.string().optional(),
  mentions: z.array(z.number()).optional(),
  reactions: z.array(z.object({
    reaction: ReactionTypeSchema,
    users: z.array(z.number()),
    count: z.number()
  })).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    url: z.string(),
    size: z.number()
  })).optional()
});

export const ChatReactionSchema = z.object({
  reaction: ReactionTypeSchema,
  users: z.array(z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    profilePicture: z.string().optional()
  })),
  count: z.number()
});

export const ChatMemberSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  color: z.string(),
  profilePicture: z.string().optional(),
  role: z.string().optional(),
  date_joined: z.string()
});

// ========================================
// TYPE EXPORTS
// ========================================

export type CreateChannelRequest = z.infer<typeof CreateChannelSchema>;
export type CreateChannelOnParentRequest = z.infer<typeof CreateChannelOnParentSchema>;
export type CreateDirectMessageRequest = z.infer<typeof CreateDirectMessageSchema>;
export type UpdateChannelRequest = z.infer<typeof UpdateChannelSchema>;
export type GetChannelsFilter = z.infer<typeof GetChannelsFilterSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageSchema>;
export type UpdateMessageRequest = z.infer<typeof UpdateMessageSchema>;
export type CreateReplyRequest = z.infer<typeof CreateReplySchema>;
export type GetMessagesFilter = z.infer<typeof GetMessagesFilterSchema>;
export type GetRepliesFilter = z.infer<typeof GetRepliesFilterSchema>;
export type CreateReactionRequest = z.infer<typeof CreateReactionSchema>;
export type DeleteReactionRequest = z.infer<typeof DeleteReactionSchema>;
export type AddChannelMemberRequest = z.infer<typeof AddChannelMemberSchema>;
export type RemoveChannelMemberRequest = z.infer<typeof RemoveChannelMemberSchema>;
export type ChatChannel = z.infer<typeof ChatChannelSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatReaction = z.infer<typeof ChatReactionSchema>;
export type ChatMember = z.infer<typeof ChatMemberSchema>;
