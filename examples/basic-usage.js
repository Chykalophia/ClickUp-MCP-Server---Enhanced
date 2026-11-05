/**
 * Basic usage example for the ClickUp MCP Server
 * 
 * This example demonstrates how to use the ClickUp MCP Server
 * with a simple Node.js script that retrieves workspaces and tasks.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  // Run from the repo root after `npm run build`.
  args: ['./packages/core/build/index-enhanced.js'],
  env: {
    // You can provide your ClickUp API token here or use environment variables
    CLICKUP_API_TOKEN: process.env.CLICKUP_API_TOKEN
  }
});

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

async function main() {
  try {
    console.log('Connecting to ClickUp MCP Server...');
    await client.connect(transport);
    console.log('Connected!');

    const { tools } = await client.listTools();
    console.log('Available tools:', tools.map(tool => tool.name));

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
        
        console.log('\nFetching lists...');
        const listsResult = await client.callTool({
          name: 'clickup_get_lists',
          arguments: {
            container_type: 'space',
            container_id: space.id
          }
        });
        
        const { lists } = JSON.parse(listsResult.content[0].text);
        console.log(`Found ${lists.length} lists`);
        
        if (lists.length > 0) {
          const list = lists[0];
          console.log(`Using list: ${list.name} (${list.id})`);
          
          console.log('\nFetching tasks...');
          const tasksResult = await client.callTool({
            name: 'clickup_get_tasks',
            arguments: {
              list_id: list.id,
              include_closed: false
            }
          });
          
          const { tasks } = JSON.parse(tasksResult.content[0].text);
          console.log(`Found ${tasks.length} tasks`);
          
          if (tasks.length > 0) {
            console.log('\nTask details:');
            tasks.forEach(task => {
              console.log(`- ${task.name} (${task.id})`);
              console.log(`  Status: ${task.status.status}`);
              console.log(`  Due date: ${task.due_date ? new Date(Number(task.due_date)).toLocaleDateString() : 'None'}`);
              console.log('');
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

main();
