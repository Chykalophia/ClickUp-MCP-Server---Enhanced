import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ChatEnhancedClient } from '../clickup-client/chat-enhanced.js';
import {
  CreateChannelSchema,
  CreateChannelOnParentSchema,
  CreateDirectMessageSchema,
  UpdateChannelSchema,
  GetChannelsFilterSchema,
  SendMessageSchema,
  UpdateMessageSchema,
  CreateReplySchema,
  GetMessagesFilterSchema,
  GetRepliesFilterSchema,
  CreateReactionSchema,
  DeleteReactionSchema,
  AddChannelMemberSchema,
  RemoveChannelMemberSchema,
  ReactionTypeSchema
} from '../schemas/chat-schemas.js';

// Create enhanced chat client
const chatClient = new ChatEnhancedClient(process.env.CLICKUP_API_TOKEN!);

export function setupChatTools(server: McpServer): void {

  // ========================================
  // CHANNEL MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_chat_channels',
    'Retrieve all chat channels in a workspace with optional filtering by type and archived status.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to get channels from'),
      archived: z.boolean().optional().describe('Whether to include archived channels'),
      type: z.enum(['public', 'private', 'direct']).optional().describe('Filter by channel type')
    },
    async (args) => {
      try {
        const filter = GetChannelsFilterSchema.parse(args);
        const result = await chatClient.getChannels(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Found ${result.channels.length} channels:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting chat channels: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_chat_channel',
    'Create a new chat channel in a workspace with specified name, description, and privacy settings.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to create the channel in'),
      name: z.string().min(1).max(255).describe('The name of the channel'),
      description: z.string().optional().describe('Optional description of the channel'),
      type: z.enum(['public', 'private', 'direct']).default('public').describe('The type of channel'),
      members: z.array(z.number()).optional().describe('Array of user IDs to add as initial members'),
      is_private: z.boolean().optional().describe('Whether the channel is private')
    },
    async (args) => {
      try {
        const request = CreateChannelSchema.parse(args);
        const result = await chatClient.createChannel(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel created successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating chat channel: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_chat_channel_on_parent',
    'Create a chat channel on a specific space, folder, or list for contextual discussions.',
    {
      parent_id: z.string().min(1).describe('The ID of the parent (space, folder, or list)'),
      parent_type: z.enum(['space', 'folder', 'list']).describe('The type of parent container'),
      name: z.string().min(1).max(255).describe('The name of the channel'),
      description: z.string().optional().describe('Optional description of the channel'),
      type: z.enum(['public', 'private', 'direct']).default('public').describe('The type of channel'),
      members: z.array(z.number()).optional().describe('Array of user IDs to add as initial members'),
      is_private: z.boolean().optional().describe('Whether the channel is private')
    },
    async (args) => {
      try {
        const request = CreateChannelOnParentSchema.parse(args);
        const result = await chatClient.createChannelOnParent(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel created on ${args.parent_type} successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating channel on parent: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_direct_message',
    'Create a direct message channel between specific users for private conversations.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace'),
      members: z.array(z.number()).min(2).describe('Array of user IDs to include in the direct message (minimum 2)'),
      name: z.string().optional().describe('Optional name for the direct message channel')
    },
    async (args) => {
      try {
        const request = CreateDirectMessageSchema.parse(args);
        const result = await chatClient.createDirectMessage(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Direct message channel created successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating direct message: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_chat_channel',
    'Retrieve detailed information about a specific chat channel by its ID.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to retrieve')
    },
    async (args) => {
      try {
        const result = await chatClient.getChannel(args.channel_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel details:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting channel: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_chat_channel',
    'Update a chat channel\'s name, description, or privacy settings.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the channel'),
      description: z.string().optional().describe('New description for the channel'),
      is_private: z.boolean().optional().describe('Update privacy setting')
    },
    async (args) => {
      try {
        const request = UpdateChannelSchema.parse(args);
        const result = await chatClient.updateChannel(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating channel: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // CHANNEL MEMBERS & FOLLOWERS
  // ========================================

  server.tool(
    'clickup_get_chat_channel_followers',
    'Retrieve all followers of a chat channel who receive notifications about channel activity.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to get followers for')
    },
    async (args) => {
      try {
        const result = await chatClient.getChannelFollowers(args.channel_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel followers (${result.followers.length}):\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting channel followers: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_chat_channel_members',
    'Retrieve all members of a chat channel with their roles and join dates.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to get members for')
    },
    async (args) => {
      try {
        const result = await chatClient.getChannelMembers(args.channel_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel members (${result.members.length}):\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting channel members: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_add_chat_channel_member',
    'Add a user as a member to a chat channel.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel'),
      user_id: z.number().describe('The ID of the user to add as a member')
    },
    async (args) => {
      try {
        const request = AddChannelMemberSchema.parse(args);
        await chatClient.addChannelMember(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `User ${args.user_id} added to channel ${args.channel_id} successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error adding channel member: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_remove_chat_channel_member',
    'Remove a user from a chat channel membership.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel'),
      user_id: z.number().describe('The ID of the user to remove from the channel')
    },
    async (args) => {
      try {
        const request = RemoveChannelMemberSchema.parse(args);
        await chatClient.removeChannelMember(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `User ${args.user_id} removed from channel ${args.channel_id} successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error removing channel member: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================

  server.tool(
    'clickup_get_chat_channel_messages',
    'Retrieve messages from a chat channel with pagination and filtering options.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to get messages from'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of messages to return (1-100)'),
      before: z.string().optional().describe('Get messages before this message ID'),
      after: z.string().optional().describe('Get messages after this message ID')
    },
    async (args) => {
      try {
        const filter = GetMessagesFilterSchema.parse(args);
        const result = await chatClient.getChannelMessages(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Retrieved ${result.messages.length} messages:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting channel messages: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_send_chat_message',
    'Send a message to a chat channel with optional mentions and attachments.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to send the message to'),
      text: z.string().min(1).describe('The text content of the message'),
      mentions: z.array(z.number()).optional().describe('Array of user IDs to mention in the message'),
      attachments: z.array(z.string()).optional().describe('Array of attachment IDs to include'),
      reply_to: z.string().optional().describe('ID of the message this is replying to')
    },
    async (args) => {
      try {
        const request = SendMessageSchema.parse(args);
        const result = await chatClient.sendMessage(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Message sent successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_chat_message',
    'Update the text content and mentions of an existing chat message.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to update'),
      text: z.string().min(1).describe('The new text content of the message'),
      mentions: z.array(z.number()).optional().describe('Updated array of user IDs to mention')
    },
    async (args) => {
      try {
        const request = UpdateMessageSchema.parse(args);
        const result = await chatClient.updateMessage(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Message updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating message: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_chat_message',
    'Delete a message from a chat channel. This action cannot be undone.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to delete')
    },
    async (args) => {
      try {
        await chatClient.deleteMessage(args.channel_id, args.message_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Message ${args.message_id} deleted successfully from channel ${args.channel_id}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting message: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // MESSAGE REPLIES
  // ========================================

  server.tool(
    'clickup_get_chat_message_replies',
    'Retrieve all replies to a specific message in a chat channel.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to get replies for'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of replies to return (1-100)'),
      before: z.string().optional().describe('Get replies before this reply ID'),
      after: z.string().optional().describe('Get replies after this reply ID')
    },
    async (args) => {
      try {
        const filter = GetRepliesFilterSchema.parse(args);
        const result = await chatClient.getMessageReplies(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Retrieved ${result.replies.length} replies:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting message replies: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_chat_message_reply',
    'Create a reply to a specific message in a chat channel.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to reply to'),
      text: z.string().min(1).describe('The text content of the reply'),
      mentions: z.array(z.number()).optional().describe('Array of user IDs to mention in the reply'),
      attachments: z.array(z.string()).optional().describe('Array of attachment IDs to include')
    },
    async (args) => {
      try {
        const request = CreateReplySchema.parse(args);
        const result = await chatClient.createReply(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Reply created successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating reply: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // MESSAGE REACTIONS
  // ========================================

  server.tool(
    'clickup_get_chat_message_reactions',
    'Retrieve all reactions on a specific message in a chat channel.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to get reactions for')
    },
    async (args) => {
      try {
        const result = await chatClient.getMessageReactions(args.channel_id, args.message_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Message reactions:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting message reactions: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_chat_message_reaction',
    'Add a reaction to a message in a chat channel.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to react to'),
      reaction: ReactionTypeSchema.describe('The type of reaction to add')
    },
    async (args) => {
      try {
        const request = CreateReactionSchema.parse(args);
        await chatClient.createReaction(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Reaction ${args.reaction} added to message ${args.message_id} successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating reaction: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_chat_message_reaction',
    'Remove a reaction from a message in a chat channel.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to remove reaction from'),
      reaction: ReactionTypeSchema.describe('The type of reaction to remove')
    },
    async (args) => {
      try {
        const request = DeleteReactionSchema.parse(args);
        await chatClient.deleteReaction(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Reaction ${args.reaction} removed from message ${args.message_id} successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting reaction: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // TAGGED USERS & UTILITY
  // ========================================

  server.tool(
    'clickup_get_chat_message_tagged_users',
    'Retrieve all users tagged/mentioned in a specific message.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel containing the message'),
      message_id: z.string().min(1).describe('The ID of the message to get tagged users for')
    },
    async (args) => {
      try {
        const result = await chatClient.getTaggedUsers(args.channel_id, args.message_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Tagged users in message:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting tagged users: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_search_chat_channels',
    'Search for chat channels by name within a workspace.',
    {
      workspace_id: z.string().min(1).describe('The ID of the workspace to search in'),
      query: z.string().min(1).describe('The search query to match against channel names')
    },
    async (args) => {
      try {
        const result = await chatClient.searchChannels(args.workspace_id, args.query);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Found ${result.channels.length} channels matching "${args.query}":\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error searching channels: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_chat_channel_stats',
    'Get statistics for a chat channel including message count, member count, and last activity.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to get statistics for')
    },
    async (args) => {
      try {
        const result = await chatClient.getChannelStats(args.channel_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel statistics:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting channel stats: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_mark_chat_channel_as_read',
    'Mark all messages in a chat channel as read for the current user.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to mark as read')
    },
    async (args) => {
      try {
        await chatClient.markChannelAsRead(args.channel_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Channel ${args.channel_id} marked as read successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error marking channel as read: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_chat_channel_unread_count',
    'Get the number of unread messages in a chat channel for the current user.',
    {
      channel_id: z.string().min(1).describe('The ID of the channel to get unread count for')
    },
    async (args) => {
      try {
        const result = await chatClient.getUnreadCount(args.channel_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Unread messages in channel ${args.channel_id}: ${result.unread_count}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting unread count: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
}
