import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthRouter,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { isRemoteMode, runWithClickUpToken } from '../clickup-client/request-context.js';
import { secureLog } from '../utils/security.js';
import { createClickUpOAuthAdapter, type ClickUpOAuthAdapter } from './clickup-oauth.js';
import { loadRemoteConfig, type RemoteConfig } from './config.js';
import {
  CALLBACK_PATH,
  CONSENT_PATH,
  ClickUpOAuthProvider,
  type ClickUpAuthExtra,
} from './provider.js';

/**
 * The hosted (Streamable HTTP) ClickUp MCP server.
 *
 * Stateless: every POST /mcp builds a fresh server + transport, runs it inside
 * the caller's ClickUp credentials, and throws both away. That fits serverless
 * hosts (Vercel) and needs no session store. GET/DELETE /mcp (server-initiated
 * streams, session teardown) do not apply to a stateless server and return 405.
 */
export interface RemoteAppOptions {
  config: RemoteConfig;
  /** Stand-in for ClickUp's OAuth endpoints (tests). Defaults to the real ones. */
  clickUpOAuth?: ClickUpOAuthAdapter;
  /** Builds the MCP server per request. Defaults to the full ClickUp tool surface. */
  createServer: () => McpServer;
}

/**
 * The SDK rate-limits /authorize, /token and /register itself; these cover the
 * two sign-in routes it does not own. Each callback spends one ClickUp token
 * exchange with this app's client secret, so it must not be free to hammer.
 * Per instance and in memory: on serverless hosts this is a brake, not a wall.
 */
const signInLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many sign-in attempts. Wait a few minutes and start again from Claude.',
  });

/** Large enough for base64 attachment uploads (the attachment cap is enforced downstream). */
const MCP_BODY_LIMIT = '50mb';

export function createRemoteApp(options: RemoteAppOptions): Express {
  if (!isRemoteMode()) {
    // Without hosted mode, a request that somehow lost its bound token would
    // fall back to CLICKUP_API_TOKEN — one person's ClickUp acting for another.
    throw new Error(
      'createRemoteApp requires hosted mode: set CLICKUP_MCP_REMOTE=1 before importing any tool module ' +
        '(index-http.ts and api/index.js do this)'
    );
  }

  const { config } = options;
  const clickUpOAuth =
    options.clickUpOAuth ??
    createClickUpOAuthAdapter({
      clientId: config.clickUpClientId,
      clientSecret: config.clickUpClientSecret,
    });
  const provider = new ClickUpOAuthProvider(config, clickUpOAuth);

  const app = express();
  app.disable('x-powered-by');
  // Proxy hops to trust for the client IP (rate limiting): 1 on Vercel, 0 elsewhere unless configured.
  app.set('trust proxy', config.trustProxyHops > 0 ? config.trustProxyHops : false);

  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: config.publicUrl,
      resourceServerUrl: config.mcpUrl,
      resourceName: 'ClickUp MCP server',
      clientRegistrationOptions: {
        // client_id is the sealed client metadata (provider.ts), not a random id.
        clientIdGeneration: false,
        // Stateless: a secret cannot be rotated in place, so it does not expire.
        clientSecretExpirySeconds: 0,
      },
    })
  );

  app.post(
    CONSENT_PATH,
    signInLimiter(),
    express.urlencoded({ extended: false, limit: '16kb' }),
    (req, res) => {
      provider.handleConsent(req, res).catch(error => {
        secureLog('error', 'hosted_consent_crashed', {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!res.headersSent)
          res.status(500).type('text/plain').send('Sign-in failed. Try again from Claude.');
      });
    }
  );

  app.get(CALLBACK_PATH, signInLimiter(), (req, res) => {
    provider.handleClickUpCallback(req, res).catch(error => {
      secureLog('error', 'hosted_callback_crashed', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent)
        res.status(500).type('text/plain').send('Sign-in failed. Try again from Claude.');
    });
  });

  const bearer = requireBearerAuth({
    verifier: provider,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(config.mcpUrl),
  });

  app.post(
    '/mcp',
    bearer,
    express.json({ limit: MCP_BODY_LIMIT }),
    async (req: Request, res: Response) => {
      const extra = req.auth?.extra as ClickUpAuthExtra | undefined;
      if (!extra?.clickUpToken) {
        // requireBearerAuth always sets this; refuse rather than run unauthenticated.
        res.status(401).json({ error: 'invalid_token' });
        return;
      }

      const server = options.createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });

      try {
        await runWithClickUpToken(extra.clickUpToken, async () => {
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
        });
      } catch (error) {
        secureLog('error', 'hosted_mcp_request_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    }
  );

  const methodNotAllowed = (_req: Request, res: Response) => {
    res
      .set('Allow', 'POST')
      .status(405)
      .json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed: this server is stateless, use POST' },
        id: null,
      });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/', (_req, res) => {
    res
      .type('text/plain')
      .send(`ClickUp MCP server. Add ${config.mcpUrl.href} as a custom connector in Claude.`);
  });

  // Last resort: Express's default handler would answer with an HTML stack
  // trace (absolute paths included) whenever NODE_ENV is not "production".
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 500;
    if (status >= 500) {
      secureLog('error', 'hosted_unhandled_error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (res.headersSent) return;
    res.status(status).json({
      error: status >= 500 ? 'server_error' : 'invalid_request',
      error_description: status >= 500 ? 'Internal server error' : 'Malformed request',
    });
  });

  return app;
}

/**
 * Build the hosted app from the environment. The entry points (index-http.ts,
 * api/index.js) pass the server factory in after switching hosted mode on, so
 * this module never imports the tool modules itself — it stays type-checkable
 * without pulling in the whole tool surface.
 */
export function createRemoteAppFromEnv(
  createServer: () => McpServer,
  env: Record<string, string | undefined> = process.env
): Express {
  return createRemoteApp({ config: loadRemoteConfig(env), createServer });
}
