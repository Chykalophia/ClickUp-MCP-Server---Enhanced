#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

// There is a single server. The -basic/-enhanced/-efficiency bins in the
// package are aliases of it, kept only for existing configs.
const SERVER_PACKAGE = '@chykalophia/clickup-mcp-server@latest';

function getConfigPath() {
  const platform = process.platform;
  if (platform === 'darwin') {
    return join(homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
  } else if (platform === 'win32') {
    return join(process.env.APPDATA || '', 'Claude/claude_desktop_config.json');
  } else {
    return join(homedir(), '.config/claude/claude_desktop_config.json');
  }
}

async function main() {
  console.log('🚀 ClickUp MCP Server Installer\n');
  
  // API token input
  const apiToken = await question('\nEnter your ClickUp API token: ');
  if (!apiToken.trim()) {
    console.log('❌ API token required');
    process.exit(1);
  }
  
  // Config setup
  const configPath = getConfigPath();
  const configDir = configPath.split('/').slice(0, -1).join('/');
  
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  let config = { mcpServers: {} };
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.log('⚠️  Invalid existing config, creating new one');
    }
  }
  
  // Add ClickUp server
  config.mcpServers.clickup = {
    command: 'npx',
    args: ['-y', SERVER_PACKAGE],
    env: {
      CLICKUP_API_TOKEN: apiToken
    }
  };
  
  // Write config
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log('\n✅ Successfully installed ClickUp MCP Server');
  console.log(`📁 Config saved to: ${configPath}`);
  console.log('\n🔄 Please restart Claude Desktop to activate the server');
  
  rl.close();
}

main().catch(console.error);