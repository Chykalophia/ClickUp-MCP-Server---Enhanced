#!/usr/bin/env node
/* eslint-disable no-console */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClickUpMcpServer } from './server-factory.js';
import { describeToolsets, type ResolvedToolsets } from './tools/toolsets.js';

// Environment variables are passed to the server through the MCP settings file
// See mcp-settings-example.json for an example

class ClickUpServer {
  private server: McpServer;
  private toolsets: ResolvedToolsets;

  constructor() {
    ({ server: this.server, toolsets: this.toolsets } = createClickUpMcpServer());

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
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
