import { ClickUpClient } from './index.js';
import axios from 'axios';

// ========================================
// CUSTOM FIELD TYPE DEFINITIONS
// ========================================

export type CustomFieldType = 
  | 'text' | 'textarea'
  | 'number' | 'currency'
  | 'date'
  | 'drop_down' | 'labels'
  | 'checkbox'
  | 'url' | 'email' | 'phone'
  | 'rating' | 'progress'
  | 'task_relationship';

// Base custom field interface
export interface BaseCustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  date_created: string;
  hide_from_guests: boolean;
  required: boolean;
  type_config: Record<string, any>;
}

// Text fields
export interface ShortTextField extends BaseCustomField {
  type: 'text';
  type_config: {
    default?: string;
    placeholder?: string;
  };
}

export interface LongTextField extends BaseCustomField {
  type: 'textarea';
  type_config: {
    default?: string;
    placeholder?: string;
  };
}

// Number fields
export interface NumberField extends BaseCustomField {
  type: 'number';
  type_config: {
    default?: number;
    precision?: number; // 0-8 decimal places
  };
}

export interface CurrencyField extends BaseCustomField {
  type: 'currency';
  type_config: {
    default?: number;
    precision?: number;
    currency_type?: string; // USD, EUR, GBP, etc.
  };
}

// Date fields
export interface DateField extends BaseCustomField {
  type: 'date';
  type_config: {
    default?: number; // Unix timestamp
    include_time?: boolean;
  };
}

// Selection fields
export interface DropdownOption {
  id: string;
  name: string;
  color?: string;
  orderindex: number;
}

export interface DropdownField extends BaseCustomField {
  type: 'drop_down';
  type_config: {
    default?: number; // option index
    options: DropdownOption[];
  };
}

export interface LabelsField extends BaseCustomField {
  type: 'labels';
  type_config: {
    options: DropdownOption[];
  };
}

// Boolean fields
export interface CheckboxField extends BaseCustomField {
  type: 'checkbox';
  type_config: {
    default?: boolean;
  };
}

// Contact fields
export interface URLField extends BaseCustomField {
  type: 'url';
  type_config: {
    default?: string;
    placeholder?: string;
  };
}

export interface EmailField extends BaseCustomField {
  type: 'email';
  type_config: {
    default?: string;
    placeholder?: string;
  };
}

export interface PhoneField extends BaseCustomField {
  type: 'phone';
  type_config: {
    default?: string;
    placeholder?: string;
  };
}

// Rating fields
export interface RatingField extends BaseCustomField {
  type: 'rating';
  type_config: {
    default?: number;
    count: number; // 1-10 stars
  };
}

// Progress fields
export interface ProgressField extends BaseCustomField {
  type: 'progress';
  type_config: {
    default?: number;
    start?: number; // default: 0
    end?: number;   // default: 100
    unit?: string;  // %, points, etc.
  };
}

// Relationship fields
export interface TaskRelationshipField extends BaseCustomField {
  type: 'task_relationship';
  type_config: {
    multiple?: boolean;
  };
}

// Union type for all custom fields
export type CustomField = 
  | ShortTextField | LongTextField
  | NumberField | CurrencyField
  | DateField
  | DropdownField | LabelsField
  | CheckboxField
  | URLField | EmailField | PhoneField
  | RatingField | ProgressField
  | TaskRelationshipField;

// ========================================
// CUSTOM FIELD VALUE DEFINITIONS
// ========================================

export interface BaseCustomFieldValue {
  id: string;
  name: string;
  type: CustomFieldType;
  value: any;
}

export interface TextFieldValue extends BaseCustomFieldValue {
  type: 'text' | 'textarea';
  value: {
    value: string;
  };
}

export interface NumberFieldValue extends BaseCustomFieldValue {
  type: 'number' | 'currency';
  value: {
    value: number;
  };
}

export interface DateFieldValue extends BaseCustomFieldValue {
  type: 'date';
  value: {
    value: number; // Unix timestamp
  };
}

export interface DropdownFieldValue extends BaseCustomFieldValue {
  type: 'drop_down';
  value: {
    value: {
      id: string;
      name: string;
      color?: string;
    };
  };
}

export interface LabelsFieldValue extends BaseCustomFieldValue {
  type: 'labels';
  value: {
    value: Array<{
      id: string;
      name: string;
      color?: string;
    }>;
  };
}

export interface CheckboxFieldValue extends BaseCustomFieldValue {
  type: 'checkbox';
  value: {
    value: boolean;
  };
}

export interface URLFieldValue extends BaseCustomFieldValue {
  type: 'url' | 'email' | 'phone';
  value: {
    value: string;
  };
}

export interface RatingFieldValue extends BaseCustomFieldValue {
  type: 'rating';
  value: {
    value: number;
  };
}

export interface ProgressFieldValue extends BaseCustomFieldValue {
  type: 'progress';
  value: {
    value: number;
  };
}

export interface TaskRelationshipFieldValue extends BaseCustomFieldValue {
  type: 'task_relationship';
  value: {
    value: string | string[];
  };
}

export type CustomFieldValue = 
  | TextFieldValue | NumberFieldValue | DateFieldValue
  | DropdownFieldValue | LabelsFieldValue | CheckboxFieldValue
  | URLFieldValue | RatingFieldValue | ProgressFieldValue
  | TaskRelationshipFieldValue;

// ========================================
// PARAMETER INTERFACES
// ========================================

export interface CreateCustomFieldParams {
  name: string;
  type: CustomFieldType;
  type_config?: Record<string, any>;
  required?: boolean;
  hide_from_guests?: boolean;
}

export interface UpdateCustomFieldParams {
  name?: string;
  type_config?: Record<string, any>;
  required?: boolean;
  hide_from_guests?: boolean;
}

export interface SetFieldValueParams {
  value: any; // Type depends on field type
}

export interface GetCustomFieldsParams {
  include_deleted?: boolean;
}

export interface CustomFieldsResponse {
  fields: CustomField[];
}

// ========================================
// ENHANCED CUSTOM FIELDS CLIENT
// ========================================

export class EnhancedCustomFieldsClient {
  private client: ClickUpClient;
  private apiToken: string;

  constructor(client: ClickUpClient) {
    this.client = client;
    this.apiToken = process.env.CLICKUP_API_TOKEN || '';
  }

  private getHeaders() {
    return {
      'Authorization': this.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  // ========================================
  // CUSTOM FIELD MANAGEMENT
  // ========================================

  /**
   * Get custom fields for a list
   */
  async getListCustomFields(listId: string, params?: GetCustomFieldsParams): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/list/${listId}/field`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting list custom fields:', error);
      throw this.handleError(error, `Failed to get custom fields for list ${listId}`);
    }
  }

  /**
   * Get custom fields for a folder
   */
  async getFolderCustomFields(folderId: string, params?: GetCustomFieldsParams): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/folder/${folderId}/field`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting folder custom fields:', error);
      throw this.handleError(error, `Failed to get custom fields for folder ${folderId}`);
    }
  }

  /**
   * Get custom fields for a space
   */
  async getSpaceCustomFields(spaceId: string, params?: GetCustomFieldsParams): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/space/${spaceId}/field`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting space custom fields:', error);
      throw this.handleError(error, `Failed to get custom fields for space ${spaceId}`);
    }
  }

  /**
   * Create a custom field in a list
   */
  async createListCustomField(listId: string, params: CreateCustomFieldParams): Promise<CustomField> {
    try {
      const url = `https://api.clickup.com/api/v2/list/${listId}/field`;
      const response = await axios.post(url, params, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating list custom field:', error);
      throw this.handleError(error, `Failed to create custom field in list ${listId}`);
    }
  }

  /**
   * Create a custom field in a folder
   */
  async createFolderCustomField(folderId: string, params: CreateCustomFieldParams): Promise<CustomField> {
    try {
      const url = `https://api.clickup.com/api/v2/folder/${folderId}/field`;
      const response = await axios.post(url, params, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating folder custom field:', error);
      throw this.handleError(error, `Failed to create custom field in folder ${folderId}`);
    }
  }

  /**
   * Create a custom field in a space
   */
  async createSpaceCustomField(spaceId: string, params: CreateCustomFieldParams): Promise<CustomField> {
    try {
      const url = `https://api.clickup.com/api/v2/space/${spaceId}/field`;
      const response = await axios.post(url, params, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating space custom field:', error);
      throw this.handleError(error, `Failed to create custom field in space ${spaceId}`);
    }
  }

  /**
   * Update a custom field
   */
  async updateCustomField(fieldId: string, params: UpdateCustomFieldParams): Promise<CustomField> {
    try {
      const url = `https://api.clickup.com/api/v2/field/${fieldId}`;
      const response = await axios.put(url, params, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating custom field:', error);
      throw this.handleError(error, `Failed to update custom field ${fieldId}`);
    }
  }

  /**
   * Delete a custom field
   */
  async deleteCustomField(fieldId: string): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v2/field/${fieldId}`;
      await axios.delete(url, {
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Error deleting custom field:', error);
      throw this.handleError(error, `Failed to delete custom field ${fieldId}`);
    }
  }

  // ========================================
  // CUSTOM FIELD VALUE MANAGEMENT
  // ========================================

  /**
   * Set a custom field value on a task
   */
  async setCustomFieldValue(taskId: string, fieldId: string, value: any): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}`;
      await axios.post(url, { value }, {
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Error setting custom field value:', error);
      throw this.handleError(error, `Failed to set custom field value for task ${taskId}, field ${fieldId}`);
    }
  }

  /**
   * Remove a custom field value from a task
   */
  async removeCustomFieldValue(taskId: string, fieldId: string): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}`;
      await axios.delete(url, {
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error('Error removing custom field value:', error);
      throw this.handleError(error, `Failed to remove custom field value for task ${taskId}, field ${fieldId}`);
    }
  }

  /**
   * Get a custom field value from a task
   */
  async getCustomFieldValue(taskId: string, fieldId: string): Promise<any> {
    try {
      // Get task details which includes custom field values
      const taskUrl = `https://api.clickup.com/api/v2/task/${taskId}`;
      const response = await axios.get(taskUrl, {
        headers: this.getHeaders()
      });
      
      const task = response.data;
      const customField = task.custom_fields?.find((field: any) => field.id === fieldId);
      
      if (!customField) {
        throw new Error(`Custom field ${fieldId} not found on task ${taskId}`);
      }
      
      return {
        field_id: customField.id,
        field_name: customField.name,
        field_type: customField.type,
        value: customField.value,
        type_config: customField.type_config
      };
    } catch (error) {
      console.error('Error getting custom field value:', error);
      throw this.handleError(error, `Failed to get custom field value for task ${taskId}, field ${fieldId}`);
    }
  }

  /**
   * Get all custom field values for a task
   */
  async getTaskCustomFieldValues(taskId: string): Promise<any[]> {
    try {
      const taskUrl = `https://api.clickup.com/api/v2/task/${taskId}`;
      const response = await axios.get(taskUrl, {
        headers: this.getHeaders()
      });
      
      const task = response.data;
      return task.custom_fields?.map((field: any) => ({
        field_id: field.id,
        field_name: field.name,
        field_type: field.type,
        value: field.value,
        type_config: field.type_config,
        required: field.required,
        hide_from_guests: field.hide_from_guests
      })) || [];
    } catch (error) {
      console.error('Error getting task custom field values:', error);
      throw this.handleError(error, `Failed to get custom field values for task ${taskId}`);
    }
  }

  /**
   * Bulk set multiple custom field values on a task
   */
  async bulkSetCustomFieldValues(taskId: string, fieldValues: Array<{field_id: string, value: any}>): Promise<any[]> {
    try {
      const results = [];
      
      // ClickUp doesn't have a native bulk API, so we'll set them individually
      // but return consolidated results
      for (const { field_id, value } of fieldValues) {
        try {
          await this.setCustomFieldValue(taskId, field_id, value);
          results.push({
            field_id,
            value,
            status: 'success'
          });
        } catch (error: any) {
          results.push({
            field_id,
            value,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error bulk setting custom field values:', error);
      throw this.handleError(error, `Failed to bulk set custom field values for task ${taskId}`);
    }
  }

  // ========================================
  // VALIDATION UTILITIES
  // ========================================

  /**
   * Validate a field value against its field type
   */
  validateFieldValue(field: CustomField, value: any): boolean {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return typeof value === 'string';
      
      case 'number':
      case 'currency':
        return typeof value === 'number' && !isNaN(value);
      
      case 'date':
        return typeof value === 'number' && value > 0;
      
      case 'checkbox':
        return typeof value === 'boolean';
      
      case 'url':
        return typeof value === 'string' && this.isValidURL(value);
      
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      
      case 'phone':
        return typeof value === 'string' && value.length > 0;
      
      case 'drop_down':
        return field.type_config.options?.some((opt: DropdownOption) => opt.id === value);
      
      case 'labels':
        return Array.isArray(value) && value.every(v => 
          field.type_config.options?.some((opt: DropdownOption) => opt.id === v)
        );
      
      case 'rating':
        return typeof value === 'number' && 
               value >= 0 && value <= (field.type_config.count || 5);
      
      case 'progress':
        const { start = 0, end = 100 } = field.type_config;
        return typeof value === 'number' && value >= start && value <= end;
      
      case 'task_relationship':
        if (field.type_config.multiple) {
          return Array.isArray(value) && value.every(v => typeof v === 'string');
        }
        return typeof value === 'string';
      
      default:
        return true;
    }
  }

  /**
   * Get field type configuration template
   */
  getFieldTypeTemplate(type: CustomFieldType): Record<string, any> {
    switch (type) {
      case 'text':
      case 'textarea':
        return {
          default: '',
          placeholder: ''
        };
      
      case 'number':
        return {
          default: 0,
          precision: 0
        };
      
      case 'currency':
        return {
          default: 0,
          precision: 2,
          currency_type: 'USD'
        };
      
      case 'date':
        return {
          include_time: false
        };
      
      case 'drop_down':
      case 'labels':
        return {
          options: []
        };
      
      case 'checkbox':
        return {
          default: false
        };
      
      case 'url':
      case 'email':
      case 'phone':
        return {
          placeholder: ''
        };
      
      case 'rating':
        return {
          count: 5,
          default: 0
        };
      
      case 'progress':
        return {
          start: 0,
          end: 100,
          unit: '%'
        };
      
      case 'task_relationship':
        return {
          multiple: false
        };
      
      default:
        return {};
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private isValidURL(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private handleError(error: any, context: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      switch (status) {
        case 400:
          return new Error(`${context}: Invalid request - ${message}`);
        case 401:
          return new Error(`${context}: Authentication failed - check API token`);
        case 403:
          return new Error(`${context}: Permission denied - insufficient access rights`);
        case 404:
          return new Error(`${context}: Resource not found - ${message}`);
        case 429:
          return new Error(`${context}: Rate limit exceeded - please retry later`);
        case 500:
          return new Error(`${context}: Server error - please try again`);
        default:
          return new Error(`${context}: ${message}`);
      }
    }
    
    return new Error(`${context}: ${error.message || 'Unknown error'}`);
  }
}

export const createEnhancedCustomFieldsClient = (client: ClickUpClient): EnhancedCustomFieldsClient => {
  return new EnhancedCustomFieldsClient(client);
};
