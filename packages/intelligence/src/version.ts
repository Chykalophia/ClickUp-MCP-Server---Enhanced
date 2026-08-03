import { createRequire } from 'node:module';

// The MCP handshake advertises this version to every connecting client, so it
// has to track the real published version. It is read from package.json at
// runtime rather than repeated as a literal here: the previous hardcoded string
// sat at '4.1.0' while the package shipped as 5.0.0, which made "is this server
// up to date?" unanswerable from the protocol.
//
// createRequire resolves relative to this module's own URL, and this file sits
// exactly one directory below the package root in both layouts (src/version.ts
// for dev, build/version.js for the published package), so '../package.json' is
// correct either way.
//
// Deliberately NOT `import pkg from '../package.json'`: that would pull a file
// outside `rootDir` into the tsc program and break `tsc --build`.
const requireFromHere = createRequire(import.meta.url);

function readVersion(): string {
  try {
    const pkg = requireFromHere('../package.json') as { version?: unknown };

    return typeof pkg.version === 'string' && pkg.version.length > 0
      ? pkg.version
      : '0.0.0-unknown';
  } catch {
    // Reporting an unknown version is a cosmetic defect; failing to start is
    // not. This module is imported by the server entry point, so an unreadable,
    // missing, or malformed package.json would otherwise throw during startup
    // and the process would never reach the stdio transport.
    return '0.0.0-unknown';
  }
}

export const VERSION = readVersion();
