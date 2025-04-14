# ClickUp MCP Server System Patterns

## Architecture Overview

```mermaid
flowchart TD
    A[AI Assistant] --> B[MCP Server]
    B --> C[API Client Layer]
    C --> D[ClickUp API]
    
    subgraph MCP Server
        E[Tools] --> F[API Clients]
        G[Resources] --> F
        H[Error Handling] --> F
    end
```

## Core Patterns

### 1. API Client Layer
```mermaid
flowchart LR
    A[Base Client] --> B[Auth Client]
    A --> C[Tasks Client]
    A --> D[Lists Client]
    A --> E[Spaces Client]
    A --> F[Folders Client]
    A --> G[Docs Client]
    A --> H[Comments Client]
    A --> I[Checklists Client]
```

Pattern:
- Each entity has dedicated client
- Clients inherit from base client
- Consistent error handling
- Standard response formatting

### 2. Tool Implementation
```mermaid
flowchart TD
    A[Tool Registration] --> B[Input Validation]
    B --> C[API Call]
    C --> D[Response Formatting]
    D --> E[Error Handling]
```

Pattern:
- Clear tool naming
- Strong parameter typing
- Comprehensive descriptions
- Consistent error patterns

### 3. Resource Structure
```mermaid
flowchart TD
    A[Resource Template] --> B[URI Pattern]
    B --> C[Parameter Extraction]
    C --> D[Data Retrieval]
    D --> E[Response Formatting]
```

Pattern:
- URI-based access
- Clear parameter patterns
- Consistent data format
- Resource relationships

## Design Decisions

### 1. Authentication
- API Token based
- Optional OAuth support
- Token security measures
- Rate limiting handling

### 2. Error Handling
```typescript
try {
  // API call
} catch (error: any) {
  console.error('[Error] API call failed:', error);
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}
```

Pattern:
- Consistent error format
- Detailed error messages
- Error type identification
- Recovery suggestions

### 3. Response Formatting
```typescript
return {
  content: [{
    type: 'text',
    text: JSON.stringify(result, null, 2)
  }]
};
```

Pattern:
- Consistent structure
- Pretty formatting
- Type identification
- Complete data

## Component Relationships

### 1. Tool to Client
```mermaid
flowchart LR
    A[Tool Layer] --> B[Parameter Validation]
    B --> C[API Client]
    C --> D[ClickUp API]
    D --> E[Response]
    E --> F[Formatting]
```

### 2. Resource to Client
```mermaid
flowchart LR
    A[Resource Request] --> B[URI Processing]
    B --> C[Parameter Extraction]
    C --> D[API Client]
    D --> E[Data Retrieval]
```

### 3. Error Flow
```mermaid
flowchart TD
    A[API Call] --> B{Error?}
    B -->|Yes| C[Error Handler]
    C --> D[Format Error]
    D --> E[Return Response]
    B -->|No| F[Format Success]
```

## Implementation Guidelines

### 1. Tool Creation
```typescript
server.tool(
  'tool_name',
  { description: 'Tool purpose and usage' },
  {
    param: z.string().describe('Parameter description')
  },
  async (params) => {
    // Implementation
  }
);
```

### 2. Resource Definition
```typescript
server.resource(
  'resource_name',
  new ResourceTemplate('scheme://{param}'),
  async (uri, params) => {
    // Implementation
  }
);
```

### 3. Error Handling
```typescript
try {
  const result = await apiCall();
  return formatSuccess(result);
} catch (error) {
  return formatError(error);
}
```

## Testing Patterns

### 1. Tool Testing
- Verify registration
- Check descriptions
- Validate parameters
- Test error cases

### 2. Resource Testing
- Verify URI patterns
- Check data access
- Validate formatting
- Test relationships

### 3. Integration Testing
- End-to-end flows
- Error scenarios
- Performance checks
- Security validation

## Best Practices

### 1. Code Organization
- Modular structure
- Clear separation
- Consistent patterns
- Strong typing

### 2. Documentation
- Clear descriptions
- Usage examples
- Error guidance
- Relationship documentation

### 3. Error Management
- Consistent handling
- Clear messages
- Recovery paths
- Logging standards
