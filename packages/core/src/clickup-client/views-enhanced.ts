import { ClickUpClient } from './index.js';
import { validateResponse, ViewsResponseSchema, ViewResponseSchema, TasksResponseSchema } from '../schemas/response-schemas.js';
import { normalizeViewType } from '../schemas/views-schemas.js';
import type {
  CreateViewRequest,
  UpdateViewRequest,
  GetViewsFilter,
  SetViewFiltersRequest,
  SetViewGroupingRequest,
  SetViewSortingRequest,
  UpdateViewSettingsRequest,
  DuplicateViewRequest,
  ViewFilter,
  ViewGrouping,
  ViewDivide,
  ViewSorting,
  ViewColumn
} from '../schemas/views-schemas.js';

export interface ViewResponse {
  id: string;
  name: string;
  type: string;
  parent: {
    id: string;
    type: number;
  };
  grouping: {
    field: string;
    dir: number;
    collapsed: string[];
    ignore: boolean;
  };
  divide: {
    field: string | null;
    dir: number | null;
    collapsed: string[] | null;
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
      op: string;
      values: any[];
    }>;
    search: string;
    show_closed: boolean;
  };
  columns: {
    fields: Array<{
      field: string;
      hidden?: boolean;
      width?: number;
    }>;
  };
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
    collapse_empty_columns: any;
    me_comments: boolean;
    me_subtasks: boolean;
    me_checklists: boolean;
  };
  creator: number;
  date_created: string;
  orderindex: number;
  protected: boolean;
  visibility: string;
}

export interface ViewListResponse {
  views: ViewResponse[];
}

export class ViewsEnhancedClient extends ClickUpClient {
  constructor(apiToken: string) {
    super({ apiToken });
  }

  /**
   * Create a new view.
   * The API accepts only name, type, and the optional grouping/divide/sorting/
   * filters/columns/team_sidebar/settings objects; the parent is derived from
   * the URL path.
   */
  async createView(request: CreateViewRequest): Promise<ViewResponse> {
    const endpoint = this.getParentEndpoint(request.parent_type, request.parent_id);

    const payload = {
      name: request.name,
      type: normalizeViewType(request.type),
      grouping: request.grouping ? this.formatGrouping(request.grouping) : undefined,
      divide: request.divide ? this.formatDivide(request.divide) : undefined,
      sorting: request.sorting ? this.formatSorting(request.sorting) : undefined,
      filters: request.filters ? this.formatFilters(request.filters) : undefined,
      columns: request.columns ? this.formatColumns(request.columns) : undefined,
      team_sidebar: request.team_sidebar,
      settings: request.settings
    };

    const response = await this.post<{ view: ViewResponse }>(`${endpoint}/view`, payload);
    return response.view;
  }

  /**
   * Get views for a parent (team/Workspace, space, folder, or list).
   * The Get Views endpoints accept no query parameters, so any type filter
   * is applied client-side.
   */
  async getViews(filter: GetViewsFilter): Promise<ViewListResponse> {
    const endpoint = this.getParentEndpoint(filter.parent_type, filter.parent_id);

    const response = await this.get<unknown>(`${endpoint}/view`);
    const validated = validateResponse(ViewsResponseSchema, response, 'getViews');
    const result = validated as unknown as ViewListResponse;

    if (filter.type) {
      const wantedType = normalizeViewType(filter.type);
      return { ...result, views: result.views.filter(view => view.type === wantedType) };
    }

    return result;
  }

  /**
   * Get a specific view by ID
   */
  async getView(viewId: string): Promise<ViewResponse> {
    const response = await this.get<unknown>(`/view/${viewId}`);
    const validated = validateResponse(ViewResponseSchema, response, 'getView');
    return validated.view as unknown as ViewResponse;
  }

  /**
   * Update an existing view.
   * The Update View endpoint requires the FULL view object, so the current
   * view is fetched, the requested changes are merged in, and the complete
   * body is PUT back.
   */
  async updateView(request: UpdateViewRequest): Promise<ViewResponse> {
    return this.putFullView(request.view_id, current => ({
      ...(request.name !== undefined && { name: request.name }),
      ...(request.type !== undefined && { type: normalizeViewType(request.type) }),
      ...(request.grouping && { grouping: this.formatGrouping(request.grouping) }),
      ...(request.divide && { divide: this.formatDivide(request.divide) }),
      ...(request.sorting && { sorting: this.formatSorting(request.sorting) }),
      ...(request.filters && { filters: this.formatFilters(request.filters) }),
      ...(request.columns && { columns: this.formatColumns(request.columns) }),
      ...(request.team_sidebar && { team_sidebar: request.team_sidebar }),
      ...(request.settings && { settings: { ...current.settings, ...request.settings } })
    }));
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<{ success: boolean }> {
    await this.delete(`/view/${viewId}`);
    return { success: true };
  }

  /**
   * Set view filters (fetches the view and PUTs the full merged object)
   */
  async setViewFilters(request: SetViewFiltersRequest): Promise<ViewResponse> {
    return this.putFullView(request.view_id, () => ({
      filters: this.formatFilters(request.filters)
    }));
  }

  /**
   * Set view grouping (fetches the view and PUTs the full merged object)
   */
  async setViewGrouping(request: SetViewGroupingRequest): Promise<ViewResponse> {
    return this.putFullView(request.view_id, () => ({
      grouping: this.formatGrouping(request.grouping)
    }));
  }

  /**
   * Set view sorting (fetches the view and PUTs the full merged object)
   */
  async setViewSorting(request: SetViewSortingRequest): Promise<ViewResponse> {
    return this.putFullView(request.view_id, () => ({
      sorting: this.formatSorting(request.sorting)
    }));
  }

  /**
   * Update view settings (fetches the view and PUTs the full merged object)
   */
  async updateViewSettings(request: UpdateViewSettingsRequest): Promise<ViewResponse> {
    return this.putFullView(request.view_id, current => ({
      settings: { ...current.settings, ...request.settings }
    }));
  }

  /**
   * Get view tasks (tasks visible in the view).
   * Pagination is 0-indexed and the page parameter is always sent.
   */
  async getViewTasks(
    viewId: string,
    page = 0
  ): Promise<{
    tasks: any[];
    last_page: boolean;
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());

    const endpoint = `/view/${viewId}/task?${params.toString()}`;

    const response = await this.get<unknown>(endpoint);
    const validated = validateResponse(TasksResponseSchema, response, 'getViewTasks');

    return validated as unknown as { tasks: any[]; last_page: boolean };
  }

  /**
   * Duplicate a view.
   * The API has no duplicate endpoint, so this is implemented client-side:
   * GET the source view, strip identifying fields, and POST the view
   * configuration to the destination parent's create-view endpoint.
   */
  async duplicateView(request: DuplicateViewRequest): Promise<ViewResponse> {
    const source = await this.getView(request.view_id);

    // Views of types the Create View endpoint does not accept (e.g. form,
    // embed, doc) cannot be duplicated via the API.
    const creatableTypes = [
      'list', 'board', 'calendar', 'table', 'timeline',
      'workload', 'activity', 'map', 'chat', 'conversation', 'gantt'
    ];
    if (!creatableTypes.includes(source.type)) {
      throw new Error(
        `Views of type '${source.type}' cannot be duplicated via the ClickUp API`
      );
    }

    const endpoint = this.getParentEndpoint(request.parent_type, request.parent_id);

    // Copy only the view configuration; ids, creator, dates, and parent are
    // stripped by construction.
    const payload = {
      name: request.name,
      type: source.type,
      grouping: source.grouping,
      divide: source.divide,
      sorting: source.sorting,
      filters: source.filters,
      columns: source.columns,
      team_sidebar: source.team_sidebar,
      settings: source.settings
    };

    const response = await this.post<{ view: ViewResponse }>(`${endpoint}/view`, payload);
    return response.view;
  }

  // Helper methods

  private getParentEndpoint(parentType: string, parentId: string): string {
    switch (parentType) {
    case 'team':
      return `/team/${parentId}`;
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

  /**
   * Update View requires the complete view object: GET the current view,
   * merge the overrides, and PUT the full body back.
   */
  private async putFullView(
    viewId: string,
    makeOverrides: (_current: ViewResponse) => Record<string, any>
  ): Promise<ViewResponse> {
    const current = await this.getView(viewId);

    const body = {
      name: current.name,
      type: current.type,
      parent: current.parent,
      grouping: current.grouping,
      divide: current.divide,
      sorting: current.sorting,
      filters: current.filters,
      columns: current.columns,
      team_sidebar: current.team_sidebar,
      settings: current.settings,
      ...makeOverrides(current)
    };

    const response = await this.put<{ view: ViewResponse }>(`/view/${viewId}`, body);
    return response.view;
  }

  private formatGrouping(grouping: ViewGrouping): any {
    return {
      field: grouping.field,
      dir: grouping.order === 'asc' ? 1 : -1,
      collapsed: grouping.collapsed ?? [],
      ignore: grouping.ignore ?? false
    };
  }

  private formatDivide(divide: ViewDivide): any {
    return {
      field: divide.field,
      dir: divide.order === 'asc' ? 1 : -1,
      collapsed: divide.collapsed ?? []
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
        op: filter.op,
        values: filter.values ?? []
      })),
      search: '',
      show_closed: false
    };
  }

  private formatColumns(columns: ViewColumn[]): any {
    return {
      fields: columns.map(column => ({
        field: column.field,
        ...(column.hidden !== undefined && { hidden: column.hidden }),
        ...(column.width !== undefined && { width: column.width })
      }))
    };
  }

  /**
   * Get accessible Custom Fields for a parent (team, space, folder, or list).
   * Note: this is ClickUp's Get Accessible Custom Fields endpoint — it
   * returns Custom Fields only, not built-in view fields such as status,
   * assignee, dueDate, or priority.
   */
  async getViewFields(
    parentType: string,
    parentId: string
  ): Promise<{
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
