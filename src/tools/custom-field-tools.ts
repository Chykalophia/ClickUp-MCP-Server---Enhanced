import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedCustomFieldsClient, CustomFieldType } from '../clickup-client/custom-fields-enhanced.js';
import { CustomFieldToolSchemas, DropdownOptionSchema } from '../schemas/custom-field-schemas.js';

// Create clients
const clickUpClient = createClickUpClient();
const customFieldsClient = createEnhancedCustomFieldsClient(clickUpClient);

export function setupCustomFieldTools(server: McpServer): void {

  // ========================================
  // GET CUSTOM FIELDS OPERATIONS
  // ========================================

  server.tool(
    'get_custom_fields',
    'Get custom fields for a ClickUp list, folder, or space. Returns all field definitions with their configurations.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container to get custom fields from'),
      container_id: z.string().min(1).describe('The ID of the container (list, folder, or space)'),
      include_deleted: z.boolean().optional().default(false).describe('Whether to include deleted custom fields')
    },
    async ({ container_type, container_id, include_deleted }) => {
      try {
        let fields;
        
        switch (container_type) {
          case 'list':
            fields = await customFieldsClient.getListCustomFields(container_id, { include_deleted });
            break;
          case 'folder':
            fields = await customFieldsClient.getFolderCustomFields(container_id, { include_deleted });
            break;
          case 'space':
            fields = await customFieldsClient.getSpaceCustomFields(container_id, { include_deleted });
            break;
          default:
            throw new Error('Invalid container type');
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Custom fields for ${container_type} ${container_id}:\n\n${JSON.stringify(fields, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting custom fields:', error);
        return {
          content: [{ type: 'text', text: `Error getting custom fields: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // CREATE CUSTOM FIELD OPERATIONS
  // ========================================

  server.tool(
    'create_custom_field',
    'Create a new custom field in a ClickUp list, folder, or space. Supports all field types with type-specific configurations.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container to create the custom field in'),
      container_id: z.string().min(1).describe('The ID of the container (list, folder, or space)'),
      name: z.string().min(1).max(255).describe('The name of the custom field'),
      type: z.enum([
        'text', 'textarea',
        'number', 'currency', 
        'date',
        'drop_down', 'labels',
        'checkbox',
        'url', 'email', 'phone',
        'rating', 'progress',
        'task_relationship'
      ] as const).describe('The type of custom field to create'),
      type_config: z.record(z.any()).optional().describe('Type-specific configuration object'),
      required: z.boolean().optional().default(false).describe('Whether the field is required'),
      hide_from_guests: z.boolean().optional().default(false).describe('Whether to hide the field from guests')
    },
    async ({ container_type, container_id, name, type, type_config, required, hide_from_guests }) => {
      try {
        // Get default configuration for field type if not provided
        const finalTypeConfig = type_config || customFieldsClient.getFieldTypeTemplate(type as CustomFieldType);

        const fieldParams = {
          name,
          type: type as CustomFieldType,
          type_config: finalTypeConfig,
          required,
          hide_from_guests
        };

        let field;
        switch (container_type) {
          case 'list':
            field = await customFieldsClient.createListCustomField(container_id, fieldParams);
            break;
          case 'folder':
            field = await customFieldsClient.createFolderCustomField(container_id, fieldParams);
            break;
          case 'space':
            field = await customFieldsClient.createSpaceCustomField(container_id, fieldParams);
            break;
          default:
            throw new Error('Invalid container type');
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Custom field created successfully in ${container_type} ${container_id}!\n\n${JSON.stringify(field, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating custom field:', error);
        return {
          content: [{ type: 'text', text: `Error creating custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // UPDATE CUSTOM FIELD OPERATIONS
  // ========================================

  server.tool(
    'update_custom_field',
    'Update an existing custom field. Can modify name, configuration, required status, and guest visibility.',
    {
      field_id: z.string().min(1).describe('The ID of the custom field to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the custom field'),
      type_config: z.record(z.any()).optional().describe('Updated type-specific configuration'),
      required: z.boolean().optional().describe('Whether the field should be required'),
      hide_from_guests: z.boolean().optional().describe('Whether to hide the field from guests')
    },
    async ({ field_id, name, type_config, required, hide_from_guests }) => {
      try {
        // Validate that at least one field is being updated
        if (name === undefined && type_config === undefined && 
            required === undefined && hide_from_guests === undefined) {
          return {
            content: [{ type: 'text', text: 'Error: Must specify at least one field to update (name, type_config, required, or hide_from_guests)' }],
            isError: true
          };
        }

        const updatedField = await customFieldsClient.updateCustomField(field_id, {
          name,
          type_config,
          required,
          hide_from_guests
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Custom field updated successfully!\n\n${JSON.stringify(updatedField, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating custom field:', error);
        return {
          content: [{ type: 'text', text: `Error updating custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // DELETE CUSTOM FIELD OPERATIONS
  // ========================================

  server.tool(
    'delete_custom_field',
    'Delete a custom field from ClickUp. This will remove the field and all its values from tasks. This action cannot be undone.',
    {
      field_id: z.string().min(1).describe('The ID of the custom field to delete')
    },
    async ({ field_id }) => {
      try {
        await customFieldsClient.deleteCustomField(field_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Custom field ${field_id} deleted successfully. All field values have been removed from tasks.` 
          }]
        };
      } catch (error: any) {
        console.error('Error deleting custom field:', error);
        return {
          content: [{ type: 'text', text: `Error deleting custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // CUSTOM FIELD VALUE OPERATIONS
  // ========================================

  server.tool(
    'set_custom_field_value',
    'Set a custom field value on a ClickUp task. The value format depends on the field type.',
    {
      task_id: z.string().min(1).describe('The ID of the task to set the custom field value on'),
      field_id: z.string().min(1).describe('The ID of the custom field'),
      value: z.any().describe('The value to set (format depends on field type)')
    },
    async ({ task_id, field_id, value }) => {
      try {
        await customFieldsClient.setCustomFieldValue(task_id, field_id, value);

        return {
          content: [{ 
            type: 'text', 
            text: `Custom field value set successfully on task ${task_id} for field ${field_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error setting custom field value:', error);
        return {
          content: [{ type: 'text', text: `Error setting custom field value: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'remove_custom_field_value',
    'Remove a custom field value from a ClickUp task. This clears the field value but keeps the field definition.',
    {
      task_id: z.string().min(1).describe('The ID of the task to remove the custom field value from'),
      field_id: z.string().min(1).describe('The ID of the custom field to clear')
    },
    async ({ task_id, field_id }) => {
      try {
        await customFieldsClient.removeCustomFieldValue(task_id, field_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Custom field value removed successfully from task ${task_id} for field ${field_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error removing custom field value:', error);
        return {
          content: [{ type: 'text', text: `Error removing custom field value: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_custom_field_value',
    'Get a custom field value from a ClickUp task. Returns the current value and field information.',
    {
      task_id: z.string().min(1).describe('The ID of the task to get the custom field value from'),
      field_id: z.string().min(1).describe('The ID of the custom field to retrieve')
    },
    async ({ task_id, field_id }) => {
      try {
        const value = await customFieldsClient.getCustomFieldValue(task_id, field_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Custom field value for task ${task_id}, field ${field_id}:\n\n${JSON.stringify(value, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting custom field value:', error);
        return {
          content: [{ type: 'text', text: `Error getting custom field value: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'bulk_set_custom_field_values',
    'Set multiple custom field values on a ClickUp task in a single operation. More efficient than setting values individually.',
    {
      task_id: z.string().min(1).describe('The ID of the task to set custom field values on'),
      field_values: z.array(z.object({
        field_id: z.string().min(1).describe('The ID of the custom field'),
        value: z.any().describe('The value to set (format depends on field type)')
      })).min(1).describe('Array of field ID and value pairs to set')
    },
    async ({ task_id, field_values }) => {
      try {
        // Ensure all field_values have the required properties
        const validatedFieldValues = field_values.map(fv => ({
          field_id: fv.field_id,
          value: fv.value
        }));
        
        const results = await customFieldsClient.bulkSetCustomFieldValues(task_id, validatedFieldValues);

        return {
          content: [{ 
            type: 'text', 
            text: `Bulk custom field values set successfully on task ${task_id}!\n\nResults:\n${JSON.stringify(results, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error bulk setting custom field values:', error);
        return {
          content: [{ type: 'text', text: `Error bulk setting custom field values: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_task_custom_field_values',
    'Get all custom field values for a ClickUp task. Returns all field values with their definitions.',
    {
      task_id: z.string().min(1).describe('The ID of the task to get custom field values from')
    },
    async ({ task_id }) => {
      try {
        const values = await customFieldsClient.getTaskCustomFieldValues(task_id);

        return {
          content: [{ 
            type: 'text', 
            text: `All custom field values for task ${task_id}:\n\n${JSON.stringify(values, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting task custom field values:', error);
        return {
          content: [{ type: 'text', text: `Error getting task custom field values: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // HELPER TOOLS FOR FIELD CREATION
  // ========================================

  server.tool(
    'create_text_custom_field',
    'Create a text custom field with optional default value and placeholder.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container'),
      container_id: z.string().min(1).describe('The ID of the container'),
      name: z.string().min(1).max(255).describe('The name of the text field'),
      default_value: z.string().optional().describe('Default text value'),
      placeholder: z.string().optional().describe('Placeholder text'),
      required: z.boolean().optional().default(false).describe('Whether the field is required'),
      hide_from_guests: z.boolean().optional().default(false).describe('Whether to hide from guests')
    },
    async ({ container_type, container_id, name, default_value, placeholder, required, hide_from_guests }) => {
      try {
        const type_config = {
          default: default_value,
          placeholder
        };

        const fieldParams = {
          name,
          type: 'text' as CustomFieldType,
          type_config,
          required,
          hide_from_guests
        };

        let field;
        switch (container_type) {
          case 'list':
            field = await customFieldsClient.createListCustomField(container_id, fieldParams);
            break;
          case 'folder':
            field = await customFieldsClient.createFolderCustomField(container_id, fieldParams);
            break;
          case 'space':
            field = await customFieldsClient.createSpaceCustomField(container_id, fieldParams);
            break;
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Text custom field created successfully!\n\n${JSON.stringify(field, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating text custom field:', error);
        return {
          content: [{ type: 'text', text: `Error creating text custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_dropdown_custom_field',
    'Create a dropdown custom field with specified options.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container'),
      container_id: z.string().min(1).describe('The ID of the container'),
      name: z.string().min(1).max(255).describe('The name of the dropdown field'),
      options: z.array(DropdownOptionSchema).min(1).describe('Array of dropdown options'),
      default_option_index: z.number().min(0).optional().describe('Index of default selected option'),
      required: z.boolean().optional().default(false).describe('Whether the field is required'),
      hide_from_guests: z.boolean().optional().default(false).describe('Whether to hide from guests')
    },
    async ({ container_type, container_id, name, options, default_option_index, required, hide_from_guests }) => {
      try {
        const type_config = {
          options: options.map((option, index) => ({
            ...option,
            orderindex: option.orderindex ?? index
          })),
          default: default_option_index
        };

        const fieldParams = {
          name,
          type: 'drop_down' as CustomFieldType,
          type_config,
          required,
          hide_from_guests
        };

        let field;
        switch (container_type) {
          case 'list':
            field = await customFieldsClient.createListCustomField(container_id, fieldParams);
            break;
          case 'folder':
            field = await customFieldsClient.createFolderCustomField(container_id, fieldParams);
            break;
          case 'space':
            field = await customFieldsClient.createSpaceCustomField(container_id, fieldParams);
            break;
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Dropdown custom field created successfully with ${options.length} options!\n\n${JSON.stringify(field, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating dropdown custom field:', error);
        return {
          content: [{ type: 'text', text: `Error creating dropdown custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_number_custom_field',
    'Create a number custom field with optional precision and default value.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container'),
      container_id: z.string().min(1).describe('The ID of the container'),
      name: z.string().min(1).max(255).describe('The name of the number field'),
      default_value: z.number().optional().describe('Default numeric value'),
      precision: z.number().min(0).max(8).optional().default(0).describe('Number of decimal places (0-8)'),
      required: z.boolean().optional().default(false).describe('Whether the field is required'),
      hide_from_guests: z.boolean().optional().default(false).describe('Whether to hide from guests')
    },
    async ({ container_type, container_id, name, default_value, precision, required, hide_from_guests }) => {
      try {
        const type_config = {
          default: default_value,
          precision
        };

        const fieldParams = {
          name,
          type: 'number' as CustomFieldType,
          type_config,
          required,
          hide_from_guests
        };

        let field;
        switch (container_type) {
          case 'list':
            field = await customFieldsClient.createListCustomField(container_id, fieldParams);
            break;
          case 'folder':
            field = await customFieldsClient.createFolderCustomField(container_id, fieldParams);
            break;
          case 'space':
            field = await customFieldsClient.createSpaceCustomField(container_id, fieldParams);
            break;
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Number custom field created successfully with ${precision} decimal places!\n\n${JSON.stringify(field, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating number custom field:', error);
        return {
          content: [{ type: 'text', text: `Error creating number custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_date_custom_field',
    'Create a date custom field with optional time inclusion.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container'),
      container_id: z.string().min(1).describe('The ID of the container'),
      name: z.string().min(1).max(255).describe('The name of the date field'),
      include_time: z.boolean().optional().default(false).describe('Whether to include time in the date field'),
      default_value: z.number().positive().optional().describe('Default date value (Unix timestamp)'),
      required: z.boolean().optional().default(false).describe('Whether the field is required'),
      hide_from_guests: z.boolean().optional().default(false).describe('Whether to hide from guests')
    },
    async ({ container_type, container_id, name, include_time, default_value, required, hide_from_guests }) => {
      try {
        const type_config = {
          include_time,
          default: default_value
        };

        const fieldParams = {
          name,
          type: 'date' as CustomFieldType,
          type_config,
          required,
          hide_from_guests
        };

        let field;
        switch (container_type) {
          case 'list':
            field = await customFieldsClient.createListCustomField(container_id, fieldParams);
            break;
          case 'folder':
            field = await customFieldsClient.createFolderCustomField(container_id, fieldParams);
            break;
          case 'space':
            field = await customFieldsClient.createSpaceCustomField(container_id, fieldParams);
            break;
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Date custom field created successfully${include_time ? ' with time support' : ''}!\n\n${JSON.stringify(field, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating date custom field:', error);
        return {
          content: [{ type: 'text', text: `Error creating date custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_checkbox_custom_field',
    'Create a checkbox (boolean) custom field with optional default value.',
    {
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container'),
      container_id: z.string().min(1).describe('The ID of the container'),
      name: z.string().min(1).max(255).describe('The name of the checkbox field'),
      default_value: z.boolean().optional().default(false).describe('Default checkbox state'),
      required: z.boolean().optional().default(false).describe('Whether the field is required'),
      hide_from_guests: z.boolean().optional().default(false).describe('Whether to hide from guests')
    },
    async ({ container_type, container_id, name, default_value, required, hide_from_guests }) => {
      try {
        const type_config = {
          default: default_value
        };

        const fieldParams = {
          name,
          type: 'checkbox' as CustomFieldType,
          type_config,
          required,
          hide_from_guests
        };

        let field;
        switch (container_type) {
          case 'list':
            field = await customFieldsClient.createListCustomField(container_id, fieldParams);
            break;
          case 'folder':
            field = await customFieldsClient.createFolderCustomField(container_id, fieldParams);
            break;
          case 'space':
            field = await customFieldsClient.createSpaceCustomField(container_id, fieldParams);
            break;
        }

        return {
          content: [{ 
            type: 'text', 
            text: `Checkbox custom field created successfully!\n\n${JSON.stringify(field, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating checkbox custom field:', error);
        return {
          content: [{ type: 'text', text: `Error creating checkbox custom field: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // FIELD VALUE VALIDATION HELPER
  // ========================================

  server.tool(
    'validate_custom_field_value',
    'Validate a custom field value against its field type and configuration. Useful for checking values before setting them.',
    {
      field_id: z.string().min(1).describe('The ID of the custom field'),
      container_type: z.enum(['list', 'folder', 'space']).describe('The type of container the field belongs to'),
      container_id: z.string().min(1).describe('The ID of the container'),
      value: z.any().describe('The value to validate')
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
        }

        const field = fields.find(f => f.id === field_id);
        if (!field) {
          return {
            content: [{ type: 'text', text: `Error: Custom field ${field_id} not found in ${container_type} ${container_id}` }],
            isError: true
          };
        }

        // Validate the value
        const isValid = customFieldsClient.validateFieldValue(field, value);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Validation result for field "${field.name}" (${field.type}):\n\nValue: ${JSON.stringify(value)}\nValid: ${isValid}\n\nField Configuration:\n${JSON.stringify(field.type_config, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error validating custom field value:', error);
        return {
          content: [{ type: 'text', text: `Error validating custom field value: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
