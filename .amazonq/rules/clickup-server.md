# MCP Server Development Protocol - ClickUp Server

⚠️ CRITICAL: DO NOT USE attempt_completion BEFORE TESTING ⚠️

## Step 1: Planning (PLAN MODE)
- **What problem does this tool solve?**
  - Provides a standardized interface for AI assistants to interact with the ClickUp API
  - Enables AI systems to access and manipulate ClickUp data (workspaces, spaces, folders, lists, tasks, docs, comments, checklists)
  - Bridges the gap between AI assistants and the ClickUp platform without needing to understand the specifics of the ClickUp API

- **What API/service will it use?**
  - ClickUp API (https://clickup.com/api/)

- **What are the authentication requirements?**
  - ✓ Standard API key (ClickUp API Token)
  - ✓ OAuth (optional, supported through separate setup script)

## Step 2: Implementation (ACT MODE)
1. **Bootstrap**
   - Using the MCP SDK for TypeScript:
     ```bash
     npx @modelcontextprotocol/create-server clickup-mcp-server
     cd clickup-mcp-server
     npm install axios dotenv express zod @modelcontextprotocol/sdk
     ```

2. **Core Implementation**
   - Implemented using MCP SDK with modular architecture:
     ```
     clickup-mcp-server/
     ├── src/
     │   ├── index.ts                 # Main server entry point
     │   ├── app.ts                   # Express app setup (for HTTP transport)
     │   ├── clickup-client/          # API clients for ClickUp
     │   │   ├── auth.ts              # Authentication handling
     │   │   ├── tasks.ts             # Task-related API calls
     │   │   ├── lists.ts             # List-related API calls
     │   │   ├── spaces.ts            # Space-related API calls
     │   │   ├── folders.ts           # Folder-related API calls
     │   │   ├── docs.ts              # Doc-related API calls
     │   │   ├── comments.ts          # Comment-related API calls
     │   │   ├── checklists.ts        # Checklist-related API calls
     │   │   └── index.ts             # Client exports
     │   ├── tools/                   # MCP tool implementations
     │   ├── resources/               # MCP resource implementations
     │   ├── controllers/             # Business logic controllers
     │   ├── routes/                  # Express routes (for HTTP)
     │   └── services/                # Service layer
     └── scripts/
         └── get-access-token.js      # Helper for OAuth token retrieval
     ```
   - Comprehensive logging:
     ```typescript
     console.error('[ClickUp API] Requesting workspace data');
     console.error('[ClickUp API] Request to endpoint:', endpoint);
     console.error('[Error] API call failed with:', error);
     ```
   - Strong type definitions with TypeScript and Zod schemas for all inputs and outputs
   - Error handling with context in all API clients
   - Rate limiting through ClickUp API constraints

3. **Configuration**
   - API Token authentication:
     ```json
     {
       "mcpServers": {
         "clickup": {
           "command": "clickup-mcp-server",
           "env": {
             "CLICKUP_API_TOKEN": "your_api_token_here"
           },
           "disabled": false,
           "autoApprove": []
         }
       }
     }
     ```
   - Or if installed from source:
     ```json
     {
       "mcpServers": {
         "clickup": {
           "command": "node",
           "args": ["path/to/clickup-mcp-server/build/index-enhanced.js"],
           "env": {
             "CLICKUP_API_TOKEN": "your_api_token_here"
           },
           "disabled": false,
           "autoApprove": []
         }
       }
     }
     ```

## Step 3: Testing (BLOCKER ⛔️)

<thinking>
BEFORE using attempt_completion, I MUST verify:
- Have I tested EVERY tool?
- Have I confirmed success from the user for each test?
- Have I documented the test results?

If ANY answer is "no", I MUST NOT use attempt_completion.
</thinking>

1. **Test Each Tool (REQUIRED)**
   - Testing workspace and space tools:
     ```javascript
     // Test get_workspaces
     use_mcp_tool({
       server_name: "clickup",
       tool_name: "get_workspaces",
       arguments: {}
     })
     
     // Test get_spaces
     use_mcp_tool({
       server_name: "clickup",
       tool_name: "get_spaces",
       arguments: { 
         workspace_id: "9011839976" 
       }
     })
     ```
   
   - Testing task tools:
     ```javascript
     // Test get_tasks
     use_mcp_tool({
       server_name: "clickup",
       tool_name: "get_tasks",
       arguments: {
         list_id: "901109776097",
         include_closed: false
       }
     })
     
     // Test create_task
     use_mcp_tool({
       server_name: "clickup",
       tool_name: "create_task",
       arguments: {
         list_id: "901109776097",
         name: "Test task from MCP",
         description: "This is a test task"
       }
     })
     ```
   
   - Testing document tools:
     ```javascript
     // Test get_docs_from_workspace
     use_mcp_tool({
       server_name: "clickup",
       tool_name: "get_docs_from_workspace",
       arguments: { 
         workspace_id: "9011839976",
         deleted: false,
         archived: false
       }
     })
     ```
   
   - Testing resource access:
     ```javascript
     // Test task resource
     access_mcp_resource({
       server_name: "clickup",
       uri: "clickup://task/86rkjvttt"
     })
     
     // Test lists in folder resource
     access_mcp_resource({
       server_name: "clickup",
       uri: "clickup://folder/90115795569/lists"
     })
     ```
   
   ⚠️ DO NOT PROCEED UNTIL ALL TOOLS TESTED

## Step 4: Completion
❗ STOP AND VERIFY:
- ✓ Every tool has been tested with valid inputs
- ✓ Output format is correct for each tool
- ✓ Error handling has been verified
- ✓ All resources are accessible

Only after ALL tools have been tested can attempt_completion be used.

## Available Tools and Resources

### Tools

The server provides tools for interacting with various ClickUp entities:

#### Workspace and Authentication Tools
- `get_workspaces`: Get the list of workspaces the user has access to
- `get_workspace_seats`: Get information about seats in a workspace

#### Space Tools
- `get_spaces`: Get spaces within a workspace
- `get_space`: Get details of a specific space

#### Folder Tools
- `create_folder`: Create a new folder in a space
- `update_folder`: Update an existing folder
- `delete_folder`: Delete a folder

#### List Tools
- `get_lists`: Get lists in a folder or space
- `get_folderless_lists`: Get lists not in any folder
- `get_list`: Get details of a specific list
- `create_list`: Create a new list in a folder or space
- `create_folderless_list`: Create a list not in any folder
- `update_list`: Update an existing list
- `delete_list`: Delete a list
- `create_list_from_template_in_folder`: Create a list from a template in a folder
- `create_list_from_template_in_space`: Create a list from a template in a space

#### Task Tools
- `get_tasks`: Get tasks from a list
- `get_task_details`: Get detailed information about a task
- `create_task`: Create a new task
- `update_task`: Update an existing task
- `add_task_to_list`: Add a task to a list
- `remove_task_from_list`: Remove a task from a list

#### Document Tools
- `get_docs_from_workspace`: Get all docs from a workspace
- `get_doc_content`: Get the content of a specific doc
- `get_doc_pages`: Get the pages of a doc
- `search_docs`: Search for docs in a workspace

#### Checklist Tools
- `create_checklist`: Create a new checklist in a task
- `update_checklist`: Update an existing checklist
- `delete_checklist`: Delete a checklist
- `create_checklist_item`: Create a new checklist item
- `update_checklist_item`: Update an existing checklist item
- `delete_checklist_item`: Delete a checklist item

#### Comment Tools
- `get_task_comments`: Get comments for a task
- `create_task_comment`: Create a comment on a task
- `get_chat_view_comments`: Get comments for a chat view
- `create_chat_view_comment`: Create a comment on a chat view
- `get_list_comments`: Get comments for a list
- `create_list_comment`: Create a comment on a list
- `update_comment`: Update an existing comment
- `delete_comment`: Delete a comment
- `get_threaded_comments`: Get threaded comments for a parent comment
- `create_threaded_comment`: Create a threaded comment

### Resources

The server exposes ClickUp data through URI-addressable resources:

- `clickup://task/{task_id}`: Details of a specific task
- `clickup://task/{task_id}/comments`: Comments for a specific task
- `clickup://task/{task_id}/checklist`: Checklists for a specific task
- `clickup://list/{list_id}`: Details of a specific list
- `clickup://list/{list_id}/comments`: Comments for a specific list
- `clickup://folder/{folder_id}`: Details of a specific folder
- `clickup://folder/{folder_id}/lists`: Lists in a specific folder
- `clickup://space/{space_id}`: Details of a specific space
- `clickup://space/{space_id}/folders`: Folders in a specific space
- `clickup://space/{space_id}/lists`: Folderless lists in a specific space
- `clickup://workspace/{workspace_id}/spaces`: Spaces in a specific workspace
- `clickup://workspace/{workspace_id}/doc/{doc_id}`: Content of a specific doc
- `clickup://view/{view_id}/comments`: Comments for a specific chat view
- `clickup://comment/{comment_id}/reply`: Threaded comments for a specific comment
- `clickup://checklist/{checklist_id}/items`: Items in a specific checklist

## Development Guidelines

### Code Organization
- **Modular Structure**: Clear separation of concerns
- **Consistent Patterns**: Standardized implementation across all tools
- **Strong Typing**: TypeScript strict mode with comprehensive validation
- **Error Management**: Consistent handling with clear messages

### Documentation Requirements
- **Tool Descriptions**: Clear purpose and usage context for every tool
- **Resource Documentation**: Complete data structure and relationship explanations
- **Parameter Explanations**: Detailed descriptions for all parameters
- **Error Scenarios**: Documentation of error cases and recovery

### Testing Standards
- **MCP Test Client**: Verify all tools and resources are properly documented
- **Security Testing**: 85+ test cases covering all attack vectors
- **Integration Testing**: End-to-end validation of all workflows
- **Error Handling**: Comprehensive error scenario testing

## Key Requirements
- ✓ Uses MCP SDK (@modelcontextprotocol/sdk v1.6.1)
- ✓ Comprehensive logging throughout all API clients
- ✓ Strong typing with TypeScript and Zod schemas
- ✓ Error handling in all API interactions
- ✓ No testing skipped before completion
- ✓ Available as npm package: `clickup-mcp-server`

## Technical Architecture

### Core Dependencies
- **TypeScript 5.x**: Strong typing and modern ECMAScript features
- **Zod**: Schema validation and runtime type checking
- **Axios**: HTTP client for API requests
- **Express**: HTTP server for SSE support
- **dotenv**: Environment variable management

### System Patterns

#### API Client Layer
```
Base Client → Auth Client
           → Tasks Client
           → Lists Client
           → Spaces Client
           → Folders Client
           → Docs Client
           → Comments Client
           → Checklists Client
```

#### Error Handling Pattern
```typescript
try {
  const result = await apiCall();
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  };
} catch (error: any) {
  console.error('[Error] API call failed:', error);
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}
```

#### Tool Implementation Pattern
```typescript
server.tool(
  'tool_name',
  { description: 'Clear tool purpose and usage context' },
  {
    param: z.string().describe('Parameter description')
  },
  async (params) => {
    // Implementation with error handling
  }
);
```

### Security Requirements
- **Input Validation**: XSS and injection prevention
- **API Token Security**: Secure storage and validation
- **Rate Limiting**: 1000 API, 100 webhook, 10 upload/min
- **HMAC Validation**: Timing-safe webhook signature verification
- **File Security**: Path traversal prevention, size limits

### Performance Considerations
- **Response Time**: API call optimization and caching
- **Memory Usage**: Resource cleanup and management
- **Concurrency**: Request handling and connection limits
- **Bulk Operations**: Multiple items in single requests
