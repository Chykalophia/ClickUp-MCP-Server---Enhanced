import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { suggestToolsForTask, getChatChannelDiscoveryStrategy, getEfficiencyRating, TOOL_METADATA } from '../utils/tool-efficiency.js';

const client = createClickUpClient();

export function setupHelperTools(server: McpServer): void {

  // ========================================
  // TOOL SUGGESTION AND EFFICIENCY HELPERS
  // ========================================

  server.tool(
    'suggest_tools_for_task',
    'Get intelligent tool suggestions for a given task or request. Provides the most efficient tool path and alternatives.',
    {
      request: z.string().min(1).describe('Description of what you want to accomplish'),
      context: z.object({
        known_ids: z.record(z.string()).optional().describe('Any known IDs (workspace_id, space_id, etc.)'),
        preferred_approach: z.enum(['direct', 'search', 'explore']).optional().describe('Preferred approach style')
      }).optional().describe('Additional context about the request')
    },
    async (args) => {
      try {
        const suggestion = suggestToolsForTask(args.request);
        const efficiency = getEfficiencyRating(suggestion.primary_tools);
        
        return {
          content: [{
            type: 'text',
            text: `## Tool Suggestions for: "${args.request}"

### 🎯 Primary Tools (Recommended)
${suggestion.primary_tools.map(tool => `- **${tool}**: ${TOOL_METADATA[tool]?.efficiency_hint || 'Efficient choice'}`).join('\n')}

### 🔄 Alternative Tools
${suggestion.alternative_tools.map(tool => `- ${tool}`).join('\n')}

### ⚡ Efficiency Notes
${suggestion.efficiency_notes.map(note => `- ${note}`).join('\n')}

### 🛠️ Workflow Hint
${suggestion.workflow_hint}

### 📊 Efficiency Rating: ${efficiency.rating.toUpperCase()}
${efficiency.suggestions.map(s => `- ${s}`).join('\n')}

${args.context?.known_ids ? `\n### 🔑 Available IDs\n${Object.entries(args.context.known_ids).map(([key, value]) => `- ${key}: ${value}`).join('\n')}` : ''}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting tool suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // ========================================
  // CHAT CHANNEL DISCOVERY
  // ========================================

  server.tool(
    'find_chat_channels',
    'Efficiently find chat channels across workspaces. More efficient than hierarchical navigation.',
    {
      workspace_id: z.string().optional().describe('Specific workspace ID to search in'),
      channel_name: z.string().optional().describe('Partial or full channel name to search for'),
      include_private: z.boolean().default(true).describe('Whether to include private channels')
    },
    async (args) => {
      try {
        const workspaces = args.workspace_id ? 
          [{ id: args.workspace_id }] : 
          await client.get('/team');

        const allChatChannels = [];

        for (const workspace of workspaces.teams || workspaces) {
          try {
            const spaces = await client.get(`/space?team_id=${workspace.id}`);
            
            for (const space of spaces.spaces || []) {
              try {
                const views = await client.get(`/space/${space.id}/view`);
                const chatViews = (views.views || []).filter((view: any) => 
                  view.type === 'conversation' || view.type === 'chat'
                );

                for (const chatView of chatViews) {
                  if (!args.channel_name || 
                      chatView.name.toLowerCase().includes(args.channel_name.toLowerCase())) {
                    allChatChannels.push({
                      id: chatView.id,
                      name: chatView.name,
                      type: chatView.type,
                      workspace_id: workspace.id,
                      workspace_name: (workspace as any).name,
                      space_id: space.id,
                      space_name: space.name,
                      visibility: chatView.visibility || 'unknown'
                    });
                  }
                }
              } catch (spaceError) {
                // Continue with other spaces if one fails
                console.error(`Error processing space ${space.id}:`, spaceError);
              }
            }
          } catch (workspaceError) {
            console.error(`Error processing workspace ${workspace.id}:`, workspaceError);
          }
        }

        return {
          content: [{
            type: 'text',
            text: `## 💬 Found ${allChatChannels.length} Chat Channels

${allChatChannels.length === 0 ? '❌ No chat channels found matching your criteria.' : 
  allChatChannels.map(channel => 
    `### 📢 ${channel.name}
- **ID**: \`${channel.id}\`
- **Type**: ${channel.type}
- **Workspace**: ${channel.workspace_name} (\`${channel.workspace_id}\`)
- **Space**: ${channel.space_name} (\`${channel.space_id}\`)
- **Visibility**: ${channel.visibility}

*Use this ID with \`create_chat_view_comment\` to post messages.*`
  ).join('\n\n')}

### 🚀 Next Steps
To post a message to any of these channels, use:
\`\`\`
create_chat_view_comment(view_id="CHANNEL_ID", comment_text="Your message")
\`\`\``
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error finding chat channels: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // ========================================
  // VIEW SEARCH BY NAME
  // ========================================

  server.tool(
    'search_views_by_name',
    'Search for views by name across spaces. More efficient than browsing all views.',
    {
      workspace_id: z.string().optional().describe('Workspace to search in'),
      view_name: z.string().min(1).describe('View name to search for (partial matches supported)'),
      view_type: z.enum(['list', 'board', 'calendar', 'gantt', 'timeline', 'table', 'form', 'chat', 'workload', 'activity', 'map', 'embed']).optional().describe('Filter by view type')
    },
    async (args) => {
      try {
        const workspaces = args.workspace_id ? 
          [{ id: args.workspace_id }] : 
          await client.get('/team');

        const matchingViews = [];

        for (const workspace of workspaces.teams || workspaces) {
          const spaces = await client.get(`/space?team_id=${workspace.id}`);
          
          for (const space of spaces.spaces || []) {
            try {
              const views = await client.get(`/space/${space.id}/view`);
              
              for (const view of views.views || []) {
                const nameMatch = view.name.toLowerCase().includes(args.view_name.toLowerCase());
                const typeMatch = !args.view_type || view.type === args.view_type;
                
                if (nameMatch && typeMatch) {
                  matchingViews.push({
                    ...view,
                    workspace_id: workspace.id,
                    workspace_name: (workspace as any).name,
                    space_id: space.id,
                    space_name: space.name
                  });
                }
              }
            } catch (error) {
              console.error(`Error searching views in space ${space.id}:`, error);
            }
          }
        }

        return {
          content: [{
            type: 'text',
            text: `## 🔍 Found ${matchingViews.length} Views matching "${args.view_name}"

${matchingViews.map(view => 
  `### 📋 ${view.name}
- **ID**: \`${view.id}\`
- **Type**: ${view.type}
- **Workspace**: ${view.workspace_name}
- **Space**: ${view.space_name}
- **Visibility**: ${view.visibility || 'unknown'}`
).join('\n\n')}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error searching views: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // ========================================
  // WORKSPACE OVERVIEW (SINGLE CALL)
  // ========================================

  server.tool(
    'get_workspace_overview',
    'Get a comprehensive overview of a workspace structure in a single efficient call. Better than multiple navigation calls.',
    {
      workspace_id: z.string().min(1).describe('The workspace ID to get overview for'),
      include_views: z.boolean().default(false).describe('Whether to include view details (slower but more complete)'),
      include_chat_channels: z.boolean().default(true).describe('Whether to include chat channel discovery')
    },
    async (args) => {
      try {
        const [workspace, spaces] = await Promise.all([
          client.get('/team').then((teams: any) => 
            teams.teams?.find((w: any) => w.id === args.workspace_id)
          ),
          client.get(`/space?team_id=${args.workspace_id}`)
        ]);

        if (!workspace) {
          throw new Error(`Workspace ${args.workspace_id} not found`);
        }

        const overview: any = {
          workspace: {
            id: workspace.id,
            name: workspace.name,
            members: workspace.members?.length || 0
          },
          spaces: [],
          chat_channels: [],
          summary: {
            total_spaces: spaces.spaces?.length || 0,
            total_chat_channels: 0,
            total_views: 0
          }
        };

        // Process each space
        for (const space of spaces.spaces || []) {
          const spaceData: any = {
            id: space.id,
            name: space.name,
            color: space.color,
            private: space.private,
            folders: [],
            lists: [],
            views: []
          };

          try {
            // Get folders and lists
            const [folders, folderlessLists] = await Promise.all([
              client.get(`/space/${space.id}/folder`).then((r: any) => r.folders || []).catch(() => []),
              client.get(`/space/${space.id}/list`).then((r: any) => r.lists || []).catch(() => [])
            ]);

            spaceData.folders = folders;
            spaceData.lists = folderlessLists;

            // Get views if requested
            if (args.include_views || args.include_chat_channels) {
              const viewsResponse = await client.get(`/space/${space.id}/view`).catch(() => ({ views: [] }));
              const views = viewsResponse.views || [];
              
              if (args.include_views) {
                spaceData.views = views;
              }

              // Extract chat channels
              if (args.include_chat_channels) {
                const chatViews = views.filter((view: any) => 
                  view.type === 'conversation' || view.type === 'chat'
                );
                
                for (const chatView of chatViews) {
                  overview.chat_channels.push({
                    id: chatView.id,
                    name: chatView.name,
                    space_name: space.name,
                    space_id: space.id
                  });
                }
              }

              overview.summary.total_views += views.length;
            }
          } catch (error) {
            console.error(`Error processing space ${space.id}:`, error);
          }

          overview.spaces.push(spaceData);
        }

        overview.summary.total_chat_channels = overview.chat_channels.length;

        return {
          content: [{
            type: 'text',
            text: `## 🏢 Workspace Overview: ${overview.workspace.name}

### 📊 Summary
- **Spaces**: ${overview.summary.total_spaces}
- **Chat Channels**: ${overview.summary.total_chat_channels}
- **Total Views**: ${overview.summary.total_views}
- **Members**: ${overview.workspace.members}

### 💬 Chat Channels
${overview.chat_channels.length === 0 ? '❌ No chat channels found' : 
  overview.chat_channels.map((chat: any) => 
    `- **${chat.name}** (\`${chat.id}\`) in ${chat.space_name}`
  ).join('\n')}

### 🏗️ Spaces Structure
${overview.spaces.map((space: any) => 
  `#### 📁 ${space.name} ${space.private ? '🔒' : '🌐'}
- **ID**: \`${space.id}\`
- **Folders**: ${space.folders.length}
- **Lists**: ${space.lists.length}
${args.include_views ? `- **Views**: ${space.views.length}` : ''}`
).join('\n\n')}

### 🚀 Quick Actions
${overview.chat_channels.length > 0 ? 
  `**Post to chat**: Use \`create_chat_view_comment\` with any of the chat channel IDs above.` : 
  '**No chat channels available for posting.**'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting workspace overview: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // ========================================
  // EFFICIENCY ANALYZER
  // ========================================

  server.tool(
    'analyze_tool_efficiency',
    'Analyze the efficiency of a planned tool sequence and get optimization suggestions.',
    {
      planned_tools: z.array(z.string()).min(1).describe('Array of tool names you plan to use'),
      goal: z.string().describe('What you are trying to accomplish')
    },
    async (args) => {
      try {
        const efficiency = getEfficiencyRating(args.planned_tools);
        const suggestion = suggestToolsForTask(args.goal);
        
        const toolAnalysis = args.planned_tools.map(tool => {
          const metadata = TOOL_METADATA[tool];
          return {
            tool,
            efficiency: metadata?.efficiency || 'unknown',
            category: metadata?.category || 'unknown',
            performance_impact: metadata?.performance_impact || 'unknown',
            hint: metadata?.efficiency_hint || 'No specific guidance available'
          };
        });

        return {
          content: [{
            type: 'text',
            text: `## 🔍 Tool Efficiency Analysis

### 🎯 Goal: ${args.goal}

### 📋 Planned Tools Analysis
${toolAnalysis.map(analysis => 
  `#### ${analysis.tool}
- **Efficiency**: ${analysis.efficiency}
- **Category**: ${analysis.category}
- **Performance Impact**: ${analysis.performance_impact}
- **Hint**: ${analysis.hint}`
).join('\n\n')}

### 📊 Overall Efficiency Rating: ${efficiency.rating.toUpperCase()}

### 💡 Optimization Suggestions
${efficiency.suggestions.map(s => `- ${s}`).join('\n')}

### 🎯 Recommended Alternative Approach
**Primary Tools**: ${suggestion.primary_tools.join(', ')}
**Workflow**: ${suggestion.workflow_hint}

### ⚡ Efficiency Notes
${suggestion.efficiency_notes.map(note => `- ${note}`).join('\n')}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error analyzing tool efficiency: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
