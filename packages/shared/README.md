# ClickUp MCP Shared Utilities

<p align="center">
  <img src="https://raw.githubusercontent.com/Chykalophia/ClickUp-MCP-Server---Enhanced/main/assets/images/clickupserverlogo.png" width="256" alt="ClickUp Shared Utilities Logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@chykalophia/clickup-mcp-shared"><img src="https://img.shields.io/npm/v/@chykalophia/clickup-mcp-shared.svg" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js Version"></a>
</p>

Shared utilities, types, and schemas for ClickUp MCP Server packages. This package provides common functionality used across the ClickUp MCP ecosystem.

## 📦 What's Included

### TypeScript Types
- **ClickUp API Types**: Complete type definitions for ClickUp API responses
- **MCP Protocol Types**: Model Context Protocol interface definitions
- **Shared Interfaces**: Common interfaces used across packages

### Validation Schemas
- **Zod Schemas**: Runtime validation for API requests and responses
- **Input Validation**: Sanitization and security validation helpers
- **Type Guards**: Runtime type checking utilities

### Utility Functions
- **API Helpers**: Common ClickUp API interaction utilities
- **Error Handling**: Standardized error processing and formatting
- **Security Utils**: Input sanitization and validation functions

## 🚀 Installation

```bash
npm install @chykalophia/clickup-mcp-shared
```

## 🛠️ Usage

### Import Types
```typescript
import { 
  ClickUpTask, 
  ClickUpList, 
  ClickUpSpace,
  MCPToolResponse 
} from '@chykalophia/clickup-mcp-shared';
```

### Use Validation Schemas
```typescript
import { TaskSchema, ListSchema } from '@chykalophia/clickup-mcp-shared';

// Validate task data
const validatedTask = TaskSchema.parse(taskData);
```

### Utility Functions
```typescript
import { 
  sanitizeInput, 
  validateApiToken,
  formatClickUpError 
} from '@chykalophia/clickup-mcp-shared';

// Sanitize user input
const cleanInput = sanitizeInput(userInput);

// Validate API token
const isValid = validateApiToken(token);
```

## 📋 Key Features

### Type Safety
- **Complete ClickUp API coverage** with TypeScript types
- **Runtime validation** with Zod schemas
- **Type guards** for safe type checking

### Security
- **Input sanitization** to prevent XSS and injection attacks
- **API token validation** with format checking
- **URL validation** with protocol and domain restrictions

### Consistency
- **Standardized error handling** across all packages
- **Common interfaces** for consistent API design
- **Shared validation logic** to prevent duplication

## 🔧 Development

This package is primarily intended for use by other ClickUp MCP packages, but can be used independently for ClickUp API integration projects.

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## 🤝 Related Packages

- **[@chykalophia/clickup-mcp-server](https://www.npmjs.com/package/@chykalophia/clickup-mcp-server)** - Core ClickUp integration (177+ tools)
- **[@chykalophia/clickup-intelligence-mcp-server](https://www.npmjs.com/package/@chykalophia/clickup-intelligence-mcp-server)** - AI-powered project intelligence

## 📚 API Reference

### Types
- `ClickUpTask` - Complete task object with all properties
- `ClickUpList` - List object with metadata and settings
- `ClickUpSpace` - Space object with features and permissions
- `ClickUpUser` - User object with profile information
- `MCPToolResponse` - Standard MCP tool response format

### Schemas
- `TaskSchema` - Zod schema for task validation
- `ListSchema` - Zod schema for list validation
- `CommentSchema` - Zod schema for comment validation
- `AttachmentSchema` - Zod schema for attachment validation

### Utilities
- `sanitizeInput(input: any): any` - Sanitize user input
- `validateApiToken(token: string): boolean` - Validate ClickUp API token
- `formatClickUpError(error: any): string` - Format ClickUp API errors
- `generateRequestId(): string` - Generate unique request identifiers

## 📄 License

MIT - see [LICENSE](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced/blob/main/LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced)
- [Issues & Support](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced/issues)
- [Model Context Protocol](https://modelcontextprotocol.io)
