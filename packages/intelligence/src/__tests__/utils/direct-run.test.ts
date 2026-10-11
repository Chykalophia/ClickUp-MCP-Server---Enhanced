import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDirectRun } from '../../utils/direct-run.js';

describe('isDirectRun', () => {
  let dir: string;
  let target: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'direct-run-'));
    target = join(dir, 'server with space.js');
    writeFileSync(target, '');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('matches when argv[1] is the module itself (including URL-escaped characters)', () => {
    expect(isDirectRun(pathToFileURL(target).href, target)).toBe(true);
  });

  it('matches when argv[1] is an npm-style bin symlink to the module', () => {
    const link = join(dir, 'bin-link');
    symlinkSync(target, link);
    expect(isDirectRun(pathToFileURL(target).href, link)).toBe(true);
  });

  it('does not match a different entry script', () => {
    const other = join(dir, 'other.js');
    writeFileSync(other, '');
    expect(isDirectRun(pathToFileURL(target).href, other)).toBe(false);
  });

  it('returns false when there is no entry script or it does not exist', () => {
    expect(isDirectRun(pathToFileURL(target).href, undefined)).toBe(false);
    expect(isDirectRun(pathToFileURL(target).href, join(dir, 'missing.js'))).toBe(false);
  });
});
