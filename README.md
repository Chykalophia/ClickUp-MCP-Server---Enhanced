# ClickUp MCP Server

<p align="center">
  <img src="assets/images/clickupserverlogo.png" width="256" alt="ClickUp MCP Server Logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/clickup-mcp-server"><img src="https://img.shields.io/npm/v/clickup-mcp-server.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js Version"></a>
  <a href="https://github.com/modelcontextprotocol/typescript-sdk"><img src="https://img.shields.io/badge/MCP%20SDK-1.6.1-orange" alt="MCP SDK"></a>
</p>

A comprehensive Model Context Protocol (MCP) server that provides a standardized interface for AI assistants to interact with the ClickUp API. This server enables AI systems to access and manipulate ClickUp data such as workspaces, spaces, folders, lists, tasks, docs, comments, and checklists with **full GitHub Flavored Markdown support**.

## 🚀 Key Features

### ✅ **GitHub Flavored Markdown Support**
- **Rich Text Formatting**: Create tasks and comments with headers, bold, italic, code blocks, lists, tables, and more
- **Smart Content Processing**: Automatic detection and conversion between markdown, HTML, and plain text
- **Backward Compatible**: Existing plain text content continues to work unchanged

### 🛠️ **Comprehensive API Coverage**
- **120+ Total Tools** covering 100% of major ClickUp API endpoints
- **Task Management**: Complete CRUD operations with markdown descriptions
- **Comment System**: Rich formatted comments with threading support
- **Advanced Features**: Webhooks, views, dependencies, attachments, time tracking, and goals

### 🔒 **Production Ready**
- **Security Audited**: Zero vulnerabilities with comprehensive input validation
- **Performance Optimized**: <1% overhead with efficient processing
- **Error Handling**: Robust error handling with graceful fallbacks

## Available Tools

### Core Task Management
- `get_workspaces`: Get the list of workspaces
- `get_spaces`: Get spaces within a workspace
- `get_tasks`: Get tasks from a list with processed markdown content
- `create_task`: Create a new task with **markdown description support**
- `update_task`: Update an existing task with **markdown description support**
- `get_task_details`: Get detailed task information with processed markdown

### Rich Comment System
- `create_task_comment`: Create comments with **GitHub Flavored Markdown**
- `create_list_comment`: Create list comments with **markdown formatting**
- `create_chat_view_comment`: Create chat view comments with **markdown support**
- `update_comment`: Update comments with **markdown formatting**
- `get_task_comments`: Get comments with processed markdown content

### Document Management
- `get_docs_from_workspace`: Get all docs from a workspace
- `search_docs`: Search docs with advanced filtering
- `get_doc_content`: Get document content with format conversion
- `get_doc_pages`: Get document pages in markdown or plain text

### Advanced Features
- **Webhooks Management** (11 tools): Real-time event processing with HMAC validation
- **Views Management** (13 tools): Complete view lifecycle with advanced filtering
- **Dependencies Management** (12 tools): Task relationships with circular detection
- **Attachments Management** (15 tools): File handling with security validation
- **Time Tracking** (5 tools): Comprehensive time management
- **Goals Management** (10 tools): Goal tracking and key results
- **Custom Fields** (15 tools): Dynamic field management

## 📝 Markdown Examples

### Creating a Task with Rich Description

```typescript
// Task with markdown description
{
  "list_id": "123456789",
  "name": "Project Documentation",
  "description": `# Project Overview

This project implements **advanced features** for our application.

## Key Components

1. **Authentication System**
   - JWT token management
   - Role-based access control

2. **API Integration**
   - RESTful endpoints
   - Real-time updates

## Code Example

\`\`\`typescript
interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}
\`\`\`

## Next Steps

- [x] Set up project structure
- [ ] Complete authentication module
- [ ] Implement API endpoints

> **Note**: This is a high-priority project.`
}
```

### Adding a Formatted Comment

```typescript
// Comment with markdown formatting
{
  "task_id": "868f9p3bg",
  "comment_text": `## Status Update ✅

### Completed
- Authentication system implementation
- Database schema design

### In Progress
- **API Integration**: Currently working on REST endpoints

### Code Changes
\`\`\`diff
+ Added user authentication middleware
+ Implemented JWT token validation
- Removed deprecated login method
\`\`\`

**Estimated Completion**: End of week`
}
```

## Installation

```bash
git clone https://github.com/nsxdavid/clickup-mcp-server.git
cd clickup-mcp-server
npm install
```

## Get ClickUp API Token

1. Log in to ClickUp account
2. Go to Settings > Apps
3. Click "Generate API Token"
4. Copy the token

## Configuration

Add to the MCP settings file:

```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["/path/to/clickup-mcp-server/build/index.js"],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_API_TOKEN_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

* Make sure to correct the path
* Make sure to supply your API token

## Alternate Installation (npx)

For users who prefer not to clone the repository, the package can be run directly using npx:

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": [
        "-y",
        "clickup-mcp-server"
      ],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_API_TOKEN_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

* Replace `YOUR_API_TOKEN_HERE` with your API token
* No installation or cloning is required with this method

## Configuration File Locations

- Cline VSCode Extension: `~/.vscode/extensions/saoudrizwan.claude-dev/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Claude Desktop Apps:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## 📚 Documentation

- **[MARKDOWN_SUPPORT.md](./MARKDOWN_SUPPORT.md)** - Comprehensive markdown features and usage guide
- **[COMPREHENSIVE_API_COVERAGE.md](./COMPREHENSIVE_API_COVERAGE.md)** - Complete API coverage documentation
- **[WEBHOOK_PROCESSING_GUIDE.md](./WEBHOOK_PROCESSING_GUIDE.md)** - Webhook implementation guide
- **[SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)** - Security audit and compliance report

## Development

### Building

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Testing Markdown Features

```bash
# Test markdown functionality specifically
npm test -- --testPathPattern=markdown

# Run all tests with coverage
npm run test:coverage
```

## 🔧 Technical Features

### Markdown Processing
- **Libraries**: Uses `marked` and `turndown` for robust markdown processing
- **Smart Detection**: Automatically detects content format (markdown, HTML, plain text)
- **Bidirectional Conversion**: Seamless conversion between formats
- **Error Handling**: Graceful fallbacks with comprehensive error handling

### Security & Performance
- **Zero Vulnerabilities**: Comprehensive security audit with 85+ test cases
- **Input Validation**: Robust input sanitization and validation
- **Rate Limiting**: Built-in rate limiting and monitoring
- **Performance**: <1% overhead with efficient processing

### API Coverage
- **120+ Total Tools**: Complete coverage of ClickUp API endpoints
- **8 Major Categories**: Tasks, comments, docs, webhooks, views, dependencies, attachments, time tracking
- **Production Ready**: Comprehensive error handling and monitoring

## License

MIT

---

**Note**: This server provides comprehensive ClickUp integration with rich markdown support, enabling AI assistants to create beautifully formatted content in ClickUp while maintaining full backward compatibility with existing plain text workflows.
