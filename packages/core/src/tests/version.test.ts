import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for the stale-version bug: the MCP handshake advertised a
// hardcoded '3.4.0' from the 3.x era all the way through the 6.0.0 release —
// three majors out of date — so clients could not tell which build they were
// talking to. The fix reads the version from package.json at runtime
// (src/version.ts); these tests fail if anyone reintroduces a literal.
//
// This asserts against the SOURCE rather than importing src/version.ts, because
// that module uses `import.meta.url` (it must, to resolve package.json from the
// installed location) and ts-jest transpiles this suite to CommonJS, where
// `import.meta` is a syntax error. Checking the source text guards the thing
// that actually rots — the literal — without needing an ESM test runner.
const PACKAGE_ROOT = join(__dirname, '..', '..');

const readSource = (relative: string): string =>
  readFileSync(join(PACKAGE_ROOT, relative), 'utf8');

const ENTRY_POINTS = ['src/index-enhanced.ts', 'src/index-efficiency-simple.ts'];

describe('server version reporting', () => {
  it.each(ENTRY_POINTS)('%s advertises VERSION, not a literal', (entry) => {
    const source = readSource(entry);

    // The server constructor must hand through the shared VERSION constant.
    expect(source).toMatch(/version:\s*VERSION\b/);
    expect(source).toMatch(/from '\.\/version\.js'/);

    // ...and must not carry a hardcoded semver literal in its place.
    expect(source).not.toMatch(/version:\s*['"]\d+\.\d+\.\d+['"]/);
  });

  it('version.ts sources the version from package.json', () => {
    const source = readSource('src/version.ts');

    expect(source).toContain("requireFromHere('../package.json')");
    expect(source).toMatch(/export const VERSION/);

    // No semver literal may appear in the executable code. Comments are
    // stripped first: the explanatory comment cites the old '3.4.0' string on
    // purpose, and that is documentation, not a value the server can report.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'0\.0\.0-unknown'/g, '');

    expect(code).not.toMatch(/'\d+\.\d+\.\d+'/);
  });

  it('package.json declares a valid semver version', () => {
    const pkg = JSON.parse(readSource('package.json')) as { version: string };

    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
