import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request ClickUp credentials for the hosted (HTTP) server.
 *
 * The stdio server is single-user: one CLICKUP_API_TOKEN for the whole process,
 * captured by module-level clients at import time. The hosted server serves
 * several people from one process, so every outbound ClickUp call has to carry
 * the token of the person whose MCP request caused it. ClickUpClient reads the
 * token bound here on every request (see the request interceptor in index.ts),
 * which lets the existing module-level clients stay as they are.
 */
interface ClickUpRequestContext {
  token: string;
}

const storage = new AsyncLocalStorage<ClickUpRequestContext>();

/** Env flag the hosted entry points set before importing any tool module. */
export const REMOTE_MODE_ENV = 'CLICKUP_MCP_REMOTE';

/**
 * Placeholder handed to clients constructed at import time in hosted mode. It is
 * never sent: in hosted mode the interceptor either swaps in the request's own
 * token or refuses the call.
 */
export const REMOTE_PLACEHOLDER_TOKEN = 'hosted-mode-no-process-token';

/**
 * Hosted mode: every ClickUp call must carry the caller's own token, and the
 * process-wide CLICKUP_API_TOKEN is never used, even when it is set.
 */
export const isRemoteMode = (): boolean => process.env[REMOTE_MODE_ENV] === '1';

/** Run `fn` with `token` as the ClickUp credential for every call it makes. */
export const runWithClickUpToken = <T>(token: string, fn: () => T): T => {
  if (!token) {
    throw new Error('runWithClickUpToken requires a non-empty token');
  }
  return storage.run({ token }, fn);
};

/** The token bound to the current request, if any. */
export const getRequestClickUpToken = (): string | undefined => storage.getStore()?.token;

export class MissingRequestCredentialsError extends Error {
  constructor() {
    super(
      'No ClickUp credentials are bound to this request. The hosted server only calls ClickUp ' +
        'with the signed-in user’s own token and never falls back to a server token.'
    );
    this.name = 'MissingRequestCredentialsError';
  }
}
