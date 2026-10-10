/**
 * Toolsets, profiles, and the tool-loading mode for the ClickUp MCP server.
 *
 * Every tool is always *registered*; what changes is which tools are *enabled*
 * (published in tools/list). Publishing all ~160 JSON Schemas on connect costs
 * ~170 KB / ~43k tokens of context before the first prompt, and clients that
 * bridge a local server to a remote session pay it on every reconnect.
 *
 * Since 7.0.0 the default is `core` mode: a small set of everyday tools plus
 * three always-on catalog tools (clickup_list_toolsets, clickup_enable_toolset,
 * clickup_call_tool) that let the model discover and switch on the rest at
 * runtime. See docs/guides/TOOL_LOADING.md.
 *
 *   CLICKUP_TOOL_MODE=core|all          (default core)
 *   CLICKUP_TOOLSETS=pm,time,goals      (toolsets or profiles to add to core)
 *   CLICKUP_TOOLSETS=all                (everything, same as CLICKUP_TOOL_MODE=all)
 *
 * Tool counts are deliberately NOT declared here: the registry in
 * utils/tool-registration.ts records which toolset each tool registered under,
 * so counts always reflect what actually registered.
 */

/** Toolset name -> what it covers, and whether other ClickUp MCP servers lack it. */
export const TOOLSETS = {
  tasks: {
    description: 'Task create/read/update/delete, search, filtering, tags, templates, merging',
    unique: false,
  },
  lists: {
    description: 'Lists, folders, folderless lists, templates, and list membership',
    unique: false,
  },
  chat: { description: 'Chat channels, messages, reactions, replies', unique: true },
  'time-tracking': {
    description: 'Time entries, timers, tags, history, and time-in-status',
    unique: true,
  },
  goals: { description: 'Goals and goal targets', unique: true },
  views: { description: 'Views, view filters, grouping, and sorting', unique: true },
  comments: { description: 'Task, list, chat-view, and threaded comments', unique: false },
  docs: { description: 'Docs, doc pages, and doc search', unique: false },
  spaces: { description: 'Spaces and space tags', unique: true },
  dependencies: {
    description: 'Task dependencies, links, conflict checks, and dependency graphs',
    unique: true,
  },
  'custom-fields': { description: 'Custom field definitions and values', unique: false },
  webhooks: {
    description: 'Webhook management, processing, and signature validation',
    unique: true,
  },
  checklists: { description: 'Checklists and checklist items', unique: true },
  workspace: {
    description: 'Workspaces, hierarchy, members, seats, plan, roles, and authorized user',
    unique: false,
  },
  bulk: {
    description: 'Bulk task create/update/delete and bulk custom-field writes',
    unique: false,
  },
  attachments: { description: 'Task attachments and uploads', unique: false },
} as const;

export type ToolsetName = keyof typeof TOOLSETS;

export const ALL_TOOLSETS = Object.keys(TOOLSETS) as ToolsetName[];

/** Pseudo-toolset the catalog tools register under. Always enabled. */
export const CATALOG_TOOLSET = 'catalog';

/**
 * Profiles: shorthand names usable anywhere a toolset name is accepted in
 * CLICKUP_TOOLSETS. A real toolset name always wins over a profile of the same
 * name (`chat`, `docs` are both, and expand to themselves).
 */
export const PROFILES: Record<string, ToolsetName[]> = {
  pm: ['tasks', 'comments', 'lists', 'custom-fields', 'checklists', 'dependencies'],
  time: ['time-tracking'],
  chat: ['chat'],
  docs: ['docs'],
  admin: ['spaces', 'views', 'webhooks', 'goals', 'workspace'],
};

/**
 * Tools enabled in every mode. Names that do not exist in this build are
 * skipped silently, so the list can name tools that are added later.
 */
export const CORE_TOOLS: readonly string[] = [
  'clickup_get_workspace_hierarchy',
  'clickup_find_member',
  'clickup_get_filtered_team_tasks',
  'clickup_get_tasks',
  'clickup_get_task_details',
  'clickup_get_task_comments',
  'clickup_create_task',
  'clickup_update_task',
  'clickup_create_task_comment',
  'clickup_move_task',
  'clickup_get_custom_fields',
  'clickup_set_custom_field_value',
  'clickup_start_timer',
  'clickup_stop_timer',
];

export type ToolMode = 'core' | 'all';

export interface ResolvedToolsets {
  /** core: core tools + `enabled` toolsets. all: every tool (or `enabled` only, see `legacyNarrow`). */
  mode: ToolMode;
  /** Toolsets switched on in full, beyond the core tools. */
  enabled: Set<ToolsetName>;
  /** Names supplied in CLICKUP_TOOLSETS that matched no toolset or profile. */
  unknown: string[];
  /** Unknown CLICKUP_TOOL_MODE value, if one was supplied. */
  unknownMode?: string;
  /** True when every tool is enabled. */
  isAll: boolean;
  /**
   * CLICKUP_TOOL_MODE=all together with an explicit toolset list: the pre-7.0
   * behaviour, where only the named toolsets are enabled (no core extras).
   */
  legacyNarrow: boolean;
  /** CLICKUP_TOOLSETS was set but nothing in it resolved; fell back to core. */
  fellBack: boolean;
}

/** Split, lowercase, and normalise `_` to `-`. */
function parseNames(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[,\s]+/)
    .map(part => part.trim().toLowerCase().replace(/_/g, '-'))
    .filter(Boolean);
}

export function resolveToolMode(raw: string | undefined): { mode: ToolMode; unknown?: string } {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '' || value === 'core') return { mode: 'core' };
  if (value === 'all') return { mode: 'all' };
  return { mode: 'core', unknown: value };
}

/**
 * Expand toolset and profile names. Returns the toolsets and the names that
 * resolved to nothing.
 */
export function expandToolsetNames(names: string[]): {
  toolsets: Set<ToolsetName>;
  unknown: string[];
} {
  const toolsets = new Set<ToolsetName>();
  const unknown: string[] = [];
  for (const name of names) {
    if ((ALL_TOOLSETS as string[]).includes(name)) {
      toolsets.add(name as ToolsetName);
    } else if (name in PROFILES) {
      PROFILES[name].forEach(t => toolsets.add(t));
    } else {
      unknown.push(name);
    }
  }
  return { toolsets, unknown };
}

/**
 * Resolve CLICKUP_TOOL_MODE and CLICKUP_TOOLSETS into what to enable.
 *
 * - Unset/empty CLICKUP_TOOLSETS in core mode: core tools only.
 * - `all` in CLICKUP_TOOLSETS, or CLICKUP_TOOL_MODE=all with no toolsets: every tool.
 * - Named toolsets/profiles in core mode: core tools + those toolsets.
 * - Named toolsets with CLICKUP_TOOL_MODE=all: only those toolsets (pre-7.0 behaviour).
 * - Names supplied but none valid: core only (caller warns with `unknown`).
 */
export function resolveToolsets(
  raw: string | undefined = process.env.CLICKUP_TOOLSETS,
  modeRaw: string | undefined = process.env.CLICKUP_TOOL_MODE
): ResolvedToolsets {
  const { mode, unknown: unknownMode } = resolveToolMode(modeRaw);
  const requested = parseNames(raw);

  const all = (unknown: string[] = []): ResolvedToolsets => ({
    mode: 'all',
    enabled: new Set(ALL_TOOLSETS),
    unknown,
    unknownMode,
    isAll: true,
    legacyNarrow: false,
    fellBack: false,
  });

  if (requested.includes('all')) {
    return all(requested.filter(n => n !== 'all' && expandToolsetNames([n]).unknown.length > 0));
  }

  const { toolsets, unknown } = expandToolsetNames(requested);

  if (mode === 'all') {
    if (toolsets.size === 0 || toolsets.size === ALL_TOOLSETS.length) {
      return all(unknown);
    }
    return {
      mode,
      enabled: toolsets,
      unknown,
      unknownMode,
      isAll: false,
      legacyNarrow: true,
      fellBack: false,
    };
  }

  return {
    mode,
    enabled: toolsets,
    unknown,
    unknownMode,
    isAll: toolsets.size === ALL_TOOLSETS.length,
    legacyNarrow: false,
    fellBack: requested.length > 0 && toolsets.size === 0,
  };
}

/** Whether a tool is active under `resolved`, given the toolset it registered in. */
export function isToolActive(name: string, toolset: string, resolved: ResolvedToolsets): boolean {
  if (toolset === CATALOG_TOOLSET) return true;
  if (resolved.isAll) return true;
  if ((resolved.enabled as Set<string>).has(toolset)) return true;
  return !resolved.legacyNarrow && CORE_TOOLS.includes(name);
}

export interface ToolCounts {
  total: number;
  enabled: number;
}

/**
 * Human-readable startup summary. Written to stderr by the entrypoint — stdout
 * is the JSON-RPC channel and must never carry log output.
 */
export function describeToolsets(resolved: ResolvedToolsets, counts: ToolCounts): string {
  const withheld = counts.total - counts.enabled;
  if (resolved.isAll) {
    return `all ${counts.total} tools enabled (CLICKUP_TOOL_MODE=all)`;
  }
  const extra = resolved.enabled.size > 0 ? ` + toolsets: ${[...resolved.enabled].join(', ')}` : '';
  const base = resolved.legacyNarrow
    ? `toolsets: ${[...resolved.enabled].join(', ')}`
    : `core${extra}`;
  return (
    `${counts.enabled} of ${counts.total} tools enabled — ${base} (${withheld} available on demand ` +
    'via clickup_list_toolsets / clickup_enable_toolset / clickup_call_tool; ' +
    `${resolved.legacyNarrow ? 'unset CLICKUP_TOOLSETS' : 'CLICKUP_TOOL_MODE=all'} enables everything)`
  );
}
