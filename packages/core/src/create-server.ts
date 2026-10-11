/**
 * Builds the ClickUp McpServer with every tool registered and the tool-loading
 * mode applied. Kept separate from index-enhanced.ts (which starts a stdio
 * transport on import) so tests can build the same server over an in-memory
 * transport.
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
import { setupCatalogTools } from './tools/catalog-tools.js';
import {
  enforceStrictParams,
  getToolRegistry,
  type ToolRegistry,
} from './utils/tool-registration.js';
import {
  CATALOG_TOOLSET,
  isToolActive,
  resolveToolsets,
  type ResolvedToolsets,
  type ToolsetName,
} from './tools/toolsets.js';

export const SERVER_INSTRUCTIONS = [
  'ClickUp workspace access.',
  'Start with clickup_get_workspace_hierarchy to find space, folder, and list IDs;',
  'use clickup_find_member (when available) to resolve people.',
  'All ClickUp IDs are strings. Dates and timestamps are Unix epoch milliseconds.',
  'Only a core set of tools is loaded by default.',
  'Use clickup_list_toolsets to see everything available (goals, views, webhooks,',
  'checklists, chat, docs, dependencies, time tracking, ...), clickup_enable_toolset',
  'to load a toolset, or clickup_call_tool to run any tool by name without loading it.',
].join(' ');

/**
 * Toolset -> setup function. Every tool a setup function registers is
 * attributed to its toolset automatically (see withToolset in
 * utils/tool-registration.ts), so new tools need no entry here.
 */
export function toolsetRegistrars(
  options: { includeDebugTools?: boolean } = {}
): Array<[ToolsetName, (server: McpServer) => void]> {
  return [
    ['tasks', setupTaskTools],
    ['workspace', setupWorkspaceTools],
    ['lists', setupListFolderTools],
    ['bulk', setupBulkTaskTools],
    ['docs', setupEnhancedDocTools],
    ['custom-fields', setupCustomFieldTools],
    ['time-tracking', setupTimeTrackingTools],
    ['goals', setupGoalsTools],
    ['webhooks', setupWebhookTools],
    ['views', setupViewsTools],
    ['dependencies', setupDependenciesTools],
    ['attachments', setupAttachmentsTools],
    ['spaces', setupSpaceTools],
    ['checklists', setupChecklistTools],
    [
      'comments',
      server => setupCommentTools(server, { includeDebugTools: options.includeDebugTools }),
    ],
    ['chat', setupChatTools],
  ];
}

export interface CreateServerOptions {
  /** Defaults to process.env. */
  env?: Record<string, string | undefined>;
  /**
   * Version advertised in serverInfo. The entry point passes VERSION from
   * version.ts; it is injected rather than imported here because version.ts
   * uses import.meta, which the CommonJS jest transpile cannot load.
   */
  version?: string;
}

export interface CreatedServer {
  server: McpServer;
  registry: ToolRegistry;
  resolved: ResolvedToolsets;
  counts: { total: number; enabled: number };
}

const truthy = (value: string | undefined) =>
  ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());

const falsy = (value: string | undefined) =>
  ['0', 'false', 'no', 'off'].includes((value ?? '').trim().toLowerCase());

export function createClickUpServer(options: CreateServerOptions = {}): CreatedServer {
  const env = options.env ?? process.env;
  // resolveToolsets falls back to process.env for undefined arguments; pass
  // '' for absent keys so an injected env stays isolated from the host's.
  const resolved = resolveToolsets(env.CLICKUP_TOOLSETS ?? '', env.CLICKUP_TOOL_MODE ?? '');

  // enforceStrictParams patches server.tool, so it has to run before any
  // toolset registers. Unknown parameters become an error instead of being
  // silently dropped, annotations are applied, and every tool is recorded
  // against its toolset — see utils/tool-registration.ts.
  const server = enforceStrictParams(
    new McpServer(
      {
        name: 'clickup-mcp-server',
        title: 'ClickUp MCP Server',
        version: options.version ?? '0.0.0-dev',
        websiteUrl: 'https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced',
      },
      { instructions: SERVER_INSTRUCTIONS }
    ),
    undefined,
    undefined,
    // CLICKUP_CONFIRM_DESTRUCTIVE=false skips elicitation prompts.
    { confirmDestructive: !falsy(env.CLICKUP_CONFIRM_DESTRUCTIVE) }
  );
  const registry = getToolRegistry(server)!;

  // Register everything; enablement is decided afterwards, so tools that are
  // off can still be described (clickup_list_toolsets) and run
  // (clickup_call_tool), and switched on without a restart.
  for (const [toolset, register] of toolsetRegistrars({
    includeDebugTools: truthy(env.CLICKUP_DEBUG_TOOLS),
  })) {
    registry.withToolset(toolset, () => register(server));
  }
  registry.withToolset(CATALOG_TOOLSET, () => setupCatalogTools(server, registry, resolved));

  // Not connected yet, so flipping `enabled` directly sends no notifications.
  let enabled = 0;
  for (const entry of registry.tools.values()) {
    entry.handle.enabled = isToolActive(entry.name, entry.toolset, resolved);
    if (entry.handle.enabled) enabled++;
  }

  return { server, registry, resolved, counts: { total: registry.tools.size, enabled } };
}
