/**
 * Context-Aware Tool Suggestion System
 * Analyzes user requests and provides intelligent tool recommendations
 */

import { TOOL_METADATA, ToolSuggestion } from './tool-efficiency.js';

export interface RequestContext {
  entities: {
    workspace_id?: string;
    space_id?: string;
    list_id?: string;
    task_id?: string;
    view_id?: string;
    chat_channel?: string;
  };
  intent: 'create' | 'read' | 'update' | 'delete' | 'search' | 'discover';
  target: 'task' | 'comment' | 'chat' | 'doc' | 'view' | 'workspace' | 'unknown';
  urgency: 'low' | 'medium' | 'high';
  user_experience: 'beginner' | 'intermediate' | 'expert';
}

export interface SmartSuggestion extends ToolSuggestion {
  confidence: number;
  reasoning: string[];
  context_analysis: RequestContext;
  quick_start_guide?: string;
}

/**
 * Analyzes a user request and extracts context
 */
export function analyzeRequestContext(request: string): RequestContext {
  const lowerRequest = request.toLowerCase();
  
  // Extract entity IDs from request
  const entities: RequestContext['entities'] = {};
  
  // Look for ID patterns
  const workspaceMatch = request.match(/workspace[_\s]*id[:\s]*['"]*(\w+)['"]*|workspace[:\s]*['"]*(\w+)['"]/i);
  if (workspaceMatch) entities.workspace_id = workspaceMatch[1] || workspaceMatch[2];
  
  const spaceMatch = request.match(/space[_\s]*id[:\s]*['"]*(\w+)['"]*|space[:\s]*['"]*(\w+)['"]/i);
  if (spaceMatch) entities.space_id = spaceMatch[1] || spaceMatch[2];
  
  const taskMatch = request.match(/task[_\s]*id[:\s]*['"]*(\w+)['"]*|task[:\s]*['"]*(\w+)['"]/i);
  if (taskMatch) entities.task_id = taskMatch[1] || taskMatch[2];
  
  const viewMatch = request.match(/view[_\s]*id[:\s]*['"]*(\w+)['"]*|view[:\s]*['"]*(\w+)['"]/i);
  if (viewMatch) entities.view_id = viewMatch[1] || viewMatch[2];

  // Determine intent
  let intent: RequestContext['intent'] = 'read';
  if (lowerRequest.includes('create') || lowerRequest.includes('add') || lowerRequest.includes('new') || lowerRequest.includes('post') || lowerRequest.includes('send')) {
    intent = 'create';
  } else if (lowerRequest.includes('update') || lowerRequest.includes('edit') || lowerRequest.includes('modify') || lowerRequest.includes('change')) {
    intent = 'update';
  } else if (lowerRequest.includes('delete') || lowerRequest.includes('remove')) {
    intent = 'delete';
  } else if (lowerRequest.includes('search') || lowerRequest.includes('find') || lowerRequest.includes('look for')) {
    intent = 'search';
  } else if (lowerRequest.includes('explore') || lowerRequest.includes('browse') || lowerRequest.includes('discover') || lowerRequest.includes('list')) {
    intent = 'discover';
  }

  // Determine target
  let target: RequestContext['target'] = 'unknown';
  if (lowerRequest.includes('task')) target = 'task';
  else if (lowerRequest.includes('chat') || lowerRequest.includes('message')) target = 'chat';
  else if (lowerRequest.includes('comment')) target = 'comment';
  else if (lowerRequest.includes('doc') || lowerRequest.includes('document')) target = 'doc';
  else if (lowerRequest.includes('view')) target = 'view';
  else if (lowerRequest.includes('workspace') || lowerRequest.includes('space')) target = 'workspace';

  // Determine urgency
  let urgency: RequestContext['urgency'] = 'medium';
  if (lowerRequest.includes('urgent') || lowerRequest.includes('asap') || lowerRequest.includes('immediately') || lowerRequest.includes('now')) {
    urgency = 'high';
  } else if (lowerRequest.includes('when you can') || lowerRequest.includes('no rush') || lowerRequest.includes('eventually')) {
    urgency = 'low';
  }

  // Determine user experience level
  let user_experience: RequestContext['user_experience'] = 'intermediate';
  if (lowerRequest.includes('how do i') || lowerRequest.includes('help me') || lowerRequest.includes('guide') || lowerRequest.includes('tutorial')) {
    user_experience = 'beginner';
  } else if (lowerRequest.includes('efficiently') || lowerRequest.includes('optimize') || lowerRequest.includes('best way') || lowerRequest.includes('fastest')) {
    user_experience = 'expert';
  }

  return {
    entities,
    intent,
    target,
    urgency,
    user_experience
  };
}

/**
 * Provides smart tool suggestions based on context analysis
 */
export function getSmartSuggestions(request: string): SmartSuggestion {
  const context = analyzeRequestContext(request);
  const lowerRequest = request.toLowerCase();
  
  let suggestion: SmartSuggestion = {
    primary_tools: [],
    alternative_tools: [],
    efficiency_notes: [],
    workflow_hint: '',
    confidence: 0,
    reasoning: [],
    context_analysis: context
  };

  // Chat-related suggestions
  if (context.target === 'chat') {
    if (context.intent === 'create') {
      if (context.entities.view_id) {
        suggestion = {
          primary_tools: ['create_chat_view_comment'],
          alternative_tools: ['send_chat_message'],
          efficiency_notes: [
            '🚀 Direct chat posting - most efficient approach',
            'No workspace navigation needed',
            'Supports rich markdown formatting'
          ],
          workflow_hint: 'create_chat_view_comment(view_id="' + context.entities.view_id + '", comment_text="your message")',
          confidence: 0.95,
          reasoning: [
            'User has chat view ID - direct posting possible',
            'Create intent detected for chat target',
            'Most efficient path available'
          ],
          context_analysis: context,
          quick_start_guide: `**Quick Start**: You have the chat view ID, so you can post directly:
\`\`\`
create_chat_view_comment(
  view_id="${context.entities.view_id}",
  comment_text="Your message here"
)
\`\`\``
        };
      } else {
        suggestion = {
          primary_tools: ['find_chat_channels'],
          alternative_tools: ['get_workspaces', 'get_spaces', 'get_views'],
          efficiency_notes: [
            '🔍 Chat discovery needed first',
            'find_chat_channels is more efficient than workspace navigation',
            'Then use create_chat_view_comment with discovered ID'
          ],
          workflow_hint: 'find_chat_channels() → create_chat_view_comment(view_id="discovered_id", comment_text="message")',
          confidence: 0.85,
          reasoning: [
            'No chat view ID provided - discovery needed',
            'find_chat_channels more efficient than hierarchical navigation',
            'Two-step process required'
          ],
          context_analysis: context,
          quick_start_guide: `**Quick Start**: First find chat channels, then post:
1. \`find_chat_channels(channel_name="development")\` (optional: filter by name)
2. \`create_chat_view_comment(view_id="found_id", comment_text="Your message")\``
        };
      }
    } else if (context.intent === 'read') {
      if (context.entities.view_id) {
        suggestion = {
          primary_tools: ['get_chat_view_comments'],
          alternative_tools: ['get_chat_messages'],
          efficiency_notes: [
            '📖 Direct chat reading - most efficient',
            'No navigation overhead'
          ],
          workflow_hint: 'get_chat_view_comments(view_id="' + context.entities.view_id + '")',
          confidence: 0.95,
          reasoning: ['Direct access with known view ID'],
          context_analysis: context
        };
      } else {
        suggestion = {
          primary_tools: ['find_chat_channels', 'get_chat_view_comments'],
          alternative_tools: ['get_views'],
          efficiency_notes: [
            '🔍 Need to find chat first',
            'Two-step process for reading'
          ],
          workflow_hint: 'find_chat_channels() → get_chat_view_comments(view_id="found_id")',
          confidence: 0.80,
          reasoning: ['Chat discovery needed before reading'],
          context_analysis: context
        };
      }
    }
  }

  // Task-related suggestions
  else if (context.target === 'task') {
    if (context.intent === 'create') {
      suggestion = {
        primary_tools: ['create_task'],
        alternative_tools: ['create_task_from_template'],
        efficiency_notes: [
          '✅ Direct task creation',
          'Supports markdown descriptions',
          'Can set assignees, dates, and priority'
        ],
        workflow_hint: 'create_task(list_id="list_id", name="Task Name", description="Markdown description")',
        confidence: 0.90,
        reasoning: ['Clear task creation intent'],
        context_analysis: context
      };
    } else if (context.intent === 'read') {
      if (context.entities.task_id) {
        suggestion = {
          primary_tools: ['get_task_details'],
          alternative_tools: ['get_tasks'],
          efficiency_notes: [
            '🎯 Direct task access - most efficient',
            'Complete task information in one call'
          ],
          workflow_hint: 'get_task_details(task_id="' + context.entities.task_id + '")',
          confidence: 0.95,
          reasoning: ['Task ID available - direct access possible'],
          context_analysis: context
        };
      } else {
        suggestion = {
          primary_tools: ['get_tasks'],
          alternative_tools: ['get_view_tasks', 'search_tasks'],
          efficiency_notes: [
            '📋 List-based task retrieval',
            'Consider search if looking for specific tasks'
          ],
          workflow_hint: 'get_tasks(list_id="list_id") or search for specific tasks',
          confidence: 0.75,
          reasoning: ['No task ID - need list or search approach'],
          context_analysis: context
        };
      }
    }
  }

  // Document-related suggestions
  else if (context.target === 'doc') {
    if (context.intent === 'search') {
      suggestion = {
        primary_tools: ['search_docs'],
        alternative_tools: ['get_docs_from_workspace'],
        efficiency_notes: [
          '🔍 Search is more efficient than browsing',
          'Targeted results vs. full workspace scan'
        ],
        workflow_hint: 'search_docs(workspace_id="workspace_id", query="search terms")',
        confidence: 0.90,
        reasoning: ['Search intent for documents - direct search most efficient'],
        context_analysis: context
      };
    }
  }

  // Workspace exploration
  else if (context.target === 'workspace' || context.intent === 'discover') {
    if (context.user_experience === 'expert' || context.urgency === 'high') {
      suggestion = {
        primary_tools: ['get_workspace_overview'],
        alternative_tools: ['find_chat_channels', 'search_docs'],
        efficiency_notes: [
          '⚡ Single comprehensive call',
          'Efficient for experienced users',
          'Complete workspace structure in one request'
        ],
        workflow_hint: 'get_workspace_overview(workspace_id="workspace_id", include_chat_channels=true)',
        confidence: 0.85,
        reasoning: ['Expert user or high urgency - comprehensive overview preferred'],
        context_analysis: context
      };
    } else {
      suggestion = {
        primary_tools: ['get_workspaces', 'get_spaces'],
        alternative_tools: ['get_workspace_overview'],
        efficiency_notes: [
          '👋 Step-by-step exploration',
          'Good for learning workspace structure',
          'Consider get_workspace_overview for faster results'
        ],
        workflow_hint: 'get_workspaces() → get_spaces(workspace_id) → explore further',
        confidence: 0.70,
        reasoning: ['Beginner user - step-by-step approach better for learning'],
        context_analysis: context
      };
    }
  }

  // Default fallback
  if (suggestion.primary_tools.length === 0) {
    suggestion = {
      primary_tools: ['suggest_tools_for_task'],
      alternative_tools: ['get_workspace_overview'],
      efficiency_notes: [
        '🤔 Request needs clarification',
        'Use suggest_tools_for_task for specific guidance'
      ],
      workflow_hint: 'suggest_tools_for_task(request="' + request + '")',
      confidence: 0.50,
      reasoning: ['Unclear request - need more specific tool suggestion'],
      context_analysis: context
    };
  }

  return suggestion;
}

/**
 * Generates efficiency tips based on user patterns
 */
export function generateEfficiencyTips(context: RequestContext): string[] {
  const tips: string[] = [];

  if (context.user_experience === 'beginner') {
    tips.push('💡 **Tip**: Save frequently used IDs (workspace, space, list) for faster access');
    tips.push('📚 **Learning**: Direct tools (with IDs) are always faster than navigation tools');
  }

  if (context.urgency === 'high') {
    tips.push('⚡ **Speed**: Use search tools instead of browsing when possible');
    tips.push('🎯 **Direct**: If you have entity IDs, use direct tools for instant results');
  }

  if (context.target === 'chat') {
    tips.push('💬 **Chat Efficiency**: Use find_chat_channels once, then save chat view IDs for future use');
    tips.push('🚀 **Pro Tip**: create_chat_view_comment supports rich markdown formatting');
  }

  if (context.intent === 'discover') {
    tips.push('🔍 **Discovery**: Search tools are usually faster than hierarchical browsing');
    tips.push('📊 **Overview**: get_workspace_overview gives you everything in one call');
  }

  return tips;
}

/**
 * Provides workflow optimization suggestions
 */
export function optimizeWorkflow(tools: string[], context: RequestContext): {
  optimized_tools: string[];
  improvements: string[];
  efficiency_gain: number;
} {
  const improvements: string[] = [];
  let optimized_tools = [...tools];
  let efficiency_gain = 0;

  // Replace hierarchical navigation with direct tools
  if (tools.includes('get_workspaces') && tools.includes('get_spaces') && tools.includes('get_views')) {
    if (context.target === 'chat') {
      optimized_tools = ['find_chat_channels'];
      improvements.push('Replaced workspace navigation with direct chat discovery');
      efficiency_gain += 60;
    } else {
      optimized_tools = ['get_workspace_overview'];
      improvements.push('Replaced multiple navigation calls with single overview');
      efficiency_gain += 40;
    }
  }

  // Suggest search over browsing
  if (tools.includes('get_docs_from_workspace') && context.intent === 'search') {
    const index = optimized_tools.indexOf('get_docs_from_workspace');
    if (index !== -1) {
      optimized_tools[index] = 'search_docs';
      improvements.push('Use search_docs instead of browsing all documents');
      efficiency_gain += 30;
    }
  }

  // Suggest direct access when IDs are available
  if (context.entities.task_id && tools.includes('get_tasks')) {
    const index = optimized_tools.indexOf('get_tasks');
    if (index !== -1) {
      optimized_tools[index] = 'get_task_details';
      improvements.push('Use direct task access instead of listing all tasks');
      efficiency_gain += 50;
    }
  }

  return {
    optimized_tools,
    improvements,
    efficiency_gain
  };
}
