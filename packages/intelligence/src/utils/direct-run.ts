import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Returns true when the module identified by `moduleUrl` (pass `import.meta.url`)
 * is the script Node was started with.
 *
 * A naive `import.meta.url === \`file://${process.argv[1]}\`` check fails when
 * the server is launched through an npm bin symlink (argv[1] is the link, not
 * the target), on Windows (drive letters/backslashes), and for paths that need
 * URL escaping. Both sides are therefore resolved with realpath and normalised
 * through pathToFileURL before comparing.
 */
export function isDirectRun(moduleUrl: string, entryPath: string | undefined = process.argv[1]): boolean {
  if (!entryPath) {
    return false;
  }
  try {
    const entryUrl = pathToFileURL(realpathSync(entryPath)).href;
    const selfUrl = pathToFileURL(realpathSync(fileURLToPath(moduleUrl))).href;
    return entryUrl === selfUrl;
  } catch {
    return false;
  }
}
