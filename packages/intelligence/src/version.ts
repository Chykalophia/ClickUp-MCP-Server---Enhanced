import { createRequire } from 'node:module';

// The MCP handshake advertises this version to clients, so it is read from
// package.json at runtime instead of a literal that can drift from the release.
//
// createRequire resolves from this module, which sits one level below the package
// root in both layouts (src/version.ts, build/version.js), so '../package.json' works.
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
    // An unknown version is cosmetic; throwing here (missing or malformed package.json)
    // would crash startup before the server reaches the stdio transport.
    return '0.0.0-unknown';
  }
}

export const VERSION = readVersion();
