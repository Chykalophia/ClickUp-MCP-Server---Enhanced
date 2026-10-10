/**
 * Strict parameter validation for every tool this server registers.
 *
 * ## The defect this fixes
 *
 * `McpServer.tool()` takes a *raw zod shape* and the SDK wraps it with
 * `z.object(shape)`. Zod v3 objects **strip** unknown keys instead of rejecting
 * them, so a caller that misspells a parameter gets that parameter silently
 * discarded and the operation runs anyway. A real subtask was created on a
 * client board this way: HTTP success, a complete task object in the response,
 * and `description: ""` — because the description had been passed under a name
 * the tool did not declare. Nothing errored and nothing warned.
 *
 * That behaviour also contradicts the server's own published contract: the
 * JSON Schema sent to clients on connect already carries
 * `additionalProperties: false` for every tool. Making the runtime strict does
 * not add a restriction — it makes the runtime obey the schema it advertises.
 *
 * ## How it is fixed here, once, for all ~157 tools
 *
 * `tool()` cannot take a full `ZodObject` — it mis-routes anything that is not
 * a raw shape into its annotations branch and throws. `registerTool()` can, and
 * `normalizeObjectSchema` passes an object schema through untouched. So this
 * module replaces `server.tool` with a function that mirrors the SDK's own
 * overload parsing, upgrades the raw shape to `z.strictObject(...)`, and
 * forwards to `registerTool`. Call sites are untouched; there are 174 of them.
 *
 * The same pass applies PARAM_ALIASES (see ./param-aliases.ts), so alternative
 * spellings validate as first-class parameters and reach handlers under the
 * canonical name.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  PARAM_ALIASES,
  UNIVERSAL_ALIASES,
  type AliasMap,
  type ToolParamAliases,
} from './param-aliases.js';
import { isDestructive, resolveAnnotations, type ToolAnnotationsShape } from './tool-annotations.js';

type RawShape = Record<string, z.ZodTypeAny>;
type ToolArgs = Record<string, unknown>;
type ToolHandler = (args: ToolArgs, extra: unknown) => unknown;

/**
 * The SDK decides whether an argument is a params shape or a ToolAnnotations
 * bag with these three predicates. They are reproduced rather than imported
 * because the SDK does not export them, and this wrapper has to make exactly
 * the same call the SDK would — a disagreement here would silently change which
 * overload a call site resolves to.
 * Mirrors isZodTypeLike / isZodSchemaInstance / isZodRawShapeCompat in
 * @modelcontextprotocol/sdk/server/mcp.js.
 */
function isZodTypeLike(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { parse?: unknown }).parse === 'function' &&
    typeof (value as { safeParse?: unknown }).safeParse === 'function'
  );
}

function isZodSchemaInstance(value: object): boolean {
  return '_def' in value || '_zod' in value || isZodTypeLike(value);
}

function isRawShape(value: unknown): value is RawShape {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (isZodSchemaInstance(value)) {
    return false;
  }
  // An empty object is a valid raw shape: it is how zero-parameter tools are
  // registered, and it still produces an input schema.
  if (Object.keys(value).length === 0) {
    return true;
  }
  return Object.values(value).some(isZodTypeLike);
}

/** Levenshtein distance, iterative two-row form. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * Closest declared parameter to a rejected key, or undefined when nothing is
 * close enough to be worth suggesting. The threshold scales with the key length
 * so short names need a near-exact match and long ones tolerate a typo or two.
 */
function closestParam(unknownKey: string, candidates: string[]): string | undefined {
  const threshold = Math.max(2, Math.floor(unknownKey.length / 3));
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = editDistance(unknownKey, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return bestDistance <= threshold ? best : undefined;
}

/**
 * The message a caller sees when a parameter name is not recognised. It names
 * what was rejected, suggests the nearest real name when there is one, and
 * always lists the full set — the failure mode being fixed was a caller with no
 * way to discover the right spelling.
 */
export function unknownParamMessage(
  toolName: string,
  unknownKeys: string[],
  validNames: string[]
): string {
  const parts = [`Unknown parameter(s) for ${toolName}: ${unknownKeys.join(', ')}.`];

  if (validNames.length === 0) {
    parts.push('This tool takes no parameters.');
    return parts.join(' ');
  }

  const suggestions = unknownKeys
    .map(key => {
      const match = closestParam(key, validNames);
      return match ? `"${key}" -> did you mean "${match}"?` : undefined;
    })
    .filter((entry): entry is string => entry !== undefined);

  if (suggestions.length > 0) {
    parts.push(suggestions.join(' '));
  }

  parts.push(`Valid parameters: ${validNames.join(', ')}.`);
  return parts.join(' ');
}

/**
 * Resolve which aliases apply to one tool.
 *
 * A per-tool entry is authoritative: a bad one throws, because an explicit
 * mapping that points at nothing is a bug in PARAM_ALIASES. A universal entry
 * is a broad rule, so it simply does not apply to a tool that lacks the
 * canonical parameter or already declares the alias for real.
 */
function resolveAliases(
  toolName: string,
  shape: RawShape,
  explicit: AliasMap,
  universal: AliasMap
): AliasMap {
  const resolved: Record<string, string> = {};

  for (const [alias, canonical] of Object.entries(explicit)) {
    if (alias in shape) {
      throw new Error(
        `Tool ${toolName}: PARAM_ALIASES declares "${alias}" as an alias, ` +
          'but the tool already declares it as a real parameter.'
      );
    }
    if (!(canonical in shape)) {
      throw new Error(
        `Tool ${toolName}: PARAM_ALIASES maps "${alias}" to "${canonical}", which is not a parameter of this tool.`
      );
    }
    resolved[alias] = canonical;
  }

  for (const [alias, canonical] of Object.entries(universal)) {
    if (alias in shape || alias in resolved || !(canonical in shape)) {
      continue;
    }
    resolved[alias] = canonical;
  }

  return resolved;
}

/**
 * Make every tool registered on `server` reject unknown parameters, and accept
 * the alias spellings declared in `aliases` and `universal`.
 *
 * Call this immediately after constructing the server and before any tool is
 * registered on it; it patches the instance's `tool` method, so registrations
 * that happened first are not covered.
 */
export function enforceStrictParams(
  server: McpServer,
  aliases: ToolParamAliases = PARAM_ALIASES,
  universal: AliasMap = UNIVERSAL_ALIASES,
  options: StrictParamsOptions = {}
): McpServer {
  const registry = createToolRegistry(server, options);
  const target = server as unknown as {
    tool: (...args: unknown[]) => unknown;
    registerTool: (
      name: string,
      config: { description?: string; inputSchema?: unknown; annotations?: unknown },
      cb: ToolHandler
    ) => unknown;
  };

  const originalTool = target.tool.bind(server);
  const originalRegisterTool = target.registerTool.bind(server);

  target.tool = (...toolArgs: unknown[]): unknown => {
    const name = toolArgs[0] as string;
    const rest = toolArgs.slice(1);

    // Mirror the SDK's overload parsing exactly — see the predicates above.
    const pending = [...rest];
    let description: string | undefined;
    let shape: RawShape | undefined;
    let annotations: unknown;

    if (typeof pending[0] === 'string') {
      description = pending.shift() as string;
    }

    if (pending.length > 1) {
      const firstArg = pending[0];
      if (isRawShape(firstArg)) {
        shape = pending.shift() as RawShape;
        if (
          pending.length > 1 &&
          typeof pending[0] === 'object' &&
          pending[0] !== null &&
          !isRawShape(pending[0])
        ) {
          annotations = pending.shift();
        }
      }
    }

    // No params shape: the SDK invokes these handlers as cb(extra) rather than
    // cb(args, extra), so wrapping one would change its arity. It also owns the
    // error for a malformed annotations bag. Hand the call back untouched.
    if (!shape) {
      return registry.record(name, originalTool(name, ...rest) as RegisteredToolHandle);
    }

    const callback = pending[0] as ToolHandler;
    // Registration-time failures, so a stale alias entry breaks server boot and
    // the test suite instead of quietly doing nothing.
    const aliasMap = resolveAliases(name, shape, aliases[name] ?? {}, universal);
    const shapeWithAliases: RawShape = { ...shape };
    // Canonical parameters that were required before an alias was added. Zod
    // validates before the handler renames anything, so a required canonical
    // would reject a call that supplied only the alias. These are relaxed to
    // optional in the schema and re-checked after the rename instead, which is
    // the same either/or shape clickup_create_task_comment uses for
    // comment_text vs comment.
    const requiredEither: Array<[canonical: string, alias: string]> = [];

    for (const [alias, canonical] of Object.entries(aliasMap)) {
      const canonicalSchema = shape[canonical];
      shapeWithAliases[alias] = canonicalSchema
        .optional()
        .describe(`Alias for \`${canonical}\` — either name is accepted.`);

      if (!canonicalSchema.isOptional()) {
        requiredEither.push([canonical, alias]);
        const existing = canonicalSchema.description;
        shapeWithAliases[canonical] = canonicalSchema
          .optional()
          .describe(
            `${existing ? `${existing} ` : ''}Required unless \`${alias}\` is given instead.`
          );
      }
    }

    const validNames = Object.keys(shapeWithAliases);
    const inputSchema = z.strictObject(shapeWithAliases, {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.unrecognized_keys) {
          return { message: unknownParamMessage(name, issue.keys, validNames) };
        }
        return { message: ctx.defaultError };
      },
    });

    const handler: ToolHandler = (rawArgs, extra) => {
      const normalized: ToolArgs = { ...rawArgs };

      for (const [alias, canonical] of Object.entries(aliasMap)) {
        if (normalized[alias] === undefined) {
          continue;
        }
        if (normalized[canonical] === undefined) {
          normalized[canonical] = normalized[alias];
        } else {
          // stderr, not stdout: stdout carries the JSON-RPC stream on this
          // transport and writing to it corrupts the protocol.
          console.warn(
            `${name}: both "${canonical}" and its alias "${alias}" were supplied; using "${canonical}".`
          );
        }
        delete normalized[alias];
      }

      for (const [canonical, alias] of requiredEither) {
        if (normalized[canonical] === undefined) {
          throw new Error(
            `${name} requires "${canonical}" (or its alias "${alias}"); neither was supplied.`
          );
        }
      }

      return callback(normalized, extra);
    };

    return registry.record(
      name,
      originalRegisterTool(
        name,
        { description, inputSchema, annotations },
        handler
      ) as RegisteredToolHandle
    );
  };

  return server;
}

// ---------------------------------------------------------------------------
// Tool registry: toolset tracking, central annotations, destructive-call
// confirmation.
//
// Every registration above funnels through `registry.record`, which
//   1. records tool name -> toolset (the toolset whose setup function is
//      running, see `withToolset`) so counts come from what actually
//      registered, never from a hand-maintained table;
//   2. applies MCP annotations (title, readOnly/destructive/idempotent/
//      openWorld hints) from utils/tool-annotations.ts without overwriting any
//      the call site passed;
//   3. wraps destructive handlers so that, when the connected client supports
//      form elicitation, the user confirms before anything is deleted. Clients
//      without elicitation see exactly the pre-7.0 behaviour.
// ---------------------------------------------------------------------------

export interface StrictParamsOptions {
  /**
   * Ask the user to confirm destructive tools via elicitation when the client
   * supports it. Default true.
   */
  confirmDestructive?: boolean;
}

/** The parts of the SDK's RegisteredTool this module relies on (all public). */
export interface RegisteredToolHandle {
  description?: string;
  inputSchema?: z.ZodTypeAny;
  annotations?: ToolAnnotationsShape;
  handler: (...args: unknown[]) => unknown;
  enabled: boolean;
  enable(): void;
  disable(): void;
}

export interface ToolEntry {
  name: string;
  toolset: string;
  handle: RegisteredToolHandle;
}

/**
 * Toolsets whose tools never prompt for confirmation themselves. The catalog's
 * clickup_call_tool runs other tools' handlers, which confirm on their own.
 */
export const CONFIRM_EXEMPT_TOOLSETS = new Set(['catalog']);

/**
 * Closest candidate to `name` for a "did you mean" hint: edit distance first,
 * then a substring match on the part after `clickup_`.
 */
export function closestName(name: string, candidates: string[]): string | undefined {
  const byDistance = closestParam(name, candidates);
  if (byDistance) return byDistance;
  const bare = name.replace(/^clickup_/, '').toLowerCase();
  if (bare.length < 3) return undefined;
  return candidates.find(c => c.includes(bare) || bare.includes(c.replace(/^clickup_/, '')));
}

/** Toolset recorded for tools registered outside any `withToolset` block. */
export const UNGROUPED_TOOLSET = 'other';

export interface ToolRegistry {
  readonly tools: Map<string, ToolEntry>;
  /** Run `fn` with every tool it registers attributed to `toolset`. */
  withToolset<T>(toolset: string, fn: () => T): T;
  /** toolset -> tool names, in registration order. */
  byToolset(): Map<string, string[]>;
  /** Internal: called for every registration. */
  record(name: string, handle: RegisteredToolHandle): RegisteredToolHandle;
}

const registries = new WeakMap<object, ToolRegistry>();

/** The registry enforceStrictParams attached to `server`, if any. */
export function getToolRegistry(server: McpServer): ToolRegistry | undefined {
  return registries.get(server);
}

/** Run `fn` with its registrations attributed to `toolset`. */
export function withToolset<T>(server: McpServer, toolset: string, fn: () => T): T {
  const registry = registries.get(server);
  if (!registry) {
    throw new Error('withToolset requires a server wrapped by enforceStrictParams');
  }
  return registry.withToolset(toolset, fn);
}

interface ElicitCapableServer {
  getClientCapabilities(): { elicitation?: Record<string, unknown> } | undefined;
  elicitInput(
    params: {
      mode?: 'form';
      message: string;
      requestedSchema: Record<string, unknown>;
    },
    options?: { relatedRequestId?: string | number }
  ): Promise<{ action: string; content?: Record<string, unknown> }>;
}

function supportsFormElicitation(server: ElicitCapableServer): boolean {
  const elicitation = server.getClientCapabilities()?.elicitation;
  if (!elicitation || typeof elicitation !== 'object') return false;
  // `elicitation: {}` is the older spelling of form support.
  return 'form' in elicitation || Object.keys(elicitation).length === 0;
}

function summarizeArgs(args: unknown): string {
  if (args === undefined) return '';
  let text: string;
  try {
    text = JSON.stringify(args);
  } catch {
    return '';
  }
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

type CancelledResult = { content: Array<{ type: 'text'; text: string }>; isError: true };

/**
 * Ask the user to confirm a destructive call. Resolves to undefined to proceed,
 * or to an error CallToolResult when the user declined, cancelled, or the
 * confirmation could not be obtained (fail closed: the client said it supports
 * elicitation, so a failed confirmation is not consent).
 */
async function confirmDestructiveCall(
  server: ElicitCapableServer,
  name: string,
  title: string,
  args: unknown,
  extra: unknown
): Promise<CancelledResult | undefined> {
  const requestId = (extra as { requestId?: string | number } | undefined)?.requestId;
  const argText = summarizeArgs(args);
  const cancelled = (reason: string): CancelledResult => ({
    content: [{ type: 'text', text: `${name} was cancelled${reason}. Nothing was changed.` }],
    isError: true,
  });

  try {
    const result = await server.elicitInput(
      {
        mode: 'form',
        message:
          `${title} (${name}) permanently changes or removes ClickUp data.` +
          (argText ? ` Arguments: ${argText}.` : '') +
          ' Proceed?',
        requestedSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              title: 'Proceed',
              description: `Run ${name}`,
              default: false,
            },
          },
          required: ['confirm'],
        },
      },
      requestId !== undefined ? { relatedRequestId: requestId } : undefined
    );
    if (result.action === 'accept' && result.content?.confirm === true) {
      return undefined;
    }
    const why = result.action === 'accept' ? 'not confirmed' : result.action;
    return cancelled(` by the user (${why})`);
  } catch (error) {
    return cancelled(
      `: confirmation could not be obtained (${error instanceof Error ? error.message : String(error)})`
    );
  }
}

function createToolRegistry(server: McpServer, options: StrictParamsOptions): ToolRegistry {
  const confirm = options.confirmDestructive !== false;
  const tools = new Map<string, ToolEntry>();
  let currentToolset = UNGROUPED_TOOLSET;
  const lowLevel = (server as unknown as { server: ElicitCapableServer }).server;

  const registry: ToolRegistry = {
    tools,
    withToolset(toolset, fn) {
      const previous = currentToolset;
      currentToolset = toolset;
      try {
        return fn();
      } finally {
        currentToolset = previous;
      }
    },
    byToolset() {
      const grouped = new Map<string, string[]>();
      for (const entry of tools.values()) {
        const names = grouped.get(entry.toolset) ?? [];
        names.push(entry.name);
        grouped.set(entry.toolset, names);
      }
      return grouped;
    },
    record(name, handle) {
      handle.annotations = resolveAnnotations(name, handle.annotations);

      if (confirm && !CONFIRM_EXEMPT_TOOLSETS.has(currentToolset)) {
        const inner = handle.handler;
        const hasArgs = handle.inputSchema !== undefined;
        // Annotations are read at call time, so a later change applies.
        handle.handler = async (...callArgs: unknown[]) => {
          if (isDestructive(handle.annotations) && supportsFormElicitation(lowLevel)) {
            const args = hasArgs ? callArgs[0] : undefined;
            const extra = hasArgs ? callArgs[1] : callArgs[0];
            const title = String(handle.annotations?.title ?? name);
            const cancelled = await confirmDestructiveCall(lowLevel, name, title, args, extra);
            if (cancelled) return cancelled;
          }
          return inner(...callArgs);
        };
      }

      tools.set(name, { name, toolset: currentToolset, handle });
      return handle;
    },
  };

  registries.set(server, registry);
  return registry;
}
