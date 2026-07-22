/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiToken } from '../clickup-client/index.js';
import { ViewsEnhancedClient } from '../clickup-client/views-enhanced.js';
import {
  CreateViewSchema,
  UpdateViewSchema,
  GetViewsFilterSchema,
  SetViewFiltersSchema,
  SetViewGroupingSchema,
  SetViewSortingSchema,
  UpdateViewSettingsSchema,
  DuplicateViewSchema,
  ViewTypeSchema,
  ViewParentTypeSchema,
  ViewFilterSchema,
  ViewGroupingSchema,
  ViewDivideSchema,
  ViewSortingSchema,
  ViewColumnSchema,
  TeamSidebarSchema,
  ViewSettingsSchema,
} from '../schemas/views-schemas.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const viewsClient = new ViewsEnhancedClient(getApiToken());

export function setupViewsTools(server: McpServer): void {
  // ========================================
  // VIEW MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_create_view',
    'Create a new view in a ClickUp Workspace (team), space, folder, or list. Supports the API view types: list, board, calendar, table, timeline, workload, activity, map, conversation (chat), and gantt.',
    {
      parent_id: z.coerce.string().min(1).describe('The ID of the parent (Workspace/team, space, folder, or list)'),
      parent_type: ViewParentTypeSchema.describe('The type of parent container (team = Workspace/Everything level)'),
      name: z.string().min(1).describe('The name of the view'),
      type: ViewTypeSchema.describe('The type of view to create'),
      filters: z.array(ViewFilterSchema).optional().describe('Initial filter conditions ({field, op, values}) for the view'),
      grouping: ViewGroupingSchema.optional().describe('Grouping configuration for the view'),
      divide: ViewDivideSchema.optional().describe('Divide (board swimlane) configuration for the view'),
      sorting: z.array(ViewSortingSchema).optional().describe('Sorting configuration for the view'),
      columns: z.array(ViewColumnSchema).optional().describe('Column configuration for table and list views'),
      team_sidebar: TeamSidebarSchema.optional().describe('Team sidebar configuration for the view'),
      settings: ViewSettingsSchema.optional().describe('View display settings (show_task_locations, show_subtasks, show_assignees, etc.)'),
    },
    async args => {
      try {
        const request = CreateViewSchema.parse(args);
        const result = await viewsClient.createView(request);

        return {
          content: [
            {
              type: 'text',
              text: `View created successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating view', error);
      }
    }
  );

  server.tool(
    'clickup_get_views',
    'Get all views for a Workspace (team), space, folder, or list. The API returns all views; the optional type filter is applied client-side.',
    {
      parent_id: z.coerce.string().min(1).describe('The ID of the parent (Workspace/team, space, folder, or list)'),
      parent_type: ViewParentTypeSchema.describe('The type of parent container (team = Workspace/Everything level)'),
      type: ViewTypeSchema.optional().describe('Filter views by type (applied client-side)'),
    },
    async args => {
      try {
        const filter = GetViewsFilterSchema.parse(args);
        const result = await viewsClient.getViews(filter);

        return {
          content: [
            {
              type: 'text',
              text: `Views for ${args.parent_type} ${args.parent_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting views', error);
      }
    }
  );

  server.tool(
    'clickup_get_view',
    'Get detailed information about a specific view by its ID.',
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to get'),
    },
    async args => {
      try {
        const result = await viewsClient.getView(args.view_id);

        return {
          content: [
            {
              type: 'text',
              text: `View details:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting view', error);
      }
    }
  );

  server.tool(
    'clickup_update_view',
    "Update an existing view's properties including name, type, filters, grouping, divide, sorting, columns, team sidebar, and settings. The current view is fetched and merged with your changes because the API requires the full view object.",
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to update'),
      name: z.string().optional().describe('New name for the view'),
      type: ViewTypeSchema.optional().describe('New type for the view'),
      filters: z.array(ViewFilterSchema).optional().describe('New filter conditions ({field, op, values}) for the view'),
      grouping: ViewGroupingSchema.optional().describe('New grouping configuration'),
      divide: ViewDivideSchema.optional().describe('New divide (board swimlane) configuration'),
      sorting: z.array(ViewSortingSchema).optional().describe('New sorting configuration'),
      columns: z.array(ViewColumnSchema).optional().describe('New column configuration for table and list views'),
      team_sidebar: TeamSidebarSchema.optional().describe('New team sidebar configuration'),
      settings: ViewSettingsSchema.optional().describe('New view display settings (merged with the current settings)'),
    },
    async args => {
      try {
        const request = UpdateViewSchema.parse(args);
        const result = await viewsClient.updateView(request);

        return {
          content: [
            {
              type: 'text',
              text: `View updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating view', error);
      }
    }
  );

  server.tool(
    'clickup_delete_view',
    'Delete a view from ClickUp. This action cannot be undone.',
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to delete'),
    },
    async args => {
      try {
        const result = await viewsClient.deleteView(args.view_id);

        return {
          content: [
            {
              type: 'text',
              text: `View deleted successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting view', error);
      }
    }
  );

  server.tool(
    'clickup_set_view_filters',
    'Set or update filters for a view. Filters determine which tasks are visible in the view. Each condition uses {field, op, values} with ClickUp operator tokens (EQ, ANY, ALL, NOT ANY, ...).',
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to update'),
      filters: z.array(ViewFilterSchema).describe('Array of filter conditions ({field, op, values}) to apply to the view'),
    },
    async args => {
      try {
        const request = SetViewFiltersSchema.parse(args);
        const result = await viewsClient.setViewFilters(request);

        return {
          content: [
            {
              type: 'text',
              text: `View filters updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('setting view filters', error);
      }
    }
  );

  server.tool(
    'clickup_set_view_grouping',
    'Set or update the grouping configuration for a view. Grouping organizes tasks into sections; collapsed is an array of collapsed group IDs.',
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to update'),
      grouping: ViewGroupingSchema.describe('Grouping configuration ({field, order, collapsed group IDs, ignore})'),
    },
    async args => {
      try {
        const request = SetViewGroupingSchema.parse(args);
        const result = await viewsClient.setViewGrouping(request);

        return {
          content: [
            {
              type: 'text',
              text: `View grouping updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('setting view grouping', error);
      }
    }
  );

  server.tool(
    'clickup_set_view_sorting',
    'Set or update sorting configuration for a view. Sorting determines the order of tasks.',
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to update'),
      sorting: z.array(ViewSortingSchema).describe('Array of sorting configurations'),
    },
    async args => {
      try {
        const request = SetViewSortingSchema.parse(args);
        const result = await viewsClient.setViewSorting(request);

        return {
          content: [
            {
              type: 'text',
              text: `View sorting updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('setting view sorting', error);
      }
    }
  );

  server.tool(
    'clickup_update_view_settings',
    'Update view display settings such as show_task_locations, show_subtasks, show_assignees, show_images, collapse_empty_columns, and the me_* filters. Provided settings are merged with the current ones.',
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to update'),
      settings: ViewSettingsSchema.describe('View display settings object'),
    },
    async args => {
      try {
        const request = UpdateViewSettingsSchema.parse(args);
        const result = await viewsClient.updateViewSettings(request);

        return {
          content: [
            {
              type: 'text',
              text: `View settings updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating view settings', error);
      }
    }
  );

  // ========================================
  // ADDITIONAL VIEW OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_view_tasks',
    "Get tasks that are visible in a specific view, respecting the view's filters and settings. Pagination is 0-indexed (page 0 is the first page).",
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to get tasks from'),
      page: z.number().int().min(0).optional().describe('Page number for pagination, starting at 0 (default 0)'),
    },
    async args => {
      try {
        const result = await viewsClient.getViewTasks(args.view_id, args.page);

        return {
          content: [
            {
              type: 'text',
              text: `Tasks in view ${args.view_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting view tasks', error);
      }
    }
  );

  server.tool(
    'clickup_duplicate_view',
    "Create a duplicate of an existing view with a new name. The API has no duplicate endpoint, so the source view's configuration is fetched and a new view is created in the specified parent (use the source view's parent to duplicate in place).",
    {
      view_id: z.coerce.string().min(1).describe('The ID of the view to duplicate'),
      name: z.string().min(1).describe('Name for the duplicated view'),
      parent_id: z.coerce.string().min(1).describe('The ID of the parent (Workspace/team, space, folder, or list) to create the duplicate in'),
      parent_type: ViewParentTypeSchema.describe('The type of parent container to create the duplicate in'),
    },
    async args => {
      try {
        const request = DuplicateViewSchema.parse(args);
        const result = await viewsClient.duplicateView(request);

        return {
          content: [
            {
              type: 'text',
              text: `View duplicated successfully:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('duplicating view', error);
      }
    }
  );

  server.tool(
    'clickup_get_view_fields',
    'Get the Custom Fields accessible in a Workspace (team), space, folder, or list (Get Accessible Custom Fields endpoint). Note: built-in fields such as status, assignee, dueDate, and priority are not included.',
    {
      parent_id: z.coerce.string().min(1).describe('The ID of the parent (Workspace/team, space, folder, or list)'),
      parent_type: ViewParentTypeSchema.describe('The type of parent container'),
    },
    async args => {
      try {
        const result = await viewsClient.getViewFields(args.parent_type, args.parent_id);

        return {
          content: [
            {
              type: 'text',
              text: `Accessible Custom Fields for ${args.parent_type} ${args.parent_id}:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting view fields', error);
      }
    }
  );
}
