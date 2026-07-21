/* eslint-disable no-console */
import { ClickUpClient } from './index.js';
import axios, { AxiosInstance } from 'axios';

// ========================================
// CUSTOM FIELD TYPE DEFINITIONS
// ========================================

// Real ClickUp custom field type strings as returned by the API.
// NOTE: The ClickUp public API has NO endpoints to create, update, or delete
// custom field DEFINITIONS — fields must be created in the ClickUp UI.
// The API can only list field definitions and get/set/remove field VALUES.
export type CustomFieldType =
  | 'url'
  | 'drop_down'
  | 'email'
  | 'phone'
  | 'date'
  | 'text'
  | 'checkbox'
  | 'number'
  | 'currency'
  | 'tasks'
  | 'users'
  | 'emoji'
  | 'labels'
  | 'automatic_progress'
  | 'manual_progress'
  | 'short_text'
  | 'location';

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

// Text fields ('short_text' = single line, 'text' = long text)
export interface ShortTextField extends BaseCustomField {
  type: 'short_text';
  type_config: {
    default?: string;
    placeholder?: string;
  };
}

export interface LongTextField extends BaseCustomField {
  type: 'text';
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
    default?: number; // Unix timestamp (milliseconds)
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
    options: Array<{
      id: string;
      label: string;
      color?: string;
    }>;
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

// Rating fields (ClickUp calls these 'emoji')
export interface EmojiField extends BaseCustomField {
  type: 'emoji';
  type_config: {
    code_point?: string; // emoji code point, e.g. '2b50' for star
    count: number; // 1-10 rating scale
  };
}

// Progress fields
export interface AutomaticProgressField extends BaseCustomField {
  type: 'automatic_progress';
  type_config: {
    tracking?: Record<string, any>;
    complete_on?: number;
  };
}

export interface ManualProgressField extends BaseCustomField {
  type: 'manual_progress';
  type_config: {
    start?: number; // default: 0
    end?: number; // default: 100
    current?: number;
  };
}

// Relationship fields (task relationships are type 'tasks')
export interface TasksField extends BaseCustomField {
  type: 'tasks';
  type_config: Record<string, any>;
}

// People fields
export interface UsersField extends BaseCustomField {
  type: 'users';
  type_config: {
    single_user?: boolean;
    include_groups?: boolean;
    include_guests?: boolean;
    include_team_members?: boolean;
  };
}

// Location fields
export interface LocationField extends BaseCustomField {
  type: 'location';
  type_config: Record<string, any>;
}

// Union type for all custom fields
export type CustomField =
  | ShortTextField
  | LongTextField
  | NumberField
  | CurrencyField
  | DateField
  | DropdownField
  | LabelsField
  | CheckboxField
  | URLField
  | EmailField
  | PhoneField
  | EmojiField
  | AutomaticProgressField
  | ManualProgressField
  | TasksField
  | UsersField
  | LocationField;

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
  type: 'text' | 'short_text';
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
    value: number; // Unix timestamp in milliseconds
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
      label: string;
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

export interface EmojiFieldValue extends BaseCustomFieldValue {
  type: 'emoji';
  value: {
    value: number; // integer rating
  };
}

export interface ProgressFieldValue extends BaseCustomFieldValue {
  type: 'automatic_progress' | 'manual_progress';
  value: {
    value: number;
  };
}

export interface TasksFieldValue extends BaseCustomFieldValue {
  type: 'tasks';
  value: {
    value: Array<Record<string, any>>; // linked tasks
  };
}

export interface UsersFieldValue extends BaseCustomFieldValue {
  type: 'users';
  value: {
    value: Array<Record<string, any>>; // user objects
  };
}

export interface LocationFieldValue extends BaseCustomFieldValue {
  type: 'location';
  value: {
    value: {
      location: { lat: number; lng: number };
      formatted_address?: string;
    };
  };
}

export type CustomFieldValue =
  | TextFieldValue
  | NumberFieldValue
  | DateFieldValue
  | DropdownFieldValue
  | LabelsFieldValue
  | CheckboxFieldValue
  | URLFieldValue
  | EmojiFieldValue
  | ProgressFieldValue
  | TasksFieldValue
  | UsersFieldValue
  | LocationFieldValue;

// ========================================
// PARAMETER INTERFACES
// ========================================

/**
 * Options accepted by Set/Remove Custom Field Value (and task reads).
 * custom_task_ids/team_id let tasks be addressed by custom task ID
 * (e.g. 'DEV-1234'); team_id is required when custom_task_ids is true.
 */
export interface TaskAddressingOptions {
  customTaskIds?: boolean;
  teamId?: string | number;
}

/**
 * Extra options for Set Custom Field Value. value_options is sent as a
 * top-level sibling of value in the request body; for date fields,
 * { time: true } stores/displays the time component.
 */
export interface SetFieldValueOptions extends TaskAddressingOptions {
  valueOptions?: {
    time?: boolean;
  };
}

export interface SetFieldValueParams {
  value: any; // Type depends on field type
  value_options?: {
    time?: boolean;
  };
}

export interface CustomFieldsResponse {
  fields: CustomField[];
}

// ========================================
// ENHANCED CUSTOM FIELDS CLIENT
// ========================================

export class EnhancedCustomFieldsClient {
  private client: ClickUpClient;
  private http: AxiosInstance;

  constructor(client: ClickUpClient) {
    this.client = client;
    this.http = client.getAxiosInstance();
  }

  // ========================================
  // CUSTOM FIELD LISTING
  // ========================================

  /**
   * Get custom fields for a list (includes fields inherited from parent levels)
   */
  async getListCustomFields(listId: string): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/list/${listId}/field`;
      const response = await this.http.get(url);
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting list custom fields:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get custom fields for list ${listId}`);
    }
  }

  /**
   * Get custom fields created at the folder level (does not include fields
   * created at the list level)
   */
  async getFolderCustomFields(folderId: string): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/folder/${folderId}/field`;
      const response = await this.http.get(url);
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting folder custom fields:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get custom fields for folder ${folderId}`);
    }
  }

  /**
   * Get custom fields created at the space level (does not include fields
   * created at the folder or list level)
   */
  async getSpaceCustomFields(spaceId: string): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/space/${spaceId}/field`;
      const response = await this.http.get(url);
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting space custom fields:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get custom fields for space ${spaceId}`);
    }
  }

  /**
   * Get custom fields created at the workspace (team) level
   */
  async getTeamCustomFields(teamId: string): Promise<CustomField[]> {
    try {
      const url = `https://api.clickup.com/api/v2/team/${teamId}/field`;
      const response = await this.http.get(url);
      return response.data.fields || [];
    } catch (error) {
      console.error('Error getting workspace custom fields:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get custom fields for workspace ${teamId}`);
    }
  }

  // ========================================
  // CUSTOM FIELD VALUE MANAGEMENT
  // ========================================

  /**
   * Build the custom_task_ids/team_id query params for task-addressed requests
   */
  private buildTaskAddressingParams(options?: TaskAddressingOptions): Record<string, any> {
    const params: Record<string, any> = {};
    if (options?.customTaskIds) {
      params.custom_task_ids = true;
      if (options.teamId !== undefined) {
        params.team_id = options.teamId;
      }
    }
    return params;
  }

  /**
   * Set a custom field value on a task.
   *
   * The value shape depends on the field type (e.g. dropdown = option UUID,
   * labels = array of label option UUIDs, users/tasks = {add:[],rem:[]},
   * date = Unix ms, location = {location:{lat,lng},formatted_address}).
   * For date fields, pass options.valueOptions = { time: true } to store the
   * time component — it is sent as a top-level sibling of value in the body.
   */
  async setCustomFieldValue(
    taskId: string,
    fieldId: string,
    value: any,
    options?: SetFieldValueOptions
  ): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}`;
      const body: Record<string, any> = { value };
      if (options?.valueOptions) {
        body.value_options = options.valueOptions;
      }
      await this.http.post(url, body, {
        params: this.buildTaskAddressingParams(options),
      });
    } catch (error) {
      console.error('Error setting custom field value:', error instanceof Error ? error.message : error);
      throw this.handleError(
        error,
        `Failed to set custom field value for task ${taskId}, field ${fieldId}`
      );
    }
  }

  /**
   * Remove a custom field value from a task
   */
  async removeCustomFieldValue(
    taskId: string,
    fieldId: string,
    options?: TaskAddressingOptions
  ): Promise<void> {
    try {
      const url = `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}`;
      await this.http.delete(url, {
        params: this.buildTaskAddressingParams(options),
      });
    } catch (error) {
      console.error('Error removing custom field value:', error instanceof Error ? error.message : error);
      throw this.handleError(
        error,
        `Failed to remove custom field value for task ${taskId}, field ${fieldId}`
      );
    }
  }

  /**
   * Get a custom field value from a task
   */
  async getCustomFieldValue(
    taskId: string,
    fieldId: string,
    options?: TaskAddressingOptions
  ): Promise<any> {
    try {
      // Get task details which includes custom field values
      const taskUrl = `https://api.clickup.com/api/v2/task/${taskId}`;
      const response = await this.http.get(taskUrl, {
        params: this.buildTaskAddressingParams(options),
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
      console.error('Error getting custom field value:', error instanceof Error ? error.message : error);
      throw this.handleError(
        error,
        `Failed to get custom field value for task ${taskId}, field ${fieldId}`
      );
    }
  }

  /**
   * Get all custom field values for a task
   */
  async getTaskCustomFieldValues(
    taskId: string,
    options?: TaskAddressingOptions
  ): Promise<any[]> {
    try {
      const taskUrl = `https://api.clickup.com/api/v2/task/${taskId}`;
      const response = await this.http.get(taskUrl, {
        params: this.buildTaskAddressingParams(options),
      });

      const task = response.data;
      return (
        task.custom_fields?.map((field: any) => ({
          field_id: field.id,
          field_name: field.name,
          field_type: field.type,
          value: field.value,
          type_config: field.type_config,
          required: field.required,
          hide_from_guests: field.hide_from_guests
        })) || []
      );
    } catch (error) {
      console.error('Error getting task custom field values:', error instanceof Error ? error.message : error);
      throw this.handleError(error, `Failed to get custom field values for task ${taskId}`);
    }
  }

  /**
   * Bulk set multiple custom field values on a task
   */
  async bulkSetCustomFieldValues(
    taskId: string,
    fieldValues: Array<{ field_id: string; value: any; value_options?: { time?: boolean } }>,
    options?: TaskAddressingOptions
  ): Promise<any[]> {
    try {
      const results: Array<{ field_id: string; value: any; status: string; error?: string }> = [];

      // ClickUp doesn't have a native bulk API — parallelize independent calls
      const CONCURRENCY = 5;
      for (let i = 0; i < fieldValues.length; i += CONCURRENCY) {
        const chunk = fieldValues.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map(({ field_id, value, value_options }) =>
            this.setCustomFieldValue(taskId, field_id, value, {
              ...options,
              valueOptions: value_options,
            })
          )
        );
        // Promise.allSettled preserves input order, so index back into the chunk
        chunkResults.forEach((result, j) => {
          const { field_id, value } = chunk[j];
          if (result.status === 'fulfilled') {
            results.push({ field_id, value, status: 'success' });
          } else {
            const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
            results.push({ field_id, value, status: 'error', error: errorMessage });
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error bulk setting custom field values:', error instanceof Error ? error.message : error);
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
    case 'short_text':
      return typeof value === 'string';

    case 'number':
    case 'currency':
      return typeof value === 'number' && !isNaN(value);

    case 'date':
      // Unix timestamp in MILLISECONDS (e.g. 1667367645000)
      return typeof value === 'number' && Number.isInteger(value) && value > 0;

    case 'checkbox':
      return typeof value === 'boolean';

    case 'url':
      return typeof value === 'string' && this.isValidURL(value);

    case 'email':
      return typeof value === 'string' && this.isValidEmail(value);

    case 'phone':
      return typeof value === 'string' && value.length > 0;

    case 'drop_down':
      // Canonical value is the option UUID (type_config.options[].id)
      return field.type_config.options?.some((opt: DropdownOption) => opt.id === value);

    case 'labels':
      return (
        Array.isArray(value) &&
          value.every(v => field.type_config.options?.some((opt: { id: string }) => opt.id === v))
      );

    case 'emoji': {
      // Rating fields: an integer within the configured count range
      const count = (field.type_config as { count?: number }).count ?? 5;
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= count;
    }

    case 'automatic_progress':
      // Computed by ClickUp — cannot be set via the API
      return false;

    case 'manual_progress': {
      const { start = 0, end = 100 } = field.type_config as { start?: number; end?: number };
      return typeof value === 'number' && value >= start && value <= end;
    }

    case 'users':
    case 'tasks':
      // People and task-relationship fields take { add: [ids], rem: [ids] }
      return this.isValidAddRemValue(value);

    case 'location':
      // { location: { lat, lng }, formatted_address? }
      return (
        typeof value === 'object' &&
          value !== null &&
          typeof value.location === 'object' &&
          value.location !== null &&
          typeof value.location.lat === 'number' &&
          typeof value.location.lng === 'number' &&
          (value.formatted_address === undefined || typeof value.formatted_address === 'string')
      );

    default:
      return true;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private isValidAddRemValue(value: any): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    const isIdArray = (arr: any): boolean =>
      Array.isArray(arr) && arr.every(v => typeof v === 'string' || typeof v === 'number');
    const hasAdd = value.add !== undefined;
    const hasRem = value.rem !== undefined;
    if (!hasAdd && !hasRem) {
      return false;
    }
    return (!hasAdd || isIdArray(value.add)) && (!hasRem || isIdArray(value.rem));
  }

  private isValidURL(string: string): boolean {
    try {
      const url = new URL(string);
      return !!url;
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

export const createEnhancedCustomFieldsClient = (
  client: ClickUpClient
): EnhancedCustomFieldsClient => {
  return new EnhancedCustomFieldsClient(client);
};
