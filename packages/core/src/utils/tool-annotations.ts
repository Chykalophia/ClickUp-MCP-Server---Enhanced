/**
 * MCP tool annotations, derived centrally from each tool's name.
 *
 * Clients use these hints to decide what to auto-approve, what to confirm, and
 * how to label a tool. Note the MCP defaults: a tool with no annotations is
 * assumed destructive and open-world, so every write tool that is *not*
 * destructive has to say so explicitly.
 *
 * Inference is by name prefix (after `clickup_`); ANNOTATION_OVERRIDES corrects
 * the cases a prefix gets wrong. Annotations a call site passes explicitly win
 * over both.
 */

export interface ToolAnnotationsShape {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  [key: string]: unknown;
}

const READ_ONLY_PREFIXES = [
  'get_',
  'list_',
  'search_',
  'validate_',
  'format_',
  'check_',
  'find_',
  'resolve_',
];

const DESTRUCTIVE_PREFIXES = ['delete_', 'remove_', 'merge_', 'bulk_delete_'];

const IDEMPOTENT_PREFIXES = ['update_', 'set_', 'edit_', 'add_tag', 'move_'];

/** Words kept upper-case (or specially cased) in humanized titles. */
const TITLE_WORDS: Record<string, string> = {
  id: 'ID',
  ids: 'IDs',
  dm: 'DM',
  url: 'URL',
};

/** Per-tool corrections to the prefix rules. */
export const ANNOTATION_OVERRIDES: Record<string, ToolAnnotationsShape> = {
  // Pure local computation: no ClickUp request is made.
  clickup_format_duration: { openWorldHint: false },
  clickup_format_goal_progress: { openWorldHint: false },
  clickup_validate_webhook_signature: { openWorldHint: false },
  clickup_validate_custom_field_value: { openWorldHint: false },
  clickup_process_webhook: { readOnlyHint: true, openWorldHint: false },
  // Removals that are trivially undone (re-add the tag/list/reaction): not
  // destructive, so they do not trigger a confirmation prompt.
  clickup_remove_tag_from_task: { destructiveHint: false, idempotentHint: true },
  clickup_remove_task_from_list: { destructiveHint: false, idempotentHint: true },
  clickup_delete_chat_message_reaction: { destructiveHint: false, idempotentHint: true },
  // Catalog tools (see tools/catalog-tools.ts).
  clickup_list_toolsets: { title: 'List ClickUp Toolsets', openWorldHint: false },
  clickup_enable_toolset: {
    title: 'Enable ClickUp Toolsets',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  clickup_call_tool: {
    title: 'Call Any ClickUp Tool',
    readOnlyHint: false,
    // Can run delete tools; those confirm on their own (see elicitation in
    // tool-registration.ts), so this is advisory only.
    destructiveHint: true,
    idempotentHint: false,
  },
};

/** `clickup_get_task_details` -> `Get Task Details`. */
export function humanizeToolName(name: string): string {
  return name
    .replace(/^clickup_/, '')
    .split('_')
    .filter(Boolean)
    .map(word => TITLE_WORDS[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function inferAnnotations(name: string): ToolAnnotationsShape {
  const bare = name.replace(/^clickup_/, '');
  const startsWith = (prefixes: string[]) => prefixes.some(p => bare.startsWith(p));

  const readOnly = startsWith(READ_ONLY_PREFIXES);
  const destructive = !readOnly && startsWith(DESTRUCTIVE_PREFIXES);
  const idempotent = readOnly || startsWith(IDEMPOTENT_PREFIXES);

  const inferred: ToolAnnotationsShape = {
    title: humanizeToolName(name),
    readOnlyHint: readOnly,
    destructiveHint: destructive,
    idempotentHint: idempotent,
    openWorldHint: true,
  };
  if (readOnly) {
    // Only meaningful for write tools.
    delete inferred.destructiveHint;
  }
  return inferred;
}

/**
 * Final annotations for a tool: inferred < override table < call site.
 * Call-site values are never overwritten.
 */
export function resolveAnnotations(
  name: string,
  callSite?: ToolAnnotationsShape
): ToolAnnotationsShape {
  const merged: ToolAnnotationsShape = {
    ...inferAnnotations(name),
    ...(ANNOTATION_OVERRIDES[name] ?? {}),
    ...(callSite ?? {}),
  };
  if (merged.readOnlyHint) {
    delete merged.destructiveHint;
  }
  return merged;
}

/** Whether a tool should be confirmed with the user before running. */
export function isDestructive(annotations: ToolAnnotationsShape | undefined): boolean {
  return annotations?.readOnlyHint !== true && annotations?.destructiveHint === true;
}
