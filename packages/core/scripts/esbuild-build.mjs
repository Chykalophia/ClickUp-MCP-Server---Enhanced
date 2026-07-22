// Transpile-only build for @chykalophia/clickup-mcp-server.
//
// A full `tsc` build cannot compile this package: the MCP SDK's tool() generics
// combined with zod across the 157 tool registrations produce a type graph so
// large that tsc exhausts >8GB of memory just binding it (even with --noCheck),
// which OOMs on CI. esbuild transpiles each file independently without building
// a whole-program type model, so it finishes in seconds at a few hundred MB. It
// also elides type-only imports by usage analysis, so unmarked type imports do
// not leak into the emitted JS. Type safety is enforced separately by
// `npm run typecheck` (tsc over the client/schema/util layers).

import { build } from 'esbuild';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectTsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectTsFiles(full, out);
    } else if (
      full.endsWith('.ts') &&
      !full.endsWith('.d.ts') &&
      !full.endsWith('.test.ts') &&
      !full.endsWith('.spec.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

const entryPoints = collectTsFiles('src').filter(
  (p) => !p.includes(`${'/'}tests${'/'}`) && !p.includes(`${'/'}__tests__${'/'}`)
);

await build({
  entryPoints,
  outdir: 'build',
  outbase: 'src',
  format: 'esm',
  platform: 'node',
  target: 'es2020',
  bundle: false,
  sourcemap: false,
  logLevel: 'info',
});

// eslint-disable-next-line no-console
console.log(`esbuild: transpiled ${entryPoints.length} files -> build/`);
