import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { /* createClickUpClient */ } from '../clickup-client/index.js';
import { ViewsEnhancedClient } from '../clickup-client/views-enhanced.js';
import {
  CreateViewSchema,
  UpdateViewSchema,
  GetViewsFilterSchema,
  SetViewFiltersSchema,
  SetViewGroupingSchema,
  SetViewSortingSchema,
  UpdateViewSettingsSchema,
  ViewSharingSchema,
  ViewTypeSchema,
  ViewAccessSchema,
  // FilterOperatorSchema,
  ViewFilterSchema,
  ViewGroupingSchema,
  ViewSortingSchema,
  BoardViewSettingsSchema,
  CalendarViewSettingsSchema,
  GanttViewSettingsSchema,
  TableViewSettingsSchema
} from '../schemas/views-schemas.js';

// Create clients
// const clickUpClient = createClickUpClient();
const viewsClient = new ViewsEnhancedClient(process.env.CLICKUP_API_TOKEN!);

export function setupViewsTools(server: McpServer): void {

  // ========================================
  // VIEW MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'create_view',
    'Create a new view in a ClickUp space, folder, or list. Supports all view types including list, board, calendar, gantt, and more.',
    {
      parent_id: z.string().min(1).describe('The ID of the parent (space, folder, or list)'),
      parent_type: z.enum(['space', 'folder', 'list']).describe('The type of parent container'),
      name: z.string().min(1).describe('The name of the view'),
      type: ViewTypeSchema.describe('The type of view to create'),
      access: ViewAccessSchema.default('private').describe('Access level for the view'),
      filters: z.array(ViewFilterSchema).optional().describe('Initial filters for the view'),
      grouping: z.array(ViewGroupingSchema).optional().describe('Grouping configuration for the view'),
      sorting: z.array(ViewSortingSchema).optional().describe('Sorting configuration for the view'),
      settings: z.union([
        BoardViewSettingsSchema,
        CalendarViewSettingsSchema,
        GanttViewSettingsSchema,
        TableViewSettingsSchema,
        z.object({})
      ]).optional().describe('View-specific settings'),
      description: z.string().optional().describe('Description of the view')
    },
    async (args) => {
      try {
        const request = CreateViewSchema.parse(args);
        const result = await viewsClient.createView(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View created successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating view: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_views',
    'Get all views for a space, folder, or list with optional filtering by type and access level.',
    {
      parent_id: z.string().min(1).describe('The ID of the parent (space, folder, or list)'),
      parent_type: z.enum(['space', 'folder', 'list']).describe('The type of parent container'),
      type: ViewTypeSchema.optional().describe('Filter views by type'),
      access: ViewAccessSchema.optional().describe('Filter views by access level')
    },
    async (args) => {
      try {
        const filter = GetViewsFilterSchema.parse(args);
        const result = await viewsClient.getViews(filter);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Views for ${args.parent_type} ${args.parent_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting views: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_view',
    'Get detailed information about a specific view by its ID.',
    {
      view_id: z.string().min(1).describe('The ID of the view to get')
    },
    async (args) => {
      try {
        const result = await viewsClient.getView(args.view_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View details:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting view: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_view',
    'Update an existing view\'s properties including name, access, filters, grouping, sorting, and settings.',
    {
      view_id: z.string().min(1).describe('The ID of the view to update'),
      name: z.string().optional().describe('New name for the view'),
      access: ViewAccessSchema.optional().describe('New access level for the view'),
      filters: z.array(ViewFilterSchema).optional().describe('New filters for the view'),
      grouping: z.array(ViewGroupingSchema).optional().describe('New grouping configuration'),
      sorting: z.array(ViewSortingSchema).optional().describe('New sorting configuration'),
      settings: z.union([
        BoardViewSettingsSchema,
        CalendarViewSettingsSchema,
        GanttViewSettingsSchema,
        TableViewSettingsSchema,
        z.object({})
      ]).optional().describe('New view-specific settings'),
      description: z.string().optional().describe('New description for the view')
    },
    async (args) => {
      try {
        const request = UpdateViewSchema.parse(args);
        const result = await viewsClient.updateView(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating view: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_view',
    'Delete a view from ClickUp. This action cannot be undone.',
    {
      view_id: z.string().min(1).describe('The ID of the view to delete')
    },
    async (args) => {
      try {
        const result = await viewsClient.deleteView(args.view_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View deleted successfully: ${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting view: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'set_view_filters',
    'Set or update filters for a view. Filters determine which tasks are visible in the view.',
    {
      view_id: z.string().min(1).describe('The ID of the view to update'),
      filters: z.array(ViewFilterSchema).describe('Array of filters to apply to the view')
    },
    async (args) => {
      try {
        const request = SetViewFiltersSchema.parse(args);
        const result = await viewsClient.setViewFilters(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View filters updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error setting view filters: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'set_view_grouping',
    'Set or update grouping configuration for a view. Grouping organizes tasks into sections.',
    {
      view_id: z.string().min(1).describe('The ID of the view to update'),
      grouping: z.array(ViewGroupingSchema).describe('Array of grouping configurations')
    },
    async (args) => {
      try {
        const request = SetViewGroupingSchema.parse(args);
        const result = await viewsClient.setViewGrouping(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View grouping updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error setting view grouping: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'set_view_sorting',
    'Set or update sorting configuration for a view. Sorting determines the order of tasks.',
    {
      view_id: z.string().min(1).describe('The ID of the view to update'),
      sorting: z.array(ViewSortingSchema).describe('Array of sorting configurations')
    },
    async (args) => {
      try {
        const request = SetViewSortingSchema.parse(args);
        const result = await viewsClient.setViewSorting(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View sorting updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error setting view sorting: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_view_settings',
    'Update view-specific settings such as board columns, calendar date fields, or table configurations.',
    {
      view_id: z.string().min(1).describe('The ID of the view to update'),
      settings: z.union([
        BoardViewSettingsSchema,
        CalendarViewSettingsSchema,
        GanttViewSettingsSchema,
        TableViewSettingsSchema,
        z.object({})
      ]).describe('View-specific settings object')
    },
    async (args) => {
      try {
        const request = UpdateViewSettingsSchema.parse(args);
        const result = await viewsClient.updateViewSettings(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View settings updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating view settings: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // ADDITIONAL VIEW OPERATIONS
  // ========================================

  server.tool(
    'get_view_tasks',
    'Get tasks that are visible in a specific view, respecting the view\'s filters and settings.',
    {
      view_id: z.string().min(1).describe('The ID of the view to get tasks from'),
      page: z.number().positive().optional().describe('Page number for pagination')
    },
    async (args) => {
      try {
        const result = await viewsClient.getViewTasks(args.view_id, args.page);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Tasks in view ${args.view_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting view tasks: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'duplicate_view',
    'Create a duplicate of an existing view with a new name.',
    {
      view_id: z.string().min(1).describe('The ID of the view to duplicate'),
      name: z.string().min(1).describe('Name for the duplicated view')
    },
    async (args) => {
      try {
        const result = await viewsClient.duplicateView(args.view_id, args.name);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View duplicated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error duplicating view: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_view_sharing',
    'Update sharing settings for a view including access level, password protection, and expiration.',
    {
      view_id: z.string().min(1).describe('The ID of the view to update sharing for'),
      access: ViewAccessSchema.describe('Access level for the view'),
      password: z.string().optional().describe('Password for password-protected views'),
      expires_at: z.number().optional().describe('Expiration timestamp (Unix timestamp)')
    },
    async (args) => {
      try {
        const request = ViewSharingSchema.parse(args);
        const result = await viewsClient.updateViewSharing(request);
        
        return {
          content: [{ 
            type: 'text', 
            text: `View sharing updated successfully:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating view sharing: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_view_fields',
    'Get available fields that can be used for filtering, grouping, and sorting in views for a specific parent.',
    {
      parent_id: z.string().min(1).describe('The ID of the parent (space, folder, or list)'),
      parent_type: z.enum(['space', 'folder', 'list']).describe('The type of parent container')
    },
    async (args) => {
      try {
        const result = await viewsClient.getViewFields(args.parent_type, args.parent_id);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Available fields for ${args.parent_type} ${args.parent_id}:\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting view fields: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
}
