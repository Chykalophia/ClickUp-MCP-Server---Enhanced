#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTaskTools } from './tools/task-tools.js';
import { setupEnhancedDocTools } from './tools/doc-tools-enhanced.js';
import { setupSpaceTools } from './tools/space-tools.js';
import { setupChecklistTools } from './tools/checklist-tools.js';
import { setupCommentTools } from './tools/comment-tools.js';
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
      version: '2.0.0', // Updated version for enhanced functionality
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
    // Set up all tools
    setupTaskTools(this.server);
    setupEnhancedDocTools(this.server); // Using enhanced document tools
    setupSpaceTools(this.server);
    setupChecklistTools(this.server);
    setupCommentTools(this.server);
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
    console.error('ClickUp MCP server running on stdio with enhanced document management');
  }
}

// Create and run the server
const server = new ClickUpServer();
server.run().catch(console.error);
