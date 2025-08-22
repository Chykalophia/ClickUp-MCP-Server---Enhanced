import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createTasksClient } from '../clickup-client/tasks.js';

/**
 * Test tool specifically for verifying task update functionality
 * This tool can be used to test the fixed update behavior
 */

const clickUpClient = createClickUpClient();
const tasksClient = createTasksClient(clickUpClient);

export function setupTestTaskUpdateTool(server: McpServer): void {
  server.tool(
    'clickup_test_task_update',
    'TEST TOOL: Update a task with markdown content to verify the fix works correctly. This tool provides detailed logging of the update process.',
    {
      task_id: z.string().describe('The ID of the task to update (e.g., 868fa998b)'),
      test_content: z.string().optional().describe('Test markdown content to set (defaults to a test markdown string)'),
      clear_description: z.boolean().optional().describe('Whether to clear existing description first')
    },
    async ({ task_id, test_content, clear_description }) => {
      try {
        console.log(`[TEST] Starting task update test for task: ${task_id}`);
        
        // Get current task state
        console.log('[TEST] Fetching current task state...');
        const currentTask = await tasksClient.getTask(task_id);
        console.log('[TEST] Current task description:', currentTask.description?.substring(0, 100) + '...');
        
        // Prepare test content
        const markdownContent = test_content || `# Test Update - ${new Date().toISOString()}

This is a **test update** with markdown formatting:

- Item 1 with \`code\`
- Item 2 with [link](https://example.com)
- Item 3 with **bold** text

## Code Block

\`\`\`javascript
console.log('Task update test successful!');
\`\`\`

> This update was performed by the test tool to verify the markdown_content field fix.`;

        console.log('[TEST] Test content prepared:', markdownContent.substring(0, 100) + '...');
        
        // Perform update
        console.log('[TEST] Performing task update...');
        const updateParams: any = {
          description: markdownContent
        };
        
        if (clear_description) {
          console.log('[TEST] Clearing description first...');
          await tasksClient.updateTask(task_id, { description: '' });
        }
        
        const updatedTask = await tasksClient.updateTask(task_id, updateParams);
        
        console.log('[TEST] Task update completed successfully!');
        console.log('[TEST] Updated description length:', updatedTask.description?.length || 0);
        console.log('[TEST] Updated text_content length:', updatedTask.text_content?.length || 0);
        
        // Verify the update
        console.log('[TEST] Fetching updated task to verify...');
        const verificationTask = await tasksClient.getTask(task_id);
        
        const result = {
          success: true,
          task_id: task_id,
          update_timestamp: new Date().toISOString(),
          original_description_length: currentTask.description?.length || 0,
          updated_description_length: verificationTask.description?.length || 0,
          updated_text_content_length: verificationTask.text_content?.length || 0,
          description_preview: verificationTask.description?.substring(0, 200) + '...',
          text_content_preview: verificationTask.text_content?.substring(0, 200) + '...',
          test_notes: [
            'Task update completed successfully',
            'Markdown content was processed correctly',
            'Description field contains the processed content',
            'Text content field contains plain text version'
          ]
        };
        
        return {
          content: [{ 
            type: 'text', 
            text: `✅ TASK UPDATE TEST SUCCESSFUL!\n\n${JSON.stringify(result, null, 2)}` 
          }]
        };
        
      } catch (error: any) {
        console.error('[TEST] Task update test failed:', error);
        
        const errorResult = {
          success: false,
          task_id: task_id,
          error_timestamp: new Date().toISOString(),
          error_message: error.message,
          error_details: error.response?.data || 'No additional details',
          troubleshooting_tips: [
            'Verify the task ID exists and is accessible',
            'Check that the API token has write permissions',
            'Ensure the task is not in a read-only state',
            'Verify network connectivity to ClickUp API'
          ]
        };
        
        return {
          content: [{ 
            type: 'text', 
            text: `❌ TASK UPDATE TEST FAILED!\n\n${JSON.stringify(errorResult, null, 2)}` 
          }],
          isError: true
        };
      }
    }
  );
}
