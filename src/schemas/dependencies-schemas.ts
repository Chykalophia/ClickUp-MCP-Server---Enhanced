import { z } from 'zod';

// Dependency types
export const DependencyTypeSchema = z.enum([
  'blocking',      // Task A blocks Task B (A must finish before B can start)
  'waiting_on',    // Task A is waiting on Task B (A cannot start until B finishes)
  'linked'         // Tasks are linked but not blocking
]);

// Dependency status
export const DependencyStatusSchema = z.enum([
  'active',
  'resolved',
  'broken',
  'ignored'
]);

// Create dependency schema
export const CreateDependencySchema = z.object({
  task_id: z.string().min(1).describe('The ID of the task that depends on another'),
  depends_on: z.string().min(1).describe('The ID of the task that this task depends on'),
  type: DependencyTypeSchema.default('blocking').describe('The type of dependency relationship'),
  link_id: z.string().optional().describe('Optional link ID for grouping related dependencies')
});

// Update dependency schema
export const UpdateDependencySchema = z.object({
  dependency_id: z.string().min(1).describe('The ID of the dependency to update'),
  type: DependencyTypeSchema.optional().describe('New dependency type'),
  status: DependencyStatusSchema.optional().describe('New dependency status')
});

// Get dependencies filter schema
export const GetDependenciesFilterSchema = z.object({
  task_id: z.string().min(1).describe('The ID of the task to get dependencies for'),
  type: DependencyTypeSchema.optional().describe('Filter by dependency type'),
  status: DependencyStatusSchema.optional().describe('Filter by dependency status'),
  include_resolved: z.boolean().default(false).describe('Whether to include resolved dependencies')
});

// Dependency graph options schema
export const DependencyGraphOptionsSchema = z.object({
  task_id: z.string().min(1).describe('The root task ID for the dependency graph'),
  depth: z.number().min(1).max(10).default(3).describe('Maximum depth to traverse in the graph'),
  direction: z.enum(['upstream', 'downstream', 'both']).default('both').describe('Direction to traverse dependencies'),
  include_resolved: z.boolean().default(false).describe('Whether to include resolved dependencies'),
  include_broken: z.boolean().default(true).describe('Whether to include broken dependencies')
});

// Dependency conflict check schema
export const DependencyConflictCheckSchema = z.object({
  task_id: z.string().min(1).describe('The task ID to check for conflicts'),
  proposed_dependencies: z.array(z.object({
    depends_on: z.string(),
    type: DependencyTypeSchema
  })).optional().describe('Proposed new dependencies to check for conflicts')
});

// Bulk dependency operations schema
export const BulkDependencyOperationSchema = z.object({
  operation: z.enum(['create', 'delete', 'update']).describe('The bulk operation to perform'),
  dependencies: z.array(z.union([
    CreateDependencySchema,
    z.object({ dependency_id: z.string() }), // For delete operations
    UpdateDependencySchema
  ])).describe('Array of dependency operations to perform')
});

// Type exports
export type DependencyType = z.infer<typeof DependencyTypeSchema>;
export type DependencyStatus = z.infer<typeof DependencyStatusSchema>;
export type CreateDependencyRequest = z.infer<typeof CreateDependencySchema>;
export type UpdateDependencyRequest = z.infer<typeof UpdateDependencySchema>;
export type GetDependenciesFilter = z.infer<typeof GetDependenciesFilterSchema>;
export type DependencyGraphOptions = z.infer<typeof DependencyGraphOptionsSchema>;
export type DependencyConflictCheck = z.infer<typeof DependencyConflictCheckSchema>;
export type BulkDependencyOperation = z.infer<typeof BulkDependencyOperationSchema>;

// Dependency response interfaces
export interface DependencyResponse {
  id: string;
  task_id: string;
  depends_on: string;
  type: DependencyType;
  status: DependencyStatus;
  link_id?: string;
  date_created: string;
  date_updated: string;
  created_by: {
    id: number;
    username: string;
    email: string;
  };
  task_info: {
    id: string;
    name: string;
    status: {
      status: string;
      color: string;
    };
    assignees: Array<{
      id: number;
      username: string;
    }>;
    due_date?: string;
    url: string;
  };
  depends_on_info: {
    id: string;
    name: string;
    status: {
      status: string;
      color: string;
    };
    assignees: Array<{
      id: number;
      username: string;
    }>;
    due_date?: string;
    url: string;
  };
}

export interface DependencyListResponse {
  dependencies: DependencyResponse[];
  total_count: number;
}

export interface DependencyGraphNode {
  task_id: string;
  task_name: string;
  task_status: string;
  task_url: string;
  level: number;
  dependencies: Array<{
    id: string;
    type: DependencyType;
    status: DependencyStatus;
    target_task_id: string;
  }>;
  dependents: Array<{
    id: string;
    type: DependencyType;
    status: DependencyStatus;
    source_task_id: string;
  }>;
}

export interface DependencyGraphResponse {
  root_task_id: string;
  nodes: DependencyGraphNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: DependencyType;
    status: DependencyStatus;
  }>;
  cycles: Array<{
    cycle_id: string;
    task_ids: string[];
    description: string;
  }>;
  critical_path?: Array<{
    task_id: string;
    task_name: string;
    duration_days: number;
  }>;
}

export interface DependencyConflictResponse {
  has_conflicts: boolean;
  conflicts: Array<{
    type: 'circular' | 'duplicate' | 'invalid_status';
    description: string;
    affected_tasks: string[];
    suggested_resolution: string;
  }>;
  warnings: Array<{
    type: 'performance' | 'complexity' | 'timeline';
    description: string;
    affected_tasks: string[];
  }>;
}

// Utility functions
export const getDependencyDirection = (type: DependencyType): 'forward' | 'backward' => {
  switch (type) {
    case 'blocking':
      return 'forward';
    case 'waiting_on':
      return 'backward';
    case 'linked':
      return 'forward';
    default:
      return 'forward';
  }
};

export const getOppositeDependencyType = (type: DependencyType): DependencyType => {
  switch (type) {
    case 'blocking':
      return 'waiting_on';
    case 'waiting_on':
      return 'blocking';
    case 'linked':
      return 'linked';
    default:
      return type;
  }
};

export const validateDependencyChain = (dependencies: CreateDependencyRequest[]): {
  isValid: boolean;
  cycles: string[][];
  errors: string[];
} => {
  const graph = new Map<string, Set<string>>();
  const errors: string[] = [];
  
  // Build adjacency list
  dependencies.forEach(dep => {
    if (!graph.has(dep.task_id)) {
      graph.set(dep.task_id, new Set());
    }
    if (!graph.has(dep.depends_on)) {
      graph.set(dep.depends_on, new Set());
    }
    
    if (dep.type === 'blocking') {
      graph.get(dep.depends_on)?.add(dep.task_id);
    } else if (dep.type === 'waiting_on') {
      graph.get(dep.task_id)?.add(dep.depends_on);
    }
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
    errors.push(`Circular dependencies detected: ${cycles.map(cycle => cycle.join(' -> ')).join(', ')}`);
  }
  
  return {
    isValid: cycles.length === 0,
    cycles,
    errors
  };
};

export const calculateCriticalPath = (nodes: DependencyGraphNode[]): DependencyGraphNode[] => {
  // Simplified critical path calculation
  // In a real implementation, this would consider task durations and dates
  const nodeMap = new Map(nodes.map(node => [node.task_id, node]));
  const visited = new Set<string>();
  const criticalPath: DependencyGraphNode[] = [];
  
  // Find the longest path through the dependency graph
  const findLongestPath = (nodeId: string, currentPath: DependencyGraphNode[]): DependencyGraphNode[] => {
    if (visited.has(nodeId)) return currentPath;
    
    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return currentPath;
    
    const pathWithNode = [...currentPath, node];
    let longestPath = pathWithNode;
    
    // Explore all dependencies
    for (const dep of node.dependencies) {
      const childPath = findLongestPath(dep.target_task_id, pathWithNode);
      if (childPath.length > longestPath.length) {
        longestPath = childPath;
      }
    }
    
    return longestPath;
  };
  
  // Start from nodes with no dependencies (root nodes)
  const rootNodes = nodes.filter(node => node.dependencies.length === 0);
  
  for (const rootNode of rootNodes) {
    const path = findLongestPath(rootNode.task_id, []);
    if (path.length > criticalPath.length) {
      criticalPath.splice(0, criticalPath.length, ...path);
    }
  }
  
  return criticalPath;
};
