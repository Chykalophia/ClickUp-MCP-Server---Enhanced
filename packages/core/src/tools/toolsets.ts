/**
 * Toolset gating for the ClickUp MCP server.
 *
 * Every registered tool's JSON Schema is published to the client on connect —
 * all 157 of them, ~157KB, re-sent on every reconnect. Clients that bridge a
 * local server to a remote session (Claude Desktop's remote-tools bridge) pay
 * that cost on each connection rotation, and the definitions occupy context
 * before the first prompt.
 *
 * Most workflows need a fraction of the surface. `CLICKUP_TOOLSETS` narrows it:
 *
 *   CLICKUP_TOOLSETS=tasks,comments,custom-fields,attachments,lists,bulk
 *
 * Unset, empty, or `all` keeps every toolset, so existing installs are
 * unaffected.
 */

/** Toolset name -> what it covers, and how many tools it registers. */
export const TOOLSETS = {
  tasks: { count: 13, description: 'Task create/read/update/delete, search, assignees, status' },
  lists: { count: 17, description: 'Lists, folders, and folderless lists' },
  chat: { count: 19, description: 'Chat channels, messages, reactions, replies' },
  'time-tracking': { count: 14, description: 'Time entries, timers, and time summaries' },
  goals: { count: 12, description: 'Goals and goal targets' },
  views: { count: 12, description: 'Views, view filters, grouping, and sorting' },
  // 10 by default; CLICKUP_DEBUG_TOOLS adds clickup_create_task_comment_raw_test.
  comments: { count: 10, description: 'Task, list, chat-view, and threaded comments' },
  docs: { count: 9, description: 'Docs, doc pages, and doc search' },
  spaces: { count: 9, description: 'Spaces and space tags' },
  dependencies: { count: 8, description: 'Task dependencies, links, and dependency graphs' },
  'custom-fields': { count: 7, description: 'Custom field definitions and values' },
  webhooks: { count: 7, description: 'Webhook management, processing, and signature validation' },
  checklists: { count: 6, description: 'Checklists and checklist items' },
  workspace: { count: 6, description: 'Workspaces, members, seats, plan, and authorized user' },
  bulk: { count: 5, description: 'Bulk task create/update/delete and bulk custom-field writes' },
  attachments: { count: 2, description: 'Task attachments and uploads' },
} as const;

export type ToolsetName = keyof typeof TOOLSETS;

export const ALL_TOOLSETS = Object.keys(TOOLSETS) as ToolsetName[];

export const TOTAL_TOOL_COUNT = ALL_TOOLSETS.reduce((sum, name) => sum + TOOLSETS[name].count, 0);

export interface ResolvedToolsets {
  /** Toolsets to register. */
  enabled: Set<ToolsetName>;
  /** Names supplied that matched no known toolset. */
  unknown: string[];
  /** True when every toolset is on (the default). */
  isAll: boolean;
  /** Sum of `count` across enabled toolsets — the approximate published surface. */
  toolCount: number;
}

/**
 * Parse a `CLICKUP_TOOLSETS` value into the set of toolsets to register.
 *
 * Accepts a comma- or space-separated list, case-insensitive, with `_` treated
 * as `-` so `custom_fields` and `custom-fields` both work. Unset, empty, or
 * `all` selects everything. If a value is supplied but nothing in it resolves,
 * we fall back to all toolsets rather than starting a server with no tools —
 * the caller is expected to surface `unknown` as a warning.
 */
export function resolveToolsets(raw: string | undefined = process.env.CLICKUP_TOOLSETS): ResolvedToolsets {
  const requested = (raw ?? '')
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase().replace(/_/g, '-'))
    .filter(Boolean);

  const all = (): ResolvedToolsets => ({
    enabled: new Set(ALL_TOOLSETS),
    unknown: [],
    isAll: true,
    toolCount: TOTAL_TOOL_COUNT,
  });

  if (requested.length === 0 || requested.includes('all')) {
    return all();
  }

  const enabled = new Set<ToolsetName>();
  const unknown: string[] = [];
  for (const name of requested) {
    if ((ALL_TOOLSETS as string[]).includes(name)) {
      enabled.add(name as ToolsetName);
    } else {
      unknown.push(name);
    }
  }

  if (enabled.size === 0) {
    return { ...all(), unknown };
  }

  const toolCount = [...enabled].reduce((sum, name) => sum + TOOLSETS[name].count, 0);
  return { enabled, unknown, isAll: enabled.size === ALL_TOOLSETS.length, toolCount };
}

/**
 * Human-readable startup summary. Written to stderr by the entrypoint — stdout
 * is the JSON-RPC channel and must never carry log output.
 */
export function describeToolsets(resolved: ResolvedToolsets): string {
  if (resolved.isAll) {
    return `all ${resolved.toolCount} tools (set CLICKUP_TOOLSETS to narrow: ${ALL_TOOLSETS.join(', ')})`;
  }
  const names = [...resolved.enabled].join(', ');
  const saved = TOTAL_TOOL_COUNT - resolved.toolCount;
  return `~${resolved.toolCount} of ${TOTAL_TOOL_COUNT} tools — toolsets: ${names} (${saved} withheld)`;
}
