#!/usr/bin/env node
/* eslint-disable no-console */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTaskResources } from './resources/task-resources.js';
import { setupDocResources } from './resources/doc-resources.js';
import { setupChecklistResources } from './resources/checklist-resources.js';
import { setupCommentResources } from './resources/comment-resources.js';
import { setupSpaceResources } from './resources/space-resources.js';
import { setupFolderResources } from './resources/folder-resources.js';
import { setupListResources } from './resources/list-resources.js';
import { createClickUpServer } from './create-server.js';
import { VERSION } from './version.js';
import { describeToolsets, type ResolvedToolsets } from './tools/toolsets.js';

// Environment variables are passed to the server through the MCP settings file
// See mcp-settings-example.json for an example

class ClickUpServer {
  private server: McpServer;
  private toolsets: ResolvedToolsets;
  private counts: { total: number; enabled: number };

  constructor() {
    // Every tool is registered; CLICKUP_TOOL_MODE / CLICKUP_TOOLSETS decide
    // which are enabled. See create-server.ts and docs/guides/TOOL_LOADING.md.
    const created = createClickUpServer({ version: VERSION });
    this.server = created.server;
    this.toolsets = created.resolved;
    this.counts = created.counts;

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    this.setupResources();
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
    if (this.toolsets.unknownMode) {
      console.error(
        `ClickUp MCP server: unknown CLICKUP_TOOL_MODE "${this.toolsets.unknownMode}" (expected core or all); using core`
      );
    }
    if (this.toolsets.unknown.length > 0) {
      console.error(
        `ClickUp MCP server: ignoring unknown CLICKUP_TOOLSETS entries: ${this.toolsets.unknown.join(', ')}${
          this.toolsets.fellBack ? ' — no valid toolsets named, falling back to core tools' : ''
        }`
      );
    }
    console.error(
      `ClickUp MCP server running on stdio: ${describeToolsets(this.toolsets, this.counts)}`
    );
  }
}

// Create and run the server
const server = new ClickUpServer();
server.run().catch(console.error);
