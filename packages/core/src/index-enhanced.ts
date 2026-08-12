#!/usr/bin/env node
/* eslint-disable no-console */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import {
  describeToolsets,
  resolveToolsets,
  type ResolvedToolsets,
  type ToolsetName,
} from './tools/toolsets.js';

// Environment variables are passed to the server through the MCP settings file
// See mcp-settings-example.json for an example

/** `clickup_create_task_comment_raw_test` is a debugging aid, not a product tool. */
const DEBUG_TOOLS_ENABLED = ['1', 'true', 'yes'].includes(
  (process.env.CLICKUP_DEBUG_TOOLS ?? '').trim().toLowerCase()
);

class ClickUpServer {
  private server: McpServer;
  private toolsets: ResolvedToolsets;

  constructor() {
    this.toolsets = resolveToolsets();

    this.server = new McpServer({
      name: 'clickup-mcp-server',
      version: VERSION,
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    // Set up tools and resources
    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
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
      ['comments', (server) => setupCommentTools(server, { includeDebugTools: DEBUG_TOOLS_ENABLED })],
      ['chat', setupChatTools], // Chat messaging and channels
    ];

    for (const [name, register] of registrars) {
      if (this.toolsets.enabled.has(name)) {
        register(this.server);
      }
    }
  }

  private setupResources() {
    // Set up all resources
    setupTaskResources(this.server);
    setupDocResources(this.server);
    setupChecklistResources(this.server);
    setupCommentResources(this.server);
    setupSpaceResources(this.server);
    setupFolderResources(this.server);
    setupListResources(this.server);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // stderr only — stdout carries the JSON-RPC stream.
    if (this.toolsets.unknown.length > 0) {
      console.error(
        `ClickUp MCP server: ignoring unknown CLICKUP_TOOLSETS entries: ${this.toolsets.unknown.join(', ')}`
      );
    }
    console.error(`ClickUp MCP server running on stdio with ${describeToolsets(this.toolsets)}`);
  }
}

// Create and run the server
const server = new ClickUpServer();
server.run().catch(console.error);
