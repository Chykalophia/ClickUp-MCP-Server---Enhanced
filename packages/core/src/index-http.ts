#!/usr/bin/env node
/**
 * Hosted ClickUp MCP server over Streamable HTTP, for any Node host
 * (Railway, Fly, Render, a VPS, Docker). Vercel uses api/index.js instead.
 *
 *   CLICKUP_MCP_PUBLIC_URL=https://clickup-mcp.example.com \
 *   CLICKUP_OAUTH_CLIENT_ID=... CLICKUP_OAUTH_CLIENT_SECRET=... \
 *   CLICKUP_MCP_TOKEN_SECRET="$(openssl rand -base64 48)" \
 *   CLICKUP_ALLOWED_USER_IDS=1234567 \
 *   PORT=3000 node build/index-http.js
 *
 * See docs/HOSTED_SERVER.md.
 */
import { REMOTE_MODE_ENV } from './clickup-client/request-context.js';
import { secureLog } from './utils/security.js';

// Must be set before any tool module loads: their clients are built at import.
process.env[REMOTE_MODE_ENV] = '1';

async function main(): Promise<void> {
  const { createRemoteAppFromEnv } = await import('./remote/app.js');
  const { createClickUpMcpServer } = await import('./server-factory.js');
  const app = createRemoteAppFromEnv(() => createClickUpMcpServer().server);
  // Servers are built per request; report a mistyped CLICKUP_TOOLSETS once, at boot.
  const { toolsets } = createClickUpMcpServer();
  if (toolsets.unknown.length > 0) {
    secureLog('warn', 'hosted_unknown_toolsets', { ignored: toolsets.unknown });
  }
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  app.listen(port, host, () => {
    secureLog('info', 'hosted_server_listening', { host, port });
  });
}

main().catch(error => {
  secureLog('error', 'hosted_server_start_failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  // Exit explicitly: utils/security.ts keeps a cleanup interval alive, so a
  // misconfigured server would otherwise sit "running" while serving nothing.
  process.exit(1);
});
