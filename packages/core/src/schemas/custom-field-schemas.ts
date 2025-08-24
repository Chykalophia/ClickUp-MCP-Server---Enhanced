import { z } from 'zod';

// ========================================
// CUSTOM FIELD TYPE VALIDATION
// ========================================

export const CustomFieldTypeSchema = z.enum([
  'text', 'textarea',
  'number', 'currency',
  'date',
  'drop_down', 'labels',
  'checkbox',
  'url', 'email', 'phone',
  'rating', 'progress',
  'task_relationship'
]);

// ========================================
// FIELD CONFIGURATION SCHEMAS
// ========================================

// Text field configurations
export const TextFieldConfigSchema = z.object({
  default: z.string().optional(),
  placeholder: z.string().optional()
});

// Number field configurations
export const NumberFieldConfigSchema = z.object({
  default: z.number().optional(),
  precision: z.number().min(0).max(8).optional().default(0)
});

// Currency field configurations
export const CurrencyFieldConfigSchema = z.object({
  default: z.number().optional(),
  precision: z.number().min(0).max(8).optional().default(2),
  currency_type: z.string().optional().default('USD')
});

// Date field configurations
export const DateFieldConfigSchema = z.object({
  default: z.number().positive().optional(),
  include_time: z.boolean().optional().default(false)
});

// Dropdown option schema
export const DropdownOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  color: z.string().optional(),
  orderindex: z.number().optional()
});

// Dropdown field configurations
export const DropdownFieldConfigSchema = z.object({
  default: z.number().optional(),
  options: z.array(DropdownOptionSchema).min(1, 'At least one option is required')
});

// Labels field configurations
export const LabelsFieldConfigSchema = z.object({
  options: z.array(DropdownOptionSchema).min(1, 'At least one option is required')
});

// Checkbox field configurations
export const CheckboxFieldConfigSchema = z.object({
  default: z.boolean().optional().default(false)
});

// URL/Email/Phone field configurations
export const ContactFieldConfigSchema = z.object({
  default: z.string().optional(),
  placeholder: z.string().optional()
});

// Rating field configurations
export const RatingFieldConfigSchema = z.object({
  default: z.number().min(0).optional().default(0),
  count: z.number().min(1).max(10).default(5)
});

// Progress field configurations
export const ProgressFieldConfigSchema = z.object({
  default: z.number().optional(),
  start: z.number().optional().default(0),
  end: z.number().optional().default(100),
  unit: z.string().optional().default('%')
}).refine(data => (data.start || 0) < (data.end || 100), {
  message: 'Start value must be less than end value',
  path: ['start']
});

// Task relationship field configurations
export const TaskRelationshipFieldConfigSchema = z.object({
  multiple: z.boolean().optional().default(false)
});

// ========================================
// FIELD CREATION SCHEMAS
// ========================================

// Base field creation schema
const BaseCreateFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required').max(255, 'Field name too long'),
  required: z.boolean().optional().default(false),
  hide_from_guests: z.boolean().optional().default(false)
});

// Text field creation
export const CreateTextFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('text'),
  type_config: TextFieldConfigSchema.optional()
});

// Textarea field creation
export const CreateTextareaFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('textarea'),
  type_config: TextFieldConfigSchema.optional()
});

// Number field creation
export const CreateNumberFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('number'),
  type_config: NumberFieldConfigSchema.optional()
});

// Currency field creation
export const CreateCurrencyFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('currency'),
  type_config: CurrencyFieldConfigSchema.optional()
});

// Date field creation
export const CreateDateFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('date'),
  type_config: DateFieldConfigSchema.optional()
});

// Dropdown field creation
export const CreateDropdownFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('drop_down'),
  type_config: DropdownFieldConfigSchema
});

// Labels field creation
export const CreateLabelsFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('labels'),
  type_config: LabelsFieldConfigSchema
});

// Checkbox field creation
export const CreateCheckboxFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('checkbox'),
  type_config: CheckboxFieldConfigSchema.optional()
});

// URL field creation
export const CreateURLFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('url'),
  type_config: ContactFieldConfigSchema.optional()
});

// Email field creation
export const CreateEmailFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('email'),
  type_config: ContactFieldConfigSchema.optional()
});

// Phone field creation
export const CreatePhoneFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('phone'),
  type_config: ContactFieldConfigSchema.optional()
});

// Rating field creation
export const CreateRatingFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('rating'),
  type_config: RatingFieldConfigSchema.optional()
});

// Progress field creation
export const CreateProgressFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('progress'),
  type_config: ProgressFieldConfigSchema.optional()
});

// Task relationship field creation
export const CreateTaskRelationshipFieldSchema = BaseCreateFieldSchema.extend({
  type: z.literal('task_relationship'),
  type_config: TaskRelationshipFieldConfigSchema.optional()
});

// Union schema for all field creation types
export const CreateCustomFieldSchema = z.discriminatedUnion('type', [
  CreateTextFieldSchema,
  CreateTextareaFieldSchema,
  CreateNumberFieldSchema,
  CreateCurrencyFieldSchema,
  CreateDateFieldSchema,
  CreateDropdownFieldSchema,
  CreateLabelsFieldSchema,
  CreateCheckboxFieldSchema,
  CreateURLFieldSchema,
  CreateEmailFieldSchema,
  CreatePhoneFieldSchema,
  CreateRatingFieldSchema,
  CreateProgressFieldSchema,
  CreateTaskRelationshipFieldSchema
]);

// ========================================
// FIELD UPDATE SCHEMAS
// ========================================

export const UpdateCustomFieldSchema = z.object({
  name: z.string().min(1, 'Field name cannot be empty').max(255, 'Field name too long').optional(),
  type_config: z.record(z.any()).optional(),
  required: z.boolean().optional(),
  hide_from_guests: z.boolean().optional()
}).refine(data => 
  Object.keys(data).length > 0,
{ 
  message: 'Must specify at least one field to update',
  path: ['name']
}
);

// ========================================
// FIELD VALUE VALIDATION SCHEMAS
// ========================================

// Text value schema
export const TextValueSchema = z.string();

// Number value schema
export const NumberValueSchema = z.number().finite();

// Date value schema
export const DateValueSchema = z.number().positive();

// Boolean value schema
export const BooleanValueSchema = z.boolean();

// URL value schema
export const URLValueSchema = z.string().url('Must be a valid URL');

// Email value schema
export const EmailValueSchema = z.string().email('Must be a valid email address');

// Phone value schema
export const PhoneValueSchema = z.string().min(1, 'Phone number cannot be empty');

// Dropdown value schema (option ID)
export const DropdownValueSchema = z.string().min(1, 'Must select a valid option');

// Labels value schema (array of option IDs)
export const LabelsValueSchema = z.array(z.string().min(1)).min(1, 'Must select at least one label');

// Rating value schema
export const RatingValueSchema = z.number().min(0).max(10);

// Progress value schema
export const ProgressValueSchema = z.number();

// Task relationship value schema
export const TaskRelationshipValueSchema = z.union([
  z.string().min(1), // Single task ID
  z.array(z.string().min(1)).min(1) // Multiple task IDs
]);

// ========================================
// CONTAINER VALIDATION SCHEMAS
// ========================================

export const ListIdSchema = z.string().min(1, 'List ID is required');
export const FolderIdSchema = z.string().min(1, 'Folder ID is required');
export const SpaceIdSchema = z.string().min(1, 'Space ID is required');
export const FieldIdSchema = z.string().min(1, 'Field ID is required');
export const TaskIdSchema = z.string().min(1, 'Task ID is required');

// ========================================
// TOOL PARAMETER SCHEMAS
// ========================================

// Get custom fields schemas
export const GetListCustomFieldsSchema = z.object({
  list_id: ListIdSchema,
  include_deleted: z.boolean().optional().default(false)
});

export const GetFolderCustomFieldsSchema = z.object({
  folder_id: FolderIdSchema,
  include_deleted: z.boolean().optional().default(false)
});

export const GetSpaceCustomFieldsSchema = z.object({
  space_id: SpaceIdSchema,
  include_deleted: z.boolean().optional().default(false)
});

// Create custom field schemas
export const CreateListCustomFieldSchema = z.object({
  list_id: ListIdSchema,
  name: z.string().min(1).max(255),
  type: CustomFieldTypeSchema,
  type_config: z.record(z.any()).optional(),
  required: z.boolean().optional().default(false),
  hide_from_guests: z.boolean().optional().default(false)
});

export const CreateFolderCustomFieldSchema = z.object({
  folder_id: FolderIdSchema,
  name: z.string().min(1).max(255),
  type: CustomFieldTypeSchema,
  type_config: z.record(z.any()).optional(),
  required: z.boolean().optional().default(false),
  hide_from_guests: z.boolean().optional().default(false)
});

export const CreateSpaceCustomFieldSchema = z.object({
  space_id: SpaceIdSchema,
  name: z.string().min(1).max(255),
  type: CustomFieldTypeSchema,
  type_config: z.record(z.any()).optional(),
  required: z.boolean().optional().default(false),
  hide_from_guests: z.boolean().optional().default(false)
});

// Update custom field schema
export const UpdateCustomFieldToolSchema = z.object({
  field_id: FieldIdSchema,
  name: z.string().min(1).max(255).optional(),
  type_config: z.record(z.any()).optional(),
  required: z.boolean().optional(),
  hide_from_guests: z.boolean().optional()
});

// Delete custom field schema
export const DeleteCustomFieldSchema = z.object({
  field_id: FieldIdSchema
});

// Set custom field value schema
export const SetCustomFieldValueSchema = z.object({
  task_id: TaskIdSchema,
  field_id: FieldIdSchema,
  value: z.any() // Will be validated based on field type
});

// Remove custom field value schema
export const RemoveCustomFieldValueSchema = z.object({
  task_id: TaskIdSchema,
  field_id: FieldIdSchema
});

// ========================================
// COMBINED TOOL SCHEMAS
// ========================================

export const CustomFieldToolSchemas = {
  // Get operations
  getListCustomFields: GetListCustomFieldsSchema,
  getFolderCustomFields: GetFolderCustomFieldsSchema,
  getSpaceCustomFields: GetSpaceCustomFieldsSchema,

  // Create operations
  createListCustomField: CreateListCustomFieldSchema,
  createFolderCustomField: CreateFolderCustomFieldSchema,
  createSpaceCustomField: CreateSpaceCustomFieldSchema,

  // Update operations
  updateCustomField: UpdateCustomFieldToolSchema,

  // Delete operations
  deleteCustomField: DeleteCustomFieldSchema,

  // Value operations
  setCustomFieldValue: SetCustomFieldValueSchema,
  removeCustomFieldValue: RemoveCustomFieldValueSchema
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
  case 'textarea':
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
    
  case 'rating':
    return RatingValueSchema;
    
  case 'progress':
    return ProgressValueSchema;
    
  case 'task_relationship':
    return TaskRelationshipValueSchema;
    
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
  case 'textarea':
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
    
  case 'rating':
    return RatingFieldConfigSchema;
    
  case 'progress':
    return ProgressFieldConfigSchema;
    
  case 'task_relationship':
    return TaskRelationshipFieldConfigSchema;
    
  default:
    return z.record(z.any());
  }
}
