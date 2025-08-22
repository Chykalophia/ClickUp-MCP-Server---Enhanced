#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTaskTools } from './tools/task-tools.js';
import { setupDocTools } from './tools/doc-tools.js';
import { setupSpaceTools } from './tools/space-tools.js';
import { setupChecklistTools } from './tools/checklist-tools.js';
import { setupCommentTools } from './tools/comment-tools.js';
import { setupWebhookTools } from './tools/webhook-tools-setup.js';
import { setupViewsTools } from './tools/views-tools-setup.js';
import { setupDependenciesTools } from './tools/dependencies-tools-setup.js';
import { setupAttachmentsTools } from './tools/attachments-tools-setup.js';
import { setupCustomFieldTools } from './tools/custom-field-tools.js';
import { setupTimeTrackingTools } from './tools/time-tracking-tools.js';
import { setupGoalsTools } from './tools/goals-tools.js';
import { setupTaskResources } from './resources/task-resources.js';
import { setupDocResources } from './resources/doc-resources.js';
import { setupChecklistResources } from './resources/checklist-resources.js';
import { setupCommentResources } from './resources/comment-resources.js';
import { setupSpaceResources } from './resources/space-resources.js';
import { setupFolderResources } from './resources/folder-resources.js';
import { setupListResources } from './resources/list-resources.js';

// Environment variables are passed to the server through the MCP settings file
// See mcp-settings-example.json for an example

class ClickUpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'clickup-mcp-server',
      version: '1.9.0',
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
    // Core tools
    setupTaskTools(this.server);
    setupDocTools(this.server);
    setupSpaceTools(this.server);
    setupChecklistTools(this.server);
    setupCommentTools(this.server);
    
    // Advanced features tools
    setupWebhookTools(this.server);
    setupViewsTools(this.server);
    setupDependenciesTools(this.server);
    setupAttachmentsTools(this.server);
    setupCustomFieldTools(this.server);
    setupTimeTrackingTools(this.server);
    setupGoalsTools(this.server);
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
    console.error('ClickUp MCP server running on stdio');
  }
}

// Create and run the server
const server = new ClickUpServer();
server.run().catch(console.error);
