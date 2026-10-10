# Tool Loading: Core Mode, Toolsets, and the Catalog

Since **7.0.0** the ClickUp MCP server no longer publishes all of its tools on
connect. It registers every tool, but only a small **core** set is *enabled*
(listed in `tools/list`). Everything else is one call away through three
always-on **catalog tools**.

| | Tools in `tools/list` | `tools/list` size |
|---|---:|---:|
| 6.x (everything, always) | 157 | ~173 KB (~43k tokens) |
| 7.0 `core` mode (default) | 15 | ~24 KB (~6k tokens) |
| 7.0 `all` mode | 160 | ~194 KB |

(Measured over stdio with `initialize` + `tools/list`. `all` mode is larger than
6.x because every tool now carries annotations, and there are three catalog
tools.)

Tool definitions occupy the model's context before the first prompt, and
clients that bridge a local server to a remote session re-fetch them on every
reconnect. Core mode cuts that cost by ~85% without taking anything away.

## Configuration

| Variable | Values | Default |
|---|---|---|
| `CLICKUP_TOOL_MODE` | `core`, `all` | `core` |
| `CLICKUP_TOOLSETS` | toolset and profile names, comma- or space-separated, or `all` | unset |
| `CLICKUP_CONFIRM_DESTRUCTIVE` | `false` to skip confirmation prompts | `true` |

How they combine:

| `CLICKUP_TOOL_MODE` | `CLICKUP_TOOLSETS` | Enabled |
|---|---|---|
| `core` (default) | unset | core tools + catalog |
| `core` | `goals,time` | core tools + those toolsets + catalog |
| any | `all` | everything |
| `all` | unset | everything (the 6.x behaviour) |
| `all` | `tasks,comments` | exactly those toolsets + catalog (the 6.x `CLICKUP_TOOLSETS` behaviour) |
| `core` | only unknown names | core tools + catalog, with a warning on stderr |

Names are case-insensitive and `_` is treated as `-` (`Custom_Fields` works).
Unknown names are reported on stderr and ignored.

**To restore the pre-7.0 behaviour exactly, set `CLICKUP_TOOL_MODE=all`.**

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "@chykalophia/clickup-mcp-server@latest"],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_API_TOKEN_HERE",
        "CLICKUP_TOOLSETS": "pm,time"
      }
    }
  }
}
```

## Core tools

Always enabled (a name is skipped if this build does not have it):

- `clickup_get_workspace_hierarchy` — start here to find space, folder, and list IDs
- `clickup_find_member`
- `clickup_get_filtered_team_tasks`, `clickup_get_tasks`, `clickup_get_task_details`
- `clickup_create_task`, `clickup_update_task`, `clickup_move_task`
- `clickup_get_task_comments`, `clickup_create_task_comment`
- `clickup_get_custom_fields`, `clickup_set_custom_field_value`
- `clickup_start_timer`, `clickup_stop_timer`

## Toolsets and profiles

| Toolset | Covers | Unique* |
|---|---|:---:|
| `tasks` | Task CRUD, search, filtering, tags, templates, merging | |
| `lists` | Lists, folders, folderless lists, templates | |
| `comments` | Task, list, chat-view, threaded comments | |
| `custom-fields` | Custom field definitions and values | |
| `docs` | Docs, doc pages, doc search | |
| `workspace` | Workspaces, hierarchy, members, seats, plan, roles | |
| `bulk` | Bulk create/update/delete, bulk custom fields | |
| `attachments` | Task attachments and uploads | |
| `time-tracking` | Time entries, timers, tags, history, time in status | ✓ |
| `goals` | Goals and goal targets | ✓ |
| `views` | Views, filters, grouping, sorting | ✓ |
| `webhooks` | Webhook management, processing, signatures | ✓ |
| `checklists` | Checklists and checklist items | ✓ |
| `chat` | Chat channels, messages, reactions, replies | ✓ |
| `spaces` | Spaces and space tags | ✓ |
| `dependencies` | Dependencies, links, conflict checks, graphs | ✓ |

\* Toolsets most other ClickUp MCP servers do not offer. `clickup_list_toolsets`
reports this as `unique: true`.

Tool counts are not listed here on purpose: the server records which toolset
each tool registers under at startup, and `clickup_list_toolsets` reports the
live numbers.

Profiles are shorthands accepted anywhere a toolset name is:

| Profile | Expands to |
|---|---|
| `pm` | tasks, comments, lists, custom-fields, checklists, dependencies |
| `time` | time-tracking |
| `chat` | chat |
| `docs` | docs |
| `admin` | spaces, views, webhooks, goals, workspace |

## Catalog tools

These three are enabled in every mode.

### `clickup_list_toolsets`

Lists every toolset with its description, tool names, `enabled` flag,
`enabled_tools` / `tool_count`, and `unique` flag, plus the profiles.

```json
{ "toolset": "goals", "include_schemas": true }
```

returns the full description, annotations, and JSON input schema of each tool
in that toolset — what a model needs to call one through `clickup_call_tool`.
`include_schemas` requires `toolset`.

### `clickup_enable_toolset`

```json
{ "toolsets": ["goals", "time"] }
{ "toolsets": ["chat"], "disable": true }
```

Enables (or disables) toolsets or profiles at runtime. The server sends one
`notifications/tools/list_changed`; clients that honour it re-fetch the tool
list and the new tools appear. Core and catalog tools are never disabled.

### `clickup_call_tool`

```json
{ "tool": "clickup_create_goal", "arguments": { "team_id": "123", "name": "Q4" } }
```

Runs any registered tool, enabled or not. `arguments` is validated with that
tool's strict schema (unknown parameters are rejected with a "did you mean"
hint, exactly as a direct call would be) and the tool's result is returned
unchanged. An unknown tool name returns an error naming the closest match.
Catalog tools cannot be called through it.

Use it when the client does not refresh on `list_changed`, or for a one-off
call that does not justify loading a whole toolset.

## Annotations

Every tool carries MCP annotations, applied centrally from its name:

- `title` — humanised from the name (`clickup_get_task_details` → "Get Task Details")
- `readOnlyHint` — `get_`, `list_`, `search_`, `validate_`, `format_`, `check_`, `find_`, `resolve_`
- `destructiveHint` — `delete_`, `remove_`, `merge_`, `bulk_delete_`; explicitly
  `false` for other write tools (the MCP default is `true`)
- `idempotentHint` — reads and `update_` / `set_` / `edit_` / `move_`
- `openWorldHint` — `true`, except for purely local helpers (formatters,
  signature validation)

An override table in `packages/core/src/utils/tool-annotations.ts` corrects the
cases a prefix gets wrong. Annotations a tool passes at its call site are never
overwritten.

## Confirming destructive tools

When the connected client advertises the `elicitation` capability, the server
asks the user to confirm before running any tool with `destructiveHint: true`
(directly or through `clickup_call_tool`). Declining or cancelling returns an
error result saying the call was cancelled; nothing is sent to ClickUp.

Clients without elicitation support behave exactly as before. Set
`CLICKUP_CONFIRM_DESTRUCTIVE=false` to turn the prompts off.

## Server instructions

The `initialize` response includes short `instructions` for the model: start
with `clickup_get_workspace_hierarchy`, IDs are strings, timestamps are Unix
milliseconds, and use the catalog tools to reach everything else.

## For contributors

- Add new tools inside an existing setup function under `packages/core/src/tools/`.
  They are attributed to that toolset automatically; there is no count to update.
- A new toolset needs an entry in `TOOLSETS` (`tools/toolsets.ts`) and in the
  registrar table in `create-server.ts`.
- To make a tool part of the core set, add its name to `CORE_TOOLS`.
- `src/tests/tool-loading.test.ts` asserts the core-mode `tools/list` stays under
  a byte budget; raise it deliberately, not by accident.
