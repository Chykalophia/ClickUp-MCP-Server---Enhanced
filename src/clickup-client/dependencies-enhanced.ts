import { ClickUpClient } from './index.js';
import type {
  CreateDependencyRequest,
  UpdateDependencyRequest,
  GetDependenciesFilter,
  DependencyGraphOptions,
  DependencyConflictCheck,
  BulkDependencyOperation,
  DependencyResponse,
  DependencyListResponse,
  DependencyGraphResponse,
  DependencyConflictResponse,
  DependencyGraphNode
} from '../schemas/dependencies-schemas.js';

export class DependenciesEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Create a new dependency between tasks
   */
  async createDependency(request: CreateDependencyRequest): Promise<DependencyResponse> {
    const payload = {
      depends_on: request.depends_on,
      type: request.type,
      link_id: request.link_id
    };

    const response = await this.post<{ dependency: DependencyResponse }>(
      `/task/${request.task_id}/dependency`,
      payload
    );
    return response.dependency;
  }

  /**
   * Get dependencies for a task
   */
  async getTaskDependencies(filter: GetDependenciesFilter): Promise<DependencyListResponse> {
    const params = new URLSearchParams();
    if (filter.type) params.append('type', filter.type);
    if (filter.status) params.append('status', filter.status);
    if (filter.include_resolved) params.append('include_resolved', 'true');

    const queryString = params.toString();
    const endpoint = `/task/${filter.task_id}/dependency${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<DependencyListResponse>(endpoint);
    return response;
  }

  /**
   * Update an existing dependency
   */
  async updateDependency(request: UpdateDependencyRequest): Promise<DependencyResponse> {
    const updateData: Record<string, any> = {};
    
    if (request.type) updateData.type = request.type;
    if (request.status) updateData.status = request.status;

    const response = await this.put<{ dependency: DependencyResponse }>(
      `/dependency/${request.dependency_id}`,
      updateData
    );
    return response.dependency;
  }

  /**
   * Delete a dependency
   */
  async deleteDependency(dependencyId: string): Promise<{ success: boolean }> {
    await this.delete(`/dependency/${dependencyId}`);
    return { success: true };
  }

  /**
   * Get dependency graph for a task
   */
  async getDependencyGraph(options: DependencyGraphOptions): Promise<DependencyGraphResponse> {
    const params = new URLSearchParams();
    params.append('depth', options.depth.toString());
    params.append('direction', options.direction);
    if (options.include_resolved) params.append('include_resolved', 'true');
    if (options.include_broken) params.append('include_broken', 'true');

    const queryString = params.toString();
    const endpoint = `/task/${options.task_id}/dependency/graph?${queryString}`;
    
    const response = await this.get<DependencyGraphResponse>(endpoint);
    return response;
  }

  /**
   * Check for dependency conflicts
   */
  async checkDependencyConflicts(check: DependencyConflictCheck): Promise<DependencyConflictResponse> {
    const payload = {
      proposed_dependencies: check.proposed_dependencies || []
    };

    const response = await this.post<DependencyConflictResponse>(
      `/task/${check.task_id}/dependency/conflicts`,
      payload
    );
    return response;
  }

  /**
   * Perform bulk dependency operations
   */
  async bulkDependencyOperations(operation: BulkDependencyOperation): Promise<{
    success: boolean;
    results: Array<{
      success: boolean;
      dependency?: DependencyResponse;
      error?: string;
    }>;
  }> {
    const response = await this.post<{
      success: boolean;
      results: Array<{
        success: boolean;
        dependency?: DependencyResponse;
        error?: string;
      }>;
    }>('/dependency/bulk', operation);
    
    return response;
  }

  /**
   * Get all dependencies in a workspace
   */
  async getWorkspaceDependencies(workspaceId: string, options?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<DependencyListResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/team/${workspaceId}/dependency${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<DependencyListResponse>(endpoint);
    return response;
  }

  /**
   * Get dependency statistics for a workspace
   */
  async getDependencyStats(workspaceId: string): Promise<{
    total_dependencies: number;
    active_dependencies: number;
    resolved_dependencies: number;
    broken_dependencies: number;
    circular_dependencies: number;
    most_dependent_tasks: Array<{
      task_id: string;
      task_name: string;
      dependency_count: number;
    }>;
    most_blocking_tasks: Array<{
      task_id: string;
      task_name: string;
      blocking_count: number;
    }>;
  }> {
    const response = await this.get<{
      total_dependencies: number;
      active_dependencies: number;
      resolved_dependencies: number;
      broken_dependencies: number;
      circular_dependencies: number;
      most_dependent_tasks: Array<{
        task_id: string;
        task_name: string;
        dependency_count: number;
      }>;
      most_blocking_tasks: Array<{
        task_id: string;
        task_name: string;
        blocking_count: number;
      }>;
    }>(`/team/${workspaceId}/dependency/stats`);
    
    return response;
  }

  /**
   * Resolve dependency conflicts automatically
   */
  async resolveDependencyConflicts(taskId: string, resolution: {
    break_cycles?: boolean;
    remove_duplicates?: boolean;
    update_invalid_statuses?: boolean;
  }): Promise<{
    success: boolean;
    resolved_conflicts: number;
    remaining_conflicts: number;
    actions_taken: Array<{
      action: string;
      description: string;
      affected_dependencies: string[];
    }>;
  }> {
    const response = await this.post<{
      success: boolean;
      resolved_conflicts: number;
      remaining_conflicts: number;
      actions_taken: Array<{
        action: string;
        description: string;
        affected_dependencies: string[];
      }>;
    }>(`/task/${taskId}/dependency/resolve`, resolution);
    
    return response;
  }

  /**
   * Get dependency timeline impact
   */
  async getDependencyTimelineImpact(taskId: string): Promise<{
    task_id: string;
    current_timeline: {
      start_date?: string;
      due_date?: string;
      estimated_duration_days: number;
    };
    dependency_impact: {
      earliest_start_date?: string;
      latest_due_date?: string;
      critical_path_duration_days: number;
      buffer_days: number;
    };
    blocking_tasks: Array<{
      task_id: string;
      task_name: string;
      delay_days: number;
    }>;
    dependent_tasks: Array<{
      task_id: string;
      task_name: string;
      affected_start_date?: string;
    }>;
  }> {
    const response = await this.get<{
      task_id: string;
      current_timeline: {
        start_date?: string;
        due_date?: string;
        estimated_duration_days: number;
      };
      dependency_impact: {
        earliest_start_date?: string;
        latest_due_date?: string;
        critical_path_duration_days: number;
        buffer_days: number;
      };
      blocking_tasks: Array<{
        task_id: string;
        task_name: string;
        delay_days: number;
      }>;
      dependent_tasks: Array<{
        task_id: string;
        task_name: string;
        affected_start_date?: string;
      }>;
    }>(`/task/${taskId}/dependency/timeline`);
    
    return response;
  }

  /**
   * Export dependency graph
   */
  async exportDependencyGraph(taskId: string, format: 'json' | 'csv' | 'graphml' = 'json'): Promise<{
    format: string;
    data: string;
    download_url?: string;
  }> {
    const params = new URLSearchParams();
    params.append('format', format);

    const response = await this.get<{
      format: string;
      data: string;
      download_url?: string;
    }>(`/task/${taskId}/dependency/export?${params.toString()}`);
    
    return response;
  }

  /**
   * Import dependency graph
   */
  async importDependencyGraph(workspaceId: string, data: {
    format: 'json' | 'csv';
    data: string;
    options?: {
      merge_existing?: boolean;
      validate_tasks?: boolean;
      create_missing_tasks?: boolean;
    };
  }): Promise<{
    success: boolean;
    imported_dependencies: number;
    skipped_dependencies: number;
    errors: Array<{
      line_number?: number;
      error: string;
      data?: any;
    }>;
  }> {
    const response = await this.post<{
      success: boolean;
      imported_dependencies: number;
      skipped_dependencies: number;
      errors: Array<{
        line_number?: number;
        error: string;
        data?: any;
      }>;
    }>(`/team/${workspaceId}/dependency/import`, data);
    
    return response;
  }
}
