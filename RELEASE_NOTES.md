# Release Notes - ClickUp MCP Server Suite

## Version 5.0.0 - Code Quality, Security & Reliability Overhaul

**Release Date**: April 12, 2026
**Status**: Production Ready

### ⚠️ Breaking Changes

- **Doc CRUD tools now require `workspace_id`** (fixes #4 — these endpoints were returning 404 without it).
  Affected tools: `clickup_get_doc`, `clickup_update_doc`, `clickup_delete_doc`, `clickup_create_doc_page`,
  `clickup_update_doc_page`, `clickup_delete_doc_page`, `clickup_get_doc_sharing`, `clickup_update_doc_sharing`.
- **`ClickUpClient` HTTP method generics** changed from `<T = any>` to `<T = unknown>`. Callers must
  now specify a type parameter or accept `unknown` (which requires explicit narrowing).

### 🔒 Security

- **API token leak prevention**: 56 `console.error` calls in client files now log only `error.message`,
  preventing axios error objects (which include the `Authorization` header) from being logged.
- **Request timeout**: Added 30s timeout to base `ClickUpClient` to prevent indefinite hangs.
- **Singleton client**: `createClickUpClient()` now returns a cached singleton (was creating duplicate
  axios instances per tool file).
- **`getApiToken()` helper**: Replaces unsafe `process.env.CLICKUP_API_TOKEN!` non-null assertions
  across all enhanced clients.
- **Sanitized error responses**: Added `mcpError()` and `resourceError()` helpers; standardized 200+
  catch blocks to use them. Error messages no longer expose raw axios error objects.
- **minimatch ReDoS** vulnerability fixed via npm audit (and ongoing dependabot updates).
- **0 npm audit vulnerabilities**, **0 semgrep findings**.

### 🐛 Bug Fixes

- **#4** — Doc CRUD endpoints (`updateDoc`, `deleteDoc`, `getDoc`, page operations, sharing) were
  returning 404 because they were missing `/workspaces/{workspaceId}` in the URL path.
- **`getGoalStatus`** progress calculation was always showing ~100% (was dividing raw timestamps).
- **`getSubtasks`** silently returned `[]` on API errors. Now propagates errors to the caller.
- **`updateWebhook`** and **`updateAttachmentMetadata`** were dropping falsy-but-valid values
  (e.g., couldn't clear `secret` to empty string). Now use `!== undefined` checks.
- **`validateGoalDate`** was comparing seconds-based timestamps against `Date.now()` in milliseconds.
- **`bulkSetCustomFieldValues`** partial failures were reported as success in tool output.
- **`create_time_entry`** now validates that either `duration` or `stop` is provided.
- **`create_timer_entry`** no longer creates a phantom 1ms time entry before starting the timer.
- **`delete_doc`** no longer fails when the user has delete but not read permission (pre-fetch is
  now optional).
- **`hasMarkdown`** regex was matching any string containing `-`, `()`, or `[]` as markdown. Now
  uses proper markdown patterns.
- **Bulk task description destructuring** — `const { ...rest } = task` was a no-op; now properly
  excludes `description` when `markdown_content` is provided.

### ⚡ Performance

- **Bulk operations parallelized** with concurrency-limited `Promise.allSettled` (concurrency 5):
  - `bulkCreateTasks`, `bulkUpdateTasks`, `bulkSetCustomFieldValues`
  - 50-task bulk operations are roughly 5–10× faster.
- **Singleton ClickUpClient** eliminates 10+ duplicate axios instances across tool files.
- **`EnhancedDocsClient`** and **`EnhancedCustomFieldsClient`** now use the shared `ClickUpClient`
  axios instance (was bypassing it with raw `axios` calls — losing timeouts, interceptors, and
  retry logic).

### 🛡️ Type Safety & Validation

- **API response validation** with Zod schemas via new `validateResponse()` utility. Validates the
  envelope shape of 20+ client methods (tasks, comments, spaces, lists, folders, goals, time
  entries, views, webhooks). API contract changes now fail fast with descriptive errors instead
  of silent `undefined` access.
- **Standardized error handling**: ~150 catch blocks across 14 tool files migrated from
  `catch (error: any)` to `catch (error: unknown)` + `mcpError(operation, error)`.
- **Resource error handling**: New `resourceError()` helper for MCP resource handlers (which
  must throw, not return error objects).

### 🧹 Refactoring & Cleanup

- **Deleted ~3,500 lines of dead code**:
  - `helper-tools.ts`, `context-aware-suggestions.ts` — never registered
  - `webhook-tools.ts` (old) — superseded by `webhook-tools-setup.ts`
  - `test-task-update.ts` — debug tool
  - 4 empty stub files (`app.ts`, `lists.service.ts`, `lists.controller.ts`, `lists.routes.ts`)
- **Split `task-tools.ts`** (1,106 lines) into 4 focused modules:
  - `workspace-tools.ts` (workspace + auth)
  - `list-folder-tools.ts` (list/folder CRUD)
  - `bulk-task-tools.ts` (bulk + merge operations)
  - `task-tools.ts` (core task CRUD)
- **Consolidated entry points** — `index-enhanced.ts` is now the canonical server; `index.ts` is
  a thin re-export. Added missing `setupChatTools` to `index-enhanced.ts`.
- **Doc tool naming consistency** — added `clickup_` prefix to 4 tools in `doc-tools.ts`.

### 📊 Audit Results

- **TypeScript**: 0 errors
- **Semgrep**: 0 findings
- **ESLint**: 0 errors, 0 warnings
- **npm audit**: 0 vulnerabilities

### 📈 Diff Stats

Roughly **-3,000 net lines** across 30+ commits, while adding response validation, error handling,
and bug fixes.

---

## Version 4.1.0 - Documentation & Intelligence Release

**Release Date**: September 1, 2025  
**Status**: Production Ready

### 🚀 Major Features

#### Complete Documentation Ecosystem
- **API Documentation**: 100% coverage of 21 intelligence tools
- **Interactive Documentation**: Swagger UI with live API exploration
- **Developer Guides**: 6 comprehensive guides (35,000+ words)
- **Deployment Documentation**: Production-ready deployment guides
- **Troubleshooting**: Complete diagnostic and resolution procedures

#### AI-Powered Intelligence Package
- **Project Health Analyzer**: Real-time health scoring and risk assessment
- **Smart Sprint Planner**: AI-optimized sprint planning with capacity analysis
- **Task Decomposition Engine**: Intelligent task breakdown and sizing
- **Resource Optimizer**: Team workload balancing and skill matching
- **Workflow Intelligence**: Pattern analysis and automation recommendations

### 📦 Package Structure

#### Core Package: `@chykalophia/clickup-mcp-server@4.0.0`
- 177+ core tools with complete ClickUp API coverage
- Production-grade security (zero vulnerabilities)
- GitHub Flavored Markdown support
- Comprehensive error handling and validation

#### Intelligence Package: `@chykalophia/clickup-intelligence-mcp-server@4.1.0`
- 21 AI-powered tools for project intelligence
- Real-time data processing engine
- Advanced analytics and reporting
- Machine learning-based recommendations

#### Shared Package: `@chykalophia/clickup-mcp-shared@1.0.0`
- Common types and schemas
- Validation helpers
- Cross-package consistency utilities

### ✅ Quality Assurance

#### Testing & Validation
- **Core Tests**: 144/144 passing (100% success rate)
- **Security Tests**: 34/34 passing (comprehensive security validation)
- **Build Validation**: All packages compile successfully
- **Integration Tests**: End-to-end workflow validation

#### Code Quality
- **TypeScript**: Strict mode with comprehensive type safety
- **Linting**: ESLint validation with minimal warnings
- **Security**: Zero vulnerabilities in dependency audit
- **Documentation**: Complete API reference and developer guides

### 🔧 Technical Improvements

#### Performance Enhancements
- Optimized API call patterns (50-70% efficiency gains)
- Intelligent caching strategies
- Bulk operations for improved throughput
- Real-time processing with <2s latency SLA

#### Developer Experience
- Complete monorepo architecture
- Automated build and test processes
- Comprehensive documentation with examples
- Interactive API exploration tools

### 📋 Migration Guide

#### From Previous Versions
- All existing tools maintain backward compatibility
- New namespaced tool names (prefixed with `clickup_`)
- Enhanced error handling and validation
- Improved response formats with structured data

#### Installation
```bash
# Core package only
npm install @chykalophia/clickup-mcp-server

# Intelligence package
npm install @chykalophia/clickup-intelligence-mcp-server

# Full suite
npm install @chykalophia/clickup-mcp-server @chykalophia/clickup-intelligence-mcp-server
```

### 🔒 Security

#### Security Features
- Input validation and XSS prevention
- HMAC webhook signature validation
- Rate limiting (1000 API, 100 webhook, 10 upload/min)
- File upload security with path traversal prevention
- Secure token handling and validation

#### Compliance
- Zero security vulnerabilities
- Production-grade error handling
- Comprehensive audit logging
- Secure configuration management

### 📚 Documentation

#### Available Documentation
- **API Reference**: Complete tool documentation with examples
- **OpenAPI Specification**: Interactive Swagger UI documentation
- **Developer Guides**: Architecture, development, testing, contributing
- **Deployment Guides**: Production deployment strategies
- **Troubleshooting**: Comprehensive diagnostic procedures

#### Access Points
- `/docs/api/` - API reference documentation
- `/docs/openapi/` - OpenAPI specifications
- `/docs/interactive/` - Interactive Swagger UI
- `/docs/developer/` - Developer guides
- `/examples/` - Working code examples

### 🎯 Next Steps

#### Upcoming Features
- Enhanced AI capabilities
- Additional integration patterns
- Performance optimizations
- Extended analytics and reporting

#### Community
- Open source contributions welcome
- Comprehensive contributing guidelines
- Active issue tracking and resolution
- Community feedback integration

---

**For technical support and documentation, visit the project repository and documentation sites.**
