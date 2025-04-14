import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createDocsClient } from '../clickup-client/docs.js';

// Create clients
const clickUpClient = createClickUpClient();
const docsClient = createDocsClient(clickUpClient);

export function setupDocResources(server: McpServer): void {
  // Register doc content resource
  server.resource(
    'doc-content',
    new ResourceTemplate('clickup://workspace/{workspace_id}/doc/{doc_id}', { list: undefined }),
    {
      description: 'Get the content of a specific ClickUp doc, combining all pages into a single document.'
    },
    async (uri, params) => {
      try {
        const workspace_id = params.workspace_id as string;
        const doc_id = params.doc_id as string;
        
        console.log('[DocResources] Getting doc:', doc_id, 'from workspace:', workspace_id);
        
        // Get the pages of the doc
        const pages = await docsClient.getDocPages(workspace_id, doc_id);
        
        // Combine the content of all pages
        let combinedContent = '';
        if (Array.isArray(pages)) {
          for (const page of pages) {
            if (page.content) {
              combinedContent += page.content + '\n\n';
            }
          }
        }
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: combinedContent || 'No content found in this doc.',
            },
          ],
        };
      } catch (error: any) {
        console.error('[DocResources] Error fetching doc:', error);
        throw new Error(`Error fetching doc: ${error.message}`);
      }
    }
  );

  // Add some example static resources for discoverability
  server.resource(
    'example-doc',
    'clickup://workspace/9011839976/doc/8cjbgz8-911',
    {
      description: 'An example doc resource demonstrating the doc content format.'
    },
    async (uri) => {
      try {
        const workspace_id = '9011839976';
        const doc_id = '8cjbgz8-911';
        
        console.log('[DocResources] Getting example doc:', doc_id, 'from workspace:', workspace_id);
        
        // Get the pages of the doc
        const pages = await docsClient.getDocPages(workspace_id, doc_id);
        
        // Combine the content of all pages
        let combinedContent = '';
        if (Array.isArray(pages)) {
          for (const page of pages) {
            if (page.content) {
              combinedContent += page.content + '\n\n';
            }
          }
        }
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: combinedContent || 'No content found in this doc.',
            },
          ],
        };
      } catch (error: any) {
        console.error('[DocResources] Error fetching example doc:', error);
        throw new Error(`Error fetching example doc: ${error.message}`);
      }
    }
  );
}
