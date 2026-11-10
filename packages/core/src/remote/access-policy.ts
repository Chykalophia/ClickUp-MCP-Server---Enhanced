/**
 * Who may use a hosted server.
 *
 * A hosted server is private by default: it refuses to start without at least
 * one allowlist entry (see config.ts), so nobody can deploy one that is open to
 * every ClickUp account by accident. Someone passes if ANY rule matches:
 *  - their ClickUp user id is listed, or
 *  - their ClickUp account email is listed, or
 *  - they authorized at least one listed workspace during sign-in.
 *
 * The policy is re-checked on every MCP request and every token refresh, not
 * only at sign-in, so removing someone from the list takes effect on their next
 * request — that is how access is revoked without a database.
 */
export interface AccessPolicy {
  userIds: ReadonlySet<string>;
  emails: ReadonlySet<string>;
  workspaceIds: ReadonlySet<string>;
}

export interface ClickUpIdentity {
  userId: string;
  email?: string;
  username?: string;
  /** Workspaces (ClickUp "teams") the user authorized this app for. */
  workspaceIds: string[];
}

/** Split a comma/whitespace-separated env list, trimming stray whitespace and newlines. */
export const parseList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(/[\s,]+/)
    .map(entry => entry.trim())
    .filter(Boolean);

export const createAccessPolicy = (lists: {
  userIds?: string[];
  emails?: string[];
  workspaceIds?: string[];
}): AccessPolicy => ({
  userIds: new Set(lists.userIds ?? []),
  emails: new Set((lists.emails ?? []).map(email => email.toLowerCase())),
  workspaceIds: new Set(lists.workspaceIds ?? []),
});

export const isPolicyEmpty = (policy: AccessPolicy): boolean =>
  policy.userIds.size === 0 && policy.emails.size === 0 && policy.workspaceIds.size === 0;

export const isAllowed = (policy: AccessPolicy, identity: ClickUpIdentity): boolean => {
  if (policy.userIds.has(identity.userId)) return true;
  if (identity.email && policy.emails.has(identity.email.toLowerCase())) return true;
  return identity.workspaceIds.some(id => policy.workspaceIds.has(id));
};
