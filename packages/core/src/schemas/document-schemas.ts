import { z } from 'zod';

// Content format values accepted by tool inputs.
// 'markdown' and 'html' are aliases normalized to 'text/md'/'text/html'
// before being sent to the API (which accepts the MIME-style values only).
export const ContentFormatSchema = z.enum([
  'markdown',
  'html',
  'text/md',
  'text/plain',
  'text/html',
]);

// API-native content format values
export const ApiContentFormatSchema = z.enum(['text/md', 'text/plain', 'text/html']);

// How Edit Page applies new content
export const ContentEditModeSchema = z.enum(['replace', 'append', 'prepend']);

// Documented parent types for Create Doc:
// 4 = Space, 5 = Folder, 6 = List, 7 = Everything, 12 = Workspace
export const DocParentTypeSchema = z.union([
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(12),
]);

export const DocParentSchema = z.object({
  id: z.string().min(1, 'Parent ID is required'),
  type: DocParentTypeSchema,
});

// Documented parent_type filter values for Search Docs
export const DocParentTypeFilterSchema = z.enum([
  'SPACE',
  'FOLDER',
  'LIST',
  'EVERYTHING',
  'WORKSPACE',
  '4',
  '5',
  '6',
  '7',
  '12',
]);

// Document creation schema (POST /api/v3/workspaces/{workspaceId}/docs)
export const CreateDocSchema = z.object({
  workspace_id: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(1, 'Document name is required').max(255, 'Document name too long'),
  parent: DocParentSchema.optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional().default('PRIVATE'),
  create_page: z.boolean().optional().default(true),
  // Initial content; added as the doc's first page in a follow-up call
  content: z.string().optional(),
  content_format: ContentFormatSchema.optional().default('text/md'),
});

// Page creation schema (POST /api/v3/workspaces/{workspaceId}/docs/{docId}/pages)
export const CreatePageSchema = z.object({
  name: z.string().min(1, 'Page name is required').max(255, 'Page name too long'),
  content: z.string().min(1, 'Page content is required'),
  sub_title: z.string().optional(),
  content_format: ContentFormatSchema.optional().default('text/md'),
  parent_page_id: z.string().optional(),
});

// Page update schema (PUT /api/v3/workspaces/{workspaceId}/docs/{docId}/pages/{pageId})
export const UpdatePageSchema = z
  .object({
    name: z.string().min(1, 'Page name cannot be empty').max(255, 'Page name too long').optional(),
    sub_title: z.string().optional(),
    content: z.string().optional(),
    content_edit_mode: ContentEditModeSchema.optional().default('replace'),
    content_format: ContentFormatSchema.optional(),
  })
  .refine(
    data =>
      data.name !== undefined || data.sub_title !== undefined || data.content !== undefined,
    {
      message: 'Must specify at least one field to update',
      path: ['name'],
    }
  );

// Get docs parameters schema (GET /api/v3/workspaces/{workspaceId}/docs)
export const GetDocsParamsSchema = z.object({
  id: z.string().optional(),
  creator: z.number().int().optional(),
  deleted: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  parent_id: z.string().optional(),
  parent_type: DocParentTypeFilterSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

// Search docs parameters schema.
// The v3 API has no free-text query parameter; `query` is applied
// client-side against doc names on top of the documented filters.
export const SearchDocsParamsSchema = GetDocsParamsSchema.extend({
  query: z.string().optional(),
});

// Document ID validation
export const DocIdSchema = z.string().min(1, 'Document ID is required');

// Page ID validation
export const PageIdSchema = z.string().min(1, 'Page ID is required');

// Workspace ID validation
export const WorkspaceIdSchema = z.string().min(1, 'Workspace ID is required');

// Combined schemas for tool validation.
// Note: the public ClickUp API has no doc update/delete, page delete,
// sharing, or template endpoints, so no schemas exist for those operations.
export const DocumentToolSchemas = {
  // Document operations
  createDoc: CreateDocSchema,
  getDoc: z.object({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
  }),

  // Page operations
  createPage: CreatePageSchema.extend({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
  }),
  updatePage: z.object({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
    page_id: PageIdSchema,
    name: z.string().min(1).optional(),
    sub_title: z.string().optional(),
    content: z.string().optional(),
    content_edit_mode: ContentEditModeSchema.optional(),
    content_format: ContentFormatSchema.optional(),
  }),
  getPage: z.object({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
    page_id: PageIdSchema,
    content_format: ContentFormatSchema.optional(),
  }),

  // Read operations
  getDocsFromWorkspace: GetDocsParamsSchema.extend({
    workspace_id: WorkspaceIdSchema,
  }),
  getDocPages: z.object({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
    content_format: ContentFormatSchema.optional().default('text/md'),
  }),
  getDocPageListing: z.object({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
    max_page_depth: z.number().int().optional().default(-1),
  }),
  searchDocs: SearchDocsParamsSchema.extend({
    workspace_id: WorkspaceIdSchema,
  }),
};
