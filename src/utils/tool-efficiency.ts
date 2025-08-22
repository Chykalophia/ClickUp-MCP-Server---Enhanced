/**
 * Tool Efficiency and Metadata System
 * Provides intelligent tool suggestions and efficiency hints for better AI decision making
 */

export interface ToolMetadata {
  name: string;
  category: 'core' | 'search' | 'bulk' | 'helper' | 'advanced';
  efficiency: 'direct' | 'hierarchical' | 'bulk' | 'search';
  use_cases: string[];
  alternatives: string[];
  efficiency_hint?: string;
  prerequisites?: string[];
  related_tools?: string[];
  performance_impact: 'low' | 'medium' | 'high';
}

export interface ToolSuggestion {
  primary_tools: string[];
  alternative_tools: string[];
  efficiency_notes: string[];
  workflow_hint: string;
}

/**
 * Tool categories and their efficiency characteristics
 */
export const TOOL_CATEGORIES = {
  // Direct action tools - most efficient for specific tasks
  DIRECT: {
    chat: ['create_chat_view_comment', 'get_chat_view_comments'],
    tasks: ['get_task_details', 'create_task', 'update_task'],
    search: ['search_docs', 'search_attachments'],
    bulk: ['bulk_set_custom_field_values', 'bulk_attachment_operations']
  },
  
  // Hierarchical navigation tools - use when direct tools aren't available
  HIERARCHICAL: {
    navigation: ['get_workspaces', 'get_spaces', 'get_lists', 'get_views'],
    discovery: ['get_folders', 'get_folderless_lists']
  },
  
  // Helper tools for complex workflows
  HELPERS: {
    suggestions: ['suggest_tools_for_task', 'find_chat_channels', 'search_views_by_name'],
    validation: ['validate_custom_field_value', 'check_dependency_conflicts']
  }
};

/**
 * Comprehensive tool metadata registry
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // Chat Tools
  'create_chat_view_comment': {
    name: 'create_chat_view_comment',
    category: 'core',
    efficiency: 'direct',
    use_cases: ['send_message_to_chat', 'post_announcement', 'team_communication'],
    alternatives: ['create_list_comment', 'create_task_comment'],
    efficiency_hint: 'Most direct way to post to chat channels. Use find_chat_channels if you need to discover chat view IDs first.',
    prerequisites: ['chat_view_id'],
    related_tools: ['get_chat_view_comments', 'find_chat_channels'],
    performance_impact: 'low'
  },
  
  'get_chat_view_comments': {
    name: 'get_chat_view_comments',
    category: 'core',
    efficiency: 'direct',
    use_cases: ['read_chat_history', 'get_recent_messages'],
    alternatives: ['get_task_comments', 'get_list_comments'],
    efficiency_hint: 'Direct way to read chat messages. More efficient than navigating workspace hierarchy.',
    prerequisites: ['chat_view_id'],
    related_tools: ['create_chat_view_comment', 'find_chat_channels'],
    performance_impact: 'low'
  },

  // Navigation Tools (less efficient)
  'get_workspaces': {
    name: 'get_workspaces',
    category: 'core',
    efficiency: 'hierarchical',
    use_cases: ['workspace_discovery', 'initial_setup'],
    alternatives: [],
    efficiency_hint: 'Use only when you need to discover workspaces. Avoid if you already know workspace structure.',
    performance_impact: 'medium'
  },

  'get_spaces': {
    name: 'get_spaces',
    category: 'core',
    efficiency: 'hierarchical',
    use_cases: ['space_discovery', 'workspace_exploration'],
    alternatives: ['search_views_by_name'],
    efficiency_hint: 'Use when you need to explore workspace structure. Consider search tools for specific items.',
    prerequisites: ['workspace_id'],
    related_tools: ['get_views', 'get_lists'],
    performance_impact: 'medium'
  },

  'get_views': {
    name: 'get_views',
    category: 'core',
    efficiency: 'hierarchical',
    use_cases: ['view_discovery', 'find_chat_channels'],
    alternatives: ['find_chat_channels', 'search_views_by_name'],
    efficiency_hint: 'Use with type filter for efficiency. Consider find_chat_channels for chat discovery.',
    prerequisites: ['parent_id', 'parent_type'],
    related_tools: ['create_view', 'update_view'],
    performance_impact: 'medium'
  },

  // Search Tools (most efficient for discovery)
  'search_docs': {
    name: 'search_docs',
    category: 'search',
    efficiency: 'search',
    use_cases: ['find_documents', 'content_discovery'],
    alternatives: ['get_docs_from_workspace'],
    efficiency_hint: 'Most efficient way to find specific documents. Prefer over workspace navigation.',
    prerequisites: ['workspace_id', 'query'],
    performance_impact: 'low'
  },

  // Task Tools
  'get_task_details': {
    name: 'get_task_details',
    category: 'core',
    efficiency: 'direct',
    use_cases: ['task_information', 'task_analysis'],
    alternatives: ['get_tasks'],
    efficiency_hint: 'Most direct way to get task information when you have task ID.',
    prerequisites: ['task_id'],
    related_tools: ['update_task', 'create_task_comment'],
    performance_impact: 'low'
  },

  'get_tasks': {
    name: 'get_tasks',
    category: 'core',
    efficiency: 'hierarchical',
    use_cases: ['list_tasks', 'task_discovery'],
    alternatives: ['get_view_tasks', 'search_tasks'],
    efficiency_hint: 'Use when you need all tasks from a list. Consider get_view_tasks for filtered results.',
    prerequisites: ['list_id'],
    related_tools: ['create_task', 'get_task_details'],
    performance_impact: 'medium'
  }
};

/**
 * Analyzes a user request and suggests the most efficient tools
 */
export function suggestToolsForTask(request: string): ToolSuggestion {
  const lowerRequest = request.toLowerCase();
  
  // Chat-related requests
  if (lowerRequest.includes('chat') || lowerRequest.includes('message') || lowerRequest.includes('post')) {
    if (lowerRequest.includes('send') || lowerRequest.includes('post') || lowerRequest.includes('create')) {
      return {
        primary_tools: ['create_chat_view_comment'],
        alternative_tools: ['create_list_comment', 'create_task_comment'],
        efficiency_notes: [
          'Use create_chat_view_comment for direct chat posting',
          'If you need to find chat channels, use find_chat_channels first',
          'Avoid workspace navigation unless absolutely necessary'
        ],
        workflow_hint: 'If you have chat_view_id → create_chat_view_comment. If not → find_chat_channels → create_chat_view_comment'
      };
    }
    
    if (lowerRequest.includes('read') || lowerRequest.includes('get') || lowerRequest.includes('history')) {
      return {
        primary_tools: ['get_chat_view_comments'],
        alternative_tools: ['find_chat_channels'],
        efficiency_notes: [
          'Use get_chat_view_comments for direct chat reading',
          'More efficient than navigating workspace hierarchy'
        ],
        workflow_hint: 'If you have chat_view_id → get_chat_view_comments. If not → find_chat_channels → get_chat_view_comments'
      };
    }
  }

  // Task-related requests
  if (lowerRequest.includes('task')) {
    if (lowerRequest.includes('create') || lowerRequest.includes('new')) {
      return {
        primary_tools: ['create_task'],
        alternative_tools: ['create_task_from_template'],
        efficiency_notes: ['Direct task creation is most efficient'],
        workflow_hint: 'create_task with list_id'
      };
    }
    
    if (lowerRequest.includes('get') || lowerRequest.includes('details') || lowerRequest.includes('info')) {
      return {
        primary_tools: ['get_task_details'],
        alternative_tools: ['get_tasks'],
        efficiency_notes: [
          'Use get_task_details if you have task_id',
          'Use get_tasks only if you need to list multiple tasks'
        ],
        workflow_hint: 'Prefer get_task_details over get_tasks when possible'
      };
    }
  }

  // Document-related requests
  if (lowerRequest.includes('doc') || lowerRequest.includes('document')) {
    if (lowerRequest.includes('search') || lowerRequest.includes('find')) {
      return {
        primary_tools: ['search_docs'],
        alternative_tools: ['get_docs_from_workspace'],
        efficiency_notes: ['search_docs is more efficient than workspace navigation'],
        workflow_hint: 'Use search_docs with query instead of browsing workspace'
      };
    }
  }

  // Default suggestion for exploration
  return {
    primary_tools: ['get_workspaces'],
    alternative_tools: ['search_docs', 'find_chat_channels'],
    efficiency_notes: [
      'Consider using search tools before hierarchical navigation',
      'Direct tools are always more efficient when you have IDs'
    ],
    workflow_hint: 'Try search/direct tools first, then fall back to workspace navigation'
  };
}

/**
 * Finds chat channels efficiently
 */
export function getChatChannelDiscoveryStrategy(): ToolSuggestion {
  return {
    primary_tools: ['find_chat_channels'],
    alternative_tools: ['get_views'],
    efficiency_notes: [
      'find_chat_channels is purpose-built for chat discovery',
      'More efficient than get_workspaces → get_spaces → get_views'
    ],
    workflow_hint: 'Use find_chat_channels instead of hierarchical navigation'
  };
}

/**
 * Gets efficiency rating for a tool combination
 */
export function getEfficiencyRating(tools: string[]): {
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  suggestions: string[];
} {
  const directTools = tools.filter(tool => TOOL_METADATA[tool]?.efficiency === 'direct').length;
  const searchTools = tools.filter(tool => TOOL_METADATA[tool]?.efficiency === 'search').length;
  const hierarchicalTools = tools.filter(tool => TOOL_METADATA[tool]?.efficiency === 'hierarchical').length;

  if (directTools > 0 && hierarchicalTools === 0) {
    return {
      rating: 'excellent',
      suggestions: ['Perfect! Using direct tools for maximum efficiency.']
    };
  }

  if (searchTools > 0 && hierarchicalTools <= 1) {
    return {
      rating: 'good',
      suggestions: ['Good use of search tools. Consider direct tools if you have IDs.']
    };
  }

  if (hierarchicalTools <= 2) {
    return {
      rating: 'fair',
      suggestions: [
        'Consider using search tools before navigation',
        'Look for direct tools if you have entity IDs'
      ]
    };
  }

  return {
    rating: 'poor',
    suggestions: [
      'Too much hierarchical navigation',
      'Use search tools or direct tools instead',
      'Consider caching IDs for future direct access'
    ]
  };
}
