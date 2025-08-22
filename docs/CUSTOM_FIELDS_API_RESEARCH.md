# Custom Fields API Research & Type System Design

**Task:** 1.4: Research Custom Fields API & Design Type System (868f9p5gk)  
**Date:** August 21, 2025  
**Status:** In Progress

## Executive Summary

Custom Fields in ClickUp provide powerful data collection and organization capabilities. This research analyzes the complete Custom Fields API to design a comprehensive type system for the MCP server implementation.

## Current Implementation Gap

### ❌ Currently Missing (Complete Gap)
The ClickUp MCP server has **NO custom fields functionality** implemented:
- No custom field creation or management
- No custom field value setting or retrieval
- No support for any custom field types
- No integration with task management

This represents a **critical functionality gap** as custom fields are essential for:
- Data collection and organization
- Workflow customization
- Business process automation
- Advanced task management

## ClickUp Custom Fields API Analysis

### API Version & Base URL
- **API Version:** v2 (Custom Fields use v2 endpoints)
- **Base URL:** `https://api.clickup.com/api/v2/`
- **Authentication:** Bearer token in Authorization header

### Custom Field Hierarchy
```
Workspace
├── Space
│   ├── Custom Fields (space-level)
│   └── Folder
│       ├── Custom Fields (folder-level)
│       └── List
│           ├── Custom Fields (list-level)
│           └── Tasks
│               └── Custom Field Values
```

## Complete Custom Field Types Analysis

### 1. Text Fields

#### 1.1 Short Text (text)
```typescript
interface ShortTextField {
  id: string;
  name: string;
  type: 'text';
  type_config: {
    default?: string;
    placeholder?: string;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface ShortTextValue {
  value: string;
}
```

#### 1.2 Long Text (textarea)
```typescript
interface LongTextField {
  id: string;
  name: string;
  type: 'textarea';
  type_config: {
    default?: string;
    placeholder?: string;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface LongTextValue {
  value: string;
}
```

### 2. Number Fields

#### 2.1 Number (number)
```typescript
interface NumberField {
  id: string;
  name: string;
  type: 'number';
  type_config: {
    default?: number;
    precision?: number; // decimal places (0-8)
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface NumberValue {
  value: number;
}
```

#### 2.2 Currency (currency)
```typescript
interface CurrencyField {
  id: string;
  name: string;
  type: 'currency';
  type_config: {
    default?: number;
    precision?: number;
    currency_type?: string; // USD, EUR, GBP, etc.
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface CurrencyValue {
  value: number;
}
```

### 3. Date Fields

#### 3.1 Date (date)
```typescript
interface DateField {
  id: string;
  name: string;
  type: 'date';
  type_config: {
    default?: number; // Unix timestamp
    include_time?: boolean;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface DateValue {
  value: number; // Unix timestamp
}
```

### 4. Selection Fields

#### 4.1 Dropdown (drop_down)
```typescript
interface DropdownField {
  id: string;
  name: string;
  type: 'drop_down';
  type_config: {
    default?: number; // option index
    options: Array<{
      id: string;
      name: string;
      color?: string;
      orderindex: number;
    }>;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface DropdownValue {
  value: {
    id: string;
    name: string;
    color?: string;
  };
}
```

#### 4.2 Labels (labels)
```typescript
interface LabelsField {
  id: string;
  name: string;
  type: 'labels';
  type_config: {
    options: Array<{
      id: string;
      name: string;
      color?: string;
      orderindex: number;
    }>;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format (multiple selection)
interface LabelsValue {
  value: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
}
```

### 5. Boolean Fields

#### 5.1 Checkbox (checkbox)
```typescript
interface CheckboxField {
  id: string;
  name: string;
  type: 'checkbox';
  type_config: {
    default?: boolean;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface CheckboxValue {
  value: boolean;
}
```

### 6. URL Fields

#### 6.1 URL (url)
```typescript
interface URLField {
  id: string;
  name: string;
  type: 'url';
  type_config: {
    default?: string;
    placeholder?: string;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface URLValue {
  value: string; // Must be valid URL
}
```

### 7. Contact Fields

#### 7.1 Email (email)
```typescript
interface EmailField {
  id: string;
  name: string;
  type: 'email';
  type_config: {
    default?: string;
    placeholder?: string;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface EmailValue {
  value: string; // Must be valid email
}
```

#### 7.2 Phone (phone)
```typescript
interface PhoneField {
  id: string;
  name: string;
  type: 'phone';
  type_config: {
    default?: string;
    placeholder?: string;
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface PhoneValue {
  value: string; // Phone number format
}
```

### 8. Rating Fields

#### 8.1 Rating (rating)
```typescript
interface RatingField {
  id: string;
  name: string;
  type: 'rating';
  type_config: {
    default?: number;
    count: number; // Number of stars (1-10)
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface RatingValue {
  value: number; // 0 to count
}
```

### 9. Progress Fields

#### 9.1 Progress (progress)
```typescript
interface ProgressField {
  id: string;
  name: string;
  type: 'progress';
  type_config: {
    default?: number;
    start?: number; // Start value (default: 0)
    end?: number;   // End value (default: 100)
    unit?: string;  // Unit display (%, points, etc.)
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface ProgressValue {
  value: number; // Between start and end values
}
```

### 10. Relationship Fields

#### 10.1 Task Relationship (task_relationship)
```typescript
interface TaskRelationshipField {
  id: string;
  name: string;
  type: 'task_relationship';
  type_config: {
    multiple?: boolean; // Allow multiple task selection
  };
  required: boolean;
  hide_from_guests: boolean;
}

// Value format
interface TaskRelationshipValue {
  value: string | string[]; // Task ID(s)
}
```

## API Endpoints Specification

### 1. Custom Field Management

#### 1.1 Get Custom Fields
```http
GET /list/{list_id}/field
GET /folder/{folder_id}/field
GET /space/{space_id}/field

Response:
{
  "fields": [
    {
      "id": "field_id",
      "name": "Field Name",
      "type": "text",
      "type_config": {...},
      "date_created": "timestamp",
      "hide_from_guests": false,
      "required": false
    }
  ]
}
```

#### 1.2 Create Custom Field
```http
POST /list/{list_id}/field
POST /folder/{folder_id}/field  
POST /space/{space_id}/field

Request Body:
{
  "name": "Field Name",
  "type": "text",
  "type_config": {
    "default": "Default value",
    "placeholder": "Placeholder text"
  },
  "required": false,
  "hide_from_guests": false
}

Response: Created field object
```

#### 1.3 Update Custom Field
```http
PUT /field/{field_id}

Request Body:
{
  "name": "Updated Field Name",
  "type_config": {
    "default": "New default value"
  },
  "required": true
}

Response: Updated field object
```

#### 1.4 Delete Custom Field
```http
DELETE /field/{field_id}

Response: Success confirmation
```

### 2. Custom Field Values

#### 2.1 Set Custom Field Value
```http
POST /task/{task_id}/field/{field_id}

Request Body:
{
  "value": "field_value" // Format depends on field type
}

Response: Success confirmation with value
```

#### 2.2 Remove Custom Field Value
```http
DELETE /task/{task_id}/field/{field_id}

Response: Success confirmation
```

#### 2.3 Get Task with Custom Fields
```http
GET /task/{task_id}?include_subtasks=true

Response includes custom_fields array:
{
  "id": "task_id",
  "name": "Task Name",
  "custom_fields": [
    {
      "id": "field_id",
      "name": "Field Name",
      "type": "text",
      "value": {
        "value": "field_value"
      }
    }
  ]
}
```

## Type System Design

### 1. Base Custom Field Interface
```typescript
interface BaseCustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  date_created: string;
  hide_from_guests: boolean;
  required: boolean;
  type_config: Record<string, any>;
}

type CustomFieldType = 
  | 'text' | 'textarea'
  | 'number' | 'currency'
  | 'date'
  | 'drop_down' | 'labels'
  | 'checkbox'
  | 'url' | 'email' | 'phone'
  | 'rating' | 'progress'
  | 'task_relationship';
```

### 2. Type-Specific Interfaces
```typescript
// Union type for all custom fields
type CustomField = 
  | ShortTextField | LongTextField
  | NumberField | CurrencyField
  | DateField
  | DropdownField | LabelsField
  | CheckboxField
  | URLField | EmailField | PhoneField
  | RatingField | ProgressField
  | TaskRelationshipField;

// Union type for all custom field values
type CustomFieldValue = 
  | ShortTextValue | LongTextValue
  | NumberValue | CurrencyValue
  | DateValue
  | DropdownValue | LabelsValue
  | CheckboxValue
  | URLValue | EmailValue | PhoneValue
  | RatingValue | ProgressValue
  | TaskRelationshipValue;
```

### 3. API Parameter Interfaces
```typescript
interface CreateCustomFieldParams {
  name: string;
  type: CustomFieldType;
  type_config?: Record<string, any>;
  required?: boolean;
  hide_from_guests?: boolean;
}

interface UpdateCustomFieldParams {
  name?: string;
  type_config?: Record<string, any>;
  required?: boolean;
  hide_from_guests?: boolean;
}

interface SetFieldValueParams {
  value: any; // Type depends on field type
}
```

## Validation Strategy

### 1. Field Type Validation
```typescript
const validateFieldValue = (field: CustomField, value: any): boolean => {
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
      return typeof value === 'string' && isValidURL(value);
    
    case 'email':
      return typeof value === 'string' && isValidEmail(value);
    
    case 'drop_down':
      return field.type_config.options.some(opt => opt.id === value);
    
    case 'labels':
      return Array.isArray(value) && value.every(v => 
        field.type_config.options.some(opt => opt.id === v)
      );
    
    case 'rating':
      return typeof value === 'number' && 
             value >= 0 && value <= field.type_config.count;
    
    case 'progress':
      const { start = 0, end = 100 } = field.type_config;
      return typeof value === 'number' && value >= start && value <= end;
    
    default:
      return true;
  }
};
```

### 2. Zod Validation Schemas
```typescript
// Base field schema
const BaseCustomFieldSchema = z.object({
  name: z.string().min(1).max(255),
  required: z.boolean().optional().default(false),
  hide_from_guests: z.boolean().optional().default(false)
});

// Type-specific schemas
const TextFieldSchema = BaseCustomFieldSchema.extend({
  type: z.literal('text'),
  type_config: z.object({
    default: z.string().optional(),
    placeholder: z.string().optional()
  }).optional()
});

const NumberFieldSchema = BaseCustomFieldSchema.extend({
  type: z.literal('number'),
  type_config: z.object({
    default: z.number().optional(),
    precision: z.number().min(0).max(8).optional()
  }).optional()
});

const DropdownFieldSchema = BaseCustomFieldSchema.extend({
  type: z.literal('drop_down'),
  type_config: z.object({
    default: z.number().optional(),
    options: z.array(z.object({
      name: z.string().min(1),
      color: z.string().optional(),
      orderindex: z.number().optional()
    })).min(1)
  })
});

// Union schema for all field types
const CustomFieldSchema = z.discriminatedUnion('type', [
  TextFieldSchema,
  NumberFieldSchema,
  DropdownFieldSchema,
  // ... other field type schemas
]);
```

## Error Handling Strategy

### 1. Common Error Scenarios
- **Field not found** (404) - Field ID doesn't exist
- **Invalid field type** (400) - Unsupported field type
- **Invalid value format** (400) - Value doesn't match field type
- **Required field missing** (400) - Required field has no value
- **Permission denied** (403) - Insufficient access to modify fields
- **Validation failed** (400) - Field configuration invalid

### 2. Error Response Format
```typescript
interface CustomFieldError {
  code: string;
  message: string;
  details?: {
    field_id?: string;
    field_type?: string;
    expected_type?: string;
    validation_errors?: string[];
  };
}
```

## Implementation Roadmap

### Phase 1: Core Field Management
1. **Field CRUD Operations**
   - get_custom_fields
   - create_custom_field
   - update_custom_field
   - delete_custom_field

2. **Basic Field Types**
   - Text fields (text, textarea)
   - Number fields (number, currency)
   - Boolean fields (checkbox)

### Phase 2: Advanced Field Types
3. **Selection Fields**
   - Dropdown fields
   - Label fields (multi-select)

4. **Specialized Fields**
   - Date fields
   - URL/Email/Phone fields
   - Rating fields

### Phase 3: Value Management
5. **Field Value Operations**
   - set_custom_field_value
   - get_custom_field_value
   - remove_custom_field_value

6. **Integration with Tasks**
   - Enhanced task creation with custom fields
   - Task queries with custom field filters

## Security Considerations

### 1. Input Validation
- **Type Safety:** Strict validation of field types and values
- **SQL Injection Prevention:** Parameterized queries for field operations
- **XSS Prevention:** Sanitization of field names and string values

### 2. Permission Management
- **Field Access Control:** Respect ClickUp's field visibility settings
- **Guest Restrictions:** Honor hide_from_guests settings
- **Required Field Validation:** Enforce required field constraints

### 3. Data Integrity
- **Value Consistency:** Ensure values match field type constraints
- **Reference Integrity:** Validate dropdown/label option references
- **Cascade Operations:** Handle field deletion impact on task values

## Performance Considerations

### 1. API Optimization
- **Batch Operations:** Group multiple field operations where possible
- **Caching Strategy:** Cache field definitions to reduce API calls
- **Lazy Loading:** Load field values only when needed

### 2. Memory Management
- **Large Field Sets:** Handle lists with many custom fields efficiently
- **Value Serialization:** Optimize storage of complex field values
- **Query Optimization:** Efficient filtering and sorting with custom fields

## Testing Strategy

### 1. Unit Tests
- Field type validation for all supported types
- Value serialization/deserialization
- Error handling for invalid inputs
- Zod schema validation

### 2. Integration Tests
- End-to-end field creation and value setting
- Cross-field type compatibility
- Permission and access control
- API error scenario handling

### 3. Performance Tests
- Large number of custom fields (100+)
- Complex field configurations
- Bulk value operations
- Concurrent field modifications

---

**Next Steps:**
1. Implement enhanced custom fields client
2. Create comprehensive Zod validation schemas
3. Build MCP tools for field management
4. Add comprehensive test coverage
5. Integrate with existing task management tools
