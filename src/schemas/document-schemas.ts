import { z } from 'zod';

// Content format validation
export const ContentFormatSchema = z.enum([
  'markdown', 'html', 'text/md', 'text/plain', 'text/html'
]);

// Document creation schema
export const CreateDocSchema = z.object({
  workspace_id: z.string().optional(),
  space_id: z.string().optional(),
  folder_id: z.string().optional(),
  name: z.string().min(1, 'Document name is required').max(255, 'Document name too long'),
  content: z.string().optional(),
  public: z.boolean().optional().default(false),
  template_id: z.string().optional()
}).refine(data => 
  data.workspace_id || data.space_id || data.folder_id,
  { 
    message: "Must specify workspace_id, space_id, or folder_id",
    path: ['workspace_id']
  }
);

// Document update schema
export const UpdateDocSchema = z.object({
  name: z.string().min(1, 'Document name cannot be empty').max(255, 'Document name too long').optional(),
  content: z.string().optional(),
  public: z.boolean().optional()
}).refine(data => 
  data.name !== undefined || data.content !== undefined || data.public !== undefined,
  { 
    message: "Must specify at least one field to update",
    path: ['name']
  }
);

// Page creation schema
export const CreatePageSchema = z.object({
  name: z.string().min(1, 'Page name is required').max(255, 'Page name too long'),
  content: z.string().min(1, 'Page content is required'),
  content_format: z.enum(['markdown', 'html']).optional().default('markdown'),
  parent_page_id: z.string().optional(),
  position: z.number().int().min(0, 'Position must be non-negative').optional()
});

// Page update schema
export const UpdatePageSchema = z.object({
  name: z.string().min(1, 'Page name cannot be empty').max(255, 'Page name too long').optional(),
  content: z.string().optional(),
  content_format: z.enum(['markdown', 'html']).optional(),
  position: z.number().int().min(0, 'Position must be non-negative').optional()
}).refine(data => 
  data.name !== undefined || data.content !== undefined || 
  data.content_format !== undefined || data.position !== undefined,
  { 
    message: "Must specify at least one field to update",
    path: ['name']
  }
);

// Sharing configuration schema
export const SharingConfigSchema = z.object({
  public: z.boolean().optional(),
  public_share_expires_on: z.number().int().positive('Expiration must be a positive timestamp').optional(),
  public_fields: z.array(z.string()).optional(),
  team_sharing: z.boolean().optional(),
  guest_sharing: z.boolean().optional()
}).refine(data => 
  Object.keys(data).length > 0,
  { 
    message: "Must specify at least one sharing setting to update",
    path: ['public']
  }
);

// Template creation schema
export const CreateFromTemplateSchema = z.object({
  workspace_id: z.string().optional(),
  space_id: z.string().optional(),
  folder_id: z.string().optional(),
  name: z.string().min(1, 'Document name is required').max(255, 'Document name too long'),
  template_variables: z.record(z.any()).optional()
}).refine(data => 
  data.workspace_id || data.space_id || data.folder_id,
  { 
    message: "Must specify workspace_id, space_id, or folder_id",
    path: ['workspace_id']
  }
);

// Get docs parameters schema
export const GetDocsParamsSchema = z.object({
  cursor: z.string().optional(),
  deleted: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(50)
});

// Search docs parameters schema
export const SearchDocsParamsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  cursor: z.string().optional()
});

// Document ID validation
export const DocIdSchema = z.string().min(1, 'Document ID is required');

// Page ID validation
export const PageIdSchema = z.string().min(1, 'Page ID is required');

// Workspace ID validation
export const WorkspaceIdSchema = z.string().min(1, 'Workspace ID is required');

// Combined schemas for tool validation
export const DocumentToolSchemas = {
  // Document operations
  createDoc: CreateDocSchema,
  updateDoc: z.object({
    doc_id: DocIdSchema,
    name: z.string().min(1).optional(),
    content: z.string().optional(),
    public: z.boolean().optional()
  }),
  deleteDoc: z.object({
    doc_id: DocIdSchema
  }),
  getDoc: z.object({
    doc_id: DocIdSchema
  }),

  // Page operations
  createPage: z.object({
    doc_id: DocIdSchema,
    name: z.string().min(1),
    content: z.string().optional(),
    content_format: z.enum(['markdown', 'html']).optional().default('markdown'),
    position: z.number().min(0).optional()
  }),
  updatePage: z.object({
    doc_id: DocIdSchema,
    page_id: PageIdSchema,
    name: z.string().min(1).optional(),
    content: z.string().optional(),
    content_format: z.enum(['markdown', 'html']).optional(),
    position: z.number().min(0).optional()
  }),
  deletePage: z.object({
    doc_id: DocIdSchema,
    page_id: PageIdSchema
  }),
  getPage: z.object({
    doc_id: DocIdSchema,
    page_id: PageIdSchema,
    content_format: ContentFormatSchema.optional()
  }),

  // Sharing operations
  getDocSharing: z.object({
    doc_id: DocIdSchema
  }),
  updateDocSharing: z.object({
    doc_id: DocIdSchema,
    public: z.boolean().optional(),
    public_share_expires_on: z.number().optional(),
    public_fields: z.array(z.string()).optional(),
    team_sharing: z.boolean().optional(),
    guest_sharing: z.boolean().optional()
  }),

  // Template operations
  createDocFromTemplate: z.object({
    template_id: z.string().min(1, 'Template ID is required'),
    workspace_id: z.string().optional(),
    space_id: z.string().optional(),
    folder_id: z.string().optional(),
    name: z.string().min(1),
    template_variables: z.record(z.any()).optional()
  }),

  // Read operations
  getDocsFromWorkspace: z.object({
    workspace_id: WorkspaceIdSchema,
    cursor: z.string().optional(),
    deleted: z.boolean().optional().default(false),
    archived: z.boolean().optional().default(false),
    limit: z.number().min(1).max(100).optional().default(25)
  }),
  getDocPages: z.object({
    workspace_id: WorkspaceIdSchema,
    doc_id: DocIdSchema,
    content_format: ContentFormatSchema.optional().default('text/md')
  }),
  searchDocs: z.object({
    workspace_id: WorkspaceIdSchema,
    query: z.string().min(1),
    cursor: z.string().optional()
  })
};
