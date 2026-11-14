#!/usr/bin/env node
// Alias of the single ClickUp MCP server (build/index-enhanced.js). The
// -basic/-enhanced/-efficiency bins all start the same server; they are kept
// so existing client configs keep working.
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// import() needs a file URL, not a bare path, to work on Windows.
await import(pathToFileURL(join(__dirname, '../build/index-enhanced.js')).href);
