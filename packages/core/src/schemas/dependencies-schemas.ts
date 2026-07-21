import { z } from 'zod';

// ============================================================================
// The real ClickUp Task Relationships API surface is exactly four endpoints:
//   POST   /task/{task_id}/dependency        (body: depends_on XOR dependency_of)
//   DELETE /task/{task_id}/dependency        (query: depends_on XOR dependency_of)
//   POST   /task/{task_id}/link/{links_to}
//   DELETE /task/{task_id}/link/{links_to}
// All four accept custom_task_ids & team_id query params. Dependencies and
// links are read from the `dependencies` / `linked_tasks` arrays embedded in
// the Get Task (GET /task/{task_id}) response — there is no dependency read,
// update, bulk, graph, or stats endpoint.
// ============================================================================

// Shared custom-task-ID query params (accepted by all four relationship endpoints)
const customTaskIdFields = {
  custom_task_ids: z
    .boolean()
    .optional()
    .describe('Set true when the task IDs are custom task IDs (also requires team_id)'),
  team_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform(v => (v === undefined ? undefined : String(v)))
    .describe('Workspace (team) ID — required when custom_task_ids is true'),
};

// custom_task_ids=true is invalid without the workspace ID (API requirement)
const requiresTeamIdWithCustomIds = (data: {
  custom_task_ids?: boolean;
  team_id?: string;
}): boolean => !data.custom_task_ids || !!data.team_id;

const TEAM_ID_ERROR = 'team_id is required when custom_task_ids is true';

// Exactly one of depends_on / dependency_of must be provided (API requirement)
const exactlyOneDirection = (data: { depends_on?: string; dependency_of?: string }): boolean =>
  (data.depends_on ? 1 : 0) + (data.dependency_of ? 1 : 0) === 1;

const DIRECTION_ERROR = 'Provide exactly one of depends_on or dependency_of';

// Create dependency schema (POST /task/{task_id}/dependency)
export const CreateDependencySchema = z
  .object({
    task_id: z.string().min(1).describe('The ID of the task to add the dependency to'),
    depends_on: z
      .string()
      .min(1)
      .optional()
      .describe('ID of the task this task is WAITING ON (must finish before this task)'),
    dependency_of: z
      .string()
      .min(1)
      .optional()
      .describe('ID of the task this task is BLOCKING (cannot start until this task finishes)'),
    ...customTaskIdFields,
  })
  .refine(exactlyOneDirection, { message: DIRECTION_ERROR })
  .refine(requiresTeamIdWithCustomIds, { message: TEAM_ID_ERROR });

// Delete dependency schema (DELETE /task/{task_id}/dependency, query params)
export const DeleteDependencySchema = z
  .object({
    task_id: z.string().min(1).describe('The ID of the task to remove the dependency from'),
    depends_on: z
      .string()
      .min(1)
      .optional()
      .describe('ID of the "waiting on" task in the dependency to remove'),
    dependency_of: z
      .string()
      .min(1)
      .optional()
      .describe('ID of the "blocking" task in the dependency to remove'),
    ...customTaskIdFields,
  })
  .refine(exactlyOneDirection, { message: DIRECTION_ERROR })
  .refine(requiresTeamIdWithCustomIds, { message: TEAM_ID_ERROR });

// Get task dependencies schema (reads GET /task/{task_id} embedded arrays)
export const GetTaskDependenciesSchema = z
  .object({
    task_id: z.string().min(1).describe('The ID of the task to get dependencies and links for'),
    ...customTaskIdFields,
  })
  .refine(requiresTeamIdWithCustomIds, { message: TEAM_ID_ERROR });

// Task link schemas (POST/DELETE /task/{task_id}/link/{links_to})
export const AddTaskLinkSchema = z
  .object({
    task_id: z.string().min(1).describe('The ID of the task to add the link to'),
    links_to: z.string().min(1).describe('The ID of the task to link to'),
    ...customTaskIdFields,
  })
  .refine(requiresTeamIdWithCustomIds, { message: TEAM_ID_ERROR });

export const DeleteTaskLinkSchema = z
  .object({
    task_id: z.string().min(1).describe('The ID of the task to remove the link from'),
    links_to: z.string().min(1).describe('The ID of the linked task to unlink'),
    ...customTaskIdFields,
  })
  .refine(requiresTeamIdWithCustomIds, { message: TEAM_ID_ERROR });

// Dependency graph options schema (client-side traversal of Get Task data)
export const DependencyGraphOptionsSchema = z.object({
  task_id: z.string().min(1).describe('The root task ID for the dependency graph'),
  depth: z.number().min(1).max(10).default(3).describe('Maximum depth to traverse in the graph'),
});

// Dependency conflict check schema (client-side cycle/duplicate detection)
export const DependencyConflictCheckSchema = z.object({
  task_id: z.string().min(1).describe('The task ID to check for conflicts'),
  proposed_dependencies: z
    .array(
      z
        .object({
          depends_on: z.string().min(1).optional(),
          dependency_of: z.string().min(1).optional(),
        })
        .refine(exactlyOneDirection, { message: DIRECTION_ERROR })
    )
    .optional()
    .describe('Proposed new dependencies for the task, to check for conflicts before creating'),
});

// Bulk dependency operations schema (client-side loop of real per-task calls)
export const BulkDependencyOperationSchema = z.object({
  operation: z.enum(['create', 'delete']).describe('The bulk operation to perform'),
  dependencies: z
    .array(
      z
        .object({
          task_id: z.string().min(1),
          depends_on: z.string().min(1).optional(),
          dependency_of: z.string().min(1).optional(),
        })
        .refine(exactlyOneDirection, { message: DIRECTION_ERROR })
    )
    .min(1)
    .describe('Array of dependencies to create or delete'),
});

// Type exports
export type CreateDependencyRequest = z.infer<typeof CreateDependencySchema>;
export type DeleteDependencyRequest = z.infer<typeof DeleteDependencySchema>;
export type GetTaskDependenciesRequest = z.infer<typeof GetTaskDependenciesSchema>;
export type AddTaskLinkRequest = z.infer<typeof AddTaskLinkSchema>;
export type DeleteTaskLinkRequest = z.infer<typeof DeleteTaskLinkSchema>;
export type DependencyGraphOptions = z.infer<typeof DependencyGraphOptionsSchema>;
export type DependencyConflictCheck = z.infer<typeof DependencyConflictCheckSchema>;
export type BulkDependencyOperation = z.infer<typeof BulkDependencyOperationSchema>;

// ============================================================================
// API response shapes
// ============================================================================

// Entry in the `dependencies` array of a Get Task response.
// `task_id` waits on `depends_on`; `type` is ClickUp's numeric relationship type.
export interface TaskDependency {
  task_id: string;
  depends_on: string;
  type?: number;
  date_created?: string;
  userid?: string;
}

// Entry in the `linked_tasks` array of a Get Task response
export interface LinkedTask {
  task_id: string;
  link_id: string;
  date_created?: string;
  userid?: string;
}

// Result of reading a task's relationships from Get Task
export interface TaskRelationships {
  task_id: string;
  dependencies: TaskDependency[];
  linked_tasks: LinkedTask[];
}

// Client-side dependency graph shapes
export interface DependencyGraphNode {
  task_id: string;
  name?: string;
  status?: string;
  url?: string;
}

export interface DependencyGraphEdge {
  task_id: string;
  depends_on: string;
  type?: number;
}

export interface DependencyGraphResponse {
  root_task_id: string;
  depth: number;
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  cycles: string[][];
}

export interface DependencyConflictResponse {
  has_conflicts: boolean;
  conflicts: Array<{
    type: 'circular' | 'duplicate';
    description: string;
    affected_tasks: string[];
  }>;
}

// ============================================================================
// Utility functions (client-side, no HTTP)
// ============================================================================

// A directed dependency edge: `task_id` waits on `depends_on`
export interface DependencyEdge {
  task_id: string;
  depends_on: string;
}

/**
 * Detect circular dependencies in a set of dependency edges using DFS.
 */
export const validateDependencyChain = (
  edges: DependencyEdge[]
): {
  isValid: boolean;
  cycles: string[][];
  errors: string[];
} => {
  const graph = new Map<string, Set<string>>();
  const errors: string[] = [];

  // Build adjacency list (task -> tasks it waits on)
  edges.forEach(edge => {
    if (!graph.has(edge.task_id)) {
      graph.set(edge.task_id, new Set());
    }
    if (!graph.has(edge.depends_on)) {
      graph.set(edge.depends_on, new Set());
    }
    graph.get(edge.task_id)?.add(edge.depends_on);
  });

  // Detect cycles using DFS
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (node: string, path: string[]): void => {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
      }
    }

    recursionStack.delete(node);
  };

  // Check all nodes for cycles
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  if (cycles.length > 0) {
    errors.push(
      `Circular dependencies detected: ${cycles.map(cycle => cycle.join(' -> ')).join(', ')}`
    );
  }

  return {
    isValid: cycles.length === 0,
    cycles,
    errors,
  };
};
