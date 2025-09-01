# Real-Time Metrics

**Tool Name**: `clickup_get_realtime_metrics`

## Overview

Get comprehensive performance metrics and analytics from the real-time processing engine. Provides detailed insights into webhook processing, WebSocket connections, cache performance, and SLA compliance.

## Parameters

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `detailed` | boolean | `false` | Include detailed breakdown of all metrics |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted metrics report
    }
  ]
}
```

## Example Usage

### Basic Metrics

```typescript
const result = await callTool({
  name: 'clickup_get_realtime_metrics',
  arguments: {}
});
```

### Detailed Metrics

```typescript
const result = await callTool({
  name: 'clickup_get_realtime_metrics',
  arguments: {
    detailed: true
  }
});
```

## Sample Response

```markdown
# ⚡ REAL-TIME ENGINE METRICS

## Engine Status
- **Status**: ✅ Running
- **Uptime**: 2h 34m 15s
- **Engine ID**: rt-engine-1693847234
- **Last Restart**: 2025-09-01T18:00:00.000Z

## Performance Metrics

### Webhook Processing
- **Total Processed**: 1,247 events
- **Success Rate**: 99.8% (1,244 successful)
- **Failed Events**: 3 (0.2%)
- **Average Latency**: 1.2s
- **SLA Compliance**: ✅ 99.9% target met

### WebSocket Connections
- **Active Connections**: 23
- **Peak Connections**: 45
- **Connection Success Rate**: 100%
- **Average Connection Duration**: 1h 23m

### Cache Performance
- **Cache Hits**: 892 (71.5%)
- **Cache Misses**: 355 (28.5%)
- **Cache Size**: 234/1000 entries
- **Memory Usage**: 45.2MB
- **Evictions**: 12 (LRU)

## SLA Monitoring
- **Latency Target**: <2000ms ✅
- **Current Average**: 1,200ms
- **95th Percentile**: 1,800ms
- **99th Percentile**: 2,100ms ⚠️
- **Delivery Rate Target**: 99.9% ✅
- **Current Rate**: 99.8%

## Error Analysis
- **Connection Timeouts**: 2
- **Invalid Payloads**: 1
- **Signature Failures**: 0
- **Processing Errors**: 0

## Resource Usage
- **CPU Usage**: 12%
- **Memory Usage**: 67.8MB
- **Network I/O**: 2.3MB/s
- **Disk I/O**: Minimal
```

## Metrics Categories

### Engine Health
- **Status**: Running, stopped, error states
- **Uptime**: Total running time since last start
- **Restart Count**: Number of restarts in current session
- **Error Count**: Total errors since startup

### Performance Metrics
- **Throughput**: Events processed per minute/hour
- **Latency**: Average, median, 95th/99th percentiles
- **Success Rates**: Percentage of successful operations
- **Queue Depths**: Pending events in processing queues

### Resource Utilization
- **CPU Usage**: Current and peak CPU utilization
- **Memory Usage**: Current memory consumption and limits
- **Network I/O**: Bandwidth usage for WebSocket connections
- **Cache Statistics**: Hit rates, evictions, memory usage

### SLA Compliance
- **Latency SLA**: Target vs. actual latency metrics
- **Delivery SLA**: Target vs. actual success rates
- **Availability**: Uptime percentage
- **Performance Trends**: Historical performance data

## Detailed Metrics (when `detailed: true`)

### Webhook Processing Breakdown
- **By Event Type**: Task updates, comments, status changes
- **By Source**: Different ClickUp workspaces or integrations
- **By Time Period**: Hourly/daily processing volumes
- **Error Details**: Specific error types and frequencies

### WebSocket Analytics
- **Connection Patterns**: Peak usage times and patterns
- **Channel Subscriptions**: Most popular channels
- **Message Volume**: Messages sent per connection
- **Client Types**: Different client applications connected

### Cache Analytics
- **Hit Rate Trends**: Cache performance over time
- **Popular Keys**: Most frequently accessed cache entries
- **Eviction Patterns**: Which entries are evicted most often
- **Memory Efficiency**: Cache memory usage optimization

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Engine not running` | Real-time engine not started | Use `clickup_start_realtime_engine` first |
| `Metrics unavailable` | Engine just started | Wait a few minutes for metrics to accumulate |
| `Permission denied` | Insufficient access rights | Check API token permissions |

## Performance Characteristics

- **Response Time**: <100ms for basic metrics, <500ms for detailed
- **Memory Usage**: ~1MB for metrics collection
- **Update Frequency**: Metrics updated every 30 seconds
- **Retention**: Metrics retained for 24 hours

## Monitoring Integration

### Alerting Thresholds
- **High Latency**: >1.5s average latency
- **Low Success Rate**: <99% delivery rate
- **High Error Rate**: >1% error rate
- **Resource Limits**: >80% memory usage

### Dashboard Integration
- **Real-time Charts**: Live performance graphs
- **Historical Trends**: Performance over time
- **SLA Tracking**: Compliance monitoring
- **Alert Status**: Current alert conditions

## Related Tools

- [`clickup_start_realtime_engine`](./realtime-engine-start.md) - Start the engine to generate metrics
- [`clickup_process_webhook`](./webhook-processor.md) - Generate webhook processing metrics
- [`clickup_stop_realtime_engine`](./realtime-engine-stop.md) - Stop engine and clear metrics
