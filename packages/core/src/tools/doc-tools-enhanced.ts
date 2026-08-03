/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedDocsClient } from '../clickup-client/docs-enhanced.js';
import {} from /* createAuthClient */ '../clickup-client/auth.js';
import {} from /* DocumentToolSchemas */ '../schemas/document-schemas.js';
import { mcpError } from '../utils/error-handling.js';
import { idSchema } from '../schemas/common.js';

// Create clients
const clickUpClient = createClickUpClient();
const enhancedDocsClient = createEnhancedDocsClient(clickUpClient);
// const authClient = createAuthClient(clickUpClient);

// Tool-facing content format values; 'markdown' and 'html' are normalized to
// the API values ('text/md'/'text/html') by the client before sending.
const contentFormatEnum = z.enum(['markdown', 'html', 'text/md', 'text/plain', 'text/html']);

// Documented parent_type values for the Search Docs filter
const parentTypeEnum = z.enum(['SPACE', 'FOLDER', 'LIST', 'EVERYTHING', 'WORKSPACE', '4', '5', '6', '7', '12']);

export function setupEnhancedDocTools(server: McpServer): void {
  // ========================================
  // READ OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_doc_content',
    'Get the content of a specific ClickUp doc. Returns combined content from all pages in the doc.',
    {
      workspace_id: idSchema().describe('The ID of the workspace containing the doc'),
      doc_id: idSchema().describe('The ID of the doc to get'),
      content_format: contentFormatEnum
        .optional()
        .default('text/md')
        .describe('The format to return the content in (markdown maps to text/md, html to text/html)')
    },
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
      } catch (error: unknown) {
        return mcpError('getting doc content', error);
      }
    }
  );

  server.tool(
    'clickup_search_docs',
    'Search for docs in a ClickUp workspace. Supports the documented v3 filters (creator, parent, deleted, archived) plus a free-text name filter applied client-side (the ClickUp API has no full-text doc search).',
    {
      workspace_id: idSchema().describe('The ID of the workspace to search in'),
      query: z
        .string()
        .optional()
        .describe('Free-text name filter, matched client-side against doc names'),
      doc_id: idSchema().optional().describe('Filter to a specific doc ID'),
      creator: z.number().int().optional().describe('Filter by creator user ID'),
      deleted: z.boolean().optional().describe('Whether to include deleted docs'),
      archived: z.boolean().optional().describe('Whether to include archived docs'),
      parent_id: idSchema().optional().describe('Filter docs by parent ID'),
      parent_type: parentTypeEnum.optional().describe('Filter docs by parent type'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum number of docs to return'),
      cursor: z.string().optional().describe('Cursor for pagination (next_cursor from a previous response)')
    },
    async ({ workspace_id, query, doc_id, creator, deleted, archived, parent_id, parent_type, limit, cursor }) => {
      try {
        const result = await enhancedDocsClient.searchDocs(workspace_id, {
          query,
          id: doc_id,
          creator,
          deleted,
          archived,
          parent_id,
          parent_type,
          limit,
          cursor
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('searching docs', error);
      }
    }
  );

  server.tool(
    'clickup_get_docs_from_workspace',
    'Get all docs from a ClickUp workspace. Supports pagination and filtering by creator, parent, and deleted/archived state.',
    {
      workspace_id: idSchema().describe('The ID of the workspace to get docs from'),
      cursor: z.string().optional().describe('Cursor for pagination (next_cursor from a previous response)'),
      deleted: z.boolean().optional().default(false).describe('Whether to include deleted docs'),
      archived: z.boolean().optional().default(false).describe('Whether to include archived docs'),
      creator: z.number().int().optional().describe('Filter by creator user ID'),
      parent_id: idSchema().optional().describe('Filter docs by parent ID'),
      parent_type: parentTypeEnum.optional().describe('Filter docs by parent type'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('The maximum number of docs to return')
    },
    async ({ workspace_id, cursor, deleted, archived, creator, parent_id, parent_type, limit }) => {
      try {
        const result = await enhancedDocsClient.getDocsFromWorkspace(workspace_id, {
          cursor,
          deleted,
          archived,
          creator,
          parent_id,
          parent_type,
          limit
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting docs from workspace', error);
      }
    }
  );

  server.tool(
    'clickup_get_doc_pages',
    'Get the pages of a specific ClickUp doc. Returns page content in the requested format (markdown or plain text).',
    {
      workspace_id: idSchema().describe('The ID of the workspace containing the doc'),
      doc_id: idSchema().describe('The ID of the doc to get pages from'),
      content_format: contentFormatEnum
        .optional()
        .default('text/md')
        .describe('The format to return the content in (markdown maps to text/md, html to text/html)')
    },
    async ({ doc_id, workspace_id, content_format }) => {
      try {
        const pages = await enhancedDocsClient.getDocPages(workspace_id, doc_id, content_format);
        return {
          content: [{ type: 'text', text: JSON.stringify(pages, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('getting doc pages', error);
      }
    }
  );

  server.tool(
    'clickup_list_doc_pages',
    'List the page hierarchy of a ClickUp doc (page IDs and names, without content). Much cheaper than clickup_get_doc_pages for large docs.',
    {
      workspace_id: idSchema().describe('The ID of the workspace containing the doc'),
      doc_id: idSchema().describe('The ID of the doc to list pages for'),
      max_page_depth: z
        .number()
        .int()
        .optional()
        .default(-1)
        .describe('Maximum depth of nested pages to return (-1 for unlimited)')
    },
    async ({ workspace_id, doc_id, max_page_depth }) => {
      try {
        const listing = await enhancedDocsClient.getDocPageListing(
          workspace_id,
          doc_id,
          max_page_depth
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(listing, null, 2) }]
        };
      } catch (error: unknown) {
        return mcpError('listing doc pages', error);
      }
    }
  );

  server.tool(
    'clickup_get_doc',
    'Get detailed information about a specific ClickUp document including metadata.',
    {
      workspace_id: idSchema().describe('The ID of the workspace containing the document'),
      doc_id: idSchema().describe('The ID of the document to get')
    },
    async ({ workspace_id, doc_id }) => {
      try {
        const doc = await enhancedDocsClient.getDoc(workspace_id, doc_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2)
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('getting document', error);
      }
    }
  );

  // ========================================
  // DOCUMENT CREATION
  // ========================================

  server.tool(
    'clickup_create_doc',
    'Create a new document in a ClickUp workspace. Placement inside the hierarchy (space, folder, list) is set via the parent fields. If content is supplied, it is added as the first page. Note: the ClickUp public API has no doc update/delete, page delete, sharing, or template endpoints.',
    {
      workspace_id: idSchema().describe('The ID of the workspace to create the document in'),
      name: z.string().min(1).max(255).describe('The name of the document'),
      space_id: idSchema().optional().describe('Place the doc in this space (parent type 4)'),
      folder_id: idSchema().optional().describe('Place the doc in this folder (parent type 5)'),
      parent_id: z
        .string()
        .optional()
        .describe('Explicit parent ID (used with parent_type; overrides space_id/folder_id)'),
      parent_type: z
        .union([z.literal(4), z.literal(5), z.literal(6), z.literal(7), z.literal(12)])
        .optional()
        .describe('Parent type for parent_id: 4=space, 5=folder, 6=list, 7=everything, 12=workspace'),
      content: z
        .string()
        .optional()
        .describe('Initial content for the document, added as its first page'),
      content_format: contentFormatEnum
        .optional()
        .default('text/md')
        .describe('Format of the initial content'),
      public: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the document should be publicly accessible (visibility PUBLIC vs PRIVATE)'),
      create_page: z
        .boolean()
        .optional()
        .describe('Whether ClickUp should create an initial empty page (default true; ignored when content is supplied)')
    },
    async ({ workspace_id, name, space_id, folder_id, parent_id, parent_type, content, content_format, public: isPublic, create_page }) => {
      try {
        if ((parent_id === undefined) !== (parent_type === undefined)) {
          throw new Error('parent_id and parent_type must be provided together');
        }
        const parent =
          parent_id && parent_type !== undefined ? { id: parent_id, type: parent_type } : undefined;

        const doc = await enhancedDocsClient.createDoc({
          workspace_id,
          name,
          parent,
          space_id,
          folder_id,
          content,
          content_format,
          public: isPublic,
          create_page
        });

        return {
          content: [
            {
              type: 'text',
              text: `Document created successfully!\n\n${JSON.stringify(doc, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('creating document', error);
      }
    }
  );

  // ========================================
  // DOCUMENT PAGE MANAGEMENT
  // ========================================

  server.tool(
    'clickup_create_doc_page',
    'Create a new page in a ClickUp document. Supports markdown and plain text content, an optional sub_title, and nesting under a parent page.',
    {
      workspace_id: idSchema().describe('The ID of the workspace containing the document'),
      doc_id: idSchema().describe('The ID of the document to create the page in'),
      name: z.string().min(1).max(255).describe('The name/title of the page'),
      content: z.string().min(1).describe('The content of the page'),
      sub_title: z.string().optional().describe('Optional sub title for the page'),
      content_format: contentFormatEnum
        .optional()
        .default('text/md')
        .describe('The format of the content (markdown maps to text/md, html to text/html)'),
      parent_page_id: idSchema().optional().describe('ID of parent page for nesting')
    },
    async ({ workspace_id, doc_id, name, content, sub_title, content_format, parent_page_id }) => {
      try {
        const page = await enhancedDocsClient.createPage(workspace_id, doc_id, {
          name,
          content,
          sub_title,
          content_format,
          parent_page_id
        });

        return {
          content: [
            {
              type: 'text',
              text: `Page created successfully!\n\n${JSON.stringify(page, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('creating page', error);
      }
    }
  );

  server.tool(
    'clickup_update_doc_page',
    'Update an existing page in a ClickUp document. Can update name, sub_title, and content. content_edit_mode controls whether content replaces, appends to, or prepends to the existing page content.',
    {
      workspace_id: idSchema().describe('The ID of the workspace containing the document'),
      doc_id: idSchema().describe('The ID of the document containing the page'),
      page_id: idSchema().describe('The ID of the page to update'),
      name: z.string().min(1).max(255).optional().describe('New name/title for the page'),
      sub_title: z.string().optional().describe('New sub title for the page'),
      content: z.string().optional().describe('New content for the page'),
      content_edit_mode: z
        .enum(['replace', 'append', 'prepend'])
        .optional()
        .default('replace')
        .describe('How to apply the content: replace (default), append, or prepend'),
      content_format: contentFormatEnum
        .optional()
        .describe('Format of the content (markdown maps to text/md, html to text/html)')
    },
    async ({ workspace_id, doc_id, page_id, name, sub_title, content, content_edit_mode, content_format }) => {
      try {
        // Validate that at least one field is being updated
        if (name === undefined && sub_title === undefined && content === undefined) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Must specify at least one field to update (name, sub_title, or content)'
              }
            ],
            isError: true
          };
        }

        const updatedPage = await enhancedDocsClient.updatePage(workspace_id, doc_id, page_id, {
          name,
          sub_title,
          content,
          content_edit_mode,
          content_format
        });

        return {
          content: [
            {
              type: 'text',
              text: `Page updated successfully!\n\n${JSON.stringify(updatedPage, null, 2)}`
            }
          ]
        };
      } catch (error: unknown) {
        return mcpError('updating page', error);
      }
    }
  );
}
