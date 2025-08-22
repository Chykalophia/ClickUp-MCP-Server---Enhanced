# ClickUp MCP Server - Enhanced Examples

This directory contains examples demonstrating how to use the ClickUp MCP Server - Enhanced in different scenarios.

## Basic Usage Example

The `basic-usage.js` file demonstrates how to:

1. Connect to the ClickUp MCP Server - Enhanced
2. List available tools
3. Retrieve workspaces
4. Retrieve spaces
5. Retrieve lists
6. Retrieve tasks
7. Display task details

### Running the Example

1. Make sure you have built the ClickUp MCP Server - Enhanced:
   ```bash
   npm run build
   ```

2. Set your ClickUp API token as an environment variable:
   ```bash
   # On Linux/macOS
   export CLICKUP_API_TOKEN=your_api_token_here
   
   # On Windows (Command Prompt)
   set CLICKUP_API_TOKEN=your_api_token_here
   
   # On Windows (PowerShell)
   $env:CLICKUP_API_TOKEN="your_api_token_here"
   ```

3. Run the example:
   ```bash
   node examples/basic-usage.js
   ```

## Creating Your Own Client

To create your own client that uses the ClickUp MCP Server - Enhanced:

1. Install the MCP SDK:
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. Create a transport to communicate with the ClickUp MCP Server - Enhanced:
   ```javascript
   import { Client } from '@modelcontextprotocol/sdk/client/index.js';
   import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

   const transport = new StdioClientTransport({
     command: 'node',
     args: ['path/to/clickup-mcp-server/build/index-enhanced.js'],
     env: {
       CLICKUP_API_TOKEN: 'your_api_token_here'
     }
   });
   ```

3. Create an MCP client:
   ```javascript
   const client = new Client(
     {
       name: 'your-client-name',
       version: '1.0.0'
     },
     {
       capabilities: {
         tools: {}
       }
     }
   );
   ```

4. Connect to the ClickUp MCP Server - Enhanced and use its tools:
   ```javascript
   await client.connect(transport);
   
   // Call a tool
   const result = await client.callTool({
     name: 'get_workspaces',
     arguments: {}
   });
   
   // Process the result
   console.log(result.content[0].text);
   
   // Close the connection when done
   await client.close();
   ```

## Additional Examples

More examples will be added in the future to demonstrate:

- Using resources instead of tools
- Working with tasks and checklists
- Managing comments and threaded discussions
- Using OAuth authentication
- Integrating with other systems
