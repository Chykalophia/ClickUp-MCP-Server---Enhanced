import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Regression guard: in stdio mode the server's stdout IS the JSON-RPC channel.
// Any console.log / console.info / console.debug / process.stdout.write in
// runtime code injects non-JSON lines into the protocol stream and corrupts the
// session for the client. Diagnostics must go to stderr (console.error /
// console.warn). This test scans every runtime source file under src/.
//
// See version.test.ts for why PACKAGE_ROOT is derived this way (ts-jest
// transpiles this suite to CommonJS, so import.meta is unavailable).
const PACKAGE_ROOT = typeof __dirname !== 'undefined' ? join(__dirname, '..', '..') : process.cwd();
const SRC = join(PACKAGE_ROOT, 'src');

const FORBIDDEN = /\bconsole\.(log|info|debug|trace|table|dir)\s*\(|\bprocess\.stdout\.write\s*\(/;

function isTestPath(rel: string): boolean {
  const parts = rel.split(sep);
  return (
    parts.includes('tests') ||
    parts.includes('__tests__') ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)
  );
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.[cm]?[jt]s$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Strip block and line comments so documentation mentioning console.log is allowed. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('runtime code never writes diagnostics to stdout', () => {
  const files = collectSourceFiles(SRC).filter(file => !isTestPath(relative(SRC, file)));

  it('finds runtime source files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('uses console.error/console.warn (stderr) instead of stdout writers', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, index) => {
        if (FORBIDDEN.test(line)) {
          offenders.push(`${relative(PACKAGE_ROOT, file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
