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

const VERSIONS = {
  '1': { name: 'Basic', command: 'clickup-mcp-server-basic', description: 'Essential tools (~150)' },
  '2': { name: 'Enhanced', command: 'clickup-mcp-server-enhanced', description: 'Production ready (170+ tools) ⭐' },
  '3': { name: 'Efficiency', command: 'clickup-mcp-server-efficiency', description: 'Smart shortcuts (170+ tools) 🚀' },
  '4': { name: 'AI-Powered', command: 'clickup-mcp-server-ai', description: 'Intelligent suggestions (170+ tools) 🧠' }
};

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
  
  // Version selection
  console.log('Available versions:');
  Object.entries(VERSIONS).forEach(([key, version]) => {
    console.log(`${key}. ${version.name} - ${version.description}`);
  });
  
  const versionChoice = await question('\nSelect version (1-4): ');
  const version = VERSIONS[versionChoice];
  
  if (!version) {
    console.log('❌ Invalid selection');
    process.exit(1);
  }
  
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
    args: ['-y', version.command],
    env: {
      CLICKUP_API_TOKEN: apiToken
    }
  };
  
  // Write config
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`\n✅ Successfully installed ClickUp MCP Server (${version.name})`);
  console.log(`📁 Config saved to: ${configPath}`);
  console.log('\n🔄 Please restart Claude Desktop to activate the server');
  
  rl.close();
}

main().catch(console.error);