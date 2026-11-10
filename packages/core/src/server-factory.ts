/**
 * Builds the ClickUp MCP server: every enabled toolset plus the resources.
 * Shared by every entry point (index-enhanced.ts, the efficiency entry, and
 * the hosted HTTP entries), so they all serve the same tool surface and all
 * honour CLICKUP_TOOLSETS.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupTaskTools } from './tools/task-tools.js';
import { setupWorkspaceTools } from './tools/workspace-tools.js';
import { setupListFolderTools } from './tools/list-folder-tools.js';
import { setupBulkTaskTools } from './tools/bulk-task-tools.js';
import { setupEnhancedDocTools } from './tools/doc-tools-enhanced.js';
import { setupCustomFieldTools } from './tools/custom-field-tools.js';
import { setupTimeTrackingTools } from './tools/time-tracking-tools.js';
import { setupGoalsTools } from './tools/goals-tools.js';
import { setupWebhookTools } from './tools/webhook-tools-setup.js';
import { setupViewsTools } from './tools/views-tools-setup.js';
import { setupDependenciesTools } from './tools/dependencies-tools-setup.js';
import { setupAttachmentsTools } from './tools/attachments-tools-setup.js';
import { setupSpaceTools } from './tools/space-tools.js';
import { setupChecklistTools } from './tools/checklist-tools.js';
import { setupCommentTools } from './tools/comment-tools.js';
import { setupChatTools } from './tools/chat-tools.js';
import { setupTaskResources } from './resources/task-resources.js';
import { setupDocResources } from './resources/doc-resources.js';
import { setupChecklistResources } from './resources/checklist-resources.js';
import { setupCommentResources } from './resources/comment-resources.js';
import { setupSpaceResources } from './resources/space-resources.js';
import { setupFolderResources } from './resources/folder-resources.js';
import { setupListResources } from './resources/list-resources.js';
import { VERSION } from './version.js';
import { enforceStrictParams } from './utils/tool-registration.js';
import { resolveToolsets, type ResolvedToolsets, type ToolsetName } from './tools/toolsets.js';

/** `clickup_create_task_comment_raw_test` is a debugging aid, not a product tool. */
const DEBUG_TOOLS_ENABLED = ['1', 'true', 'yes'].includes(
  (process.env.CLICKUP_DEBUG_TOOLS ?? '').trim().toLowerCase()
);

export interface ClickUpMcpServer {
  server: McpServer;
  toolsets: ResolvedToolsets;
}

export interface ClickUpMcpServerOptions {
  /** serverInfo.name; defaults to "clickup-mcp-server". */
  name?: string;
  /** Extra tools registered after the toolsets (still under strict params). */
  extraRegistrars?: Array<(server: McpServer) => void>;
}

export function createClickUpMcpServer(options: ClickUpMcpServerOptions = {}): ClickUpMcpServer {
  const toolsets = resolveToolsets();

  // enforceStrictParams patches server.tool, so it has to run before any
  // toolset registers. Unknown parameters become an error instead of being
  // silently dropped — see utils/tool-registration.ts.
  const server = enforceStrictParams(
    new McpServer({
      name: options.name ?? 'clickup-mcp-server',
      version: VERSION,
    })
  );

  // Each toolset is registered only when enabled — see tools/toolsets.ts and
  // the CLICKUP_TOOLSETS environment variable. Default is every toolset.
  const registrars: Array<[ToolsetName, (server: McpServer) => void]> = [
    ['tasks', setupTaskTools],
    ['workspace', setupWorkspaceTools], // Workspace and auth tools
    ['lists', setupListFolderTools], // List and folder management
    ['bulk', setupBulkTaskTools], // Bulk task operations
    ['docs', setupEnhancedDocTools], // Using enhanced document tools
    ['custom-fields', setupCustomFieldTools], // Custom fields management
    ['time-tracking', setupTimeTrackingTools], // Time tracking and timer management
    ['goals', setupGoalsTools], // Goals and targets management
    ['webhooks', setupWebhookTools], // Webhook management and processing
    ['views', setupViewsTools], // Views management and configuration
    ['dependencies', setupDependenciesTools], // Task dependencies and relationships
    ['attachments', setupAttachmentsTools], // File attachments and media management
    ['spaces', setupSpaceTools],
    ['checklists', setupChecklistTools],
    ['comments', s => setupCommentTools(s, { includeDebugTools: DEBUG_TOOLS_ENABLED })],
    ['chat', setupChatTools], // Chat messaging and channels
  ];

  for (const [name, register] of registrars) {
    if (toolsets.enabled.has(name)) {
      register(server);
    }
  }

  for (const register of options.extraRegistrars ?? []) {
    register(server);
  }

  setupTaskResources(server);
  setupDocResources(server);
  setupChecklistResources(server);
  setupCommentResources(server);
  setupSpaceResources(server);
  setupFolderResources(server);
  setupListResources(server);

  return { server, toolsets };
}
