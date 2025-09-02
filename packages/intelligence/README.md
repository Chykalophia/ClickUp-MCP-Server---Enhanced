# ClickUp Intelligence MCP Server

<p align="center">
  <img src="https://raw.githubusercontent.com/Chykalophia/ClickUp-MCP-Server---Enhanced/main/assets/images/clickupserverlogo.png" width="256" alt="ClickUp Intelligence Server Logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@chykalophia/clickup-intelligence-mcp-server"><img src="https://img.shields.io/npm/v/@chykalophia/clickup-intelligence-mcp-server.svg" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js Version"></a>
</p>

Advanced project management intelligence and workflow optimization for ClickUp - AI-powered analytics, smart planning, and automation recommendations.

## 🧠 AI-Powered Features

### Project Health Analyzer ✅ **COMPLETED**
- **Real-time health scoring** with letter grades (A-F)
- **Risk assessment** with severity levels and mitigation strategies
- **Executive dashboard** with key performance indicators
- **Actionable recommendations** (immediate, short-term, long-term)
- **Trend analysis** for velocity, quality, and timeline adherence

### Smart Sprint Planner ✅ **COMPLETED**
- **AI-optimized sprint planning** with capacity analysis
- **Resource allocation** based on team skills and availability
- **Velocity prediction** using historical data and machine learning
- **Risk mitigation** with buffer time and contingency planning

### Task Decomposition Engine ✅ **COMPLETED**
- **Intelligent task breakdown** with complexity analysis
- **Effort estimation** using historical patterns
- **Dependency mapping** and critical path identification
- **Skill-based assignment** recommendations

### Resource Optimizer ✅ **COMPLETED**
- **Team workload balancing** and capacity optimization
- **Skill-based task assignment** recommendations
- **Burnout risk analysis** with prevention strategies
- **Capacity forecasting** for resource planning

### Workflow Intelligence ✅ **COMPLETED**
- **Pattern analysis** and automation recommendations
- **Workflow optimization** suggestions
- **Integration recommendations** for productivity gains
- **Process improvement** insights

## 🚀 Quick Start

### Installation
```bash
npm install @chykalophia/clickup-intelligence-mcp-server
```

### Configuration
Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "clickup-intelligence": {
      "command": "npx",
      "args": ["-y", "@chykalophia/clickup-intelligence-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

## 🛠️ Available Tools

### Project Health Analysis
```typescript
clickup_analyze_project_health({
  workspace_id: "12345678",
  space_id: "87654321", // optional
  analysis_depth: "comprehensive" // basic, detailed, comprehensive
})
```

**Returns:**
- Overall health score (0-100) with letter grade
- Risk factors with severity levels
- Performance metrics and trends
- Actionable improvement recommendations

### Smart Sprint Planning
```typescript
clickup_plan_smart_sprint({
  workspace_id: "12345678",
  team_id: "team123",
  sprint_duration: 14, // days
  capacity_buffer: 0.2 // 20% buffer
})
```

**Returns:**
- Optimized task assignments
- Capacity utilization analysis
- Risk assessment and mitigation strategies
- Sprint success probability

### Task Decomposition
```typescript
clickup_decompose_task({
  task: {
    id: "task123",
    name: "Build user authentication system",
    description: "Complete OAuth integration with security features"
  },
  options: {
    targetGranularity: 4,
    maxSubtasks: 8,
    includeEstimation: true
  }
})
```

**Returns:**
- Intelligent task breakdown into manageable subtasks
- Effort estimation for each subtask
- Dependency mapping and sequencing
- Complexity analysis and recommendations

### Resource Optimization
```typescript
clickup_analyze_team_workload({
  workspace_id: "12345678",
  team_members: ["user1", "user2", "user3"],
  analysis_period: "2weeks"
})
```

**Returns:**
- Team workload distribution analysis
- Capacity utilization metrics
- Burnout risk assessment
- Task assignment optimization recommendations

## 💬 Conversational AI Interface

This is a **conversational AI tool** - interact through natural language:

### Example Conversations

**Basic Health Check:**
```
"Can you analyze the health of my ClickUp workspace 12345678?"
```

**Detailed Analysis:**
```
"I want a comprehensive health analysis of space 87654321 in workspace 12345678, including archived tasks"
```

**Sprint Planning:**
```
"Help me plan a 2-week sprint for team 'Development' in workspace 12345678"
```

**Follow-up Questions:**
```
"What should I focus on first based on that analysis?"
"How can I improve our team's velocity?"
"What are the biggest risks to our current sprint?"
```

## 🎯 Key Benefits

### Traditional vs AI Intelligence
- ❌ **Traditional**: "You have 15 overdue tasks"
- ✅ **AI Intelligence**: "Your 15 overdue tasks indicate a 23% timeline adherence issue. Immediate action: redistribute workload from John (120% capacity) to Sarah (60% capacity). Expected improvement: 2-3 days faster delivery."

### Intelligent Insights
- **Pattern Recognition**: Identifies workflow bottlenecks and inefficiencies
- **Predictive Analytics**: Forecasts project outcomes and potential issues
- **Automated Recommendations**: Suggests specific actions with expected impact
- **Risk Prevention**: Early warning systems for project derailment

## 🔧 Configuration File Locations

- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Cline VSCode**: `~/.vscode/extensions/saoudrizwan.claude-dev/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## 🔑 Get ClickUp API Token

1. Log in to ClickUp
2. Go to **Settings** → **Apps**
3. Click **Generate API Token**
4. Copy the token for your configuration

## 🔍 Troubleshooting

### "Tool not found" Error
- Ensure the MCP server is properly configured
- Restart your MCP client after configuration changes
- Verify your ClickUp API token is valid

### "Analysis failed" Error
- Try with a smaller scope (specific list instead of entire workspace)
- Check that the workspace contains tasks to analyze
- Verify your internet connection for ClickUp API access

## 🤝 Related Packages

- **[@chykalophia/clickup-mcp-server](https://www.npmjs.com/package/@chykalophia/clickup-mcp-server)** - Core ClickUp integration (177+ tools)
- **[@chykalophia/clickup-mcp-shared](https://www.npmjs.com/package/@chykalophia/clickup-mcp-shared)** - Shared utilities

## 🔮 Roadmap

- **Real-Time Processing Engine**: Live data streaming and instant analytics
- **Predictive Analytics**: Advanced forecasting and risk prediction
- **Integration Optimizer**: Smart tool and workflow recommendations
- **Advanced Automation**: Custom workflow automation builder

## 📄 License

MIT - see [LICENSE](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced/blob/main/LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced)
- [Issues & Support](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced/issues)
- [Model Context Protocol](https://modelcontextprotocol.io)
