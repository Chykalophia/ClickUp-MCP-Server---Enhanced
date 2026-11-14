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
    import('../build/create-server.js'),
    import('../build/version.js'),
  ]).then(([remote, factory, { VERSION }]) => {
    const build = () => factory.createClickUpServer({ version: VERSION });
    const app = remote.createRemoteAppFromEnv(() => build().server);
    // Servers are built per request; report a mistyped tool setting once per instance.
    const { unknown, unknownMode } = build().resolved;
    if (unknown.length > 0 || unknownMode) {
      process.stderr.write(
        `${JSON.stringify({ level: 'warn', message: 'hosted_unknown_toolsets', ignored: unknown, unknownMode })}\n`
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
