import { ClickUpClient } from './index.js';
import type {
  CreateViewRequest,
  UpdateViewRequest,
  GetViewsFilter,
  SetViewFiltersRequest,
  SetViewGroupingRequest,
  SetViewSortingRequest,
  UpdateViewSettingsRequest,
  ViewSharingRequest,
  ViewFilter,
  ViewGrouping,
  ViewSorting,
  ViewSettings
} from '../schemas/views-schemas.js';

export interface ViewResponse {
  id: string;
  name: string;
  type: string;
  parent: {
    id: string;
    type: string;
  };
  grouping: {
    field: string;
    dir: number;
    collapsed: boolean;
  };
  divide: {
    field: string;
    dir: number;
    collapsed: boolean;
  };
  sorting: {
    fields: Array<{
      field: string;
      dir: number;
    }>;
  };
  filters: {
    op: string;
    fields: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    search: string;
    show_closed: boolean;
  };
  columns: Array<{
    id: string;
    name: string;
    type: string;
    type_config: any;
    date_created: string;
    hide_from_guests: boolean;
  }>;
  team_sidebar: {
    assignees: any[];
    assigned_comments: boolean;
    unassigned_tasks: boolean;
  };
  settings: {
    show_task_locations: boolean;
    show_subtasks: number;
    show_subtask_parent_names: boolean;
    show_closed_subtasks: boolean;
    show_assignees: boolean;
    show_images: boolean;
    collapse_empty_columns: boolean;
    show_task_description: boolean;
    show_task_checklists: boolean;
    show_task_attachments: boolean;
  };
  creator: number;
  date_created: string;
  date_protected: string;
  orderindex: string;
  protected: boolean;
  override_statuses: boolean;
  required_custom_fields: any[];
  visibility: {
    access: string;
    password_protected: boolean;
    password: string;
    expires: string;
  };
}

export interface ViewListResponse {
  views: ViewResponse[];
}

export class ViewsEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Create a new view
   */
  async createView(request: CreateViewRequest): Promise<ViewResponse> {
    const endpoint = this.getParentEndpoint(request.parent_type, request.parent_id);
    
    const payload = {
      name: request.name,
      type: request.type,
      parent: {
        id: request.parent_id,
        type: request.parent_type
      },
      grouping: request.grouping ? this.formatGrouping(request.grouping) : undefined,
      sorting: request.sorting ? this.formatSorting(request.sorting) : undefined,
      filters: request.filters ? this.formatFilters(request.filters) : undefined,
      settings: request.settings || {},
      visibility: {
        access: request.access || 'private'
      },
      description: request.description
    };

    const response = await this.post<{ view: ViewResponse }>(`${endpoint}/view`, payload);
    return response.view;
  }

  /**
   * Get views for a parent (space, folder, or list)
   */
  async getViews(filter: GetViewsFilter): Promise<ViewListResponse> {
    const endpoint = this.getParentEndpoint(filter.parent_type, filter.parent_id);
    
    const params = new URLSearchParams();
    if (filter.type) params.append('type', filter.type);
    if (filter.access) params.append('access', filter.access);

    const queryString = params.toString();
    const fullEndpoint = `${endpoint}/view${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<ViewListResponse>(fullEndpoint);
    return response;
  }

  /**
   * Get a specific view by ID
   */
  async getView(viewId: string): Promise<ViewResponse> {
    const response = await this.get<{ view: ViewResponse }>(`/view/${viewId}`);
    return response.view;
  }

  /**
   * Update an existing view
   */
  async updateView(request: UpdateViewRequest): Promise<ViewResponse> {
    const updateData: Record<string, any> = {};
    
    if (request.name) updateData.name = request.name;
    if (request.access) updateData.visibility = { access: request.access };
    if (request.grouping) updateData.grouping = this.formatGrouping(request.grouping);
    if (request.sorting) updateData.sorting = this.formatSorting(request.sorting);
    if (request.filters) updateData.filters = this.formatFilters(request.filters);
    if (request.settings) updateData.settings = request.settings;
    if (request.description) updateData.description = request.description;

    const response = await this.put<{ view: ViewResponse }>(`/view/${request.view_id}`, updateData);
    return response.view;
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<{ success: boolean }> {
    await this.delete(`/view/${viewId}`);
    return { success: true };
  }

  /**
   * Set view filters
   */
  async setViewFilters(request: SetViewFiltersRequest): Promise<ViewResponse> {
    const payload = {
      filters: this.formatFilters(request.filters)
    };

    const response = await this.put<{ view: ViewResponse }>(`/view/${request.view_id}`, payload);
    return response.view;
  }

  /**
   * Set view grouping
   */
  async setViewGrouping(request: SetViewGroupingRequest): Promise<ViewResponse> {
    const payload = {
      grouping: this.formatGrouping(request.grouping)
    };

    const response = await this.put<{ view: ViewResponse }>(`/view/${request.view_id}`, payload);
    return response.view;
  }

  /**
   * Set view sorting
   */
  async setViewSorting(request: SetViewSortingRequest): Promise<ViewResponse> {
    const payload = {
      sorting: this.formatSorting(request.sorting)
    };

    const response = await this.put<{ view: ViewResponse }>(`/view/${request.view_id}`, payload);
    return response.view;
  }

  /**
   * Update view settings
   */
  async updateViewSettings(request: UpdateViewSettingsRequest): Promise<ViewResponse> {
    const payload = {
      settings: request.settings
    };

    const response = await this.put<{ view: ViewResponse }>(`/view/${request.view_id}`, payload);
    return response.view;
  }

  /**
   * Update view sharing settings
   */
  async updateViewSharing(request: ViewSharingRequest): Promise<ViewResponse> {
    const payload = {
      visibility: {
        access: request.access,
        password_protected: !!request.password,
        password: request.password,
        expires: request.expires_at ? new Date(request.expires_at * 1000).toISOString() : undefined
      }
    };

    const response = await this.put<{ view: ViewResponse }>(`/view/${request.view_id}`, payload);
    return response.view;
  }

  /**
   * Get view tasks (tasks visible in the view)
   */
  async getViewTasks(viewId: string, page?: number): Promise<{
    tasks: any[];
    last_page: boolean;
  }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());

    const queryString = params.toString();
    const endpoint = `/view/${viewId}/task${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.get<{
      tasks: any[];
      last_page: boolean;
    }>(endpoint);
    
    return response;
  }

  /**
   * Duplicate a view
   */
  async duplicateView(viewId: string, name: string): Promise<ViewResponse> {
    const payload = {
      name: name
    };

    const response = await this.post<{ view: ViewResponse }>(`/view/${viewId}/duplicate`, payload);
    return response.view;
  }

  // Helper methods

  private getParentEndpoint(parentType: string, parentId: string): string {
    switch (parentType) {
      case 'space':
        return `/space/${parentId}`;
      case 'folder':
        return `/folder/${parentId}`;
      case 'list':
        return `/list/${parentId}`;
      default:
        throw new Error(`Invalid parent type: ${parentType}`);
    }
  }

  private formatGrouping(grouping: ViewGrouping[]): any {
    if (grouping.length === 0) return {};
    
    const primary = grouping[0];
    return {
      field: primary.field,
      dir: primary.order === 'asc' ? 1 : -1,
      collapsed: primary.collapsed
    };
  }

  private formatSorting(sorting: ViewSorting[]): any {
    return {
      fields: sorting.map(sort => ({
        field: sort.field,
        dir: sort.order === 'asc' ? 1 : -1
      }))
    };
  }

  private formatFilters(filters: ViewFilter[]): any {
    return {
      op: 'AND',
      fields: filters.map(filter => ({
        field: filter.field,
        operator: filter.operator,
        value: filter.value || filter.values
      })),
      search: '',
      show_closed: false
    };
  }

  /**
   * Get available view fields for a parent
   */
  async getViewFields(parentType: string, parentId: string): Promise<{
    fields: Array<{
      id: string;
      name: string;
      type: string;
      type_config: any;
    }>;
  }> {
    const endpoint = this.getParentEndpoint(parentType, parentId);
    const response = await this.get<{
      fields: Array<{
        id: string;
        name: string;
        type: string;
        type_config: any;
      }>;
    }>(`${endpoint}/field`);
    
    return response;
  }
}
