import { ClickUpClient } from './index.js';
import type {
  CreateChannelRequest,
  CreateChannelOnParentRequest,
  CreateDirectMessageRequest,
  UpdateChannelRequest,
  GetChannelsFilter,
  SendMessageRequest,
  UpdateMessageRequest,
  CreateReplyRequest,
  GetMessagesFilter,
  GetRepliesFilter,
  CreateReactionRequest,
  DeleteReactionRequest,
  AddChannelMemberRequest,
  RemoveChannelMemberRequest,
  ChatChannel,
  ChatMessage,
  ChatReaction,
  ChatMember
} from '../schemas/chat-schemas.js';

export interface ChatChannelsResponse {
  channels: ChatChannel[];
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  has_more: boolean;
  next_cursor?: string;
}

export interface ChatRepliesResponse {
  replies: ChatMessage[];
  has_more: boolean;
  next_cursor?: string;
}

export interface ChatReactionsResponse {
  reactions: ChatReaction[];
}

export interface ChatMembersResponse {
  members: ChatMember[];
}

export interface ChatFollowersResponse {
  followers: ChatMember[];
}

export interface TaggedUsersResponse {
  tagged_users: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  }[];
}

export class ChatEnhancedClient {
  private client: ClickUpClient;

  constructor(apiToken: string) {
    this.client = new ClickUpClient({ apiToken });
  }

  // ========================================
  // CHANNEL MANAGEMENT
  // ========================================

  /**
   * Retrieve all channels in a workspace
   */
  async getChannels(filter: GetChannelsFilter): Promise<ChatChannelsResponse> {
    const params: any = {};
    if (filter.archived !== undefined) params.archived = filter.archived;
    if (filter.type) params.type = filter.type;

    return this.client.get<ChatChannelsResponse>(
      `/team/${filter.workspace_id}/chat/channels`,
      params
    );
  }

  /**
   * Create a new channel in a workspace
   */
  async createChannel(request: CreateChannelRequest): Promise<ChatChannel> {
    const { workspace_id, ...channelData } = request;
    return this.client.post<ChatChannel>(
      `/team/${workspace_id}/chat/channel`,
      channelData
    );
  }

  /**
   * Create a channel on a specific space, folder, or list
   */
  async createChannelOnParent(request: CreateChannelOnParentRequest): Promise<ChatChannel> {
    const { parent_id, parent_type, ...channelData } = request;
    return this.client.post<ChatChannel>(
      `/${parent_type}/${parent_id}/chat/channel`,
      channelData
    );
  }

  /**
   * Create a direct message channel
   */
  async createDirectMessage(request: CreateDirectMessageRequest): Promise<ChatChannel> {
    const { workspace_id, ...dmData } = request;
    return this.client.post<ChatChannel>(
      `/team/${workspace_id}/chat/dm`,
      dmData
    );
  }

  /**
   * Get a single channel by ID
   */
  async getChannel(channelId: string): Promise<ChatChannel> {
    return this.client.get<ChatChannel>(`/chat/channel/${channelId}`);
  }

  /**
   * Update a channel
   */
  async updateChannel(request: UpdateChannelRequest): Promise<ChatChannel> {
    const { channel_id, ...updateData } = request;
    return this.client.patch<ChatChannel>(
      `/chat/channel/${channel_id}`,
      updateData
    );
  }

  /**
   * Delete a channel (NOT IMPLEMENTED - too dangerous as per instructions)
   */
  // async deleteChannel(channelId: string): Promise<void> {
  //   return this.client.delete(`/chat/channel/${channelId}`);
  // }

  // ========================================
  // CHANNEL MEMBERS & FOLLOWERS
  // ========================================

  /**
   * Get channel followers
   */
  async getChannelFollowers(channelId: string): Promise<ChatFollowersResponse> {
    return this.client.get<ChatFollowersResponse>(`/chat/channel/${channelId}/followers`);
  }

  /**
   * Get channel members
   */
  async getChannelMembers(channelId: string): Promise<ChatMembersResponse> {
    return this.client.get<ChatMembersResponse>(`/chat/channel/${channelId}/members`);
  }

  /**
   * Add member to channel
   */
  async addChannelMember(request: AddChannelMemberRequest): Promise<void> {
    const { channel_id, user_id } = request;
    return this.client.post(`/chat/channel/${channel_id}/member/${user_id}`, {});
  }

  /**
   * Remove member from channel
   */
  async removeChannelMember(request: RemoveChannelMemberRequest): Promise<void> {
    const { channel_id, user_id } = request;
    return this.client.delete(`/chat/channel/${channel_id}/member/${user_id}`);
  }

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================

  /**
   * Get messages from a channel
   */
  async getChannelMessages(filter: GetMessagesFilter): Promise<ChatMessagesResponse> {
    const { channel_id, ...params } = filter;
    return this.client.get<ChatMessagesResponse>(
      `/chat/channel/${channel_id}/messages`,
      params
    );
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
    const { channel_id, ...messageData } = request;
    return this.client.post<ChatMessage>(
      `/chat/channel/${channel_id}/message`,
      messageData
    );
  }

  /**
   * Update a message
   */
  async updateMessage(request: UpdateMessageRequest): Promise<ChatMessage> {
    const { channel_id, message_id, ...updateData } = request;
    return this.client.patch<ChatMessage>(
      `/chat/channel/${channel_id}/message/${message_id}`,
      updateData
    );
  }

  /**
   * Delete a message
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    return this.client.delete(`/chat/channel/${channelId}/message/${messageId}`);
  }

  // ========================================
  // MESSAGE REPLIES
  // ========================================

  /**
   * Get replies to a message
   */
  async getMessageReplies(filter: GetRepliesFilter): Promise<ChatRepliesResponse> {
    const { channel_id, message_id, ...params } = filter;
    return this.client.get<ChatRepliesResponse>(
      `/chat/channel/${channel_id}/message/${message_id}/replies`,
      params
    );
  }

  /**
   * Create a reply to a message
   */
  async createReply(request: CreateReplyRequest): Promise<ChatMessage> {
    const { channel_id, message_id, ...replyData } = request;
    return this.client.post<ChatMessage>(
      `/chat/channel/${channel_id}/message/${message_id}/reply`,
      replyData
    );
  }

  // ========================================
  // MESSAGE REACTIONS
  // ========================================

  /**
   * Get reactions for a message
   */
  async getMessageReactions(channelId: string, messageId: string): Promise<ChatReactionsResponse> {
    return this.client.get<ChatReactionsResponse>(
      `/chat/channel/${channelId}/message/${messageId}/reactions`
    );
  }

  /**
   * Create a reaction on a message
   */
  async createReaction(request: CreateReactionRequest): Promise<void> {
    const { channel_id, message_id, reaction } = request;
    return this.client.post(
      `/chat/channel/${channel_id}/message/${message_id}/reaction/${reaction}`,
      {}
    );
  }

  /**
   * Delete a reaction from a message
   */
  async deleteReaction(request: DeleteReactionRequest): Promise<void> {
    const { channel_id, message_id, reaction } = request;
    return this.client.delete(
      `/chat/channel/${channel_id}/message/${message_id}/reaction/${reaction}`
    );
  }

  // ========================================
  // TAGGED USERS
  // ========================================

  /**
   * Get tagged users for a message
   */
  async getTaggedUsers(channelId: string, messageId: string): Promise<TaggedUsersResponse> {
    return this.client.get<TaggedUsersResponse>(
      `/chat/channel/${channelId}/message/${messageId}/tagged`
    );
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Search channels by name
   */
  async searchChannels(workspaceId: string, query: string): Promise<ChatChannelsResponse> {
    return this.client.get<ChatChannelsResponse>(
      `/team/${workspaceId}/chat/channels`,
      { search: query }
    );
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(channelId: string): Promise<{
    message_count: number;
    member_count: number;
    last_activity: string;
  }> {
    return this.client.get(`/chat/channel/${channelId}/stats`);
  }

  /**
   * Mark channel as read
   */
  async markChannelAsRead(channelId: string): Promise<void> {
    return this.client.post(`/chat/channel/${channelId}/read`, {});
  }

  /**
   * Get unread message count for channel
   */
  async getUnreadCount(channelId: string): Promise<{ unread_count: number }> {
    return this.client.get(`/chat/channel/${channelId}/unread`);
  }
}
