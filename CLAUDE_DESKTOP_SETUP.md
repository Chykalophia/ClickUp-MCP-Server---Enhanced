# Claude Desktop Setup Guide

## Pre-built Installation (Recommended)

No compilation required! Use the published npm package and add to your Claude Desktop configuration.

### 🚀 Recommended: Enhanced ClickUp MCP Server
```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": [
        "-y",
        "@chykalophia/clickup-mcp-server"
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

### 🔧 Alternative: Build from Source (Advanced Users)

If you prefer to build from source or need to modify the code:

#### Enhanced Version (Production Ready) ⭐ Recommended
```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["/path/to/clickup-mcp-server/build/index-enhanced.js"],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_API_TOKEN_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### Efficiency Version (Smart Shortcuts) 🚀
```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["/path/to/clickup-mcp-server/build/index-efficiency-simple.js"],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_API_TOKEN_HERE"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Setup Steps

1. **Get ClickUp API Token**:
   - Log in to ClickUp → Settings → Apps → Generate API Token

2. **Add Configuration**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Replace Token**: Change `YOUR_API_TOKEN_HERE` to your actual token

4. **Restart Claude Desktop**

## Installation Methods Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **NPM Package** ⭐ | No build required, always latest, easy setup | Requires internet for first run | Most users |
| **Build from Source** | Full control, can modify code, offline after build | Requires Node.js, build process | Developers |

## Features

- **170+ Tools** covering all major ClickUp API endpoints
- **AI-Powered Efficiency** with smart tool suggestions
- **GitHub Flavored Markdown** support for rich text formatting
- **Production-Grade Security** with comprehensive validation
- **Real-time Webhook Processing** with HMAC validation
- **Zero Vulnerabilities** - Security audited and tested

## Troubleshooting

- **Permission Error**: Restart Claude Desktop as administrator
- **Token Invalid**: Verify your ClickUp API token is correct and has proper permissions
- **Connection Failed**: Check internet connection and firewall settings
- **Package Not Found**: Ensure you're using the correct package name `@chykalophia/clickup-mcp-server`
- **Build Errors**: If building from source, ensure Node.js 18+ is installed and run `npm install` first