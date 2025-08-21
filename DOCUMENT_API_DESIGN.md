# Document API Research & Client Architecture Design

**Task:** 1.1: Research Document API Endpoints & Design Client Architecture (868f9p56y)  
**Date:** August 21, 2025  
**Status:** In Progress

## Current Implementation Analysis

### ✅ Currently Implemented (READ-ONLY)
The existing `DocsClient` in `src/clickup-client/docs.ts` provides:

1. **getDocsFromWorkspace()** - List docs in workspace with pagination
2. **getDocPages()** - Get pages with content in markdown/plain text
3. **searchDocs()** - Search docs by query string
4. **createDocInList()** - ⚠️ Partially implemented but not exposed as MCP tool
5. **createDocInFolder()** - ⚠️ Partially implemented but not exposed as MCP tool
6. **updateDoc()** - ⚠️ Partially implemented but not exposed as MCP tool

### ❌ Missing Critical Functionality
- Document deletion
- Page-level CRUD operations
- Document sharing management
- Template-based document creation
- Proper workspace-level document creation
- Content format validation and conversion

## ClickUp Document API Research

### API Version Analysis
- **Current Implementation:** Mixed v2/v3 API usage
- **Recommendation:** Standardize on v3 API for consistency
- **Base URL:** `https://api.clickup.com/api/v3/`

### Document Hierarchy Structure
```
Workspace
├── Space
│   ├── Folder
│   │   └── Documents
│   └── Documents (folderless)
└── Documents (workspace-level)
```

## Complete API Endpoint Specification

### 1. Document CRUD Operations

#### 1.1 Create Document
```typescript
POST /api/v3/workspaces/{workspace_id}/docs
// OR
POST /api/v3/spaces/{space_id}/docs
// OR  
POST /api/v3/folders/{folder_id}/docs

Parameters:
{
  name: string;                    // Document name (required)
  parent_id?: string;             // Parent folder/space ID (optional)
  content?: string;               // Initial content (optional)
  public?: boolean;               // Public sharing (default: false)
  template_id?: string;           // Create from template (optional)
}

Response: Doc object with id, name, url, etc.
```

#### 1.2 Update Document
```typescript
PUT /api/v3/docs/{doc_id}

Parameters:
{
  name?: string;                  // New document name
  content?: string;               // New content (full replacement)
  public?: boolean;               // Update sharing status
}

Response: Updated Doc object
```

#### 1.3 Delete Document
```typescript
DELETE /api/v3/docs/{doc_id}

Parameters: None (doc_id in URL)
Response: Success confirmation
```

#### 1.4 Get Document Details
```typescript
GET /api/v3/docs/{doc_id}

Parameters: None
Response: Complete Doc object with metadata
```

### 2. Document Page Management

#### 2.1 Create Page
```typescript
POST /api/v3/docs/{doc_id}/pages

Parameters:
{
  name: string;                   // Page title (required)
  content: string;                // Page content (required)
  content_format?: 'markdown' | 'html';  // Content format (default: markdown)
  parent_page_id?: string;        // Parent page for nesting (optional)
  position?: number;              // Page order position (optional)
}

Response: Page object with id, content, metadata
```

#### 2.2 Update Page
```typescript
PUT /api/v3/docs/{doc_id}/pages/{page_id}

Parameters:
{
  name?: string;                  // New page title
  content?: string;               // New page content
  content_format?: 'markdown' | 'html';  // Content format
  position?: number;              // New position in document
}

Response: Updated Page object
```

#### 2.3 Delete Page
```typescript
DELETE /api/v3/docs/{doc_id}/pages/{page_id}

Parameters: None
Response: Success confirmation
```

#### 2.4 Get Page Details
```typescript
GET /api/v3/docs/{doc_id}/pages/{page_id}

Parameters:
{
  content_format?: 'text/md' | 'text/plain' | 'text/html';
}

Response: Page object with content in requested format
```

### 3. Document Sharing Management

#### 3.1 Get Sharing Settings
```typescript
GET /api/v3/docs/{doc_id}/sharing

Parameters: None
Response: Sharing configuration object
```

#### 3.2 Update Sharing Settings
```typescript
PUT /api/v3/docs/{doc_id}/sharing

Parameters:
{
  public?: boolean;               // Public access
  public_share_expires_on?: number;  // Expiration timestamp
  public_fields?: string[];       // Visible fields for public access
  team_sharing?: boolean;         // Team-wide sharing
  guest_sharing?: boolean;        // Guest access
}

Response: Updated sharing configuration
```

## Enhanced Client Architecture Design

### 1. Extended DocsClient Interface

```typescript
export interface EnhancedDocsClient {
  // Existing methods (READ operations)
  getDocsFromWorkspace(workspaceId: string, params?: GetDocsParams): Promise<DocsResponse>;
  getDocPages(workspaceId: string, docId: string, contentFormat?: string): Promise<Page[]>;
  searchDocs(workspaceId: string, params: SearchDocsParams): Promise<DocsResponse>;
  
  // NEW: Document CRUD operations
  createDoc(params: CreateDocParams): Promise<Doc>;
  updateDoc(docId: string, params: UpdateDocParams): Promise<Doc>;
  deleteDoc(docId: string): Promise<void>;
  getDoc(docId: string): Promise<Doc>;
  
  // NEW: Page management operations
  createPage(docId: string, params: CreatePageParams): Promise<Page>;
  updatePage(docId: string, pageId: string, params: UpdatePageParams): Promise<Page>;
  deletePage(docId: string, pageId: string): Promise<void>;
  getPage(docId: string, pageId: string, contentFormat?: ContentFormat): Promise<Page>;
  
  // NEW: Sharing management
  getDocSharing(docId: string): Promise<SharingConfig>;
  updateDocSharing(docId: string, params: SharingParams): Promise<SharingConfig>;
  
  // NEW: Template operations
  createDocFromTemplate(templateId: string, params: CreateFromTemplateParams): Promise<Doc>;
}
```

### 2. Type Definitions

```typescript
// Enhanced Document interface
export interface Doc {
  id: string;
  name: string;
  date_created: number;
  date_updated: number;
  parent?: {
    id: string;
    type: number;
  };
  public: boolean;
  workspace_id: number;
  creator: number;
  deleted: boolean;
  type: number;
  content?: string;
  url?: string;
  sharing?: SharingConfig;
  page_count?: number;
}

// Page interface
export interface Page {
  id: string;
  name: string;
  content: string;
  content_format: ContentFormat;
  doc_id: string;
  parent_page_id?: string;
  position: number;
  date_created: number;
  date_updated: number;
  creator: number;
}

// Content format types
export type ContentFormat = 'markdown' | 'html' | 'text/md' | 'text/plain' | 'text/html';

// Sharing configuration
export interface SharingConfig {
  public: boolean;
  public_share_expires_on?: number;
  public_fields?: string[];
  team_sharing?: boolean;
  guest_sharing?: boolean;
  token?: string;
  seo_optimized?: boolean;
}

// Parameter interfaces
export interface CreateDocParams {
  workspace_id?: string;
  space_id?: string;
  folder_id?: string;
  name: string;
  content?: string;
  public?: boolean;
  template_id?: string;
}

export interface UpdateDocParams {
  name?: string;
  content?: string;
  public?: boolean;
}

export interface CreatePageParams {
  name: string;
  content: string;
  content_format?: ContentFormat;
  parent_page_id?: string;
  position?: number;
}

export interface UpdatePageParams {
  name?: string;
  content?: string;
  content_format?: ContentFormat;
  position?: number;
}

export interface SharingParams {
  public?: boolean;
  public_share_expires_on?: number;
  public_fields?: string[];
  team_sharing?: boolean;
  guest_sharing?: boolean;
}

export interface CreateFromTemplateParams {
  workspace_id?: string;
  space_id?: string;
  folder_id?: string;
  name: string;
  template_variables?: Record<string, any>;
}
```

### 3. Zod Validation Schemas

```typescript
// Document creation schema
export const CreateDocSchema = z.object({
  workspace_id: z.string().optional(),
  space_id: z.string().optional(),
  folder_id: z.string().optional(),
  name: z.string().min(1).max(255),
  content: z.string().optional(),
  public: z.boolean().optional().default(false),
  template_id: z.string().optional()
}).refine(data => 
  data.workspace_id || data.space_id || data.folder_id,
  { message: "Must specify workspace_id, space_id, or folder_id" }
);

// Document update schema
export const UpdateDocSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  public: z.boolean().optional()
});

// Page creation schema
export const CreatePageSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string(),
  content_format: z.enum(['markdown', 'html']).optional().default('markdown'),
  parent_page_id: z.string().optional(),
  position: z.number().int().min(0).optional()
});

// Page update schema
export const UpdatePageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  content_format: z.enum(['markdown', 'html']).optional(),
  position: z.number().int().min(0).optional()
});

// Sharing configuration schema
export const SharingConfigSchema = z.object({
  public: z.boolean().optional(),
  public_share_expires_on: z.number().optional(),
  public_fields: z.array(z.string()).optional(),
  team_sharing: z.boolean().optional(),
  guest_sharing: z.boolean().optional()
});

// Content format validation
export const ContentFormatSchema = z.enum([
  'markdown', 'html', 'text/md', 'text/plain', 'text/html'
]);
```

## Implementation Strategy

### Phase 1: Core Document Operations
1. **Extend DocsClient** with new CRUD methods
2. **Implement create_doc tool** with workspace/space/folder support
3. **Implement update_doc tool** with content and metadata updates
4. **Implement delete_doc tool** with proper error handling

### Phase 2: Page Management
1. **Implement page CRUD operations** in DocsClient
2. **Add page management tools** (create_doc_page, update_doc_page, delete_doc_page)
3. **Support content format conversion** (markdown ↔ HTML)
4. **Handle page ordering and nesting**

### Phase 3: Advanced Features
1. **Implement sharing management** tools
2. **Add template-based document creation**
3. **Enhance error handling and validation**
4. **Add comprehensive testing**

## Error Handling Strategy

### Common Error Scenarios
1. **Document not found** (404) - Clear error message with doc ID
2. **Permission denied** (403) - Explain required permissions
3. **Invalid content format** (400) - Validate before API call
4. **Rate limiting** (429) - Implement retry with backoff
5. **Content too large** (413) - Validate content size limits

### Error Response Format
```typescript
interface DocumentError {
  code: string;
  message: string;
  details?: {
    doc_id?: string;
    page_id?: string;
    field?: string;
    limit?: number;
  };
}
```

## Content Format Handling

### Supported Formats
- **Input:** Markdown, HTML
- **Output:** Markdown, HTML, Plain Text
- **Storage:** ClickUp native format (HTML-based)

### Conversion Strategy
1. **Markdown → HTML:** Use markdown parser for API submission
2. **HTML → Markdown:** Use HTML-to-markdown converter for output
3. **Validation:** Sanitize HTML content for security
4. **Preservation:** Maintain formatting fidelity during conversions

## Testing Requirements

### Unit Tests
- All DocsClient methods with mock responses
- Zod schema validation with edge cases
- Error handling scenarios
- Content format conversions

### Integration Tests
- End-to-end document creation workflow
- Page management operations
- Sharing configuration updates
- Template-based document creation

### Performance Tests
- Large document handling (>1MB content)
- Bulk page operations
- Concurrent document operations

## Security Considerations

### Content Validation
- **HTML Sanitization:** Remove malicious scripts and tags
- **Size Limits:** Enforce reasonable content size limits
- **Format Validation:** Ensure content matches declared format

### Permission Handling
- **Workspace Access:** Verify user has workspace permissions
- **Document Ownership:** Check document access rights
- **Sharing Validation:** Validate sharing configuration changes

## Migration Strategy

### Backward Compatibility
- **Existing Tools:** Maintain current read-only tools unchanged
- **API Versioning:** Use v3 API for new operations, maintain v2 compatibility
- **Response Format:** Ensure consistent response structures

### Deployment Plan
1. **Phase 1:** Deploy document CRUD operations
2. **Phase 2:** Add page management capabilities
3. **Phase 3:** Enable sharing and template features
4. **Phase 4:** Deprecate old methods (if needed)

## Success Metrics

### Functionality Coverage
- ✅ 8 new document management tools implemented
- ✅ Support for all major content formats
- ✅ Complete CRUD operations for documents and pages
- ✅ Sharing management capabilities

### Quality Metrics
- **Test Coverage:** >90% for all new code
- **Error Handling:** Comprehensive error scenarios covered
- **Performance:** <2s response time for typical operations
- **Documentation:** Complete API documentation and examples

---

**Next Steps:**
1. Implement enhanced DocsClient with new methods
2. Create MCP tools using the client
3. Add comprehensive validation and error handling
4. Implement testing suite
5. Update documentation and examples
