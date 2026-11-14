# Hosted ClickUp MCP server (claude.ai web, Desktop, mobile, Claude Code)

The stdio server (`npx @chykalophia/clickup-mcp-server`) only runs where a client
can start a local process. claude.ai on the web and on mobile cannot, so this package
also ships a **hosted** server: the same tools over Streamable HTTP, behind
"Sign in with ClickUp".

Each deployment is **private to the people you list**. There is no public instance:
if you want one, you host your own, with your own ClickUp OAuth app.

## How it works

```
Claude ──OAuth──▶ this server ──"Sign in with ClickUp"──▶ ClickUp
   │                    │
   └── POST /mcp ──────▶ runs the tool with THAT person's ClickUp token ──▶ ClickUp API
```

- Everyone signs in with **their own ClickUp account**, so actions are attributed
  to them and limited to what their ClickUp permissions allow.
- The server calls ClickUp's REST API directly. It does **not** go through
  ClickUp's own hosted MCP, so that service's daily request cap does not apply;
  ClickUp's normal per-minute REST rate limits do.
- **No database.** Registered clients, logins, codes and tokens are encrypted,
  tamper-proof blobs (AES-256-GCM) that only this server can open.
- **Private by default.** The server refuses to start without an allowlist, and
  re-checks it on every request.

## Setup

### 1. Create a ClickUp OAuth app

ClickUp → **Settings → Apps → Create new app**.

- **Redirect URL:** `https://<your-domain>/oauth/clickup/callback`
- Copy the **Client ID** and **Client Secret**.

You need the final domain first. On Vercel, deploy once (it will report itself
as misconfigured), note the production domain, then create the app.

### 2. Set the environment

See [`hosted.env.example`](../hosted.env.example).

| Variable                        | Required               | What it is                                                            |
| ------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `CLICKUP_MCP_PUBLIC_URL`        | yes (Vercel: optional) | Public origin, e.g. `https://clickup-mcp.example.com`. No path.       |
| `CLICKUP_OAUTH_CLIENT_ID`       | yes                    | From step 1                                                           |
| `CLICKUP_OAUTH_CLIENT_SECRET`   | yes                    | From step 1                                                           |
| `CLICKUP_MCP_TOKEN_SECRET`      | yes                    | 32+ chars: `openssl rand -base64 48`. Changing it signs everyone out. |
| `CLICKUP_ALLOWED_USER_IDS`      | one of these three     | ClickUp user ids                                                      |
| `CLICKUP_ALLOWED_EMAILS`        | one of these three     | ClickUp account emails (case-insensitive)                             |
| `CLICKUP_ALLOWED_WORKSPACE_IDS` | one of these three     | Anyone who authorizes one of these workspaces, **guests included**    |

Anyone matching **any** list gets in. To start with just yourself, set your user
id. To open it to your team later, add your workspace id, but note that the workspace
rule admits anyone who can authorize that workspace, including guests (clients you
invited). If you invite clients as guests, list your team's user ids instead.

Don't know your user id? Leave the user list empty, put a placeholder in another
list, and sign in: you will be refused, and the server logs
`hosted_login_denied` with your `clickUpUserId`.

Do not use `CLICKUP_API_TOKEN` here. The hosted server never uses it, even when set.

### 3. Deploy

**Vercel** (this package includes `vercel.json` and `api/index.js`):

1. New project from this repo, **Root Directory** `packages/core`.
   - Add the environment variable `NPM_CONFIG_IGNORE_SCRIPTS=true` (Production and
     Preview). The repo root's `prepare` script builds every workspace, and Vercel's
     function packaging runs a second `npm install` that would trigger it;
     `vercel.json` already sets the install command to skip it on the first install.
   - Node.js 22 or 24 (Settings → Build and Deployment).
2. Add the environment variables from step 2, scoped to **Production only**. Preview
   deployments (every branch, Dependabot's included) must not get the token secret
   or the ClickUp app secret. As a second line of defence, token keys are derived from
   the public origin **and** the Vercel environment (`VERCEL_ENV`), so a preview that
   was given the same secret and the same `CLICKUP_MCP_PUBLIC_URL` still cannot open
   production's tokens. Left unset, `CLICKUP_MCP_PUBLIC_URL` resolves to the
   production domain in production and to the deployment's own URL on previews.
3. Deploy. `https://<domain>/healthz` should return `{"ok":true}`.
4. If Vercel **Deployment Protection** is on for production, claude.ai cannot reach
   the server. Leave it off for the production domain (the server does its own auth).

Env vars are bound at deploy time: after changing one, redeploy.

Vercel limits to know: a function request body is capped at about 4.5 MB, so base64
attachment uploads over roughly 3 MB fail there (the server itself allows 50 MB on
other hosts). `maxDuration` is 60 s; a ClickUp call that waits out repeated rate
limits can exceed it.

**Any Node host** (Railway, Fly, Render, a VPS, Docker), Node 18+:

```sh
npm run build
PORT=3000 node build/index-http.js
```

Put it behind HTTPS (a reverse proxy, or the host's TLS). By default no proxy is
trusted for client IPs, so a directly exposed server cannot be tricked by a spoofed
`X-Forwarded-For`. Behind a reverse proxy, set `CLICKUP_MCP_TRUST_PROXY` to the
number of proxy hops (usually `1`) so rate limiting sees real client IPs. On Vercel
it is `1` automatically.

### 4. Add it to Claude

claude.ai → **Settings → Connectors → Add custom connector** →
URL `https://<your-domain>/mcp`. Leave the OAuth fields empty (the server supports
dynamic client registration). Claude opens this server's consent page ("Connect
ClickUp?"), then ClickUp's sign-in.

Claude Code: `claude mcp add --transport http clickup https://<your-domain>/mcp`.

## Security model

- **Who can sign in:** only allowlisted ClickUp accounts. A refused sign-in never
  issues a code.
- **Consent:** before anything goes to ClickUp, the server shows a page naming the
  app and the address your access will be sent to. It only accepts the approval
  from its own page (same-origin check), so a link someone sends you cannot skip it.
  Only approve when you just started the connection from that app yourself.
- **Redirect URIs:** OAuth clients may only register Claude's callbacks
  (`https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`)
  and loopback (`localhost`) URIs for native clients. Override with
  `CLICKUP_MCP_REDIRECT_URIS`, or set `CLICKUP_MCP_ALLOW_LOOPBACK_REDIRECTS=false`.
  Tightening either also retires clients registered under the old rules.
- **PKCE (S256)** is required. Codes expire after 2 minutes, are bound to the client
  and resource that requested them, and the sign-in is bound to the browser that
  approved it (a short-lived HttpOnly cookie) and to the ClickUp authorization it
  started (a one-time `state` value ClickUp must send back). A callback with a
  missing or wrong `state` is refused and leaves the real sign-in intact.
- **Rate limits:** the SDK limits `/authorize`, `/token` and `/register`; the consent
  and ClickUp callback routes allow 100 requests per 15 minutes per client IP. The
  counters live in memory per instance, so on serverless hosts they slow abuse down
  rather than cap it exactly.
- **Tokens:** each contains the person's ClickUp token, encrypted, and only opens on
  this deployment.
  - Access tokens last 1 hour (`CLICKUP_MCP_ACCESS_TOKEN_TTL`).
  - Refresh tokens expire after 30 days unused (`CLICKUP_MCP_REFRESH_TOKEN_TTL`).
  - Every session ends 90 days after signing in with ClickUp, however often it was
    refreshed (`CLICKUP_MCP_SESSION_MAX_AGE`). No access or refresh token is issued
    past that point, and an access token is refused once it is reached.
- **Revocation** (there is no database, so no per-token revocation list):
  - Removing a **user id** from the allowlist takes effect on their next request.
  - Every refresh asks ClickUp again who the person is and which workspaces they
    belong to, so leaving an allowlisted workspace, a removed **email**, or revoking
    the app in ClickUp takes effect within one access-token lifetime (1 hour).
  - Rotating `CLICKUP_MCP_TOKEN_SECRET` signs everyone out at once. Claude keeps its
    old client registration, so people may need to remove and re-add the connector.
- **Isolation:** every ClickUp call carries the token of the person whose request
  caused it. A call with no bound token is refused, never sent with a server token.
- **Disabled when hosted:** attachment uploads by `file_path` (it would read the
  server's disk) and by `file_url` (it would make the server fetch arbitrary URLs
  from its own network). Send files as `file_data` (base64).
- **Known limits of the stateless design:** an authorization code can be exchanged
  more than once within its 2 minutes (only by the holder of its PKCE verifier,
  that is, the client that started the sign-in), and an old refresh token keeps
  working until it expires (there is no reuse detection). Both would need a small
  store to close.

## Tools

The hosted server honours the same tool settings as stdio
([TOOL_LOADING.md](../../../docs/guides/TOOL_LOADING.md)): by default only the core
tools are listed, and `clickup_call_tool` runs any other tool by name. Set
`CLICKUP_TOOL_MODE=all` to list every tool, or `CLICKUP_TOOLSETS` to add toolsets.

`clickup_enable_toolset` is refused here: each request builds a fresh server from the
deployment's settings, so a switch would not outlive the call. Change the environment
variables and redeploy instead.

## Limits

- Stateless Streamable HTTP: `POST /mcp` only. `GET` and `DELETE` return 405, so
  there are no server-initiated notifications.
- Request bodies are capped at 50 MB (base64 attachments); about 4.5 MB on Vercel.
- Each request builds a fresh server (about 5 ms with every tool enabled), which keeps
  every request independent and needs no session store.
