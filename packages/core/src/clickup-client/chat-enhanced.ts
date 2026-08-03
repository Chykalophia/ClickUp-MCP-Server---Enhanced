import { ClickUpClient } from './index.js';
import type {
  CreateChannelRequest,
  CreateChannelOnParentRequest,
  CreateDirectMessageRequest,
  UpdateChannelRequest,
  GetChannelsFilter,
  GetChannelUsersFilter,
  SendMessageRequest,
  UpdateMessageRequest,
  CreateReplyRequest,
  GetMessagesFilter,
  GetRepliesFilter,
  GetReactionsFilter,
  CreateReactionRequest,
  DeleteReactionRequest,
  GetTaggedUsersFilter,
  ChatChannel,
  ChatMessage,
  ChatReaction,
  ChatSimpleUser,
} from '../schemas/chat-schemas.js';

// The ClickUp Chat API only exists under API v3
const CHAT_API_BASE_URL = 'https://api.clickup.com/api/v3';

// All v3 chat list endpoints share the {data, next_cursor} envelope
export interface ChatPaginatedResponse<T> {
  data: T[];
  next_cursor?: string | null;
}

// Single-object responses are wrapped in {data: {...}}
interface ChatDataResponse<T> {
  data: T;
}

export type ChatChannelsResponse = ChatPaginatedResponse<ChatChannel>;
export type ChatMessagesResponse = ChatPaginatedResponse<ChatMessage>;
export type ChatRepliesResponse = ChatPaginatedResponse<ChatMessage>;
export type ChatReactionsResponse = ChatPaginatedResponse<ChatReaction>;
export type ChatMembersResponse = ChatPaginatedResponse<ChatSimpleUser>;
export type ChatFollowersResponse = ChatPaginatedResponse<ChatSimpleUser>;
export type TaggedUsersResponse = ChatPaginatedResponse<ChatSimpleUser>;

export class ChatEnhancedClient {
  private client: ClickUpClient;

  constructor(apiToken: string) {
    this.client = new ClickUpClient({ apiToken, baseUrl: CHAT_API_BASE_URL });
  }

  // ========================================
  // CHANNEL MANAGEMENT
  // ========================================

  /**
   * Retrieve channels in a workspace (cursor-paginated)
   */
  async getChannels(filter: GetChannelsFilter): Promise<ChatChannelsResponse> {
    const { workspace_id, ...params } = filter;
    return this.client.get<ChatChannelsResponse>(
      `/workspaces/${workspace_id}/chat/channels`,
      params
    );
  }

  /**
   * Create a new channel in a workspace
   */
  async createChannel(request: CreateChannelRequest): Promise<ChatChannel> {
    const { workspace_id, ...channelData } = request;
    const response = await this.client.post<ChatDataResponse<ChatChannel>>(
      `/workspaces/${workspace_id}/chat/channels`,
      channelData
    );
    return response.data;
  }

  /**
   * Create a channel on a specific space, folder, or list
   * (the channel name derives from the location; no name field)
   */
  async createChannelOnParent(request: CreateChannelOnParentRequest): Promise<ChatChannel> {
    const { workspace_id, parent_id, parent_type, ...channelData } = request;
    const response = await this.client.post<ChatDataResponse<ChatChannel>>(
      `/workspaces/${workspace_id}/chat/channels/location`,
      {
        ...channelData,
        location: { id: parent_id, type: parent_type },
      }
    );
    return response.data;
  }

  /**
   * Create a direct message channel (up to 15 users; empty = self DM)
   */
  async createDirectMessage(request: CreateDirectMessageRequest): Promise<ChatChannel> {
    const { workspace_id, ...dmData } = request;
    const response = await this.client.post<ChatDataResponse<ChatChannel>>(
      `/workspaces/${workspace_id}/chat/channels/direct_message`,
      dmData
    );
    return response.data;
  }

  /**
   * Get a single channel by ID
   */
  async getChannel(workspaceId: string, channelId: string): Promise<ChatChannel> {
    const response = await this.client.get<ChatDataResponse<ChatChannel>>(
      `/workspaces/${workspaceId}/chat/channels/${channelId}`
    );
    return response.data;
  }

  /**
   * Update a channel
   */
  async updateChannel(request: UpdateChannelRequest): Promise<ChatChannel> {
    const { workspace_id, channel_id, ...updateData } = request;
    const response = await this.client.patch<ChatDataResponse<ChatChannel>>(
      `/workspaces/${workspace_id}/chat/channels/${channel_id}`,
      updateData
    );
    return response.data;
  }

  // ========================================
  // CHANNEL MEMBERS & FOLLOWERS
  // ========================================

  /**
   * Get channel followers (cursor-paginated)
   */
  async getChannelFollowers(filter: GetChannelUsersFilter): Promise<ChatFollowersResponse> {
    const { workspace_id, channel_id, ...params } = filter;
    return this.client.get<ChatFollowersResponse>(
      `/workspaces/${workspace_id}/chat/channels/${channel_id}/followers`,
      params
    );
  }

  /**
   * Get channel members (cursor-paginated)
   */
  async getChannelMembers(filter: GetChannelUsersFilter): Promise<ChatMembersResponse> {
    const { workspace_id, channel_id, ...params } = filter;
    return this.client.get<ChatMembersResponse>(
      `/workspaces/${workspace_id}/chat/channels/${channel_id}/members`,
      params
    );
  }

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================

  /**
   * Get messages from a channel (cursor-paginated)
   */
  async getChannelMessages(filter: GetMessagesFilter): Promise<ChatMessagesResponse> {
    const { workspace_id, channel_id, ...params } = filter;
    return this.client.get<ChatMessagesResponse>(
      `/workspaces/${workspace_id}/chat/channels/${channel_id}/messages`,
      params
    );
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
    const { workspace_id, channel_id, ...messageData } = request;
    return this.client.post<ChatMessage>(
      `/workspaces/${workspace_id}/chat/channels/${channel_id}/messages`,
      messageData
    );
  }

  /**
   * Update a message (message IDs are workspace-scoped in v3)
   */
  async updateMessage(request: UpdateMessageRequest): Promise<ChatMessage> {
    const { workspace_id, message_id, ...updateData } = request;
    return this.client.patch<ChatMessage>(
      `/workspaces/${workspace_id}/chat/messages/${message_id}`,
      updateData
    );
  }

  /**
   * Delete a message (204 No Content)
   */
  async deleteMessage(workspaceId: string, messageId: string): Promise<void> {
    await this.client.delete(`/workspaces/${workspaceId}/chat/messages/${messageId}`);
  }

  // ========================================
  // MESSAGE REPLIES
  // ========================================

  /**
   * Get replies to a message (cursor-paginated)
   */
  async getMessageReplies(filter: GetRepliesFilter): Promise<ChatRepliesResponse> {
    const { workspace_id, message_id, ...params } = filter;
    return this.client.get<ChatRepliesResponse>(
      `/workspaces/${workspace_id}/chat/messages/${message_id}/replies`,
      params
    );
  }

  /**
   * Create a reply to a message
   */
  async createReply(request: CreateReplyRequest): Promise<ChatMessage> {
    const { workspace_id, message_id, ...replyData } = request;
    return this.client.post<ChatMessage>(
      `/workspaces/${workspace_id}/chat/messages/${message_id}/replies`,
      replyData
    );
  }

  // ========================================
  // MESSAGE REACTIONS
  // ========================================

  /**
   * Get reactions for a message (cursor-paginated)
   */
  async getMessageReactions(filter: GetReactionsFilter): Promise<ChatReactionsResponse> {
    const { workspace_id, message_id, ...params } = filter;
    return this.client.get<ChatReactionsResponse>(
      `/workspaces/${workspace_id}/chat/messages/${message_id}/reactions`,
      params
    );
  }

  /**
   * Create a reaction on a message (reaction = emoji name, sent in the body)
   */
  async createReaction(request: CreateReactionRequest): Promise<ChatReaction> {
    const { workspace_id, message_id, reaction } = request;
    return this.client.post<ChatReaction>(
      `/workspaces/${workspace_id}/chat/messages/${message_id}/reactions`,
      { reaction }
    );
  }

  /**
   * Delete a reaction from a message (204 No Content)
   */
  async deleteReaction(request: DeleteReactionRequest): Promise<void> {
    const { workspace_id, message_id, reaction } = request;
    await this.client.delete(
      `/workspaces/${workspace_id}/chat/messages/${message_id}/reactions/${encodeURIComponent(reaction)}`
    );
  }

  // ========================================
  // TAGGED USERS
  // ========================================

  /**
   * Get tagged users for a message (cursor-paginated)
   */
  async getTaggedUsers(filter: GetTaggedUsersFilter): Promise<TaggedUsersResponse> {
    const { workspace_id, message_id, ...params } = filter;
    return this.client.get<TaggedUsersResponse>(
      `/workspaces/${workspace_id}/chat/messages/${message_id}/tagged_users`,
      params
    );
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Search channels by name (client-side filter over the paginated
   * channel list — the v3 API has no search parameter)
   */
  async searchChannels(workspaceId: string, query: string): Promise<ChatChannelsResponse> {
    const matches: ChatChannel[] = [];
    const lowerQuery = query.toLowerCase();
    let cursor: string | undefined;
    const maxPages = 10;

    for (let page = 0; page < maxPages; page++) {
      const response = await this.client.get<ChatChannelsResponse>(
        `/workspaces/${workspaceId}/chat/channels`,
        cursor ? { cursor, limit: 100 } : { limit: 100 }
      );
      const channels = response.data ?? [];
      matches.push(...channels.filter(channel => channel.name?.toLowerCase().includes(lowerQuery)));

      if (!response.next_cursor) {
        break;
      }
      cursor = response.next_cursor;
    }

    return { data: matches };
  }
}
