#!/usr/bin/env node

/**
 * ClickUp Intelligence MCP Server
 * 
 * Advanced project management intelligence and workflow optimization for ClickUp.
 * Provides AI-powered analytics, smart planning, and automation capabilities.
 * 
 * Features:
 * - Project Health Analyzer
 * - Smart Sprint Planner
 * - Task Decomposition Engine
 * - Resource Optimizer
 * - Workflow Intelligence
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupProjectHealthAnalyzer } from './tools/project-health-analyzer.js';
import { setupSmartSprintPlanner } from './tools/smart-sprint-planner.js';
import { setupTaskDecompositionEngine } from './tools/task-decomposition-engine.js';
import { setupResourceOptimizer } from './tools/resource-optimizer.js';
import { setupWorkflowIntelligence } from './tools/workflow-intelligence.js';

const server = new McpServer({
  name: 'clickup-intelligence-mcp-server',
  version: '1.0.0'
});

// Setup all intelligence tools
setupProjectHealthAnalyzer(server);
setupSmartSprintPlanner(server);
setupTaskDecompositionEngine(server);
setupResourceOptimizer(server);
setupWorkflowIntelligence(server);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ClickUp Intelligence MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start ClickUp Intelligence MCP Server:', error);
  process.exit(1);
});
