import { formatAuthorizationHeader } from '../clickup-client/index.js';
import type { ClickUpIdentity } from './access-policy.js';

/**
 * The upstream "Sign in with ClickUp" leg. Each person signs in with their own
 * ClickUp account, so their MCP calls run as them, with their permissions.
 *
 * ClickUp OAuth (developer.clickup.com/docs/authentication):
 *  - authorize: https://app.clickup.com/api?client_id&redirect_uri&state
 *    (state is accepted; the docs do not promise it is echoed back)
 *  - token:     POST https://api.clickup.com/api/v2/oauth/token
 *               body { client_id, client_secret, code } -> { access_token }
 *  - access tokens currently do not expire; there is no refresh token
 *
 * An interface so tests can stand in for ClickUp without network access.
 */
export interface ClickUpOAuthAdapter {
  authorizeUrl(params: { redirectUri: string; state: string }): string;
  exchangeCode(code: string, redirectUri: string): Promise<string>;
  fetchIdentity(accessToken: string): Promise<ClickUpIdentity>;
}

const AUTHORIZE_URL = 'https://app.clickup.com/api';
const API_BASE = 'https://api.clickup.com/api/v2';
const TIMEOUT_MS = 15000;

export class ClickUpOAuthError extends Error {
  constructor(
    message: string,
    /** HTTP status from ClickUp, when the failure was an HTTP response. */
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ClickUpOAuthError';
  }
}

export function createClickUpOAuthAdapter(credentials: {
  clientId: string;
  clientSecret: string;
}): ClickUpOAuthAdapter {
  const getJson = async (path: string, token: string): Promise<unknown> => {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: formatAuthorizationHeader(token), Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new ClickUpOAuthError(
        `ClickUp ${path} returned HTTP ${response.status}`,
        response.status
      );
    }
    return response.json();
  };

  return {
    authorizeUrl({ redirectUri, state }) {
      const url = new URL(AUTHORIZE_URL);
      url.searchParams.set('client_id', credentials.clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('state', state);
      return url.href;
    },

    async exchangeCode(code) {
      const response = await fetch(`${API_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new ClickUpOAuthError(
          `ClickUp token exchange returned HTTP ${response.status}`,
          response.status
        );
      }
      const data = (await response.json()) as { access_token?: unknown };
      if (typeof data.access_token !== 'string' || !data.access_token) {
        throw new ClickUpOAuthError('ClickUp token exchange returned no access_token');
      }
      return data.access_token;
    },

    async fetchIdentity(accessToken) {
      const [userData, teamData] = await Promise.all([
        getJson('/user', accessToken) as Promise<{
          user?: { id?: number | string; email?: string; username?: string };
        }>,
        getJson('/team', accessToken) as Promise<{ teams?: Array<{ id?: number | string }> }>,
      ]);
      const user = userData.user;
      if (!user || user.id === undefined || user.id === null) {
        throw new ClickUpOAuthError('ClickUp /user returned no user id');
      }
      return {
        userId: String(user.id),
        email: user.email,
        username: user.username,
        workspaceIds: (teamData.teams ?? [])
          .map(team => (team.id === undefined || team.id === null ? '' : String(team.id)))
          .filter(Boolean),
      };
    },
  };
}
