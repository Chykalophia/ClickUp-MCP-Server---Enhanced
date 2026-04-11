#!/usr/bin/env node
/**
 * Basic entry point - delegates to the enhanced entry point.
 *
 * The enhanced entry point (index-enhanced.ts) is the canonical server
 * implementation. This file exists to support the "clickup-mcp-server-basic"
 * bin alias and the "dev" npm script, both of which reference index.ts.
 */
export * from './index-enhanced.js';
import './index-enhanced.js';
