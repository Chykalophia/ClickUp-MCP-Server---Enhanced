#!/usr/bin/env node
// Thin entry point — delegates to index-enhanced.ts, the one canonical server.
// Kept so the `clickup-mcp-server-efficiency` bin and existing configs that
// point at build/index-efficiency-simple.js keep working.
import './index-enhanced.js';
