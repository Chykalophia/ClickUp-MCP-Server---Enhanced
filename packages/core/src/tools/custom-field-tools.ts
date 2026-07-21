/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedCustomFieldsClient } from '../clickup-client/custom-fields-enhanced.js';
import { mcpError } from '../utils/error-handling.js';

// Create clients
const clickUpClient = createClickUpClient();
const customFieldsClient = createEnhancedCustomFieldsClient(clickUpClient);

// NOTE: The ClickUp public API does NOT support creating, updating, or deleting
// custom field DEFINITIONS — fields must be created in the ClickUp UI. Only
// listing field definitions and getting/setting/removing field VALUES is
// supported, so no create/update/delete field tools are registered here.

const VALUE_FORMAT_GUIDE =
  'Value format by field type: ' +
  'text/short_text = string; ' +
  'number/currency = number; ' +
  'date = Unix timestamp in MILLISECONDS (set value_options {"time": true} to store the time component); ' +
  'checkbox = boolean; ' +
  'url/email/phone = string; ' +
  'drop_down = option UUID from type_config.options[].id (the canonical value; the option orderindex integer is also accepted); ' +
  'labels = array of label option UUIDs; ' +
  'emoji (rating) = integer within the configured count range; ' +
  'manual_progress = number; ' +
  'users (people) = {"add": [user_ids], "rem": [user_ids]}; ' +
  'tasks (task relationship) = {"add": [task_ids], "rem": [task_ids]}; ' +
  'location = {"location": {"lat": number, "lng": number}, "formatted_address": string}. ' +
  'automatic_progress is computed by ClickUp and cannot be set.';

export function setupCustomFieldTools(server: McpServer): void {
  // ========================================
  // GET CUSTOM FIELDS OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_custom_fields',
    'Get custom field definitions for a ClickUp list, folder, space, or team (workspace). List-level requests include fields inherited from parent levels; folder, space, and team requests return only fields created at that exact level. Note: the ClickUp API cannot create, update, or delete custom field definitions — fields must be created in the ClickUp UI.',
    {
      container_type: z
        .enum(['list', 'folder', 'space', 'team', 'workspace'])
        .describe(
          'The type of container to get custom fields from ("team" and "workspace" are synonyms)'
        ),
      container_id: z
        .string()
        .min(1)
        .describe('The ID of the container (list, folder, space, or team/workspace)'),
    },
    async ({ container_type, container_id }) => {
      try {
        let fields;

        switch (container_type) {
          case 'list':
            fields = await customFieldsClient.getListCustomFields(container_id);
            break;
          case 'folder':
            fields = await customFieldsClient.getFolderCustomFields(container_id);
            break;
          case 'space':
            fields = await customFieldsClient.getSpaceCustomFields(container_id);
            break;
          case 'team':
          case 'workspace':
            fields = await customFieldsClient.getTeamCustomFields(container_id);
            break;
          default:
            throw new Error('Invalid container type');
        }

        return {
          content: [
            {
              type: 'text',
              text: `Custom fields for ${container_type} ${container_id}:\n\n${JSON.stringify(fields, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting custom fields', error);
      }
    }
  );

  // ========================================
  // CUSTOM FIELD VALUE OPERATIONS
  // ========================================

  server.tool(
    'clickup_set_custom_field_value',
    `Set a custom field value on a ClickUp task. ${VALUE_FORMAT_GUIDE}`,
    {
      task_id: z.string().min(1).describe('The ID of the task to set the custom field value on'),
      field_id: z.string().min(1).describe('The ID of the custom field'),
      value: z
        .any()
        .describe('The value to set (format depends on field type — see tool description)'),
      value_options: z
        .object({
          time: z
            .boolean()
            .optional()
            .describe('For date fields: store/display the time component'),
        })
        .optional()
        .describe(
          'Extra value options sent alongside the value (e.g. {"time": true} for date fields)'
        ),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "DEV-1234")'),
      team_id: z
        .string()
        .optional()
        .describe('The Workspace (team) ID. Required when custom_task_ids is true'),
    },
    async ({ task_id, field_id, value, value_options, custom_task_ids, team_id }) => {
      try {
        await customFieldsClient.setCustomFieldValue(task_id, field_id, value, {
          valueOptions: value_options,
          customTaskIds: custom_task_ids,
          teamId: team_id,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Custom field value set successfully on task ${task_id} for field ${field_id}.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('setting custom field value', error);
      }
    }
  );

  server.tool(
    'clickup_remove_custom_field_value',
    'Remove a custom field value from a ClickUp task. This clears the field value but keeps the field definition.',
    {
      task_id: z
        .string()
        .min(1)
        .describe('The ID of the task to remove the custom field value from'),
      field_id: z.string().min(1).describe('The ID of the custom field to clear'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "DEV-1234")'),
      team_id: z
        .string()
        .optional()
        .describe('The Workspace (team) ID. Required when custom_task_ids is true'),
    },
    async ({ task_id, field_id, custom_task_ids, team_id }) => {
      try {
        await customFieldsClient.removeCustomFieldValue(task_id, field_id, {
          customTaskIds: custom_task_ids,
          teamId: team_id,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Custom field value removed successfully from task ${task_id} for field ${field_id}.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('removing custom field value', error);
      }
    }
  );

  server.tool(
    'clickup_get_custom_field_value',
    'Get a custom field value from a ClickUp task. Returns the current value and field information.',
    {
      task_id: z.string().min(1).describe('The ID of the task to get the custom field value from'),
      field_id: z.string().min(1).describe('The ID of the custom field to retrieve'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "DEV-1234")'),
      team_id: z
        .string()
        .optional()
        .describe('The Workspace (team) ID. Required when custom_task_ids is true'),
    },
    async ({ task_id, field_id, custom_task_ids, team_id }) => {
      try {
        const value = await customFieldsClient.getCustomFieldValue(task_id, field_id, {
          customTaskIds: custom_task_ids,
          teamId: team_id,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Custom field value for task ${task_id}, field ${field_id}:\n\n${JSON.stringify(value, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting custom field value', error);
      }
    }
  );

  server.tool(
    'clickup_bulk_set_custom_field_values',
    `Set multiple custom field values on a ClickUp task in a single operation. More efficient than setting values individually. ${VALUE_FORMAT_GUIDE}`,
    {
      task_id: z.string().min(1).describe('The ID of the task to set custom field values on'),
      field_values: z
        .array(
          z.object({
            field_id: z.string().min(1).describe('The ID of the custom field'),
            value: z
              .any()
              .describe('The value to set (format depends on field type — see tool description)'),
            value_options: z
              .object({
                time: z
                  .boolean()
                  .optional()
                  .describe('For date fields: store/display the time component'),
              })
              .optional()
              .describe(
                'Extra value options for this field (e.g. {"time": true} for date fields)'
              ),
          })
        )
        .min(1)
        .describe('Array of field ID and value pairs to set'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "DEV-1234")'),
      team_id: z
        .string()
        .optional()
        .describe('The Workspace (team) ID. Required when custom_task_ids is true'),
    },
    async ({ task_id, field_values, custom_task_ids, team_id }) => {
      try {
        // Ensure all field_values have the required properties
        const validatedFieldValues = field_values.map(fv => ({
          field_id: fv.field_id,
          value: fv.value,
          value_options: fv.value_options,
        }));

        const results = await customFieldsClient.bulkSetCustomFieldValues(
          task_id,
          validatedFieldValues,
          {
            customTaskIds: custom_task_ids,
            teamId: team_id,
          }
        );

        const hasErrors = results.some((r: any) => r.status === 'error');
        const errorCount = results.filter((r: any) => r.status === 'error').length;
        const successCount = results.filter((r: any) => r.status === 'success').length;

        return {
          content: [
            {
              type: 'text',
              text: hasErrors
                ? `Bulk custom field update partially failed on task ${task_id}.\n${successCount} succeeded, ${errorCount} failed.\n\nResults:\n${JSON.stringify(results, null, 2)}`
                : `Bulk custom field values set successfully on task ${task_id}!\n\nResults:\n${JSON.stringify(results, null, 2)}`,
            },
          ],
          ...(hasErrors ? { isError: true as const } : {}),
        };
      } catch (error: unknown) {
        return mcpError('bulk setting custom field values', error);
      }
    }
  );

  server.tool(
    'clickup_get_task_custom_field_values',
    'Get all custom field values for a ClickUp task. Returns all field values with their definitions.',
    {
      task_id: z.string().min(1).describe('The ID of the task to get custom field values from'),
      custom_task_ids: z
        .boolean()
        .optional()
        .describe('Set to true if task_id is a custom task ID (e.g. "DEV-1234")'),
      team_id: z
        .string()
        .optional()
        .describe('The Workspace (team) ID. Required when custom_task_ids is true'),
    },
    async ({ task_id, custom_task_ids, team_id }) => {
      try {
        const values = await customFieldsClient.getTaskCustomFieldValues(task_id, {
          customTaskIds: custom_task_ids,
          teamId: team_id,
        });

        return {
          content: [
            {
              type: 'text',
              text: `All custom field values for task ${task_id}:\n\n${JSON.stringify(values, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting task custom field values', error);
      }
    }
  );

  // ========================================
  // FIELD VALUE VALIDATION HELPER
  // ========================================

  server.tool(
    'clickup_validate_custom_field_value',
    `Validate a custom field value against its field type and configuration. Useful for checking values before setting them. ${VALUE_FORMAT_GUIDE}`,
    {
      field_id: z.string().min(1).describe('The ID of the custom field'),
      container_type: z
        .enum(['list', 'folder', 'space', 'team', 'workspace'])
        .describe(
          'The type of container the field belongs to ("team" and "workspace" are synonyms)'
        ),
      container_id: z.string().min(1).describe('The ID of the container'),
      value: z.any().describe('The value to validate'),
    },
    async ({ field_id, container_type, container_id, value }) => {
      try {
        // Get the field definition first
        let fields;
        switch (container_type) {
          case 'list':
            fields = await customFieldsClient.getListCustomFields(container_id);
            break;
          case 'folder':
            fields = await customFieldsClient.getFolderCustomFields(container_id);
            break;
          case 'space':
            fields = await customFieldsClient.getSpaceCustomFields(container_id);
            break;
          case 'team':
          case 'workspace':
            fields = await customFieldsClient.getTeamCustomFields(container_id);
            break;
        }

        const field = fields.find(f => f.id === field_id);
        if (!field) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Custom field ${field_id} not found in ${container_type} ${container_id}`,
              },
            ],
            isError: true,
          };
        }

        // Validate the value
        const isValid = customFieldsClient.validateFieldValue(field, value);

        return {
          content: [
            {
              type: 'text',
              text: `Validation result for field "${field.name}" (${field.type}):\n\nValue: ${JSON.stringify(value)}\nValid: ${isValid}\n\nField Configuration:\n${JSON.stringify(field.type_config, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('validating custom field value', error);
      }
    }
  );
}
