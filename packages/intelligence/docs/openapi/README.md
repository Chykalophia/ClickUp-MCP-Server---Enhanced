# OpenAPI Specification

This directory contains the OpenAPI 3.0 specification for the ClickUp Intelligence MCP Server API.

## Files

- **`openapi.yaml`** - Hand-crafted OpenAPI specification (partial)
- **`openapi-generated.json`** - Auto-generated complete specification
- **`schemas/`** - Component schemas (future expansion)

## Interactive Documentation

View the interactive API documentation at:
- **Local**: Open `../interactive/index.html` in your browser
- **Online**: [API Documentation](https://chykalophia.github.io/ClickUp-MCP-Server---Enhanced/intelligence/docs/interactive/)

## Generation

The OpenAPI specification is automatically generated from the tool definitions:

```bash
# Generate OpenAPI specification
npm run generate:openapi

# Or run directly
node scripts/generate-openapi.cjs
```

## Features

### Complete API Coverage
- ✅ All 21 intelligence tools documented
- ✅ Request/response schemas with validation
- ✅ Error handling and status codes
- ✅ Authentication specification
- ✅ Rate limiting documentation

### Interactive Features
- 🔧 **Try It Out** - Test API endpoints directly
- 📋 **Code Generation** - Auto-generated client code samples
- 🔑 **API Key Management** - Built-in authentication
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Custom Styling** - Branded interface

### Tool Categories

1. **Project Health Analysis** (1 tool)
   - Real-time health scoring and risk assessment

2. **Sprint Planning** (4 tools)
   - AI-optimized sprint planning with capacity analysis
   - Team velocity analysis with confidence intervals
   - Advanced capacity modeling with multi-factor analysis
   - Multi-objective sprint task optimization

3. **Task Management** (3 tools)
   - Intelligent task breakdown and complexity analysis
   - Task decomposition templates and patterns

4. **Resource Optimization** (4 tools)
   - Team workload balancing and optimization
   - Task assignment optimization with skill matching
   - Burnout risk analysis and prevention
   - Capacity forecasting and resource planning

5. **Workflow Intelligence** (3 tools)
   - Workflow pattern analysis and optimization
   - Automation recommendations with ROI analysis
   - Integration optimization and performance analysis

6. **Real-Time Processing** (6 tools)
   - Live data streaming and event processing
   - Webhook processing with HMAC validation
   - Real-time metrics and performance monitoring

## Usage Examples

### Basic Health Analysis
```bash
curl -X POST "http://localhost:3000/tools/clickup_analyze_project_health" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_TOKEN" \
  -d '{
    "workspaceId": "9011839976",
    "analysisDepth": "standard",
    "timeframe": "1month"
  }'
```

### Smart Sprint Planning
```bash
curl -X POST "http://localhost:3000/tools/clickup_plan_smart_sprint" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_TOKEN" \
  -d '{
    "workspaceId": "9011839976",
    "teamId": "team_123",
    "sprintGoal": "Complete user authentication system",
    "sprintDuration": 2,
    "candidateTasks": ["task_1", "task_2", "task_3"]
  }'
```

## Client Generation

Use the OpenAPI specification to generate client libraries:

### JavaScript/TypeScript
```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi/openapi-generated.json \
  -g typescript-axios \
  -o clients/typescript
```

### Python
```bash
openapi-generator generate \
  -i docs/openapi/openapi-generated.json \
  -g python \
  -o clients/python
```

### Java
```bash
openapi-generator generate \
  -i docs/openapi/openapi-generated.json \
  -g java \
  -o clients/java
```

## Validation

Validate the OpenAPI specification:

```bash
# Using swagger-codegen
swagger-codegen validate -i docs/openapi/openapi-generated.json

# Using openapi-generator
openapi-generator validate -i docs/openapi/openapi-generated.json
```

## Integration

### Postman Collection
Import the OpenAPI specification into Postman:
1. Open Postman
2. Click "Import"
3. Select "Link" and paste: `file://path/to/openapi-generated.json`
4. Configure authentication with your ClickUp API token

### Insomnia
Import into Insomnia:
1. Open Insomnia
2. Click "Create" → "Import From" → "File"
3. Select `openapi-generated.json`
4. Set up environment variables for API key

## Development

### Adding New Tools
When adding new intelligence tools:

1. Update the `INTELLIGENCE_TOOLS` array in `scripts/generate-openapi.cjs`
2. Add the tool schema and description
3. Regenerate the specification: `npm run generate:openapi`
4. Update the interactive documentation if needed

### Schema Validation
All request/response schemas include:
- Type validation
- Required field enforcement
- Format validation (dates, emails, etc.)
- Range validation (min/max values)
- Enum validation for restricted values

## Performance

### Response Times
- **Standard Analysis**: < 2 seconds
- **Comprehensive Analysis**: < 5 seconds
- **Real-time Processing**: < 500ms
- **Bulk Operations**: < 10 seconds

### Rate Limits
- **API Calls**: 1000 requests/minute per workspace
- **Webhook Processing**: 100 events/minute
- **Real-time Updates**: 10 concurrent connections

### Caching
- **Analysis Results**: 1-4 hours depending on tool
- **Team Data**: 30 minutes
- **Workspace Metadata**: 24 hours

## Support

For API support and questions:
- 📧 Email: peter@chykalophia.com
- 🐛 Issues: [GitHub Issues](https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced/issues)
- 📖 Documentation: [Full API Docs](../api/README.md)
