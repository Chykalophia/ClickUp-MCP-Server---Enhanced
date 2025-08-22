# 🚀 Easy Install Options

## Option 1: One-Click Installer (Recommended)

Download and run the installer:

```bash
curl -O https://raw.githubusercontent.com/Chykalophia/ClickUp-MCP-Server---Enhanced/main/clickup-installer.js
node clickup-installer.js
```

Or via NPX:
```bash
npx clickup-mcp-installer
```

## Option 2: Web Configurator

Visit: [ClickUp MCP Configurator](https://chykalophia.github.io/ClickUp-MCP-Server---Enhanced/configurator.html)

1. Select your preferred version
2. Enter your ClickUp API token
3. Download the generated config file
4. Place it in your Claude Desktop config directory

## Option 3: Pre-built Templates

Download a template and edit the API token:

- [Enhanced Version](templates/claude_desktop_config_enhanced.json) ⭐ Recommended
- [AI-Powered Version](templates/claude_desktop_config_ai.json) 🧠 Maximum Features

## Config File Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Get ClickUp API Token

1. Log in to ClickUp
2. Go to Settings → Apps
3. Click "Generate API Token"
4. Copy the token

## Restart Claude Desktop

After installation, restart Claude Desktop to activate the server.