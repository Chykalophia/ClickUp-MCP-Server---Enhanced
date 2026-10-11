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

const FORBIDDEN =
  /\bconsole\s*\.\s*(?:log|info|debug|trace|table|dir)\s*\(|\bprocess\s*\.\s*stdout\s*\.\s*write\s*\(/g;

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

/**
 * True when a `/` at this point starts a regex literal rather than division:
 * the previous significant token is an operator, opening bracket, or a
 * keyword such as `return`, never a value (identifier, number, `)` or `]`).
 * The exception is a `)` closing the condition of if/while/for/with, which
 * ends a statement head, not a value: `controlParenEnd` is the length `before`
 * had right after such a `)`.
 */
function regexAllowed(before: string, controlParenEnd: number): boolean {
  const offset = Math.max(0, before.length - 200);
  const trimmed = before.slice(offset).trimEnd();
  if (trimmed === '') return true;
  if (offset + trimmed.length === controlParenEnd) return true;
  const word = trimmed.match(/[A-Za-z_$][\w$]*$/);
  if (word) {
    return /^(?:return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)$/.test(word[0]);
  }
  return !/[\w$)\]'"`]$/.test(trimmed);
}

/**
 * Blank out everything that is not code (keeping newlines, so line numbers
 * hold): comments, string contents, the literal parts of template literals and
 * regex literal bodies. Quote and delimiter characters stay, and code inside a
 * template's `${ }` substitutions is kept, so a call there is still found. A
 * small lexer, not a regex: `//` inside a string ('http://...') or template
 * literal is not a comment and must not hide code after it on the same line,
 * and documentation or string data mentioning console.log is allowed.
 */
function maskNonCode(source: string): string {
  let out = '';
  let i = 0;
  // Each frame is a template literal awaiting its closing backtick, or the
  // brace depth inside one of its ${ } substitutions.
  const templateBraces: number[] = [];
  // One entry per open `(`: whether it opened an if/while/for/with condition.
  const parens: boolean[] = [];
  let controlParenEnd = -1;
  const blank = (text: string) => text.replace(/[^\n]/g, ' ');
  // Scan template literal text from `start` to its closing backtick or next
  // `${`, emitting the text blanked; returns the index after what it emitted.
  const templateText = (start: number): number => {
    let j = start;
    while (j < source.length && source[j] !== '`') {
      if (source[j] === '\\') j++;
      else if (source[j] === '$' && source[j + 1] === '{') break;
      j++;
    }
    out += blank(source.slice(start, j));
    if (source[j] === '$') {
      templateBraces.push(0);
      out += '${';
      return j + 2;
    }
    out += source.slice(j, j + 1);
    return j + 1;
  };
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += blank(source.slice(i, stop));
      i = stop;
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
    } else if (ch === '/' && regexAllowed(out, controlParenEnd)) {
      // Skip a regex literal whole, so `/*` or `//` inside it (escaped, or in
      // a character class like /[/*]/) is not read as a comment start.
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== '\n') {
        if (source[j] === '\\') j++;
        else if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) break;
        j++;
      }
      out += `/${blank(source.slice(i + 1, j))}${source.slice(j, j + 1)}`;
      i = j + 1;
    } else if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && source[j] !== '\n') {
        if (source[j] === '\\') j++;
        j++;
      }
      out += `${ch}${blank(source.slice(i + 1, j))}${source.slice(j, j + 1)}`;
      i = j + 1;
    } else if (ch === '`') {
      out += ch;
      i = templateText(i + 1);
    } else if (templateBraces.length > 0 && (ch === '{' || ch === '}')) {
      const top = templateBraces.length - 1;
      if (ch === '{') {
        templateBraces[top]++;
        out += ch;
        i++;
      } else if (templateBraces[top] > 0) {
        templateBraces[top]--;
        out += ch;
        i++;
      } else {
        // End of a ${ } substitution: resume the template literal text.
        templateBraces.pop();
        out += ch;
        i = templateText(i + 1);
      }
    } else if (ch === '(') {
      parens.push(/(?:^|[^\w$.])(?:if|while|for|with)\s*$/.test(out.slice(-200)));
      out += ch;
      i++;
    } else if (ch === ')') {
      out += ch;
      i++;
      if (parens.pop() === true) controlParenEnd = out.length;
    } else if (ch === '\\') {
      out += source.slice(i, i + 2);
      i += 2;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** `file:line: code` for every forbidden call, including ones split over lines. */
function findStdoutWrites(source: string, label: string): string[] {
  const stripped = maskNonCode(source);
  const offenders: string[] = [];
  for (const match of stripped.matchAll(FORBIDDEN)) {
    const line = stripped.slice(0, match.index).split('\n').length;
    offenders.push(`${label}:${line}: ${match[0].replace(/\s+/g, ' ')}`);
  }
  return offenders;
}

describe('runtime code never writes diagnostics to stdout', () => {
  const files = collectSourceFiles(SRC).filter(file => !isTestPath(relative(SRC, file)));

  it('finds runtime source files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('uses console.error/console.warn (stderr) instead of stdout writers', () => {
    const offenders: string[] = [];
    for (const file of files) {
      offenders.push(...findStdoutWrites(readFileSync(file, 'utf8'), relative(PACKAGE_ROOT, file)));
    }
    expect(offenders).toEqual([]);
  });

  it('catches calls hidden by naive comment stripping or split across lines', () => {
    expect(findStdoutWrites("const u = 'http://x'; console.log(u);", 'f')).toHaveLength(1);
    // eslint-disable-next-line no-template-curly-in-string -- source text under test
    expect(findStdoutWrites('const u = `a//b${x}`; console.info(u);', 'f')).toHaveLength(1);
    expect(findStdoutWrites('const u = "//"; process.stdout.write(u);', 'f')).toHaveLength(1);
    expect(findStdoutWrites("\nconsole.log\n  ('diag');", 'f')).toEqual(['f:2: console.log (']);
    expect(findStdoutWrites('console\n  .debug(1);', 'f')).toHaveLength(1);
    // eslint-disable-next-line no-template-curly-in-string -- source text under test
    expect(findStdoutWrites('const s = `${console.log(x)}`;', 'f')).toHaveLength(1);
    // eslint-disable-next-line no-template-curly-in-string -- source text under test
    expect(findStdoutWrites('const s = `a${`b${console.debug(x)}`}c`;', 'f')).toHaveLength(1);
    // A `)` closing an if condition ends no value, so the `/` starts a regex.
    expect(findStdoutWrites('if (ok) /[//]/.test(x); console.log(x)', 'f')).toHaveLength(1);
    expect(findStdoutWrites('while (f(a)) /\\//.test(x); console.log(x)', 'f')).toHaveLength(1);
  });

  it('still ignores comments and other streams', () => {
    expect(findStdoutWrites('// console.log(x)\n/* console.log(y) */ console.error(z);', 'f')).toEqual([]);
    expect(findStdoutWrites('const re = /a\\/*/; console.warn(re); // console.log()', 'f')).toEqual([]);
    expect(findStdoutWrites('const re = /[/*]/; console.log(re); // */', 'f')).toHaveLength(1);
    expect(findStdoutWrites('const half = total / 2; /* console.log(x) */', 'f')).toEqual([]);
    expect(findStdoutWrites('const half = f(total) / 2; /* console.log(x) */', 'f')).toEqual([]);
    expect(findStdoutWrites('x.if(a) / 2; /* console.log(x) */', 'f')).toEqual([]);
    // Strings and template text are data, not code.
    expect(findStdoutWrites("const example = 'console.log(';", 'f')).toEqual([]);
    expect(findStdoutWrites('const example = "process.stdout.write(";', 'f')).toEqual([]);
    // eslint-disable-next-line no-template-curly-in-string -- source text under test
    expect(findStdoutWrites('const doc = `call console.log(${n}) here`;', 'f')).toEqual([]);
    expect(findStdoutWrites('const doc = `\nconsole.info(\n`;', 'f')).toEqual([]);
  });
});
