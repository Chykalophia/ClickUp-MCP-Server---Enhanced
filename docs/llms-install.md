# ClickUp MCP Server - Installation Instructions

## Prerequisites

- Node.js 18.0.0 or higher
- npm (included with Node.js)
- ClickUp API token

## Get ClickUp API Token

Ask the user to share their API token, here is the instructions to give them to obtain it:

1. Log in to ClickUp account
2. Go to Settings > Apps
3. Click "Generate API Token"
4. Copy the token

## Installation

```bash
git clone https://github.com/nsxdavid/clickup-mcp-server.git
cd clickup-mcp-server
npm install
```

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
* Make sure to supply the shared API token


## Alternate Installation (not for Cline)

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

* Replace `YOUR_API_TOKEN_HERE` with the user's API token
* No installation or cloning is required with this method

## Configuration File Locations

- Cline VSCode Extension: `~/.vscode/extensions/saoudrizwan.claude-dev/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Claude Desktop Apps:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## Testing

```javascript
use_mcp_tool({
  server_name: "clickup",
  tool_name: "get_workspaces",
  arguments: {}
})
```
