/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiToken } from '../clickup-client/index.js';
import { ChatEnhancedClient } from '../clickup-client/chat-enhanced.js';
import { mcpError } from '../utils/error-handling.js';
import {
  CreateChannelSchema,
  CreateChannelOnParentSchema,
  CreateDirectMessageSchema,
  UpdateChannelSchema,
  GetChannelsFilterSchema,
  GetChannelUsersFilterSchema,
  SendMessageSchema,
  UpdateMessageSchema,
  CreateReplySchema,
  GetMessagesFilterSchema,
  GetRepliesFilterSchema,
  GetReactionsFilterSchema,
  CreateReactionSchema,
  DeleteReactionSchema,
  GetTaggedUsersFilterSchema,
  ChannelTypeSchema,
  ChannelVisibilitySchema,
  ChannelLocationTypeSchema,
  ContentFormatSchema,
  MessageTypeSchema,
} from '../schemas/chat-schemas.js';

// Create enhanced chat client (Chat API is v3-only)
const chatClient = new ChatEnhancedClient(getApiToken());

export function setupChatTools(server: McpServer): void {
  // ========================================
  // CHANNEL MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_chat_channels',
    'Retrieve chat channels in a workspace with cursor pagination and optional filtering by channel type, follower status, and activity.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to get channels from'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of channels to return (1-100)'),
      is_follower: z.boolean().optional().describe('Only return channels the authenticated user follows'),
      include_closed: z.boolean().optional().describe('Include closed channels in the results'),
      with_message_since: z.number().optional().describe('Only return channels with messages since this Unix timestamp (ms)'),
      channel_types: z.array(ChannelTypeSchema).optional().describe('Filter by channel types: CHANNEL, DM, GROUP_DM'),
    },
    async args => {
      try {
        const filter = GetChannelsFilterSchema.parse(args);
        const result = await chatClient.getChannels(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.data.length} channels${result.next_cursor ? ` (more available, next_cursor: ${result.next_cursor})` : ''}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting chat channels', error);
      }
    }
  );

  server.tool(
    'clickup_create_chat_channel',
    'Create a new chat channel in a workspace with specified name, description, topic, members, and visibility.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to create the channel in'),
      name: z.string().min(1).max(255).describe('The name of the channel'),
      description: z.string().optional().describe('Optional description of the channel'),
      topic: z.string().optional().describe('Optional topic of the channel'),
      user_ids: z.array(z.string()).max(100).optional().describe('User IDs (as strings) to add to the channel (up to 100)'),
      visibility: ChannelVisibilitySchema.optional().describe('Channel visibility: PUBLIC or PRIVATE'),
    },
    async args => {
      try {
        const request = CreateChannelSchema.parse(args);
        const result = await chatClient.createChannel(request);

        return {
          content: [
            {
              type: 'text',
              text: `Channel created successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating chat channel', error);
      }
    }
  );

  server.tool(
    'clickup_create_chat_channel_on_parent',
    'Create a chat channel on a specific space, folder, or list for contextual discussions. The channel name is derived from the location.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      parent_id: z.string().min(1).describe('The ID of the parent location (space, folder, or list)'),
      parent_type: ChannelLocationTypeSchema.describe('The type of parent location'),
      description: z.string().optional().describe('Optional description of the channel'),
      topic: z.string().optional().describe('Optional topic of the channel'),
      user_ids: z.array(z.string()).max(100).optional().describe('User IDs (as strings) to add to the channel (up to 100)'),
      visibility: ChannelVisibilitySchema.optional().describe('Channel visibility: PUBLIC or PRIVATE'),
    },
    async args => {
      try {
        const request = CreateChannelOnParentSchema.parse(args);
        const result = await chatClient.createChannelOnParent(request);

        return {
          content: [
            {
              type: 'text',
              text: `Channel created on ${args.parent_type} successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating channel on parent', error);
      }
    }
  );

  server.tool(
    'clickup_create_direct_message',
    'Create a direct message channel with up to 15 users. Provide no user IDs to create a self-DM.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      user_ids: z
        .array(z.string())
        .max(15)
        .optional()
        .describe('User IDs (as strings) to include in the direct message, up to 15. Omit or leave empty for a self-DM'),
    },
    async args => {
      try {
        const request = CreateDirectMessageSchema.parse(args);
        const result = await chatClient.createDirectMessage(request);

        return {
          content: [
            {
              type: 'text',
              text: `Direct message channel created successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating direct message', error);
      }
    }
  );

  server.tool(
    'clickup_get_chat_channel',
    'Retrieve detailed information about a specific chat channel by its ID.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      channel_id: z.string().min(1).describe('The ID of the channel to retrieve'),
    },
    async args => {
      try {
        const result = await chatClient.getChannel(args.workspace_id, args.channel_id);

        return {
          content: [
            {
              type: 'text',
              text: `Channel details:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting channel', error);
      }
    }
  );

  server.tool(
    'clickup_update_chat_channel',
    "Update a chat channel's name, description, topic, visibility, or location.",
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      channel_id: z.string().min(1).describe('The ID of the channel to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the channel'),
      description: z.string().optional().describe('New description for the channel'),
      topic: z.string().optional().describe('New topic for the channel'),
      visibility: ChannelVisibilitySchema.optional().describe('New visibility: PUBLIC or PRIVATE'),
      location: z
        .object({
          id: z.string().min(1).describe('The ID of the new location'),
          type: ChannelLocationTypeSchema.describe('The type of the new location'),
        })
        .optional()
        .describe('Move the channel to a new location (space, folder, or list)'),
    },
    async args => {
      try {
        const request = UpdateChannelSchema.parse(args);
        const result = await chatClient.updateChannel(request);

        return {
          content: [
            {
              type: 'text',
              text: `Channel updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating channel', error);
      }
    }
  );

  // ========================================
  // CHANNEL MEMBERS & FOLLOWERS
  // ========================================

  server.tool(
    'clickup_get_chat_channel_followers',
    'Retrieve followers of a chat channel who receive notifications about channel activity (cursor-paginated).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      channel_id: z.string().min(1).describe('The ID of the channel to get followers for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of followers to return (1-100)'),
    },
    async args => {
      try {
        const filter = GetChannelUsersFilterSchema.parse(args);
        const result = await chatClient.getChannelFollowers(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Channel followers (${result.data.length}):\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting channel followers', error);
      }
    }
  );

  server.tool(
    'clickup_get_chat_channel_members',
    'Retrieve members of a chat channel (cursor-paginated).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      channel_id: z.string().min(1).describe('The ID of the channel to get members for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of members to return (1-100)'),
    },
    async args => {
      try {
        const filter = GetChannelUsersFilterSchema.parse(args);
        const result = await chatClient.getChannelMembers(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Channel members (${result.data.length}):\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting channel members', error);
      }
    }
  );

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================

  server.tool(
    'clickup_get_chat_channel_messages',
    'Retrieve messages from a chat channel with cursor pagination.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      channel_id: z.string().min(1).describe('The ID of the channel to get messages from'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of messages to return (1-100)'),
      content_format: ContentFormatSchema.optional().describe('Format of returned message content: text/md (default) or text/plain'),
    },
    async args => {
      try {
        const filter = GetMessagesFilterSchema.parse(args);
        const result = await chatClient.getChannelMessages(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Retrieved ${result.data.length} messages${result.next_cursor ? ` (more available, next_cursor: ${result.next_cursor})` : ''}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting channel messages', error);
      }
    }
  );

  server.tool(
    'clickup_send_chat_message',
    'Send a message to a chat channel. Mentions can be embedded in markdown content.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      channel_id: z.string().min(1).describe('The ID of the channel to send the message to'),
      content: z.string().min(1).describe('The content of the message'),
      type: MessageTypeSchema.optional().describe("The type of message: 'message' (default) or 'post'"),
      content_format: ContentFormatSchema.optional().describe('Format of the content: text/md (default) or text/plain'),
      assignee: z.string().optional().describe('User ID to assign the message to'),
      group_assignee: z.string().optional().describe('Group ID to assign the message to'),
      followers: z.array(z.string()).optional().describe('User IDs (as strings) to add as followers of the message'),
      reactions: z.array(z.string()).optional().describe('Emoji names to add as initial reactions'),
      post_data: z.record(z.any()).optional().describe("Post metadata (title, subtype id) when type is 'post'"),
    },
    async args => {
      try {
        const request = SendMessageSchema.parse(args);
        const result = await chatClient.sendMessage(request);

        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('sending message', error);
      }
    }
  );

  server.tool(
    'clickup_update_chat_message',
    'Update the content, assignee, or resolved state of an existing chat message.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to update'),
      content: z.string().min(1).optional().describe('The new content of the message'),
      content_format: ContentFormatSchema.optional().describe('Format of the content: text/md (default) or text/plain'),
      assignee: z.string().optional().describe('User ID to assign the message to'),
      group_assignee: z.string().optional().describe('Group ID to assign the message to'),
      resolved: z.boolean().optional().describe('Mark the message as resolved or unresolved'),
      post_data: z.record(z.any()).optional().describe('Updated post metadata for post-type messages'),
    },
    async args => {
      try {
        const request = UpdateMessageSchema.parse(args);
        const result = await chatClient.updateMessage(request);

        return {
          content: [
            {
              type: 'text',
              text: `Message updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating message', error);
      }
    }
  );

  server.tool(
    'clickup_delete_chat_message',
    'Delete a chat message. This action cannot be undone.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to delete'),
    },
    async args => {
      try {
        await chatClient.deleteMessage(args.workspace_id, args.message_id);

        return {
          content: [
            {
              type: 'text',
              text: `Message ${args.message_id} deleted successfully`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting message', error);
      }
    }
  );

  // ========================================
  // MESSAGE REPLIES
  // ========================================

  server.tool(
    'clickup_get_chat_message_replies',
    'Retrieve replies to a specific chat message (cursor-paginated).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to get replies for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of replies to return (1-100)'),
      content_format: ContentFormatSchema.optional().describe('Format of returned reply content: text/md (default) or text/plain'),
    },
    async args => {
      try {
        const filter = GetRepliesFilterSchema.parse(args);
        const result = await chatClient.getMessageReplies(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Retrieved ${result.data.length} replies${result.next_cursor ? ` (more available, next_cursor: ${result.next_cursor})` : ''}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting message replies', error);
      }
    }
  );

  server.tool(
    'clickup_create_chat_message_reply',
    'Create a reply to a specific chat message.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to reply to'),
      content: z.string().min(1).describe('The content of the reply'),
      type: MessageTypeSchema.optional().describe("The type of message: 'message' (default) or 'post'"),
      content_format: ContentFormatSchema.optional().describe('Format of the content: text/md (default) or text/plain'),
      assignee: z.string().optional().describe('User ID to assign the reply to'),
      group_assignee: z.string().optional().describe('Group ID to assign the reply to'),
      followers: z.array(z.string()).optional().describe('User IDs (as strings) to add as followers of the reply'),
      reactions: z.array(z.string()).optional().describe('Emoji names to add as initial reactions'),
      post_data: z.record(z.any()).optional().describe("Post metadata (title, subtype id) when type is 'post'"),
    },
    async args => {
      try {
        const request = CreateReplySchema.parse(args);
        const result = await chatClient.createReply(request);

        return {
          content: [
            {
              type: 'text',
              text: `Reply created successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating reply', error);
      }
    }
  );

  // ========================================
  // MESSAGE REACTIONS
  // ========================================

  server.tool(
    'clickup_get_chat_message_reactions',
    'Retrieve reactions on a specific chat message (cursor-paginated).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to get reactions for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of reactions to return (1-100)'),
    },
    async args => {
      try {
        const filter = GetReactionsFilterSchema.parse(args);
        const result = await chatClient.getMessageReactions(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Message reactions (${result.data.length}):\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting message reactions', error);
      }
    }
  );

  server.tool(
    'clickup_create_chat_message_reaction',
    'Add a reaction to a chat message using an emoji name (e.g. "grinning", "+1").',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to react to'),
      reaction: z.string().min(1).describe('The name of the emoji to use for the reaction (e.g. "grinning", "+1")'),
    },
    async args => {
      try {
        const request = CreateReactionSchema.parse(args);
        const result = await chatClient.createReaction(request);

        return {
          content: [
            {
              type: 'text',
              text: `Reaction ${args.reaction} added to message ${args.message_id} successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating reaction', error);
      }
    }
  );

  server.tool(
    'clickup_delete_chat_message_reaction',
    'Remove a reaction from a chat message by emoji name.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to remove the reaction from'),
      reaction: z.string().min(1).describe('The name of the emoji reaction to remove'),
    },
    async args => {
      try {
        const request = DeleteReactionSchema.parse(args);
        await chatClient.deleteReaction(request);

        return {
          content: [
            {
              type: 'text',
              text: `Reaction ${args.reaction} removed from message ${args.message_id} successfully`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting reaction', error);
      }
    }
  );

  // ========================================
  // TAGGED USERS & UTILITY
  // ========================================

  server.tool(
    'clickup_get_chat_message_tagged_users',
    'Retrieve users tagged/mentioned in a specific chat message (cursor-paginated).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      message_id: z.string().min(1).describe('The ID of the message to get tagged users for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response (next_cursor)'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of tagged users to return (1-100)'),
    },
    async args => {
      try {
        const filter = GetTaggedUsersFilterSchema.parse(args);
        const result = await chatClient.getTaggedUsers(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Tagged users in message:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting tagged users', error);
      }
    }
  );

  server.tool(
    'clickup_search_chat_channels',
    'Search for chat channels by name within a workspace (client-side filtering over the channel list).',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to search in'),
      query: z.string().min(1).describe('The search query to match against channel names (case-insensitive)'),
    },
    async args => {
      try {
        const result = await chatClient.searchChannels(args.workspace_id, args.query);

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.data.length} channels matching "${args.query}":\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('searching channels', error);
      }
    }
  );
}
