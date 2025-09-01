# Troubleshooting Guide

This guide helps diagnose and resolve common issues with the ClickUp MCP Server Suite.

## Common Issues

### Authentication Problems

#### Issue: "Invalid API Token" or 401 Unauthorized

**Symptoms:**
- Authentication failures
- 401 HTTP responses
- "Invalid token" error messages

**Solutions:**
1. **Verify Token Format**
   ```bash
   # ClickUp tokens start with "pk_"
   echo $CLICKUP_API_TOKEN | grep "^pk_"
   ```

2. **Test Token Directly**
   ```bash
   curl -H "Authorization: Bearer $CLICKUP_API_TOKEN" \
        https://api.clickup.com/api/v2/user
   ```

3. **Check Token Permissions**
   - Ensure token has required scopes
   - Verify workspace access
   - Check if token is expired

#### Issue: "Forbidden" or 403 Errors

**Symptoms:**
- Access denied to specific resources
- 403 HTTP responses
- Permission-related errors

**Solutions:**
1. **Verify Workspace Access**
   - Check if user has access to workspace
   - Verify team membership
   - Confirm resource permissions

2. **Check API Limits**
   - Review ClickUp plan limitations
   - Verify API rate limits
   - Check feature availability

### Rate Limiting Issues

#### Issue: "Rate Limit Exceeded" or 429 Errors

**Symptoms:**
- 429 HTTP responses
- Temporary request failures
- Slow response times

**Solutions:**
1. **Check Current Limits**
   ```javascript
   // Monitor rate limit headers
   console.log('Rate Limit:', response.headers['x-ratelimit-limit']);
   console.log('Remaining:', response.headers['x-ratelimit-remaining']);
   console.log('Reset:', response.headers['x-ratelimit-reset']);
   ```

2. **Adjust Server Limits**
   ```bash
   # Reduce server-side limits
   export RATE_LIMIT_API=500
   export RATE_LIMIT_WEBHOOK=50
   export RATE_LIMIT_UPLOAD=5
   ```

3. **Implement Backoff Strategy**
   - Use exponential backoff
   - Implement request queuing
   - Add retry logic with delays

### Connection Issues

#### Issue: Network Timeouts or Connection Errors

**Symptoms:**
- Request timeouts
- Connection refused errors
- Network-related failures

**Solutions:**
1. **Check Network Connectivity**
   ```bash
   # Test ClickUp API connectivity
   curl -I https://api.clickup.com/api/v2/user
   ```

2. **Verify Firewall Settings**
   - Allow outbound HTTPS (443)
   - Check corporate firewall rules
   - Verify proxy settings

3. **Adjust Timeout Settings**
   ```javascript
   // Increase timeout values
   const client = axios.create({
     timeout: 30000, // 30 seconds
     retry: 3
   });
   ```

### Memory and Performance Issues

#### Issue: High Memory Usage or Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Out of memory errors
- Slow performance

**Solutions:**
1. **Monitor Memory Usage**
   ```javascript
   // Add memory monitoring
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory:', {
       rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
       heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
       heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
     });
   }, 60000);
   ```

2. **Optimize Cache Settings**
   ```bash
   # Reduce cache TTL
   export CACHE_TTL=60
   
   # Limit cache size
   export MAX_CACHE_SIZE=100
   ```

3. **Implement Garbage Collection**
   ```bash
   # Force garbage collection
   node --expose-gc --max-old-space-size=1024 build/index-enhanced.js
   ```

### Tool-Specific Issues

#### Issue: Tool Not Found or Registration Errors

**Symptoms:**
- "Tool not found" errors
- Missing tools in listings
- Registration failures

**Solutions:**
1. **Verify Tool Registration**
   ```javascript
   // Check if tool is registered
   console.log('Registered tools:', server.listTools());
   ```

2. **Check Tool Names**
   - Ensure correct tool naming (clickup_ prefix)
   - Verify parameter schemas
   - Check for naming conflicts

3. **Validate Tool Implementation**
   ```javascript
   // Test tool directly
   try {
     const result = await server.callTool('clickup_get_workspaces', {});
     console.log('Tool result:', result);
   } catch (error) {
     console.error('Tool error:', error);
   }
   ```

#### Issue: Invalid Parameters or Schema Errors

**Symptoms:**
- Parameter validation errors
- Schema mismatch errors
- Type conversion failures

**Solutions:**
1. **Check Parameter Types**
   ```javascript
   // Validate parameters before calling
   const schema = z.object({
     workspace_id: z.string(),
     include_archived: z.boolean().optional()
   });
   
   const validated = schema.parse(params);
   ```

2. **Review Tool Documentation**
   - Check required vs optional parameters
   - Verify parameter types
   - Review example usage

## Debugging Techniques

### Enable Debug Logging

```bash
# Set debug log level
export LOG_LEVEL=debug

# Enable verbose logging
export DEBUG=clickup:*

# Run with debug output
node build/index-enhanced.js 2>&1 | tee debug.log
```

### Use MCP Test Client

```bash
# Test specific tools
npx @modelcontextprotocol/inspector

# Or use custom test client
node test-client.js
```

### API Response Inspection

```javascript
// Add response logging
axios.interceptors.response.use(
  response => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);
```

### Performance Profiling

```javascript
// Add timing measurements
const startTime = Date.now();
const result = await apiCall();
const duration = Date.now() - startTime;
console.log(`API call took ${duration}ms`);

// Memory profiling
const before = process.memoryUsage();
await operation();
const after = process.memoryUsage();
console.log('Memory delta:', {
  rss: after.rss - before.rss,
  heapUsed: after.heapUsed - before.heapUsed
});
```

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | Common Causes | Solutions |
|------|---------|---------------|-----------|
| 400 | Bad Request | Invalid parameters, malformed data | Validate input parameters |
| 401 | Unauthorized | Invalid/expired token | Check API token |
| 403 | Forbidden | Insufficient permissions | Verify access rights |
| 404 | Not Found | Resource doesn't exist | Check resource IDs |
| 429 | Rate Limited | Too many requests | Implement backoff |
| 500 | Server Error | ClickUp API issues | Retry with backoff |

### MCP Error Codes

| Code | Meaning | Solutions |
|------|---------|-----------|
| -32600 | Invalid Request | Check request format |
| -32601 | Method Not Found | Verify tool name |
| -32602 | Invalid Params | Validate parameters |
| -32603 | Internal Error | Check server logs |

## Diagnostic Commands

### System Health Check

```bash
#!/bin/bash
echo "=== ClickUp MCP Server Diagnostics ==="

# Check Node.js version
echo "Node.js version: $(node --version)"

# Check npm packages
echo "Package versions:"
npm list --depth=0 | grep -E "(clickup|mcp)"

# Test API connectivity
echo "Testing ClickUp API..."
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $CLICKUP_API_TOKEN" \
  https://api.clickup.com/api/v2/user

# Check memory usage
echo "Memory usage:"
ps aux | grep node | grep -v grep

# Check disk space
echo "Disk space:"
df -h .

echo "=== End Diagnostics ==="
```

### Log Analysis

```bash
# Find error patterns
grep -i error logs/server.log | tail -20

# Check rate limiting
grep -i "rate limit" logs/server.log | wc -l

# Monitor memory usage
grep -i "memory" logs/server.log | tail -10

# Check API response times
grep -i "duration" logs/server.log | awk '{print $NF}' | sort -n | tail -10
```

## Getting Help

### Before Seeking Help

1. **Check Logs**
   - Enable debug logging
   - Review error messages
   - Check for patterns

2. **Verify Configuration**
   - Confirm API token
   - Check environment variables
   - Validate settings

3. **Test Isolation**
   - Test with minimal configuration
   - Try different tools
   - Check with fresh token

### Support Channels

1. **GitHub Issues**
   - Search existing issues
   - Provide detailed reproduction steps
   - Include relevant logs

2. **Documentation**
   - Review API documentation
   - Check tool-specific guides
   - Review examples

3. **Community**
   - Check discussions
   - Share solutions
   - Help others

### Issue Reporting Template

```markdown
## Issue Description
Brief description of the problem

## Environment
- Node.js version:
- Package version:
- Operating system:
- MCP client:

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Logs
```
Relevant log output
```

## Additional Context
Any other relevant information
```
