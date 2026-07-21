import { z } from 'zod';

// ========================================
// CUSTOM FIELD TYPE VALIDATION
// ========================================

// Real ClickUp custom field type strings as returned by the API.
// NOTE: The ClickUp public API has NO endpoints to create, update, or delete
// custom field DEFINITIONS — fields must be created in the ClickUp UI, so
// there are no field-creation schemas here; only listing and value schemas.
export const CustomFieldTypeSchema = z.enum([
  'url',
  'drop_down',
  'email',
  'phone',
  'date',
  'text',
  'checkbox',
  'number',
  'currency',
  'tasks',
  'users',
  'emoji',
  'labels',
  'automatic_progress',
  'manual_progress',
  'short_text',
  'location',
]);

// ========================================
// FIELD CONFIGURATION SCHEMAS
// ========================================

// Text field configurations ('text' = long text, 'short_text' = single line)
export const TextFieldConfigSchema = z.object({
  default: z.string().optional(),
  placeholder: z.string().optional(),
});

// Number field configurations
export const NumberFieldConfigSchema = z.object({
  default: z.number().optional(),
  precision: z.number().min(0).max(8).optional().default(0),
});

// Currency field configurations
export const CurrencyFieldConfigSchema = z.object({
  default: z.number().optional(),
  precision: z.number().min(0).max(8).optional().default(2),
  currency_type: z.string().optional().default('USD'),
});

// Date field configurations
export const DateFieldConfigSchema = z.object({
  default: z.number().positive().optional(),
  include_time: z.boolean().optional().default(false),
});

// Dropdown option schema
export const DropdownOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  color: z.string().optional(),
  orderindex: z.number().optional(),
});

// Dropdown field configurations
export const DropdownFieldConfigSchema = z.object({
  default: z.number().optional(),
  options: z.array(DropdownOptionSchema).min(1, 'At least one option is required'),
});

// Labels field configurations
export const LabelsFieldConfigSchema = z.object({
  options: z.array(DropdownOptionSchema).min(1, 'At least one option is required'),
});

// Checkbox field configurations
export const CheckboxFieldConfigSchema = z.object({
  default: z.boolean().optional().default(false),
});

// URL/Email/Phone field configurations
export const ContactFieldConfigSchema = z.object({
  default: z.string().optional(),
  placeholder: z.string().optional(),
});

// Emoji (rating) field configurations
export const EmojiFieldConfigSchema = z.object({
  code_point: z.string().optional(),
  count: z.number().min(1).max(10).default(5),
});

// Manual progress field configurations
export const ManualProgressFieldConfigSchema = z
  .object({
    start: z.number().optional().default(0),
    end: z.number().optional().default(100),
    current: z.number().optional(),
  })
  .refine(data => (data.start || 0) < (data.end || 100), {
    message: 'Start value must be less than end value',
    path: ['start'],
  });

// Automatic progress field configurations (computed by ClickUp)
export const AutomaticProgressFieldConfigSchema = z.object({
  tracking: z.record(z.any()).optional(),
  complete_on: z.number().optional(),
});

// Users (people) field configurations
export const UsersFieldConfigSchema = z.object({
  single_user: z.boolean().optional(),
  include_groups: z.boolean().optional(),
  include_guests: z.boolean().optional(),
  include_team_members: z.boolean().optional(),
});

// ========================================
// FIELD VALUE VALIDATION SCHEMAS
// ========================================

// Text value schema (text / short_text)
export const TextValueSchema = z.string();

// Number value schema (number / currency)
export const NumberValueSchema = z.number().finite();

// Date value schema — Unix timestamp in MILLISECONDS
export const DateValueSchema = z.number().int().positive();

// Boolean value schema
export const BooleanValueSchema = z.boolean();

// URL value schema
export const URLValueSchema = z.string().url('Must be a valid URL');

// Email value schema
export const EmailValueSchema = z.string().email('Must be a valid email address');

// Phone value schema
export const PhoneValueSchema = z.string().min(1, 'Phone number cannot be empty');

// Dropdown value schema (option UUID from type_config.options[].id)
export const DropdownValueSchema = z.string().min(1, 'Must select a valid option');

// Labels value schema (array of label option UUIDs)
export const LabelsValueSchema = z
  .array(z.string().min(1))
  .min(1, 'Must select at least one label');

// Emoji (rating) value schema — integer within the configured count range
export const EmojiValueSchema = z.number().int().min(0).max(10);

// Manual progress value schema — ClickUp expects { "current": <number> }
export const ManualProgressValueSchema = z.object({
  current: z.number(),
});

// Users/tasks value schema — { add: [ids], rem: [ids] }
export const AddRemValueSchema = z
  .object({
    add: z.array(z.union([z.string().min(1), z.number()])).optional(),
    rem: z.array(z.union([z.string().min(1), z.number()])).optional(),
  })
  .refine(data => data.add !== undefined || data.rem !== undefined, {
    message: 'Must specify add and/or rem',
    path: ['add'],
  });

// Location value schema — ClickUp requires formatted_address alongside lat/lng
export const LocationValueSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  formatted_address: z.string(),
});

// value_options schema (sibling of value in the Set Custom Field Value body)
export const ValueOptionsSchema = z.object({
  time: z.boolean().optional(),
});

// ========================================
// CONTAINER VALIDATION SCHEMAS
// ========================================

export const ListIdSchema = z.string().min(1, 'List ID is required');
export const FolderIdSchema = z.string().min(1, 'Folder ID is required');
export const SpaceIdSchema = z.string().min(1, 'Space ID is required');
export const TeamIdSchema = z.string().min(1, 'Team ID is required');
export const FieldIdSchema = z.string().min(1, 'Field ID is required');
export const TaskIdSchema = z.string().min(1, 'Task ID is required');

// ========================================
// TOOL PARAMETER SCHEMAS
// ========================================

// Get custom fields schemas
export const GetListCustomFieldsSchema = z.object({
  list_id: ListIdSchema,
});

export const GetFolderCustomFieldsSchema = z.object({
  folder_id: FolderIdSchema,
});

export const GetSpaceCustomFieldsSchema = z.object({
  space_id: SpaceIdSchema,
});

export const GetTeamCustomFieldsSchema = z.object({
  team_id: TeamIdSchema,
});

// Set custom field value schema
export const SetCustomFieldValueSchema = z.object({
  task_id: TaskIdSchema,
  field_id: FieldIdSchema,
  value: z.any(), // Will be validated based on field type
  value_options: ValueOptionsSchema.optional(),
  custom_task_ids: z.boolean().optional(),
  team_id: z.string().optional(),
});

// Remove custom field value schema
export const RemoveCustomFieldValueSchema = z.object({
  task_id: TaskIdSchema,
  field_id: FieldIdSchema,
  custom_task_ids: z.boolean().optional(),
  team_id: z.string().optional(),
});

// ========================================
// COMBINED TOOL SCHEMAS
// ========================================

export const CustomFieldToolSchemas = {
  // Get operations
  getListCustomFields: GetListCustomFieldsSchema,
  getFolderCustomFields: GetFolderCustomFieldsSchema,
  getSpaceCustomFields: GetSpaceCustomFieldsSchema,
  getTeamCustomFields: GetTeamCustomFieldsSchema,

  // Value operations
  setCustomFieldValue: SetCustomFieldValueSchema,
  removeCustomFieldValue: RemoveCustomFieldValueSchema,
};

// ========================================
// VALIDATION HELPER FUNCTIONS
// ========================================

/**
 * Validate a field value based on field type
 */
export function validateFieldValueByType(fieldType: string, _value: any): z.ZodSchema {
  switch (fieldType) {
    case 'text':
    case 'short_text':
      return TextValueSchema;

    case 'number':
    case 'currency':
      return NumberValueSchema;

    case 'date':
      return DateValueSchema;

    case 'checkbox':
      return BooleanValueSchema;

    case 'url':
      return URLValueSchema;

    case 'email':
      return EmailValueSchema;

    case 'phone':
      return PhoneValueSchema;

    case 'drop_down':
      return DropdownValueSchema;

    case 'labels':
      return LabelsValueSchema;

    case 'emoji':
      return EmojiValueSchema;

    case 'manual_progress':
      return ManualProgressValueSchema;

    case 'automatic_progress':
      // Computed by ClickUp — cannot be set via the API
      return z.never();

    case 'users':
    case 'tasks':
      return AddRemValueSchema;

    case 'location':
      return LocationValueSchema;

    default:
      return z.any();
  }
}

/**
 * Get field type configuration schema
 */
export function getFieldTypeConfigSchema(fieldType: string): z.ZodSchema {
  switch (fieldType) {
    case 'text':
    case 'short_text':
      return TextFieldConfigSchema;

    case 'number':
      return NumberFieldConfigSchema;

    case 'currency':
      return CurrencyFieldConfigSchema;

    case 'date':
      return DateFieldConfigSchema;

    case 'drop_down':
      return DropdownFieldConfigSchema;

    case 'labels':
      return LabelsFieldConfigSchema;

    case 'checkbox':
      return CheckboxFieldConfigSchema;

    case 'url':
    case 'email':
    case 'phone':
      return ContactFieldConfigSchema;

    case 'emoji':
      return EmojiFieldConfigSchema;

    case 'manual_progress':
      return ManualProgressFieldConfigSchema;

    case 'automatic_progress':
      return AutomaticProgressFieldConfigSchema;

    case 'users':
      return UsersFieldConfigSchema;

    default:
      return z.record(z.any());
  }
}
