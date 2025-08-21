# ClickUp MCP Server - Technical Implementation Specifications

**Document Version:** 1.0  
**Date:** August 21, 2025  
**Research Task:** 868f9p3ee  
**Project:** ClickUp MCP Server Enhancement (868f9p3bg)

## Architecture Overview

### Current Architecture
```
src/
├── index.ts                 # Main server entry point
├── tools/                   # MCP tool implementations
│   ├── task-tools.ts       # Task management tools (20 tools)
│   ├── checklist-tools.ts  # Checklist tools (6 tools)
│   ├── comment-tools.ts    # Comment tools (10 tools)
│   ├── doc-tools.ts        # Document tools (4 tools - READ ONLY)
│   └── space-tools.ts      # Space tools (2 tools)
├── clickup-client/         # API client modules
│   ├── index.js           # Main client factory
│   ├── tasks.js           # Task API client
│   ├── lists.js           # List API client
│   ├── folders.js         # Folder API client
│   ├── auth.js            # Authentication client
│   └── docs.js            # Document API client (READ ONLY)
└── resources/             # MCP resource handlers
    ├── task-resources.js
    ├── doc-resources.js
    └── ...
```

### Target Architecture (After Implementation)
```
src/
├── index.ts                 # Enhanced server entry point
├── tools/                   # Expanded MCP tool implementations
│   ├── task-tools.ts       # Enhanced task tools
│   ├── checklist-tools.ts  # Existing checklist tools
│   ├── comment-tools.ts    # Existing comment tools
│   ├── doc-tools.ts        # ENHANCED document tools (READ/WRITE)
│   ├── space-tools.ts      # Existing space tools
│   ├── custom-field-tools.ts    # NEW: Custom fields management
│   ├── time-tracking-tools.ts   # NEW: Time tracking
│   ├── goals-tools.ts           # NEW: Goals management
│   ├── views-tools.ts           # NEW: Views management
│   ├── webhooks-tools.ts        # NEW: Webhooks management
│   ├── dependencies-tools.ts    # NEW: Dependencies management
│   ├── attachments-tools.ts     # NEW: Attachments management
│   ├── template-tools.ts        # NEW: Template management
│   └── tags-status-tools.ts     # NEW: Enhanced tags/status
├── clickup-client/         # Expanded API client modules
│   ├── index.js           # Enhanced client factory
│   ├── tasks.js           # Enhanced task client
│   ├── lists.js           # Existing list client
│   ├── folders.js         # Existing folder client
│   ├── auth.js            # Existing auth client
│   ├── docs.js            # ENHANCED document client (READ/WRITE)
│   ├── custom-fields.js   # NEW: Custom fields client
│   ├── time-tracking.js   # NEW: Time tracking client
│   ├── goals.js           # NEW: Goals client
│   ├── views.js           # NEW: Views client
│   ├── webhooks.js        # NEW: Webhooks client
│   ├── dependencies.js    # NEW: Dependencies client
│   ├── attachments.js     # NEW: Attachments client
│   ├── templates.js       # NEW: Templates client
│   └── tags-status.js     # NEW: Tags/status client
└── resources/             # Enhanced resource handlers
    └── ... (expanded as needed)
```

## Implementation Standards

### Tool Implementation Pattern
All new tools must follow this standardized pattern:

```typescript
// Example: custom-field-tools.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createCustomFieldsClient } from '../clickup-client/custom-fields.js';

// Create clients
const clickUpClient = createClickUpClient();
const customFieldsClient = createCustomFieldsClient(clickUpClient);

export function setupCustomFieldTools(server: McpServer): void {
  // Tool implementation following existing patterns
  server.tool(
    'create_custom_field',
    'Create a new custom field in a list with specified type and configuration.',
    {
      list_id: z.string().describe('The ID of the list to create the custom field in'),
      name: z.string().describe('The name of the custom field'),
      type: z.enum(['text', 'number', 'date', 'dropdown', 'checkbox', 'url', 'email', 'phone', 'rating', 'progress']).describe('The type of custom field'),
      // ... additional parameters based on field type
    },
    async ({ list_id, name, type, ...config }) => {
      try {
        const result = await customFieldsClient.createCustomField(list_id, {
          name,
          type,
          ...config
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
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
}
```

### Client Implementation Pattern
All new API clients must follow this pattern:

```typescript
// Example: custom-fields.js
export function createCustomFieldsClient(clickUpClient) {
  return {
    async createCustomField(listId, fieldData) {
      const response = await clickUpClient.post(`/list/${listId}/field`, fieldData);
      return response.data;
    },

    async updateCustomField(fieldId, fieldData) {
      const response = await clickUpClient.put(`/field/${fieldId}`, fieldData);
      return response.data;
    },

    async deleteCustomField(fieldId) {
      const response = await clickUpClient.delete(`/field/${fieldId}`);
      return response.data;
    },

    async getCustomFields(listId) {
      const response = await clickUpClient.get(`/list/${listId}/field`);
      return response.data;
    },

    async setCustomFieldValue(taskId, fieldId, value) {
      const response = await clickUpClient.post(`/task/${taskId}/field/${fieldId}`, { value });
      return response.data;
    },

    async removeCustomFieldValue(taskId, fieldId) {
      const response = await clickUpClient.delete(`/task/${taskId}/field/${fieldId}`);
      return response.data;
    }
  };
}
```

## Phase 1: Document Management Implementation

### Document Tools Specifications

#### 1. create_doc
```typescript
Parameters:
- workspace_id: string (required)
- name: string (required)
- parent_id?: string (optional - folder/space ID)
- content?: string (optional - initial content)

API Endpoint: POST /doc
Response: Document object with ID, name, URL, etc.
```

#### 2. update_doc
```typescript
Parameters:
- doc_id: string (required)
- name?: string (optional)
- sharing?: object (optional - sharing settings)

API Endpoint: PUT /doc/{doc_id}
Response: Updated document object
```

#### 3. delete_doc
```typescript
Parameters:
- doc_id: string (required)

API Endpoint: DELETE /doc/{doc_id}
Response: Success confirmation
```

#### 4. create_doc_page
```typescript
Parameters:
- doc_id: string (required)
- name: string (required)
- content: string (required)
- content_format?: 'markdown' | 'html' (default: 'markdown')
- position?: number (optional - page order)

API Endpoint: POST /doc/{doc_id}/page
Response: Page object with ID, content, etc.
```

#### 5. update_doc_page
```typescript
Parameters:
- doc_id: string (required)
- page_id: string (required)
- name?: string (optional)
- content?: string (optional)
- content_format?: 'markdown' | 'html' (optional)

API Endpoint: PUT /doc/{doc_id}/page/{page_id}
Response: Updated page object
```

#### 6. delete_doc_page
```typescript
Parameters:
- doc_id: string (required)
- page_id: string (required)

API Endpoint: DELETE /doc/{doc_id}/page/{page_id}
Response: Success confirmation
```

## Phase 1: Custom Fields Implementation

### Custom Field Type System

#### Field Type Definitions
```typescript
type CustomFieldType = 
  | 'text'           // Short text input
  | 'long_text'      // Long text/textarea
  | 'number'         // Numeric input
  | 'currency'       // Currency with formatting
  | 'date'           // Date picker
  | 'datetime'       // Date and time picker
  | 'dropdown'       // Single select dropdown
  | 'labels'         // Multi-select labels
  | 'checkbox'       // Boolean checkbox
  | 'url'            // URL with validation
  | 'email'          // Email with validation
  | 'phone'          // Phone number
  | 'rating'         // Star rating (1-5)
  | 'progress'       // Progress bar (0-100%)

interface CustomFieldConfig {
  name: string;
  type: CustomFieldType;
  required?: boolean;
  hide_from_guests?: boolean;
  
  // Type-specific configurations
  text_options?: {
    max_length?: number;
  };
  
  number_options?: {
    min?: number;
    max?: number;
    precision?: number;
  };
  
  dropdown_options?: {
    options: Array<{
      name: string;
      color?: string;
      orderindex?: number;
    }>;
  };
  
  date_options?: {
    include_time?: boolean;
  };
}
```

### Custom Field Tools Specifications

#### 1. create_custom_field
```typescript
Parameters:
- list_id: string (required)
- name: string (required)
- type: CustomFieldType (required)
- config: CustomFieldConfig (required)

API Endpoint: POST /list/{list_id}/field
Response: Custom field object
```

#### 2. set_custom_field_value
```typescript
Parameters:
- task_id: string (required)
- field_id: string (required)
- value: any (required - type depends on field type)

API Endpoint: POST /task/{task_id}/field/{field_id}
Response: Success confirmation
```

## Phase 2: Time Tracking Implementation

### Time Entry Specifications

#### Time Entry Data Structure
```typescript
interface TimeEntry {
  id: string;
  task_id?: string;
  user_id: string;
  description?: string;
  start: number; // Unix timestamp
  end?: number;  // Unix timestamp (null for running timers)
  duration: number; // Milliseconds
  billable: boolean;
  tags?: string[];
}
```

### Time Tracking Tools Specifications

#### 1. create_time_entry
```typescript
Parameters:
- task_id?: string (optional)
- description?: string (optional)
- duration: number (required - in milliseconds)
- start_date?: number (optional - Unix timestamp)
- billable?: boolean (default: false)
- tags?: string[] (optional)

API Endpoint: POST /team/{team_id}/time_entries
Response: Time entry object
```

#### 2. start_timer
```typescript
Parameters:
- task_id?: string (optional)
- description?: string (optional)
- billable?: boolean (default: false)
- tags?: string[] (optional)

API Endpoint: POST /team/{team_id}/time_entries/{timer_id}/start
Response: Timer object with start time
```

## Phase 2: Goals Implementation

### Goal Type System

#### Goal Data Structure
```typescript
interface Goal {
  id: string;
  name: string;
  description?: string;
  type: 'number' | 'currency' | 'task' | 'custom';
  unit?: string;
  color?: string;
  targets: GoalTarget[];
  current_value: number;
  completion_percentage: number;
}

interface GoalTarget {
  id: string;
  name: string;
  type: 'increase' | 'decrease' | 'reach';
  target_value: number;
  current_value: number;
  unit?: string;
  due_date?: number; // Unix timestamp
}
```

## Error Handling Standards

### Standard Error Response Format
```typescript
interface ErrorResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: true;
}

// Example usage
catch (error: any) {
  console.error('Error in tool operation:', error);
  return {
    content: [{ 
      type: 'text', 
      text: `Error: ${error.message || 'Unknown error occurred'}` 
    }],
    isError: true
  };
}
```

### Common Error Types to Handle
1. **Authentication Errors** (401)
2. **Permission Errors** (403)
3. **Not Found Errors** (404)
4. **Rate Limit Errors** (429)
5. **Validation Errors** (400)
6. **Server Errors** (500)

## Testing Requirements

### Unit Testing Pattern
```typescript
// Example test structure
describe('Custom Field Tools', () => {
  describe('create_custom_field', () => {
    it('should create text custom field successfully', async () => {
      // Test implementation
    });
    
    it('should handle validation errors', async () => {
      // Error handling test
    });
    
    it('should handle permission errors', async () => {
      // Permission error test
    });
  });
});
```

### Integration Testing Requirements
- Test against actual ClickUp API (with test workspace)
- Validate all parameter combinations
- Test error scenarios
- Verify response format consistency

## Performance Considerations

### Rate Limiting Strategy
- Implement exponential backoff for rate limit errors
- Queue requests when approaching limits
- Provide user feedback for rate limit delays

### Caching Strategy
- Cache frequently accessed data (custom field definitions, etc.)
- Implement cache invalidation strategies
- Consider memory usage for large datasets

### Request Optimization
- Batch operations where possible
- Minimize API calls through efficient data fetching
- Use appropriate pagination for large result sets

## Security Considerations

### API Token Management
- Secure token storage and transmission
- Token validation and refresh handling
- Environment-based configuration

### Input Validation
- Sanitize all user inputs
- Validate against expected data types
- Prevent injection attacks

### Permission Handling
- Respect ClickUp permission model
- Graceful handling of permission errors
- User-friendly permission error messages

## Documentation Requirements

### Tool Documentation
Each tool must include:
- Clear description of functionality
- Parameter specifications with types
- Example usage
- Error scenarios and handling

### API Client Documentation
Each client module must include:
- Method descriptions
- Parameter specifications
- Return value documentation
- Error handling examples

## Deployment & CI/CD

### Build Process
- TypeScript compilation
- Linting and formatting checks
- Unit test execution
- Integration test execution

### Quality Gates
- Minimum test coverage (80%)
- No linting errors
- All tests passing
- Documentation completeness

### Release Process
- Version bumping
- Changelog generation
- NPM package publishing
- GitHub release creation

---

**Implementation Priority:**
1. Phase 1: Document Management & Custom Fields
2. Phase 2: Time Tracking & Goals
3. Phase 3: Advanced Features (Views, Webhooks, etc.)

**Success Criteria:**
- All tools follow established patterns
- Comprehensive error handling
- Adequate test coverage
- Complete documentation
- Performance within acceptable limits
