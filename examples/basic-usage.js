/**
 * Basic usage example for the ClickUp MCP Server
 * 
 * This example demonstrates how to use the ClickUp MCP Server
 * with a simple Node.js script that retrieves workspaces and tasks.
 */

// Import required modules
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Create a transport to communicate with the ClickUp MCP Server
const transport = new StdioClientTransport({
  command: 'node',
  args: ['./build/index.js'], // Path to the built ClickUp MCP Server
  env: {
    // You can provide your ClickUp API token here or use environment variables
    CLICKUP_API_TOKEN: process.env.CLICKUP_API_TOKEN
  }
});

// Create an MCP client
const client = new Client(
  {
    name: 'clickup-example-client',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Connect to the ClickUp MCP Server
async function main() {
  try {
    console.log('Connecting to ClickUp MCP Server...');
    await client.connect(transport);
    console.log('Connected!');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.map(tool => tool.name));

    // Get workspaces
    console.log('\nFetching workspaces...');
    const workspacesResult = await client.callTool({
      name: 'clickup_get_workspaces',
      arguments: {}
    });
    
    const workspaces = JSON.parse(workspacesResult.content[0].text);
    console.log(`Found ${workspaces.length} workspaces`);
    
    if (workspaces.length > 0) {
      const workspace = workspaces[0];
      console.log(`Using workspace: ${workspace.name} (${workspace.id})`);
      
      // Get spaces in the workspace
      console.log('\nFetching spaces...');
      const spacesResult = await client.callTool({
        name: 'clickup_get_spaces',
        arguments: {
          workspace_id: workspace.id
        }
      });
      
      const spaces = JSON.parse(spacesResult.content[0].text);
      console.log(`Found ${spaces.length} spaces`);
      
      if (spaces.length > 0) {
        const space = spaces[0];
        console.log(`Using space: ${space.name} (${space.id})`);
        
        // Get lists in the space
        console.log('\nFetching lists...');
        const listsResult = await client.callTool({
          name: 'clickup_get_lists',
          arguments: {
            container_type: 'space',
            container_id: space.id
          }
        });
        
        const lists = JSON.parse(listsResult.content[0].text);
        console.log(`Found ${lists.length} lists`);
        
        if (lists.length > 0) {
          const list = lists[0];
          console.log(`Using list: ${list.name} (${list.id})`);
          
          // Get tasks in the list
          console.log('\nFetching tasks...');
          const tasksResult = await client.callTool({
            name: 'clickup_get_tasks',
            arguments: {
              list_id: list.id,
              include_closed: false
            }
          });
          
          const tasks = JSON.parse(tasksResult.content[0].text);
          console.log(`Found ${tasks.length} tasks`);
          
          // Display task details
          if (tasks.length > 0) {
            console.log('\nTask details:');
            tasks.forEach(task => {
              console.log(`- ${task.name} (${task.id})`);
              console.log(`  Status: ${task.status.status}`);
              console.log(`  Due date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}`);
              console.log('');
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('Connection closed');
  }
}

main();
