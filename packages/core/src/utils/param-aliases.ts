/**
 * Accepted alternative spellings for tool parameters.
 *
 * Why this exists: agents reach this server already knowing ClickUp's public API
 * field names and Anthropic's first-party ClickUp MCP tool schemas. Where this
 * server picked a different name for the same value, the first call an agent
 * makes uses *their* name, not ours. Before parameters became strict that call
 * looked like a success and wrote a half-populated object (see
 * HANDOFF-comment-api-and-silent-param-drop.md); now it would be a loud error.
 * Either way the caller is blocked on a difference that carries no meaning, so
 * we accept both spellings.
 *
 * `enforceStrictParams` in ./tool-registration.ts adds each applicable alias to
 * the tool's published schema as an optional twin of the canonical field and
 * renames it back before the handler runs, so no tool handler ever sees an
 * alias.
 *
 * ## Rules for adding an entry
 *
 * 1. **Same meaning AND same type.** An alias is a rename, never a conversion.
 *    Where the other server takes a different *type* for the same concept, do
 *    NOT alias it — silently coercing values is the same class of defect this
 *    whole change exists to remove, and a type mismatch already fails loudly
 *    with a readable zod error. The divergences deliberately left alone are
 *    listed under "Not aliased" below.
 * 2. **Record where the name came from**, so the next person can tell a
 *    verified divergence from a guess.
 *
 * Tool-name aliases are deliberately not supported: registering the same tool
 * twice under two names would double the published schema surface that
 * CLICKUP_TOOLSETS exists to shrink.
 *
 * ## Not aliased, on purpose
 *
 * Same concept, incompatible type — these still fail loudly, which is correct:
 *
 * | Concept        | First-party           | Here            |
 * |----------------|-----------------------|-----------------|
 * | `priority`     | 'urgent'\|'high'\|... | 1-4 integer     |
 * | `due_date`     | 'YYYY-MM-DD' string   | epoch ms number |
 * | `time_estimate`| minutes as string     | milliseconds    |
 * | `assignees`    | string[]              | number[]        |
 * | `start`/`stop` | 'YYYY-MM-DD HH:MM'    | epoch ms number |
 *
 * Same concept, different *structure* — a rename cannot express these, and each
 * would need a real translation step:
 * `create_list`'s `space_id`/`folder_id` vs this server's
 * `container_type` + `container_id`; `create_document`'s nested
 * `parent: {id, type}` vs flat `parent_id` + `parent_type`;
 * `add_task_dependency`'s `type: 'waiting_on'|'blocking'` vs the
 * `depends_on`/`dependency_of` pair; `send_chat_message`'s `post_title` +
 * `post_subtype_id` vs `post_data`.
 */

/** alias -> canonical parameter name. */
export type AliasMap = Readonly<Record<string, string>>;

/** Per-tool alias maps, keyed by tool name. */
export type ToolParamAliases = Readonly<Record<string, AliasMap>>;

/**
 * Aliases applied to *any* tool that declares the canonical parameter and does
 * not already declare the alias as a real parameter of its own. These cover
 * vocabulary splits that run across the whole surface, so listing 80-odd tool
 * names by hand would only rot as tools are added.
 *
 * `workspace_id` <-> `team_id` is bidirectional because the split is internal
 * as well as external: of this server's own tools, 42 call the ClickUp
 * workspace ID `team_id` (ClickUp's API name) and 39 call it `workspace_id`
 * (the first-party MCP's name), with no tool using both. Rather than rename
 * half the surface and break existing callers, both names now work everywhere.
 * The pair is safe to declare in both directions: a tool that really declares
 * one of them is skipped for that direction, so the two rules never collide.
 *
 * `document_id` -> `doc_id` matches the first-party document tools
 * (create/get/list/update_document_page), which all say `document_id`; the
 * seven doc tools here say `doc_id` and none declares `document_id`.
 */
export const UNIVERSAL_ALIASES: AliasMap = {
  workspace_id: 'team_id',
  team_id: 'workspace_id',
  document_id: 'doc_id',
};

export const PARAM_ALIASES: ToolParamAliases = {
  // `markdown_description` is ClickUp's own API field name — clickup-client/tasks.ts
  // translates markdown_content -> markdown_description before the request — and
  // it is also what the first-party clickup_create_task/clickup_update_task
  // publish. `markdown_content` is a name that exists only inside this server.
  clickup_create_task: { markdown_description: 'markdown_content' },
  clickup_update_task: { markdown_description: 'markdown_content' },

  // `project_ids` is ClickUp's legacy v2 API name for folders. First-party
  // clickup_filter_tasks calls the same string array `folder_ids`, which is what
  // the ClickUp UI calls them today.
  clickup_get_filtered_team_tasks: { folder_ids: 'project_ids' },

  // First-party clickup_merge_tasks names the surviving task `task_id` and the
  // consumed ones `source_task_ids`. Both descriptions agree with ours on which
  // task survives ("the target/destination task that will survive the merge" vs
  // "the task that will remain after merging"), so the direction is safe. The
  // required `confirm_merge` flag is unaffected and still gates the operation.
  clickup_merge_tasks: {
    task_id: 'primary_task_id',
    source_task_ids: 'secondary_task_ids',
  },
};
