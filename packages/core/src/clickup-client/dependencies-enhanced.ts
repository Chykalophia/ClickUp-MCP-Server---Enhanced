import { ClickUpClient } from './index.js';
import {
  validateDependencyChain,
  type CreateDependencyRequest,
  type DeleteDependencyRequest,
  type GetTaskDependenciesRequest,
  type AddTaskLinkRequest,
  type DeleteTaskLinkRequest,
  type DependencyGraphOptions,
  type DependencyConflictCheck,
  type BulkDependencyOperation,
  type TaskDependency,
  type LinkedTask,
  type TaskRelationships,
  type DependencyGraphNode,
  type DependencyGraphEdge,
  type DependencyGraphResponse,
  type DependencyConflictResponse,
} from '../schemas/dependencies-schemas.js';

// Minimal slice of a Get Task response used for relationship reads
interface TaskWithRelationships {
  id: string;
  name?: string;
  status?: { status: string };
  url?: string;
  dependencies?: TaskDependency[];
  linked_tasks?: LinkedTask[];
}

// Query params accepted by all four Task Relationships endpoints
interface CustomTaskIdParams {
  custom_task_ids?: boolean;
  team_id?: string;
}

export class DependenciesEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Build the custom_task_ids/team_id query string shared by all four endpoints
   */
  private buildCustomIdQuery(params?: CustomTaskIdParams): string {
    const search = new URLSearchParams();
    if (params?.custom_task_ids !== undefined) {
      search.set('custom_task_ids', String(params.custom_task_ids));
    }
    if (params?.team_id !== undefined) {
      search.set('team_id', params.team_id);
    }
    const queryString = search.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Create a dependency between two tasks (POST /task/{task_id}/dependency).
   * Exactly one of depends_on (task is waiting on) or dependency_of (task is
   * blocking) must be provided; the API returns an empty object on success.
   */
  async createDependency(request: CreateDependencyRequest): Promise<{ success: boolean }> {
    const { task_id, depends_on, dependency_of, custom_task_ids, team_id } = request;
    const payload = depends_on ? { depends_on } : { dependency_of };

    await this.post(
      `/task/${task_id}/dependency${this.buildCustomIdQuery({ custom_task_ids, team_id })}`,
      payload
    );
    return { success: true };
  }

  /**
   * Delete a dependency between two tasks (DELETE /task/{task_id}/dependency).
   * Exactly one of depends_on or dependency_of is passed as a query parameter.
   */
  async deleteDependency(request: DeleteDependencyRequest): Promise<{ success: boolean }> {
    const { task_id, depends_on, dependency_of, custom_task_ids, team_id } = request;

    await this.delete(`/task/${task_id}/dependency`, {
      params: { depends_on, dependency_of, custom_task_ids, team_id },
    });
    return { success: true };
  }

  /**
   * Get a task's dependencies and linked tasks. The API has no dependency read
   * endpoint; relationships come from the dependencies/linked_tasks arrays
   * embedded in the Get Task response.
   */
  async getTaskDependencies(request: GetTaskDependenciesRequest): Promise<TaskRelationships> {
    const { task_id, custom_task_ids, team_id } = request;
    const task = await this.get<TaskWithRelationships>(`/task/${task_id}`, {
      custom_task_ids,
      team_id,
    });

    return {
      task_id: task.id ?? task_id,
      dependencies: task.dependencies ?? [],
      linked_tasks: task.linked_tasks ?? [],
    };
  }

  /**
   * Link two tasks together (POST /task/{task_id}/link/{links_to}).
   * Returns the updated task.
   */
  async addTaskLink(request: AddTaskLinkRequest): Promise<Record<string, unknown>> {
    const { task_id, links_to, custom_task_ids, team_id } = request;
    const response = await this.post<{ task?: Record<string, unknown> }>(
      `/task/${task_id}/link/${links_to}${this.buildCustomIdQuery({ custom_task_ids, team_id })}`
    );
    return response.task ?? response;
  }

  /**
   * Remove a link between two tasks (DELETE /task/{task_id}/link/{links_to}).
   * Returns the updated task.
   */
  async deleteTaskLink(request: DeleteTaskLinkRequest): Promise<Record<string, unknown>> {
    const { task_id, links_to, custom_task_ids, team_id } = request;
    const response = await this.delete<{ task?: Record<string, unknown> }>(
      `/task/${task_id}/link/${links_to}`,
      { params: { custom_task_ids, team_id } }
    );
    return response.task ?? response;
  }

  /**
   * Build a dependency graph client-side by breadth-first traversal of Get Task
   * responses (there is no server-side graph endpoint). Nodes beyond the
   * requested depth may appear in edges without being fetched as nodes.
   */
  async getDependencyGraph(options: DependencyGraphOptions): Promise<DependencyGraphResponse> {
    const depth = options.depth ?? 3;
    const nodes = new Map<string, DependencyGraphNode>();
    const edges = new Map<string, DependencyGraphEdge>();
    const visited = new Set<string>();
    let frontier = [options.task_id];

    for (let level = 0; level <= depth && frontier.length > 0; level++) {
      const next: string[] = [];

      for (const taskId of frontier) {
        if (visited.has(taskId)) continue;
        visited.add(taskId);

        let task: TaskWithRelationships;
        try {
          task = await this.get<TaskWithRelationships>(`/task/${taskId}`);
        } catch {
          // Skip tasks that are deleted or inaccessible
          continue;
        }

        nodes.set(task.id, {
          task_id: task.id,
          name: task.name,
          status: task.status?.status,
          url: task.url,
        });

        for (const dep of task.dependencies ?? []) {
          edges.set(`${dep.task_id}->${dep.depends_on}`, {
            task_id: dep.task_id,
            depends_on: dep.depends_on,
            type: dep.type,
          });
          const neighbor = dep.task_id === task.id ? dep.depends_on : dep.task_id;
          if (!visited.has(neighbor)) {
            next.push(neighbor);
          }
        }
      }

      frontier = next;
    }

    const edgeList = Array.from(edges.values());
    const { cycles } = validateDependencyChain(edgeList);

    return {
      root_task_id: options.task_id,
      depth,
      nodes: Array.from(nodes.values()),
      edges: edgeList,
      cycles,
    };
  }

  /**
   * Check for dependency conflicts (cycles and duplicates) client-side by
   * traversing existing dependencies and overlaying any proposed ones.
   */
  async checkDependencyConflicts(
    check: DependencyConflictCheck
  ): Promise<DependencyConflictResponse> {
    const graph = await this.getDependencyGraph({ task_id: check.task_id, depth: 10 });
    const existingKeys = new Set(graph.edges.map(edge => `${edge.task_id}->${edge.depends_on}`));

    const conflicts: DependencyConflictResponse['conflicts'] = [];
    const proposedEdges = (check.proposed_dependencies ?? []).map(proposed =>
      proposed.depends_on
        ? { task_id: check.task_id, depends_on: proposed.depends_on }
        : { task_id: proposed.dependency_of as string, depends_on: check.task_id }
    );

    for (const edge of proposedEdges) {
      if (existingKeys.has(`${edge.task_id}->${edge.depends_on}`)) {
        conflicts.push({
          type: 'duplicate',
          description: `Task ${edge.task_id} already depends on ${edge.depends_on}`,
          affected_tasks: [edge.task_id, edge.depends_on],
        });
      }
    }

    const { cycles } = validateDependencyChain([...graph.edges, ...proposedEdges]);
    for (const cycle of cycles) {
      conflicts.push({
        type: 'circular',
        description: `Circular dependency: ${cycle.join(' -> ')}`,
        affected_tasks: cycle,
      });
    }

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Perform bulk dependency operations client-side by issuing individual
   * create/delete calls (there is no bulk dependency endpoint).
   */
  async bulkDependencyOperations(operation: BulkDependencyOperation): Promise<{
    success: boolean;
    results: Array<{
      task_id: string;
      depends_on?: string;
      dependency_of?: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];

    for (const dependency of operation.dependencies) {
      try {
        if (operation.operation === 'create') {
          await this.createDependency(dependency);
        } else {
          await this.deleteDependency(dependency);
        }
        results.push({ ...dependency, success: true });
      } catch (error: unknown) {
        results.push({
          ...dependency,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: results.every(result => result.success),
      results,
    };
  }
}
