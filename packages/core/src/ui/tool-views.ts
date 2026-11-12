import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TASK_VIEW_HTML } from './task-view-html.js';

/** MIME type MCP Apps hosts look for on a UI resource. */
export const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

/** UI resource that renders task results as a card or a list. */
export const TASK_VIEW_URI = 'ui://clickup/task-view.html';

/** Tools whose results the host can render with a view, by view URI. */
export const TOOL_VIEWS: Readonly<Record<string, string>> = {
  clickup_get_tasks: TASK_VIEW_URI,
  clickup_get_task_details: TASK_VIEW_URI,
  clickup_create_task: TASK_VIEW_URI,
  clickup_update_task: TASK_VIEW_URI,
  clickup_get_filtered_team_tasks: TASK_VIEW_URI,
};

/**
 * Adds the MCP Apps view link for a tool to its existing `_meta`.
 *
 * Hosts without MCP Apps support ignore the key, and the tool's text result is
 * unchanged, so the model sees the same output either way.
 *
 * @param name - Tool name.
 * @param meta - The tool's current `_meta`, if any.
 * @returns The merged `_meta`, or `meta` unchanged when the tool has no view.
 */
export function withToolView(
  name: string,
  meta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  const resourceUri = TOOL_VIEWS[name];
  if (!resourceUri) return meta;
  const ui = (meta?.ui as Record<string, unknown> | undefined) ?? {};
  // 'ui/resourceUri' is the flat key older hosts still read.
  return { ...meta, ui: { ...ui, resourceUri }, 'ui/resourceUri': resourceUri };
}

/**
 * Registers the UI resources that tools reference through `_meta.ui.resourceUri`.
 *
 * @param server - The server to register the resources on.
 */
export function registerToolViews(server: McpServer): void {
  server.registerResource(
    'clickup-task-view',
    TASK_VIEW_URI,
    {
      title: 'ClickUp task view',
      description: 'Interactive card for ClickUp task results, rendered by MCP Apps hosts.',
      mimeType: MCP_APP_MIME_TYPE,
    },
    async uri => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MCP_APP_MIME_TYPE,
          text: TASK_VIEW_HTML,
          _meta: { ui: { prefersBorder: true } },
        },
      ],
    })
  );
}
