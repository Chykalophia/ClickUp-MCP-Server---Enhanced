import { createRequire } from 'node:module';

// The MCP handshake advertises this version to every connecting client, so it
// has to track the real published version. It is read from package.json at
// runtime rather than repeated as a literal here: the previous hardcoded string
// sat at '3.4.0' from the 3.x era through the 6.0.0 release — three majors
// stale — which made "is this server up to date?" unanswerable from the
// protocol.
//
// createRequire resolves relative to this module's own URL, and this file sits
// exactly one directory below the package root in both layouts (src/version.ts
// for ts-node dev, build/version.js for the published package), so
// '../package.json' is correct either way. npm always includes package.json in
// the tarball regardless of the `files` list, so this resolves for global
// installs too.
//
// Deliberately NOT `import pkg from '../package.json'`: that would pull a file
// outside `rootDir` into the TypeScript program and break the build.
const requireFromHere = createRequire(import.meta.url);

const pkg = requireFromHere('../package.json') as { version?: string };

export const VERSION = pkg.version ?? '0.0.0-unknown';
