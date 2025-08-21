import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedDocsClient } from '../clickup-client/docs-enhanced.js';
import { createAuthClient } from '../clickup-client/auth.js';
import { DocumentToolSchemas } from '../schemas/document-schemas.js';

// Create clients
const clickUpClient = createClickUpClient();
const enhancedDocsClient = createEnhancedDocsClient(clickUpClient);
const authClient = createAuthClient(clickUpClient);

export function setupEnhancedDocTools(server: McpServer): void {
  
  // ========================================
  // EXISTING READ OPERATIONS (Enhanced)
  // ========================================

  server.tool(
    'get_doc_content',
    'Get the content of a specific ClickUp doc. Returns combined content from all pages in the doc.',
    DocumentToolSchemas.getDocPages,
    async ({ doc_id, workspace_id, content_format }) => {
      try {
        const pages = await enhancedDocsClient.getDocPages(workspace_id, doc_id, content_format);
        
        let combinedContent = '';
        if (Array.isArray(pages)) {
          for (const page of pages) {
            if (page.content) {
              combinedContent += `# ${page.name}\n\n${page.content}\n\n`;
            }
          }
        }
        
        return {
          content: [{ type: 'text', text: combinedContent || 'No content found in this doc.' }]
        };
      } catch (error: any) {
        console.error('Error getting doc content:', error);
        return {
          content: [{ type: 'text', text: `Error getting doc content: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'search_docs',
    'Search for docs in a ClickUp workspace using a query string. Returns matching docs with their metadata.',
    DocumentToolSchemas.searchDocs,
    async ({ workspace_id, query, cursor }) => {
      try {
        const result = await enhancedDocsClient.searchDocs(workspace_id, { query, cursor });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error searching docs:', error);
        return {
          content: [{ type: 'text', text: `Error searching docs: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_docs_from_workspace',
    'Get all docs from a ClickUp workspace. Supports pagination and filtering for deleted/archived docs.',
    DocumentToolSchemas.getDocsFromWorkspace,
    async ({ workspace_id, cursor, deleted, archived, limit }) => {
      try {
        const result = await enhancedDocsClient.getDocsFromWorkspace(workspace_id, { 
          cursor,
          deleted,
          archived,
          limit
        });
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting docs from workspace:', error);
        return {
          content: [{ type: 'text', text: `Error getting docs from workspace: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_doc_pages',
    'Get the pages of a specific ClickUp doc. Returns page content in the requested format (markdown or plain text).',
    DocumentToolSchemas.getDocPages,
    async ({ doc_id, workspace_id, content_format }) => {
      try {
        const pages = await enhancedDocsClient.getDocPages(workspace_id, doc_id, content_format);
        return {
          content: [{ type: 'text', text: JSON.stringify(pages, null, 2) }]
        };
      } catch (error: any) {
        console.error('Error getting doc pages:', error);
        return {
          content: [{ type: 'text', text: `Error getting doc pages: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // NEW: DOCUMENT CRUD OPERATIONS
  // ========================================

  server.tool(
    'create_doc',
    'Create a new document in ClickUp. Can be created in a workspace, space, or folder. Supports template-based creation.',
    {
      workspace_id: z.string().optional().describe('The ID of the workspace to create the document in'),
      space_id: z.string().optional().describe('The ID of the space to create the document in'),
      folder_id: z.string().optional().describe('The ID of the folder to create the document in'),
      name: z.string().min(1).max(255).describe('The name of the document'),
      content: z.string().optional().describe('Initial content for the document (markdown or HTML)'),
      public: z.boolean().optional().default(false).describe('Whether the document should be publicly accessible'),
      template_id: z.string().optional().describe('ID of template to create document from')
    },
    async ({ workspace_id, space_id, folder_id, name, content, public: isPublic, template_id }) => {
      try {
        // Validate that at least one parent is specified
        if (!workspace_id && !space_id && !folder_id) {
          return {
            content: [{ type: 'text', text: 'Error: Must specify workspace_id, space_id, or folder_id' }],
            isError: true
          };
        }

        const doc = await enhancedDocsClient.createDoc({
          workspace_id,
          space_id,
          folder_id,
          name,
          content,
          public: isPublic,
          template_id
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Document created successfully!\n\n${JSON.stringify(doc, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating document:', error);
        return {
          content: [{ type: 'text', text: `Error creating document: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_doc',
    'Update an existing ClickUp document. Can update name, content, and sharing settings.',
    {
      doc_id: z.string().min(1).describe('The ID of the document to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the document'),
      content: z.string().optional().describe('New content for the document (markdown or HTML)'),
      public: z.boolean().optional().describe('Update public sharing setting')
    },
    async ({ doc_id, name, content, public: isPublic }) => {
      try {
        // Validate that at least one field is being updated
        if (name === undefined && content === undefined && isPublic === undefined) {
          return {
            content: [{ type: 'text', text: 'Error: Must specify at least one field to update (name, content, or public)' }],
            isError: true
          };
        }

        const updatedDoc = await enhancedDocsClient.updateDoc(doc_id, {
          name,
          content,
          public: isPublic
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Document updated successfully!\n\n${JSON.stringify(updatedDoc, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating document:', error);
        return {
          content: [{ type: 'text', text: `Error updating document: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_doc',
    'Delete a ClickUp document. This action cannot be undone.',
    {
      doc_id: z.string().min(1).describe('The ID of the document to delete')
    },
    async ({ doc_id }) => {
      try {
        await enhancedDocsClient.deleteDoc(doc_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Document ${doc_id} deleted successfully.` 
          }]
        };
      } catch (error: any) {
        console.error('Error deleting document:', error);
        return {
          content: [{ type: 'text', text: `Error deleting document: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_doc',
    'Get detailed information about a specific ClickUp document including metadata and sharing settings.',
    {
      doc_id: z.string().min(1).describe('The ID of the document to get')
    },
    async ({ doc_id }) => {
      try {
        const doc = await enhancedDocsClient.getDoc(doc_id);

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(doc, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error getting document:', error);
        return {
          content: [{ type: 'text', text: `Error getting document: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // NEW: DOCUMENT PAGE MANAGEMENT
  // ========================================

  server.tool(
    'create_doc_page',
    'Create a new page in a ClickUp document. Supports markdown and HTML content formats.',
    {
      doc_id: z.string().min(1).describe('The ID of the document to create the page in'),
      name: z.string().min(1).max(255).describe('The name/title of the page'),
      content: z.string().min(1).describe('The content of the page'),
      content_format: z.enum(['markdown', 'html']).optional().default('markdown').describe('The format of the content'),
      parent_page_id: z.string().optional().describe('ID of parent page for nesting'),
      position: z.number().int().min(0).optional().describe('Position of the page in the document')
    },
    async ({ doc_id, name, content, content_format, parent_page_id, position }) => {
      try {
        const page = await enhancedDocsClient.createPage(doc_id, {
          name,
          content,
          content_format,
          parent_page_id,
          position
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Page created successfully!\n\n${JSON.stringify(page, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating page:', error);
        return {
          content: [{ type: 'text', text: `Error creating page: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_doc_page',
    'Update an existing page in a ClickUp document. Can update name, content, format, and position.',
    {
      doc_id: z.string().min(1).describe('The ID of the document containing the page'),
      page_id: z.string().min(1).describe('The ID of the page to update'),
      name: z.string().min(1).max(255).optional().describe('New name/title for the page'),
      content: z.string().optional().describe('New content for the page'),
      content_format: z.enum(['markdown', 'html']).optional().describe('New format for the content'),
      position: z.number().int().min(0).optional().describe('New position of the page in the document')
    },
    async ({ doc_id, page_id, name, content, content_format, position }) => {
      try {
        // Validate that at least one field is being updated
        if (name === undefined && content === undefined && content_format === undefined && position === undefined) {
          return {
            content: [{ type: 'text', text: 'Error: Must specify at least one field to update (name, content, content_format, or position)' }],
            isError: true
          };
        }

        const updatedPage = await enhancedDocsClient.updatePage(doc_id, page_id, {
          name,
          content,
          content_format,
          position
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Page updated successfully!\n\n${JSON.stringify(updatedPage, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating page:', error);
        return {
          content: [{ type: 'text', text: `Error updating page: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_doc_page',
    'Delete a page from a ClickUp document. This action cannot be undone.',
    {
      doc_id: z.string().min(1).describe('The ID of the document containing the page'),
      page_id: z.string().min(1).describe('The ID of the page to delete')
    },
    async ({ doc_id, page_id }) => {
      try {
        await enhancedDocsClient.deletePage(doc_id, page_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Page ${page_id} deleted successfully from document ${doc_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error deleting page:', error);
        return {
          content: [{ type: 'text', text: `Error deleting page: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // NEW: DOCUMENT SHARING MANAGEMENT
  // ========================================

  server.tool(
    'get_doc_sharing',
    'Get the sharing settings for a ClickUp document.',
    {
      doc_id: z.string().min(1).describe('The ID of the document to get sharing settings for')
    },
    async ({ doc_id }) => {
      try {
        const sharing = await enhancedDocsClient.getDocSharing(doc_id);

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(sharing, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error getting document sharing:', error);
        return {
          content: [{ type: 'text', text: `Error getting document sharing: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_doc_sharing',
    'Update the sharing settings for a ClickUp document.',
    {
      doc_id: z.string().min(1).describe('The ID of the document to update sharing settings for'),
      public: z.boolean().optional().describe('Whether the document should be publicly accessible'),
      public_share_expires_on: z.number().int().positive().optional().describe('Expiration timestamp for public sharing'),
      public_fields: z.array(z.string()).optional().describe('Fields visible in public sharing'),
      team_sharing: z.boolean().optional().describe('Whether to enable team-wide sharing'),
      guest_sharing: z.boolean().optional().describe('Whether to enable guest access')
    },
    async ({ doc_id, public: isPublic, public_share_expires_on, public_fields, team_sharing, guest_sharing }) => {
      try {
        // Validate that at least one sharing setting is being updated
        if (isPublic === undefined && public_share_expires_on === undefined && 
            public_fields === undefined && team_sharing === undefined && guest_sharing === undefined) {
          return {
            content: [{ type: 'text', text: 'Error: Must specify at least one sharing setting to update' }],
            isError: true
          };
        }

        const updatedSharing = await enhancedDocsClient.updateDocSharing(doc_id, {
          public: isPublic,
          public_share_expires_on,
          public_fields,
          team_sharing,
          guest_sharing
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Document sharing updated successfully!\n\n${JSON.stringify(updatedSharing, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating document sharing:', error);
        return {
          content: [{ type: 'text', text: `Error updating document sharing: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // NEW: TEMPLATE OPERATIONS
  // ========================================

  server.tool(
    'create_doc_from_template',
    'Create a new document from a ClickUp template.',
    {
      template_id: z.string().min(1).describe('The ID of the template to use'),
      workspace_id: z.string().optional().describe('The ID of the workspace to create the document in'),
      space_id: z.string().optional().describe('The ID of the space to create the document in'),
      folder_id: z.string().optional().describe('The ID of the folder to create the document in'),
      name: z.string().min(1).max(255).describe('The name of the new document'),
      template_variables: z.record(z.any()).optional().describe('Variables to substitute in the template')
    },
    async ({ template_id, workspace_id, space_id, folder_id, name, template_variables }) => {
      try {
        // Validate that at least one parent is specified
        if (!workspace_id && !space_id && !folder_id) {
          return {
            content: [{ type: 'text', text: 'Error: Must specify workspace_id, space_id, or folder_id' }],
            isError: true
          };
        }

        const doc = await enhancedDocsClient.createDocFromTemplate(template_id, {
          workspace_id,
          space_id,
          folder_id,
          name,
          template_variables
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Document created from template successfully!\n\n${JSON.stringify(doc, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating document from template:', error);
        return {
          content: [{ type: 'text', text: `Error creating document from template: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
