# Cached Task Retriever

**Tool Name**: `clickup_get_cached_task`

## Overview

Retrieve cached task data from the real-time processing engine for high-performance access to frequently accessed task information. Provides sub-second response times for cached data.

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ClickUp task ID to retrieve from cache |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeComments` | boolean | `false` | Include cached comments data |
| `includeTimeTracking` | boolean | `false` | Include time tracking information |
| `includeCustomFields` | boolean | `true` | Include custom field values |
| `fallbackToAPI` | boolean | `true` | Fallback to API if not cached |

## Response Format

```typescript
{
  content: [
    {
      type: "text",
      text: string // Formatted cached task data
    }
  ]
}
```

## Example Usage

### Basic Cached Task Retrieval

```typescript
const result = await callTool({
  name: 'clickup_get_cached_task',
  arguments: {
    taskId: '868f9p3bg'
  }
});
```

### Comprehensive Cached Data Retrieval

```typescript
const result = await callTool({
  name: 'clickup_get_cached_task',
  arguments: {
    taskId: '868f9p3bg',
    includeComments: true,
    includeTimeTracking: true,
    includeCustomFields: true,
    fallbackToAPI: false
  }
});
```

## Sample Response

```markdown
# 📋 CACHED TASK DATA

## Task Information
- **Task ID**: 868f9p3bg
- **Cache Status**: ✅ Hit (retrieved from cache)
- **Cache Age**: 2 minutes 34 seconds
- **Last Updated**: 2025-09-01T20:44:36.000Z
- **Response Time**: 0.12 seconds

## Task Details
- **Name**: ClickUp MCP Server Enhancement Project
- **Status**: Completed
- **Priority**: High
- **Assignees**: Peter Krzyzek
- **Due Date**: Not set
- **Progress**: 100%

## Task Metadata
- **Created**: 2025-08-20T15:27:25.526Z
- **Updated**: 2025-09-01T20:38:17.134Z
- **Completed**: 2025-09-01T20:36:41.963Z
- **List**: General app, nerdy ideas to code up
- **Space**: Development Workspace

## Custom Fields (3 fields)
- **Complexity**: High
- **Story Points**: 21
- **Sprint**: Sprint 15

## Cache Performance
- **Cache Hit Rate**: 94.2%
- **Average Response Time**: 0.08 seconds
- **Cache Size**: 456/1000 entries
- **Memory Usage**: 12.7MB

## Data Freshness
- **Last API Sync**: 2025-09-01T20:44:36.000Z
- **Cache TTL**: 5 minutes remaining
- **Auto-refresh**: Enabled
- **Webhook Updates**: Real-time

## Related Cached Data
- **Comments**: 12 cached (last 24 hours)
- **Time Entries**: 8 cached entries
- **Attachments**: 3 cached references
- **Dependencies**: 0 cached relationships
```

## Cache Architecture

### Cache Layers
- **L1 Cache**: In-memory LRU cache (fastest access)
- **L2 Cache**: Redis distributed cache (shared across instances)
- **L3 Cache**: Database cache (persistent storage)
- **API Fallback**: Direct ClickUp API call (slowest)

### Cache Strategy
- **Write-Through**: Updates written to cache and API simultaneously
- **Read-Through**: Cache misses trigger API calls and cache population
- **TTL Management**: Time-based expiration with refresh-ahead
- **Invalidation**: Event-driven cache invalidation on updates

### Performance Tiers
- **L1 Hit**: <0.05 seconds (in-memory)
- **L2 Hit**: <0.1 seconds (Redis)
- **L3 Hit**: <0.2 seconds (database)
- **API Fallback**: 1-3 seconds (network call)

## Cache Management

### Cache Population
- **Webhook Events**: Real-time cache updates from ClickUp webhooks
- **Scheduled Refresh**: Periodic cache refresh for active tasks
- **On-Demand Loading**: Cache population on first access
- **Batch Loading**: Bulk cache population for related tasks

### Cache Eviction
- **LRU Policy**: Least recently used items evicted first
- **TTL Expiration**: Time-based automatic expiration
- **Memory Pressure**: Eviction when memory limits reached
- **Manual Invalidation**: Explicit cache clearing when needed

### Cache Monitoring
- **Hit Rate Tracking**: Monitor cache effectiveness
- **Response Time Metrics**: Track performance improvements
- **Memory Usage**: Monitor cache memory consumption
- **Error Tracking**: Log cache failures and fallbacks

## Data Inclusion Options

### Basic Task Data (Always Included)
- Task ID, name, description
- Status, priority, assignees
- Dates (created, updated, due)
- List, folder, space information

### Comments Data (`includeComments: true`)
- Recent comments (last 50)
- Comment metadata (author, timestamp)
- Threaded comment structure
- Comment reactions and mentions

### Time Tracking Data (`includeTimeTracking: true`)
- Time entries for the task
- Total time tracked
- Time by team member
- Billable vs. non-billable time

### Custom Fields Data (`includeCustomFields: true`)
- All custom field values
- Field definitions and types
- Field history and changes
- Calculated field values

## Cache Optimization

### Performance Optimization
- **Compression**: Compress cached data to save memory
- **Serialization**: Efficient data serialization formats
- **Indexing**: Fast lookup indexes for cached data
- **Partitioning**: Distribute cache across multiple nodes

### Memory Management
- **Size Limits**: Configurable cache size limits
- **Memory Monitoring**: Track memory usage patterns
- **Garbage Collection**: Efficient memory cleanup
- **Data Deduplication**: Reduce duplicate data storage

### Network Optimization
- **Connection Pooling**: Reuse Redis connections
- **Pipelining**: Batch multiple cache operations
- **Compression**: Compress network traffic
- **Local Caching**: Reduce network round trips

## Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `Task not in cache` | Task not cached yet | Enable fallbackToAPI or cache task first |
| `Cache unavailable` | Cache service down | Automatic fallback to API |
| `Stale data warning` | Cache data is old | Refresh cache or use API |
| `Cache timeout` | Cache operation timeout | Retry or use API fallback |

## Performance Characteristics

- **Cache Hit Response**: <0.1 seconds
- **Cache Miss Response**: 1-3 seconds (with API fallback)
- **Memory Usage**: ~30KB per cached task
- **Cache Capacity**: 1000 tasks default (configurable)
- **TTL**: 5 minutes default (configurable)

## Cache Statistics

### Performance Metrics
- **Hit Rate**: Percentage of requests served from cache
- **Miss Rate**: Percentage of requests requiring API calls
- **Average Response Time**: Mean response time for cached requests
- **P95 Response Time**: 95th percentile response time

### Usage Metrics
- **Requests per Minute**: Cache request volume
- **Popular Tasks**: Most frequently accessed tasks
- **Cache Turnover**: Rate of cache entry replacement
- **Memory Efficiency**: Memory usage per cached item

## Integration Points

### Real-Time Engine
- **Webhook Processing**: Updates cache from ClickUp events
- **Event Streaming**: Real-time cache invalidation
- **Performance Monitoring**: Cache performance metrics
- **Health Checks**: Cache service health monitoring

### ClickUp API
- **Fallback Mechanism**: API calls when cache misses
- **Data Synchronization**: Keep cache in sync with API
- **Rate Limiting**: Respect API rate limits
- **Error Handling**: Graceful API error handling

## Related Tools

- [`clickup_start_realtime_engine`](./realtime-engine-start.md) - Start engine to enable caching
- [`clickup_process_webhook`](./webhook-processor.md) - Update cache from webhooks
- [`clickup_get_realtime_metrics`](./realtime-metrics.md) - Monitor cache performance
- [`clickup_get_task_details`](../core/task-details.md) - Direct API task retrieval
