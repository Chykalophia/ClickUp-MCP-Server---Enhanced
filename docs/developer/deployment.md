# Deployment Guide

This guide covers deployment strategies and production considerations for the ClickUp MCP Server Suite.

## Deployment Options

### 1. NPM Package Deployment (Recommended)

The simplest deployment method using the published npm package:

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "@chykalophia/clickup-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Advantages:**
- No build process required
- Automatic updates available
- Minimal configuration
- Production-ready out of the box

### 2. Source Build Deployment

For customization or development:

```bash
git clone https://github.com/Chykalophia/ClickUp-MCP-Server---Enhanced.git
cd ClickUp-MCP-Server---Enhanced
npm install
npm run build
```

Configuration:
```json
{
  "mcpServers": {
    "clickup": {
      "command": "node",
      "args": ["/path/to/build/index-enhanced.js"],
      "env": {
        "CLICKUP_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 3. Docker Deployment

Create a Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY build/ ./build/
EXPOSE 3000
CMD ["node", "build/index-enhanced.js"]
```

## Environment Configuration

### Required Environment Variables

```bash
CLICKUP_API_TOKEN=your_clickup_api_token
```

### Optional Environment Variables

```bash
# Rate limiting
RATE_LIMIT_API=1000          # API calls per minute
RATE_LIMIT_WEBHOOK=100       # Webhook calls per minute
RATE_LIMIT_UPLOAD=10         # Upload calls per minute

# Security
WEBHOOK_SECRET=your_secret   # For HMAC validation
MAX_FILE_SIZE=104857600      # 100MB default

# Logging
LOG_LEVEL=info              # debug, info, warn, error
LOG_FORMAT=json             # json, text

# Performance
CACHE_TTL=300               # Cache TTL in seconds
MAX_CONCURRENT_REQUESTS=50  # Concurrent request limit
```

## Production Considerations

### Security

1. **API Token Management**
   - Store tokens securely (environment variables, secrets management)
   - Rotate tokens regularly
   - Use least-privilege access

2. **Network Security**
   - Use HTTPS for all communications
   - Implement proper firewall rules
   - Consider VPN for internal deployments

3. **Input Validation**
   - All inputs are validated by default
   - XSS and injection prevention built-in
   - File upload security enforced

### Performance

1. **Rate Limiting**
   - Default limits: 1000 API, 100 webhook, 10 upload/min
   - Adjust based on your ClickUp plan limits
   - Monitor rate limit usage

2. **Caching**
   - Built-in response caching
   - Configurable TTL
   - Memory-efficient implementation

3. **Resource Management**
   - Automatic cleanup of resources
   - Connection pooling for HTTP requests
   - Memory usage monitoring

### Monitoring

1. **Health Checks**
   ```bash
   # Basic health check
   curl http://localhost:3000/health
   
   # Detailed status
   curl http://localhost:3000/status
   ```

2. **Logging**
   - Structured JSON logging
   - Configurable log levels
   - Security event tracking

3. **Metrics**
   - Request/response times
   - Error rates
   - Rate limit usage
   - Memory/CPU usage

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**
   - Multiple server instances
   - Session affinity not required
   - Stateless design

2. **Database Considerations**
   - No persistent storage required
   - All data from ClickUp API
   - Consider caching layer for high load

### Vertical Scaling

1. **Resource Requirements**
   - Minimum: 512MB RAM, 1 CPU core
   - Recommended: 1GB RAM, 2 CPU cores
   - High load: 2GB+ RAM, 4+ CPU cores

2. **Performance Tuning**
   - Adjust concurrent request limits
   - Optimize cache settings
   - Monitor memory usage

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   ```bash
   # Verify token
   curl -H "Authorization: Bearer $CLICKUP_API_TOKEN" \
        https://api.clickup.com/api/v2/user
   ```

2. **Rate Limiting**
   - Check ClickUp plan limits
   - Adjust server rate limits
   - Implement exponential backoff

3. **Memory Issues**
   - Monitor heap usage
   - Adjust cache settings
   - Check for memory leaks

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug node build/index-enhanced.js
```

### Health Monitoring

Implement monitoring endpoints:
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Detailed status
app.get('/status', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});
```

## Backup and Recovery

### Configuration Backup
- Store configuration files in version control
- Document environment variables
- Maintain deployment scripts

### Data Considerations
- No persistent data stored locally
- All data retrieved from ClickUp API
- Consider API rate limits for recovery scenarios

## Security Checklist

- [ ] API tokens stored securely
- [ ] HTTPS enabled for all communications
- [ ] Input validation enabled
- [ ] Rate limiting configured
- [ ] Logging configured for security events
- [ ] File upload restrictions in place
- [ ] Network access properly restricted
- [ ] Regular security updates applied

## Performance Checklist

- [ ] Rate limits configured appropriately
- [ ] Caching enabled and tuned
- [ ] Resource limits set
- [ ] Monitoring in place
- [ ] Health checks configured
- [ ] Load testing completed
- [ ] Memory usage optimized
- [ ] Connection pooling configured
