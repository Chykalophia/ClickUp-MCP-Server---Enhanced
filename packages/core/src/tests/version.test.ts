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
//
// __dirname exists under that CommonJS transpile. The typeof guard keeps this
// working if the suite is ever switched to true ESM (jest's ESM mode needs
// NODE_OPTIONS=--experimental-vm-modules), where __dirname is undefined and
// jest's cwd is the package root. `import.meta.url` is deliberately not used
// for this either — it is the very syntax error described above.
const PACKAGE_ROOT =
  typeof __dirname !== 'undefined' ? join(__dirname, '..', '..') : process.cwd();

const readSource = (relative: string): string =>
  readFileSync(join(PACKAGE_ROOT, relative), 'utf8');

// Quote style is not the thing under test, so every pattern below accepts
// either. Prettier is configured with singleQuote, but a reformat must not be
// able to turn this guard red while version reporting is still correct.
const Q = '[\'"]';

const ENTRY_POINTS = ['src/index-enhanced.ts', 'src/index-efficiency-simple.ts'];

describe('server version reporting', () => {
  it.each(ENTRY_POINTS)('%s advertises VERSION, not a literal', (entry) => {
    const source = readSource(entry);

    // The server constructor must hand through the shared VERSION constant.
    expect(source).toMatch(/version:\s*VERSION\b/);
    expect(source).toMatch(new RegExp(`from ${Q}\\./version\\.js${Q}`));

    // ...and must not carry a hardcoded semver literal in its place.
    expect(source).not.toMatch(new RegExp(`version:\\s*${Q}\\d+\\.\\d+\\.\\d+${Q}`));
  });

  it('version.ts sources the version from package.json', () => {
    const source = readSource('src/version.ts');

    expect(source).toMatch(
      new RegExp(`requireFromHere\\(\\s*${Q}\\.\\./package\\.json${Q}\\s*\\)`)
    );
    expect(source).toMatch(/export const VERSION/);

    // No semver literal may appear in the executable code. Comments are
    // stripped first: the explanatory comment cites the old '3.4.0' string on
    // purpose, and that is documentation, not a value the server can report.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(new RegExp(`${Q}0\\.0\\.0-unknown${Q}`, 'g'), '');

    expect(code).not.toMatch(new RegExp(`${Q}\\d+\\.\\d+\\.\\d+${Q}`));
  });

  it('survives an unreadable package.json instead of crashing at startup', () => {
    const source = readSource('src/version.ts');

    // The entry points import this module, so a throw here would abort startup
    // before the stdio transport is ever connected — the fallback would never
    // be reached. Guard that the read stays wrapped.
    expect(source).toMatch(/try\s*{/);
    expect(source).toMatch(/catch/);
    expect(source).toMatch(new RegExp(`${Q}0\\.0\\.0-unknown${Q}`));
  });

  it('package.json declares a valid semver version', () => {
    const pkg = JSON.parse(readSource('package.json')) as { version: string };

    // Anchored at both ends, or the guard passes on mangled values like
    // '1.2.3.4' and '1.2.3rc1' — the same class of corruption it exists to
    // catch. The optional groups keep legitimate prerelease and build metadata
    // (6.0.1-beta.1, 6.0.1+build.5) valid.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
  });
});
