#!/usr/bin/env node
/* eslint-disable no-console */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

    // Close the MCP server before exiting on SIGINT or SIGTERM.
    // RateLimiter leaves signal handling to this handler (#62).
    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      let code = 0;
      try {
        await this.server.close();
      } catch (error) {
        console.error('ClickUp MCP server: error during shutdown:', error);
        code = 1;
      }
      process.exit(code);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
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

const server = new ClickUpServer();
server.run().catch(console.error);
