import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidTargetError,
  InvalidTokenError,
  ServerError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { secureLog } from '../utils/security.js';
import { isAllowed, type ClickUpIdentity } from './access-policy.js';
import { ClickUpOAuthError, type ClickUpOAuthAdapter } from './clickup-oauth.js';
import { LOOPBACK_HOSTS, type RemoteConfig } from './config.js';
import { Sealer } from './sealed.js';

/**
 * OAuth 2.1 authorization server for the hosted ClickUp MCP server.
 *
 * Claude (or any MCP client) does OAuth with THIS server; this server in turn
 * sends the person to "Sign in with ClickUp". The ClickUp token that comes back
 * is sealed inside the access token Claude holds, and unsealed per request to
 * make that person's ClickUp calls. Nothing is stored server-side (sealed.ts).
 *
 * Flow:
 *  1. POST /register      client_id = sealed client metadata (redirect URIs allowlisted)
 *  2. GET  /authorize     -> consent page naming the client and where it sends you
 *     POST /oauth/consent -> (same-origin only) login cookie + redirect to ClickUp
 *  3. GET  /oauth/clickup/callback  ClickUp code -> ClickUp token -> access policy
 *                         -> sealed authorization code -> redirect to the client
 *  4. POST /token         PKCE-checked code (or refresh token) -> access + refresh token
 *  5. POST /mcp           Bearer access token -> runs tools as that ClickUp user
 */

export const CALLBACK_PATH = '/oauth/clickup/callback';
export const CONSENT_PATH = '/oauth/consent';
export const LOGIN_COOKIE = 'cu_mcp_login';

const LOGIN_TTL_SECONDS = 10 * 60;
const CODE_TTL_SECONDS = 2 * 60;

interface SealedClient extends Record<string, unknown> {
  ru: string[];
  n?: string;
  am?: string;
  gt?: string[];
  rt?: string[];
  sc?: string;
  s?: string;
  sx?: number;
  iat: number;
}

interface SealedLogin extends Record<string, unknown> {
  c: string; // client_id
  ru: string; // client redirect_uri
  cc: string; // PKCE code_challenge
  st?: string; // client's state
  sc: string[];
  rs?: string; // RFC 8707 resource
  n: string; // nonce sent to ClickUp as state
}

/** Fields shared by authorization codes, access tokens and refresh tokens. */
interface SealedGrant extends Record<string, unknown> {
  c: string; // client_id
  ck: string; // the person's ClickUp OAuth token
  uid: string;
  em?: string;
  ws: string[];
  sc: string[];
  at: number; // when the person signed in with ClickUp (absolute session cap)
}

interface SealedCode extends SealedGrant {
  ru: string;
  cc: string;
  rs?: string;
}

export interface ClickUpAuthExtra extends Record<string, unknown> {
  clickUpToken: string;
  clickUpUserId: string;
}

const identityOf = (grant: SealedGrant): ClickUpIdentity => ({
  userId: grant.uid,
  email: grant.em,
  workspaceIds: grant.ws,
});

export class ClickUpOAuthProvider implements OAuthServerProvider {
  private readonly sealer: Sealer;
  private readonly callbackUrl: string;
  private readonly secureCookie: boolean;

  constructor(
    private readonly config: RemoteConfig,
    private readonly clickUp: ClickUpOAuthAdapter
  ) {
    // Bound to this deployment (origin + Vercel environment): a preview or a
    // second deployment that shares the secret still cannot open these tokens.
    this.sealer = new Sealer(config.tokenSecret, config.sealerContext);
    this.callbackUrl = new URL(CALLBACK_PATH, config.publicUrl).href;
    this.secureCookie = config.publicUrl.protocol === 'https:';
  }

  // ---------------------------------------------------------------- clients

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId: string): OAuthClientInformationFull | undefined => {
        const sealed = this.sealer.open<SealedClient>('client', clientId);
        if (!sealed) return undefined;
        // Re-checked on every use, so tightening the redirect allowlist also
        // retires client_ids that were registered under the old one.
        if (!Array.isArray(sealed.ru) || !sealed.ru.every(uri => this.isRedirectUriAllowed(uri))) {
          return undefined;
        }
        return {
          client_id: clientId,
          client_id_issued_at: sealed.iat,
          redirect_uris: sealed.ru,
          client_name: sealed.n,
          token_endpoint_auth_method: sealed.am,
          grant_types: sealed.gt,
          response_types: sealed.rt,
          scope: sealed.sc,
          client_secret: sealed.s,
          client_secret_expires_at: sealed.sx,
        };
      },

      registerClient: (
        client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
      ): OAuthClientInformationFull => {
        for (const uri of client.redirect_uris) {
          if (!this.isRedirectUriAllowed(uri)) {
            throw new InvalidClientMetadataError(
              `redirect_uri ${uri} is not allowed on this server`
            );
          }
        }
        const iat = Math.floor(Date.now() / 1000);
        const sealed: SealedClient = {
          ru: client.redirect_uris,
          n: client.client_name,
          am: client.token_endpoint_auth_method,
          gt: client.grant_types,
          rt: client.response_types,
          sc: client.scope,
          s: client.client_secret,
          sx: client.client_secret_expires_at,
          iat,
        };
        return {
          ...client,
          client_id: this.sealer.seal('client', sealed),
          client_id_issued_at: iat,
        };
      },
    };
  }

  private isRedirectUriAllowed(uri: string): boolean {
    if (this.config.allowedRedirectUris.includes(uri)) return true;
    if (!this.config.allowLoopbackRedirects) return false;
    try {
      const parsed = new URL(uri);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        LOOPBACK_HOSTS.has(parsed.hostname)
      );
    } catch {
      return false;
    }
  }

  private assertResource(resource: URL | string | undefined, boundTo?: string): void {
    if (resource === undefined) return;
    const href = typeof resource === 'string' ? resource : resource.href;
    const strip = (value: string) => value.replace(/\/+$/, '');
    const accepted = [strip(this.config.mcpUrl.href), strip(this.config.publicUrl.href)];
    if (!accepted.includes(strip(href))) {
      throw new InvalidTargetError(`resource ${href} is not served by this server`);
    }
    if (boundTo !== undefined && strip(boundTo) !== strip(href)) {
      throw new InvalidTargetError('resource does not match the authorization request');
    }
  }

  // ---------------------------------------------------------------- authorize

  /**
   * GET /authorize: show a consent page before anything goes to ClickUp.
   *
   * Registration is open (any MCP client may register) and ClickUp can skip
   * its own prompt for an app the person already authorized, so without this
   * page a link crafted by someone else could complete a sign-in silently and
   * deliver the code to *their* client. The page names the client and, more
   * importantly, where the person will be sent back to.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    this.assertResource(params.resource);
    const login: SealedLogin = {
      c: client.client_id,
      ru: params.redirectUri,
      cc: params.codeChallenge,
      st: params.state,
      sc: params.scopes ?? [],
      rs: params.resource?.href,
      n: randomBytes(16).toString('base64url'),
    };
    const sealedLogin = this.sealer.seal('login', login, LOGIN_TTL_SECONDS);
    res
      .status(200)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
        'X-Frame-Options': 'DENY',
        // Not no-referrer: under no-referrer browsers send `Origin: null` on the
        // page's own form POST, which the same-origin check must then refuse.
        // same-origin still sends nothing to other sites.
        'Referrer-Policy': 'same-origin',
      })
      .send(renderConsentPage(client.client_name, params.redirectUri, sealedLogin));
  }

  /** POST /oauth/consent: the person approved (or declined) on the consent page. */
  async handleConsent(req: Request, res: Response): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    // Only the consent page itself may submit this form: a cross-site page
    // auto-posting a login it obtained from /authorize must not skip consent.
    if (!this.isSameOriginPost(req)) {
      res.status(403).type('text/plain').send('Consent must be given on this server’s own page.');
      return;
    }
    const sealedLogin = typeof req.body?.login === 'string' ? req.body.login : undefined;
    const login = this.sealer.open<SealedLogin>('login', sealedLogin);
    if (!login) {
      res.status(400).type('text/plain').send('This sign-in has expired. Start again from Claude.');
      return;
    }
    if (req.body?.decision !== 'approve') {
      res.redirect(302, errorRedirect(login, 'access_denied', 'The user declined access'));
      return;
    }
    // The cookie binds the ClickUp callback to the browser that consented,
    // whether or not ClickUp echoes `state` back.
    res.cookie(LOGIN_COOKIE, sealedLogin, {
      httpOnly: true,
      secure: this.secureCookie,
      sameSite: 'lax',
      path: CALLBACK_PATH,
      maxAge: LOGIN_TTL_SECONDS * 1000,
    });
    res.redirect(302, this.clickUp.authorizeUrl({ redirectUri: this.callbackUrl, state: login.n }));
  }

  private isSameOriginPost(req: Request): boolean {
    const origin = req.headers.origin;
    // A real Origin decides on its own. The opaque "null" (privacy modes,
    // no-referrer policies) carries no information, so it falls through to
    // Fetch Metadata like a missing Origin; refuse when neither says same-origin.
    if (typeof origin === 'string' && origin !== 'null') {
      return origin === this.config.publicUrl.origin;
    }
    return req.headers['sec-fetch-site'] === 'same-origin';
  }

  /** GET /oauth/clickup/callback — ClickUp sends the person back here. */
  async handleClickUpCallback(req: Request, res: Response): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    const login = this.sealer.open<SealedLogin>('login', readCookie(req, LOGIN_COOKIE));
    if (!login) {
      res
        .status(400)
        .type('text/plain')
        .send(
          'This sign-in link has expired or was opened in a different browser. Start again from Claude.'
        );
      return;
    }
    // The nonce sent to ClickUp as state must come back, exactly once. The
    // cookie alone binds the browser, not the ClickUp authorization: without
    // this, a page could send the victim here with someone else's ClickUp code
    // during their sign-in. A repeated ?state=a&state=b arrives as an array.
    const rawState = req.query.state;
    if (typeof rawState !== 'string' || !safeEqual(rawState, login.n)) {
      // The cookie is kept, so a forged callback cannot cancel a real sign-in.
      res
        .status(400)
        .type('text/plain')
        .send(
          rawState === undefined
            ? 'ClickUp did not return the sign-in state. Start again from Claude.'
            : 'Sign-in state mismatch. Start again from Claude.'
        );
      return;
    }
    res.clearCookie(LOGIN_COOKIE, { path: CALLBACK_PATH });

    const fail = (error: string, description: string) => {
      res.redirect(302, errorRedirect(login, error, description));
    };

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      fail('access_denied', 'ClickUp sign-in was cancelled or did not return a code');
      return;
    }

    let clickUpToken: string;
    let identity: ClickUpIdentity;
    try {
      clickUpToken = await this.clickUp.exchangeCode(code, this.callbackUrl);
      identity = await this.clickUp.fetchIdentity(clickUpToken);
    } catch (error) {
      secureLog('error', 'hosted_login_clickup_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      fail('server_error', 'Could not complete sign-in with ClickUp');
      return;
    }

    if (!isAllowed(this.config.policy, identity)) {
      // Logged so the operator can find the id to allowlist.
      secureLog('warn', 'hosted_login_denied', {
        clickUpUserId: identity.userId,
        workspaceIds: identity.workspaceIds,
      });
      fail('access_denied', 'This ClickUp account is not allowed to use this server');
      return;
    }

    const sealedCode: SealedCode = {
      c: login.c,
      ck: clickUpToken,
      uid: identity.userId,
      em: identity.email,
      ws: identity.workspaceIds,
      sc: login.sc,
      at: Math.floor(Date.now() / 1000),
      ru: login.ru,
      cc: login.cc,
      rs: login.rs,
    };
    secureLog('info', 'hosted_login_ok', { clickUpUserId: identity.userId });

    const target = new URL(login.ru);
    target.searchParams.set('code', this.sealer.seal('code', sealedCode, CODE_TTL_SECONDS));
    if (login.st) target.searchParams.set('state', login.st);
    res.redirect(302, target.href);
  }

  // ---------------------------------------------------------------- token

  private openCode(client: OAuthClientInformationFull, authorizationCode: string): SealedCode {
    const code = this.sealer.open<SealedCode>('code', authorizationCode);
    if (!code || code.c !== client.client_id) {
      throw new InvalidGrantError('Invalid or expired authorization code');
    }
    return code;
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    return this.openCode(client, authorizationCode).cc;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL
  ): Promise<OAuthTokens> {
    const code = this.openCode(client, authorizationCode);
    if (redirectUri !== undefined && redirectUri !== code.ru) {
      throw new InvalidGrantError('redirect_uri does not match the authorization request');
    }
    this.assertResource(resource, code.rs);
    if (!isAllowed(this.config.policy, identityOf(code))) {
      throw new InvalidGrantError('This ClickUp account is no longer allowed on this server');
    }
    return this.issueTokens(code);
  }

  /**
   * Refresh: re-asks ClickUp who this is and which workspaces they are in, so
   * removal from an allowlisted workspace (or revoking the app in ClickUp)
   * takes effect within one access-token lifetime, and enforces the absolute
   * session cap so a refresh chain cannot run forever.
   */
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    _scopes?: string[],
    resource?: URL
  ): Promise<OAuthTokens> {
    const grant = this.sealer.open<SealedGrant>('refresh', refreshToken);
    if (!grant || grant.c !== client.client_id || typeof grant.at !== 'number') {
      throw new InvalidGrantError('Invalid or expired refresh token');
    }
    if (Date.now() / 1000 - grant.at > this.config.sessionMaxAgeSeconds) {
      throw new InvalidGrantError('Session expired: sign in with ClickUp again');
    }
    this.assertResource(resource);

    let identity: ClickUpIdentity;
    try {
      identity = await this.clickUp.fetchIdentity(grant.ck);
    } catch (error) {
      if (error instanceof ClickUpOAuthError && (error.status === 401 || error.status === 403)) {
        throw new InvalidGrantError('ClickUp no longer accepts this sign-in: sign in again');
      }
      secureLog('error', 'hosted_refresh_identity_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServerError('Could not reach ClickUp to refresh this session');
    }
    if (identity.userId !== grant.uid) {
      throw new InvalidGrantError('ClickUp token no longer belongs to this user');
    }
    if (!isAllowed(this.config.policy, identity)) {
      throw new InvalidGrantError('This ClickUp account is no longer allowed on this server');
    }
    return this.issueTokens({ ...grant, em: identity.email, ws: identity.workspaceIds });
  }

  private issueTokens(source: SealedGrant): OAuthTokens {
    const grant: SealedGrant = {
      c: source.c,
      ck: source.ck,
      uid: source.uid,
      em: source.em,
      ws: source.ws,
      sc: source.sc,
      at: source.at,
    };
    // A refresh token never outlives the session cap, however often it is used.
    // Neither token outlives the absolute session cap.
    const sessionLeft = grant.at + this.config.sessionMaxAgeSeconds - Math.floor(Date.now() / 1000);
    const refreshTtl = Math.max(1, Math.min(this.config.refreshTokenTtlSeconds, sessionLeft));
    const accessTtl = Math.max(1, Math.min(this.config.accessTokenTtlSeconds, sessionLeft));
    return {
      access_token: this.sealer.seal('access', grant, accessTtl),
      token_type: 'bearer',
      expires_in: accessTtl,
      refresh_token: this.sealer.seal('refresh', grant, refreshTtl),
      ...(grant.sc.length > 0 ? { scope: grant.sc.join(' ') } : {}),
    };
  }

  // ---------------------------------------------------------------- verify

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const grant = this.sealer.open<SealedGrant & { exp?: number }>('access', token);
    if (!grant || typeof grant.ck !== 'string' || !grant.ck) {
      throw new InvalidTokenError('Invalid or expired access token');
    }
    if (
      typeof grant.at !== 'number' ||
      Date.now() / 1000 - grant.at > this.config.sessionMaxAgeSeconds
    ) {
      throw new InvalidTokenError('Session expired: sign in with ClickUp again');
    }
    if (!isAllowed(this.config.policy, identityOf(grant))) {
      throw new InvalidTokenError('This ClickUp account is no longer allowed on this server');
    }
    const extra: ClickUpAuthExtra = { clickUpToken: grant.ck, clickUpUserId: grant.uid };
    return {
      token,
      clientId: grant.c,
      scopes: grant.sc,
      expiresAt: grant.exp,
      resource: this.config.mcpUrl,
      extra,
    };
  }
}

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
};

/** Minimal cookie reader (avoids a cookie-parser dependency for one cookie). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, ch =>
    ch === '&'
      ? '&amp;'
      : ch === '<'
        ? '&lt;'
        : ch === '>'
          ? '&gt;'
          : ch === '"'
            ? '&quot;'
            : '&#39;'
  );

function errorRedirect(login: SealedLogin, error: string, description: string): string {
  const target = new URL(login.ru);
  target.searchParams.set('error', error);
  target.searchParams.set('error_description', description);
  if (login.st) target.searchParams.set('state', login.st);
  return target.href;
}

/** The consent page. The client name is self-declared at registration, so the redirect host is what to trust. */
export function renderConsentPage(
  clientName: string | undefined,
  redirectUri: string,
  sealedLogin: string
): string {
  const host = new URL(redirectUri).host;
  const name = escapeHtml(clientName?.trim() || 'An MCP client');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect ClickUp</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 30rem; margin: 3rem auto; padding: 0 1rem; }
  .host { font-weight: 600; word-break: break-all; }
  .actions { display: flex; gap: .75rem; margin-top: 1.5rem; }
  button { font: inherit; padding: .6rem 1.1rem; border-radius: .4rem; border: 1px solid #888; cursor: pointer; }
  button[value=approve] { background: #7b68ee; color: #fff; border-color: #7b68ee; }
  .note { color: #777; font-size: .875rem; margin-top: 1.5rem; }
</style>
</head>
<body>
<h1>Connect ClickUp?</h1>
<p><strong>${name}</strong> wants to use your ClickUp account through this server.</p>
<p>After you sign in with ClickUp you will be sent back to <span class="host">${escapeHtml(host)}</span>.</p>
<p>Only continue if you started this from that app just now.</p>
<form method="post" action="${CONSENT_PATH}">
  <input type="hidden" name="login" value="${escapeHtml(sealedLogin)}">
  <div class="actions">
    <button type="submit" name="decision" value="approve">Continue to ClickUp</button>
    <button type="submit" name="decision" value="deny">Cancel</button>
  </div>
</form>
<p class="note">The app name is chosen by the app itself; the address above is where your access actually goes.</p>
</body>
</html>`;
}
