# ClickUp MCP Server - Usage Guide

## 🤔 What is MCP and How Do You Use It?

**MCP (Model Context Protocol)** is a protocol that allows AI assistants (like Claude, ChatGPT, etc.) to access external tools and data sources. Unlike traditional applications with user interfaces, MCP tools are accessed **through AI conversations**.

## 🎯 How to Access Your New AI Intelligence Tools

### Method 1: Claude Desktop (Recommended)

#### Step 1: Install the Intelligence Package
```bash
npm install @chykalophia/clickup-intelligence-mcp-server
```

#### Step 2: Configure Claude Desktop
Add this to your Claude Desktop configuration file:

**Location**: 
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "clickup-intelligence": {
      "command": "npx",
      "args": ["-y", "@chykalophia/clickup-intelligence-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "YOUR_CLICKUP_API_TOKEN_HERE"
      }
    }
  }
}
```

#### Step 3: Restart Claude Desktop

#### Step 4: Use the Tools in Conversation
Simply ask Claude to analyze your ClickUp projects:

```
"Can you analyze the health of my ClickUp workspace? The workspace ID is 12345678"
```

### Method 2: Other MCP-Compatible AI Assistants

The same configuration works with any MCP-compatible AI assistant:
- Cline (VS Code extension)
- Continue.dev
- Other MCP clients

## 🛠️ Available AI Intelligence Tools

### 1. Project Health Analyzer (`clickup_analyze_project_health`)

**What it does**: Provides comprehensive project health analysis with AI-powered insights.

**How to use**:
```
"Analyze the health of my ClickUp project. Workspace ID: 12345678, Space ID: 87654321"
```

**Parameters**:
- `workspace_id` (required): Your ClickUp workspace ID
- `space_id` (optional): Specific space to analyze
- `list_id` (optional): Specific list to analyze
- `include_archived` (optional): Include archived tasks (default: false)
- `analysis_depth` (optional): "basic", "detailed", or "comprehensive" (default: "detailed")

**What you get**:
- Overall health score (0-100) with letter grade
- Executive dashboard with key metrics
- Risk assessment with severity levels
- Actionable recommendations (immediate, short-term, long-term)
- Trend analysis for velocity, quality, and timeline
- Workload distribution analysis
- Dependency health evaluation

### 2. Smart Sprint Planner (`clickup_plan_smart_sprint`) - Coming Soon

**What it does**: AI-optimized sprint planning with capacity analysis.

### 3. Task Decomposition Engine (`clickup_decompose_task`) - Coming Soon

**What it does**: Intelligent task breakdown and sizing.

### 4. Resource Optimizer (`clickup_optimize_resources`) - Coming Soon

**What it does**: Team workload balancing and skill matching.

### 5. Workflow Intelligence (`clickup_analyze_workflow_patterns`) - Coming Soon

**What it does**: Pattern analysis and automation recommendations.

## 📋 Example Conversations

### Basic Health Analysis
```
You: "Can you check the health of my ClickUp workspace 12345678?"

Claude: I'll analyze your ClickUp workspace health using our AI-powered analyzer.
[Runs clickup_analyze_project_health with workspace_id: "12345678"]

[Returns comprehensive health report with scores, risks, and recommendations]
```

### Detailed Analysis with Specific Scope
```
You: "I want a comprehensive analysis of list 98765432 in workspace 12345678, including archived tasks"

Claude: I'll perform a comprehensive health analysis of that specific list.
[Runs clickup_analyze_project_health with detailed parameters]

[Returns in-depth analysis focused on that list]
```

### Follow-up Questions
```
You: "What should I focus on first based on that analysis?"

Claude: Based on the health analysis, I recommend focusing on these immediate actions:
[Provides prioritized recommendations from the analysis]
```

## 🔧 Getting Your ClickUp API Token

1. Log in to your ClickUp account
2. Go to **Settings** → **Apps**
3. Click **Generate API Token**
4. Copy the token and use it in your MCP configuration

## 🚀 Advanced Usage

### Batch Analysis
```
"Can you analyze the health of multiple spaces in my workspace? 
Workspace: 12345678
Spaces: 11111111, 22222222, 33333333"
```

### Comparative Analysis
```
"Compare the health scores between my development team's space (11111111) 
and marketing team's space (22222222) in workspace 12345678"
```

### Trend Monitoring
```
"Run a comprehensive health analysis on workspace 12345678 and 
focus on velocity trends and timeline adherence"
```

## 🎯 No Traditional Interface Needed!

**Key Point**: These are **conversational AI tools**, not traditional software with buttons and menus. You interact with them by:

1. **Asking questions** in natural language
2. **Requesting analysis** of your ClickUp data
3. **Getting insights** through AI-generated reports
4. **Following up** with additional questions

## 🔍 Troubleshooting

### "Tool not found" Error
- Ensure the MCP server is properly configured in Claude Desktop
- Restart Claude Desktop after configuration changes
- Verify your ClickUp API token is valid

### "Access denied" Error
- Check that your ClickUp API token has the necessary permissions
- Verify the workspace/space/list IDs are correct
- Ensure you have access to the specified ClickUp resources

### "Analysis failed" Error
- Try with a smaller scope (specific list instead of entire workspace)
- Check that the workspace contains tasks to analyze
- Verify your internet connection for ClickUp API access

## 🎉 Benefits of MCP-Based AI Tools

1. **Natural Language Interface**: No complex UI to learn
2. **Contextual Analysis**: AI understands your specific needs
3. **Intelligent Insights**: Goes beyond basic reporting
4. **Conversational Follow-up**: Ask clarifying questions
5. **Integration Ready**: Works with any MCP-compatible AI assistant

## 📈 What Makes This Different

Traditional ClickUp tools show you **data**. Our AI intelligence tools provide **insights**:

- ❌ Traditional: "You have 15 overdue tasks"
- ✅ AI Intelligence: "Your 15 overdue tasks indicate a 23% timeline adherence issue. Immediate action needed: redistribute workload from John (120% capacity) to Sarah (60% capacity). This should improve delivery by 2-3 days."

## 🔮 Coming Soon

- **Smart Sprint Planner**: AI-optimized sprint planning
- **Task Decomposition Engine**: Intelligent task breakdown
- **Resource Optimizer**: Team workload balancing
- **Workflow Intelligence**: Pattern analysis and automation
- **Predictive Analytics**: Forecast project outcomes
- **Risk Prediction**: Early warning systems

---

**Ready to get started?** Configure your MCP client and start having intelligent conversations about your ClickUp projects! 🚀
