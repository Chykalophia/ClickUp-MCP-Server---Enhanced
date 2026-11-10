// Vercel entry for the hosted ClickUp MCP server. Every path is rewritten here
// (see vercel.json); the Express app routes /mcp, the OAuth endpoints and the
// ClickUp callback itself. Configuration: docs/HOSTED_SERVER.md.
//
// Hosted mode must be on before any tool module loads (their ClickUp clients
// are built at import), hence the env flag first and the dynamic import after.
// request-context.js imports nothing but node:async_hooks, so this static
// import cannot pull a tool module in ahead of the flag.
import { REMOTE_MODE_ENV } from '../build/clickup-client/request-context.js';

process.env[REMOTE_MODE_ENV] = '1';

let appPromise;

export default async function handler(req, res) {
  appPromise ??= Promise.all([
    import('../build/remote/app.js'),
    import('../build/server-factory.js'),
  ]).then(([remote, factory]) => {
    const app = remote.createRemoteAppFromEnv(() => factory.createClickUpMcpServer().server);
    // Servers are built per request; report a mistyped CLICKUP_TOOLSETS once per instance.
    const { unknown } = factory.createClickUpMcpServer().toolsets;
    if (unknown.length > 0) {
      process.stderr.write(
        `${JSON.stringify({ level: 'warn', message: 'hosted_unknown_toolsets', ignored: unknown })}\n`
      );
    }
    return app;
  });
  let app;
  try {
    app = await appPromise;
  } catch (error) {
    // Misconfiguration is permanent until the env vars change and the project
    // is redeployed, so the failed promise is kept and every request says so.
    process.stderr.write(
      `${JSON.stringify({
        level: 'error',
        message: 'hosted_server_start_failed',
        error: error instanceof Error ? error.message : String(error),
      })}\n`
    );
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain');
    res.end('ClickUp MCP server is misconfigured. Check the deployment logs.');
    return;
  }
  return app(req, res);
}
