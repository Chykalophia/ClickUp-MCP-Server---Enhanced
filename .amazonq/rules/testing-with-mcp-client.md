# Testing with MCP Test Client

This is only relevenat if this tool exists on the system.  If it does not, disregard.

## Configuration Setup

1. Create mcpclient.json in the project root (if it does not already exist):
```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": [
        "D:/dev/mcp/clickup-server/build/index.js"
      ],
      "env": {
        "CLICKUP_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

2. Security:
   - mcpclient.json is added to .gitignore
   - Contains sensitive API tokens
   - Each developer maintains their own local copy

## Running Tests

Execute from the clickup-server directory using absolute paths:

```powershell
dotnet run --project D:/dev/ai/my-mcp-servers/mcp-test-client/MCPTestClient/src/MCPTestClient.CLI -- list-all --server clickup
```

Available Commands:
- `list-tools`: View all available tools and their descriptions
- `list-resources`: View available resources
- `list-all`: Comprehensive view of tools, resources, and templates

## Test Verification

When running tests, verify:
1. Tool Registration:
   - All tools are listed
   - Each tool has a proper description
   - Parameter schemas are correct

2. Resource Availability:
   - Resources are properly exposed
   - URIs are correctly formatted
   - Templates are accessible

3. Error Handling:
   - Invalid requests return appropriate errors
   - API token validation works
   - Transport errors are handled gracefully

## Best Practices

1. Always use absolute paths to ensure consistency
2. Keep mcpclient.json updated with latest configuration
3. Test after making changes to:
   - Tool implementations
   - Resource definitions
   - Server configuration
4. Verify tool descriptions are helpful and accurate
5. Check both success and error scenarios
