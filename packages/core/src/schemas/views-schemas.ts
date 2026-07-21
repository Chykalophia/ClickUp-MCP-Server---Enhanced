import { z } from 'zod';

// Base view types that can be created via the public API.
// Note: the API token for Chat views is 'conversation'; 'chat' is accepted
// as an input alias and normalized before sending. Form and Embed views
// cannot be created via the public API.
export const ViewTypeSchema = z.enum([
  'list',
  'board',
  'calendar',
  'table',
  'timeline',
  'workload',
  'activity',
  'map',
  'conversation',
  'gantt',
  'chat', // alias for 'conversation'
]);

// Normalize input aliases to the API's actual view type tokens
export const normalizeViewType = (type: ViewType): string =>
  type === 'chat' ? 'conversation' : type;

// Parent containers that support views (team = Workspace / 'Everything' level)
export const ViewParentTypeSchema = z.enum(['team', 'space', 'folder', 'list']);

// Filter operators (ClickUp API operator tokens)
export const FilterOperatorSchema = z.enum([
  'EQ',
  'NOT',
  'ANY',
  'NOT ANY',
  'ALL',
  'NOT ALL',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IS NULL',
  'IS NOT NULL',
  'RANGE',
]);

// View filter condition schema: {field, op, values}
export const ViewFilterSchema = z.object({
  field: z.string(),
  op: FilterOperatorSchema,
  values: z.array(z.union([z.string(), z.number()])).default([]),
});

// View grouping schema (a view has a single grouping configuration)
export const ViewGroupingSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
  collapsed: z.array(z.string()).optional(), // IDs of collapsed groups
  ignore: z.boolean().optional(),
});

// View divide (board swimlane) schema
export const ViewDivideSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
  collapsed: z.array(z.string()).optional(), // IDs of collapsed divisions
});

// View sorting schema
export const ViewSortingSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// View column schema (table/list views)
export const ViewColumnSchema = z.object({
  field: z.string(),
  hidden: z.boolean().optional(),
  width: z.number().int().optional(),
});

// Team sidebar schema
export const TeamSidebarSchema = z.object({
  assignees: z.array(z.union([z.string(), z.number()])).optional(),
  assigned_comments: z.boolean().optional(),
  unassigned_tasks: z.boolean().optional(),
});

// View display settings (the documented API 'settings' object)
export const ViewSettingsSchema = z.object({
  show_task_locations: z.boolean().optional(),
  show_subtasks: z.number().int().optional(), // subtask display mode
  show_subtask_parent_names: z.boolean().optional(),
  show_closed_subtasks: z.boolean().optional(),
  show_assignees: z.boolean().optional(),
  show_images: z.boolean().optional(),
  collapse_empty_columns: z.union([z.boolean(), z.string()]).nullable().optional(),
  me_comments: z.boolean().optional(),
  me_subtasks: z.boolean().optional(),
  me_checklists: z.boolean().optional(),
});

// Create view schema
export const CreateViewSchema = z.object({
  parent_id: z.string(),
  parent_type: ViewParentTypeSchema,
  name: z.string().min(1),
  type: ViewTypeSchema,
  filters: z.array(ViewFilterSchema).optional(),
  grouping: ViewGroupingSchema.optional(),
  divide: ViewDivideSchema.optional(),
  sorting: z.array(ViewSortingSchema).optional(),
  columns: z.array(ViewColumnSchema).optional(),
  team_sidebar: TeamSidebarSchema.optional(),
  settings: ViewSettingsSchema.optional(),
});

// Update view schema
export const UpdateViewSchema = z.object({
  view_id: z.string(),
  name: z.string().optional(),
  type: ViewTypeSchema.optional(),
  filters: z.array(ViewFilterSchema).optional(),
  grouping: ViewGroupingSchema.optional(),
  divide: ViewDivideSchema.optional(),
  sorting: z.array(ViewSortingSchema).optional(),
  columns: z.array(ViewColumnSchema).optional(),
  team_sidebar: TeamSidebarSchema.optional(),
  settings: ViewSettingsSchema.optional(),
});

// Get views filter schema (the API has no query params; type is filtered client-side)
export const GetViewsFilterSchema = z.object({
  parent_id: z.string(),
  parent_type: ViewParentTypeSchema,
  type: ViewTypeSchema.optional(),
});

// Set view filters schema
export const SetViewFiltersSchema = z.object({
  view_id: z.string(),
  filters: z.array(ViewFilterSchema),
});

// Set view grouping schema
export const SetViewGroupingSchema = z.object({
  view_id: z.string(),
  grouping: ViewGroupingSchema,
});

// Set view sorting schema
export const SetViewSortingSchema = z.object({
  view_id: z.string(),
  sorting: z.array(ViewSortingSchema),
});

// Update view settings schema
export const UpdateViewSettingsSchema = z.object({
  view_id: z.string(),
  settings: ViewSettingsSchema,
});

// Duplicate view schema (client-side duplication: GET view + POST to parent)
export const DuplicateViewSchema = z.object({
  view_id: z.string(),
  name: z.string().min(1),
  parent_id: z.string(),
  parent_type: ViewParentTypeSchema,
});

// Type exports
export type ViewType = z.infer<typeof ViewTypeSchema>;
export type ViewParentType = z.infer<typeof ViewParentTypeSchema>;
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;
export type ViewFilter = z.infer<typeof ViewFilterSchema>;
export type ViewGrouping = z.infer<typeof ViewGroupingSchema>;
export type ViewDivide = z.infer<typeof ViewDivideSchema>;
export type ViewSorting = z.infer<typeof ViewSortingSchema>;
export type ViewColumn = z.infer<typeof ViewColumnSchema>;
export type TeamSidebar = z.infer<typeof TeamSidebarSchema>;
export type ViewSettings = z.infer<typeof ViewSettingsSchema>;
export type CreateViewRequest = z.infer<typeof CreateViewSchema>;
export type UpdateViewRequest = z.infer<typeof UpdateViewSchema>;
export type GetViewsFilter = z.infer<typeof GetViewsFilterSchema>;
export type SetViewFiltersRequest = z.infer<typeof SetViewFiltersSchema>;
export type SetViewGroupingRequest = z.infer<typeof SetViewGroupingSchema>;
export type SetViewSortingRequest = z.infer<typeof SetViewSortingSchema>;
export type UpdateViewSettingsRequest = z.infer<typeof UpdateViewSettingsSchema>;
export type DuplicateViewRequest = z.infer<typeof DuplicateViewSchema>;
