import { z } from 'zod';

// Base view types
export const ViewTypeSchema = z.enum([
  'list',
  'board',
  'calendar',
  'gantt',
  'timeline',
  'table',
  'form',
  'chat',
  'workload',
  'activity',
  'map',
  'embed'
]);

// View access levels
export const ViewAccessSchema = z.enum([
  'private',
  'shared',
  'public'
]);

// Filter operators
export const FilterOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'between',
  'not_between',
  'in',
  'not_in',
  'is_set',
  'is_not_set'
]);

// View filter schema
export const ViewFilterSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]).optional(),
  values: z.array(z.union([z.string(), z.number()])).optional()
});

// View grouping schema
export const ViewGroupingSchema = z.object({
  field: z.string(),
  collapsed: z.boolean().default(false),
  order: z.enum(['asc', 'desc']).default('asc')
});

// View sorting schema
export const ViewSortingSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc')
});

// Board view specific settings
export const BoardViewSettingsSchema = z.object({
  columns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    orderindex: z.number().optional()
  })).optional(),
  swimlanes: z.object({
    field: z.string(),
    collapsed: z.boolean().default(false)
  }).optional(),
  card_size: z.enum(['small', 'medium', 'large']).default('medium')
});

// Calendar view specific settings
export const CalendarViewSettingsSchema = z.object({
  date_field: z.string(),
  view_mode: z.enum(['month', 'week', 'day']).default('month'),
  show_weekends: z.boolean().default(true),
  start_day: z.enum(['sunday', 'monday']).default('sunday')
});

// Gantt view specific settings
export const GanttViewSettingsSchema = z.object({
  start_date_field: z.string(),
  due_date_field: z.string(),
  show_dependencies: z.boolean().default(true),
  show_critical_path: z.boolean().default(false),
  zoom_level: z.enum(['hours', 'days', 'weeks', 'months']).default('days')
});

// Table view specific settings
export const TableViewSettingsSchema = z.object({
  columns: z.array(z.object({
    field: z.string(),
    width: z.number().optional(),
    visible: z.boolean().default(true),
    orderindex: z.number().optional()
  })),
  row_height: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable')
});

// View settings union
export const ViewSettingsSchema = z.union([
  BoardViewSettingsSchema,
  CalendarViewSettingsSchema,
  GanttViewSettingsSchema,
  TableViewSettingsSchema,
  z.object({}) // For other view types without specific settings
]);

// Create view schema
export const CreateViewSchema = z.object({
  parent_id: z.string(),
  parent_type: z.enum(['space', 'folder', 'list']),
  name: z.string().min(1),
  type: ViewTypeSchema,
  access: ViewAccessSchema.default('private'),
  filters: z.array(ViewFilterSchema).optional(),
  grouping: z.array(ViewGroupingSchema).optional(),
  sorting: z.array(ViewSortingSchema).optional(),
  settings: ViewSettingsSchema.optional(),
  description: z.string().optional()
});

// Update view schema
export const UpdateViewSchema = z.object({
  view_id: z.string(),
  name: z.string().optional(),
  access: ViewAccessSchema.optional(),
  filters: z.array(ViewFilterSchema).optional(),
  grouping: z.array(ViewGroupingSchema).optional(),
  sorting: z.array(ViewSortingSchema).optional(),
  settings: ViewSettingsSchema.optional(),
  description: z.string().optional()
});

// Get views filter schema
export const GetViewsFilterSchema = z.object({
  parent_id: z.string(),
  parent_type: z.enum(['space', 'folder', 'list']),
  type: ViewTypeSchema.optional(),
  access: ViewAccessSchema.optional()
});

// Set view filters schema
export const SetViewFiltersSchema = z.object({
  view_id: z.string(),
  filters: z.array(ViewFilterSchema)
});

// Set view grouping schema
export const SetViewGroupingSchema = z.object({
  view_id: z.string(),
  grouping: z.array(ViewGroupingSchema)
});

// Set view sorting schema
export const SetViewSortingSchema = z.object({
  view_id: z.string(),
  sorting: z.array(ViewSortingSchema)
});

// Update view settings schema
export const UpdateViewSettingsSchema = z.object({
  view_id: z.string(),
  settings: ViewSettingsSchema
});

// View sharing schema
export const ViewSharingSchema = z.object({
  view_id: z.string(),
  access: ViewAccessSchema,
  password: z.string().optional(),
  expires_at: z.number().optional() // Unix timestamp
});

// Type exports
export type ViewType = z.infer<typeof ViewTypeSchema>;
export type ViewAccess = z.infer<typeof ViewAccessSchema>;
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;
export type ViewFilter = z.infer<typeof ViewFilterSchema>;
export type ViewGrouping = z.infer<typeof ViewGroupingSchema>;
export type ViewSorting = z.infer<typeof ViewSortingSchema>;
export type BoardViewSettings = z.infer<typeof BoardViewSettingsSchema>;
export type CalendarViewSettings = z.infer<typeof CalendarViewSettingsSchema>;
export type GanttViewSettings = z.infer<typeof GanttViewSettingsSchema>;
export type TableViewSettings = z.infer<typeof TableViewSettingsSchema>;
export type ViewSettings = z.infer<typeof ViewSettingsSchema>;
export type CreateViewRequest = z.infer<typeof CreateViewSchema>;
export type UpdateViewRequest = z.infer<typeof UpdateViewSchema>;
export type GetViewsFilter = z.infer<typeof GetViewsFilterSchema>;
export type SetViewFiltersRequest = z.infer<typeof SetViewFiltersSchema>;
export type SetViewGroupingRequest = z.infer<typeof SetViewGroupingSchema>;
export type SetViewSortingRequest = z.infer<typeof SetViewSortingSchema>;
export type UpdateViewSettingsRequest = z.infer<typeof UpdateViewSettingsSchema>;
export type ViewSharingRequest = z.infer<typeof ViewSharingSchema>;

// Utility functions
export const createDefaultBoardSettings = (): BoardViewSettings => ({
  card_size: 'medium'
});

export const createDefaultCalendarSettings = (dateField: string): CalendarViewSettings => ({
  date_field: dateField,
  view_mode: 'month',
  show_weekends: true,
  start_day: 'sunday'
});

export const createDefaultGanttSettings = (startField: string, dueField: string): GanttViewSettings => ({
  start_date_field: startField,
  due_date_field: dueField,
  show_dependencies: true,
  show_critical_path: false,
  zoom_level: 'days'
});

export const createDefaultTableSettings = (fields: string[]): TableViewSettings => ({
  columns: fields.map((field, index) => ({
    field,
    visible: true,
    orderindex: index
  })),
  row_height: 'comfortable'
});

// Filter validation helpers
export const validateFilterValue = (operator: FilterOperator, value: any): boolean => {
  switch (operator) {
  case 'between':
  case 'not_between':
    return Array.isArray(value) && value.length === 2;
  case 'in':
  case 'not_in':
    return Array.isArray(value);
  case 'is_empty':
  case 'is_not_empty':
  case 'is_set':
  case 'is_not_set':
    return value === undefined;
  default:
    return value !== undefined;
  }
};

export const getRequiredFilterFields = (viewType: ViewType): string[] => {
  switch (viewType) {
  case 'calendar':
    return ['date_field'];
  case 'gantt':
  case 'timeline':
    return ['start_date_field', 'due_date_field'];
  default:
    return [];
  }
};
