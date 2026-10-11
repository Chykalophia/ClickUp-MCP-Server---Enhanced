/**
 * Catalog tools: always enabled, in every mode.
 *
 * In core mode (the default since 7.0.0) most tools are registered but
 * disabled, so they cost nothing in tools/list. These three tools are how a
 * model reaches them:
 *
 * - clickup_list_toolsets  — what exists, what is on, and (optionally) schemas
 * - clickup_enable_toolset — switch toolsets on/off; the server sends
 *                            notifications/tools/list_changed
 * - clickup_call_tool      — run any registered tool by name, enabled or not,
 *                            for clients that do not refresh on list_changed
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { z } from 'zod';
import { closestName, type ToolEntry, type ToolRegistry } from '../utils/tool-registration.js';
import {
  ALL_TOOLSETS,
  CATALOG_TOOLSET,
  CORE_TOOLS,
  PROFILES,
  TOOLSETS,
  expandToolsetNames,
  type ResolvedToolsets,
} from './toolsets.js';

type TextResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

const text = (body: string): TextResult => ({ content: [{ type: 'text', text: body }] });
const json = (value: unknown): TextResult => text(JSON.stringify(value, null, 2));
const error = (body: string): TextResult => ({ ...text(body), isError: true });

function inputJsonSchema(entry: ToolEntry): unknown {
  const schema = entry.handle.inputSchema;
  if (!schema) return { type: 'object', properties: {} };
  return toJsonSchemaCompat(schema as never, { strictUnions: true, pipeStrategy: 'input' });
}

/** Tools that clickup_enable_toolset({ disable: true }) must never switch off. */
function isPinned(entry: ToolEntry): boolean {
  return entry.toolset === CATALOG_TOOLSET || CORE_TOOLS.includes(entry.name);
}

export function setupCatalogTools(
  server: McpServer,
  registry: ToolRegistry,
  resolved: ResolvedToolsets
): void {
  const notifyListChanged = () =>
    (server as unknown as { sendToolListChanged(): void }).sendToolListChanged();

  const toolsetNames = (): string[] =>
    [...registry.byToolset().keys()].filter(name => name !== CATALOG_TOOLSET);

  server.tool(
    'clickup_list_toolsets',
    "List the ClickUp toolsets this server offers: each toolset's description, tool names, " +
      'and whether it is enabled. Pass `toolset` with `include_schemas: true` to get the full ' +
      "input schemas for that toolset's tools. Enable a toolset with clickup_enable_toolset, " +
      'or run any listed tool directly with clickup_call_tool.',
    {
      toolset: z
        .string()
        .optional()
        .describe('Only describe this toolset (e.g. "goals", "time-tracking").'),
      include_schemas: z
        .boolean()
        .optional()
        .describe("With `toolset`: include each tool's description and JSON input schema."),
    },
    async ({ toolset, include_schemas }) => {
      const grouped = registry.byToolset();
      const known = toolsetNames();

      let names = known;
      if (toolset !== undefined) {
        const wanted = toolset.trim().toLowerCase().replace(/_/g, '-');
        if (!grouped.has(wanted) || wanted === CATALOG_TOOLSET) {
          const suggestion = closestName(wanted, known);
          return error(
            `Unknown toolset "${toolset}".${
              suggestion ? ` Did you mean "${suggestion}"?` : ''
            } Toolsets: ${known.join(', ')}.`
          );
        }
        names = [wanted];
      } else if (include_schemas) {
        return error(
          'include_schemas requires `toolset` (schemas for every tool would be ~170 KB). ' +
            `Toolsets: ${known.join(', ')}.`
        );
      }

      const toolsets = names.map(name => {
        const entries = (grouped.get(name) ?? []).map(tool => registry.tools.get(tool)!);
        const enabledCount = entries.filter(e => e.handle.enabled).length;
        const meta = (TOOLSETS as Record<string, { description: string; unique: boolean }>)[name];
        return {
          name,
          description: meta?.description ?? '',
          unique: meta?.unique ?? false,
          enabled: enabledCount === entries.length,
          enabled_tools: enabledCount,
          tool_count: entries.length,
          tools: include_schemas
            ? entries.map(e => ({
                name: e.name,
                enabled: e.handle.enabled,
                description: e.handle.description,
                annotations: e.handle.annotations,
                inputSchema: inputJsonSchema(e),
              }))
            : entries.map(e => e.name),
        };
      });

      const allEntries = [...registry.tools.values()];
      return json({
        // Startup configuration (CLICKUP_TOOL_MODE / CLICKUP_TOOLSETS). It does
        // not change when clickup_enable_toolset runs; the live state is in
        // enabled_tools and toolsets[].enabled.
        startup_mode: resolved.isAll ? 'all' : resolved.mode,
        enabled_tools: allEntries.filter(e => e.handle.enabled).length,
        total_tools: allEntries.length,
        toolsets,
        ...(toolset === undefined
          ? {
              profiles: PROFILES,
              notes:
                '`unique` marks toolsets most other ClickUp MCP servers do not offer. ' +
                'Enable with clickup_enable_toolset({ toolsets: [...] }) — toolset or profile names. ' +
                'Or run a tool without enabling it: clickup_call_tool({ tool, arguments }).',
            }
          : {}),
      });
    }
  );

  server.tool(
    'clickup_enable_toolset',
    'Enable (or, with `disable: true`, disable) ClickUp toolsets so their tools appear in the ' +
      'tool list. Accepts toolset names from clickup_list_toolsets, profiles (pm, time, chat, ' +
      'docs, admin), or "all". Core and catalog tools cannot be disabled. If your client does ' +
      'not refresh its tool list, use clickup_call_tool to run the tools instead.',
    {
      toolsets: z
        .array(z.string())
        .min(1)
        .describe('Toolset or profile names, e.g. ["goals", "time-tracking"] or ["admin"].'),
      disable: z.boolean().optional().describe('Disable these toolsets instead of enabling them.'),
    },
    async ({ toolsets, disable }) => {
      const normalized = toolsets.map(n => n.trim().toLowerCase().replace(/_/g, '-'));
      const { toolsets: expanded, unknown } = normalized.includes('all')
        ? {
            toolsets: new Set(ALL_TOOLSETS),
            unknown: normalized.filter(
              n => n !== 'all' && expandToolsetNames([n]).unknown.length > 0
            ),
          }
        : expandToolsetNames(normalized);

      if (expanded.size === 0) {
        const known = toolsetNames();
        const hints = unknown
          .map(n => closestName(n, [...known, ...Object.keys(PROFILES)]))
          .filter(Boolean);
        return error(
          `No known toolsets in: ${toolsets.join(', ')}.${
            hints.length ? ` Did you mean: ${hints.join(', ')}?` : ''
          } Toolsets: ${known.join(', ')}. Profiles: ${Object.keys(PROFILES).join(', ')}.`
        );
      }

      const changed: string[] = [];
      const pinned: string[] = [];
      for (const entry of registry.tools.values()) {
        if (!(expanded as Set<string>).has(entry.toolset)) continue;
        if (disable) {
          if (isPinned(entry)) {
            if (entry.handle.enabled) pinned.push(entry.name);
            continue;
          }
          if (entry.handle.enabled) {
            entry.handle.enabled = false;
            changed.push(entry.name);
          }
        } else if (!entry.handle.enabled) {
          entry.handle.enabled = true;
          changed.push(entry.name);
        }
      }

      // One notification for the whole batch rather than one per tool.
      if (changed.length > 0) notifyListChanged();

      const verb = disable ? 'Disabled' : 'Enabled';
      const lines = [
        `${verb} ${changed.length} tool(s) in: ${[...expanded].join(', ')}.`,
        changed.length > 0
          ? `Tools: ${changed.join(', ')}.`
          : 'Nothing changed — already in that state.',
      ];
      if (pinned.length > 0) lines.push(`Kept enabled (core): ${pinned.join(', ')}.`);
      if (unknown.length > 0) lines.push(`Ignored unknown names: ${unknown.join(', ')}.`);
      if (changed.length > 0) {
        lines.push(
          'The tool list has changed (notifications/tools/list_changed sent). ' +
            'If the new tools are not visible yet, call them through clickup_call_tool.'
        );
      }
      return text(lines.join('\n'));
    }
  );

  server.tool(
    'clickup_call_tool',
    'Run any ClickUp tool by name, even one whose toolset is not enabled. `arguments` is ' +
      "validated against that tool's input schema (unknown parameters are rejected) and the " +
      "tool's result is returned unchanged. Find tool names and schemas with " +
      'clickup_list_toolsets({ toolset, include_schemas: true }).',
    {
      tool: z.string().describe('Exact tool name, e.g. "clickup_create_goal".'),
      arguments: z
        .record(z.unknown())
        .optional()
        .describe('Arguments for that tool, exactly as its input schema defines them.'),
    },
    async ({ tool, arguments: args }, extra) => {
      const entry = registry.tools.get(tool);
      if (!entry) {
        const candidates = [...registry.tools.values()]
          .filter(e => e.toolset !== CATALOG_TOOLSET)
          .map(e => e.name);
        const suggestion = closestName(tool, candidates);
        return error(
          `Unknown tool "${tool}".${
            suggestion ? ` Did you mean "${suggestion}"?` : ''
          } Use clickup_list_toolsets to see every tool.`
        );
      }
      if (entry.toolset === CATALOG_TOOLSET) {
        return error(
          `${tool} is a catalog tool; call it directly rather than through clickup_call_tool.`
        );
      }

      const schema = entry.handle.inputSchema;
      try {
        if (!schema) {
          return (await entry.handle.handler(extra)) as TextResult;
        }
        const parsed = await schema.safeParseAsync(args ?? {});
        if (!parsed.success) {
          const detail = parsed.error.issues
            .map(issue => (issue.path.length ? `${issue.path.join('.')}: ` : '') + issue.message)
            .join('; ');
          return error(`Input validation error: Invalid arguments for tool ${tool}: ${detail}`);
        }
        return (await entry.handle.handler(parsed.data, extra)) as TextResult;
      } catch (err) {
        return error(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
