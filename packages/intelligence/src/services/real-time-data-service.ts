import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

export interface RealTimeDataEvent {
  type: 'task_update' | 'task_created' | 'task_deleted' | 'comment_added' | 'status_changed';
  taskId: string;
  timestamp: number;
  data: any;
  source: 'webhook' | 'polling' | 'websocket';
}

export interface StreamProcessingConfig {
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  enableAnalytics: boolean;
}

export class RealTimeDataService extends EventEmitter {
  private wsConnections: Map<string, WebSocket> = new Map();
  private dataCache: Map<string, any> = new Map();
  private processingQueue: RealTimeDataEvent[] = [];
  private config: StreamProcessingConfig;
  private processingTimer?: ReturnType<typeof setInterval>;

  constructor(config: StreamProcessingConfig = {
    batchSize: 100,
    flushInterval: 1000,
    maxRetries: 3,
    enableAnalytics: true
  }) {
    super();
    this.config = config;
    // Only start processing in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      this.startProcessing();
    }
  }

  async processWebhookEvent(payload: any): Promise<void> {
    const event: RealTimeDataEvent = {
      type: this.mapEventType(payload.event),
      taskId: payload.task_id || payload.id,
      timestamp: Date.now(),
      data: payload,
      source: 'webhook'
    };

    this.queueEvent(event);
    this.emit('data_received', event);
  }

  private mapEventType(eventType: string): RealTimeDataEvent['type'] {
    const mapping: Record<string, RealTimeDataEvent['type']> = {
      'taskCreated': 'task_created',
      'taskUpdated': 'task_update',
      'taskDeleted': 'task_deleted',
      'taskCommentPosted': 'comment_added',
      'taskStatusUpdated': 'status_changed'
    };
    return mapping[eventType] || 'task_update';
  }

  private queueEvent(event: RealTimeDataEvent): void {
    this.processingQueue.push(event);
    
    if (this.processingQueue.length >= this.config.batchSize) {
      this.flushQueue();
    }
  }

  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      if (this.processingQueue.length > 0) {
        this.flushQueue();
      }
    }, this.config.flushInterval);
  }

  private flushQueue(): void {
    const batch = this.processingQueue.splice(0, this.config.batchSize);
    this.processBatch(batch);
  }

  private async processBatch(events: RealTimeDataEvent[]): Promise<void> {
    try {
      // Update cache
      events.forEach(event => {
        this.dataCache.set(event.taskId, {
          ...event.data,
          lastUpdated: event.timestamp
        });
      });

      // Emit batch processed event
      this.emit('batch_processed', {
        count: events.length,
        timestamp: Date.now(),
        latency: this.calculateAverageLatency(events)
      });

      // Process analytics if enabled
      if (this.config.enableAnalytics) {
        this.processAnalytics(events);
      }

    } catch (error) {
      this.emit('processing_error', { error, events });
    }
  }

  private calculateAverageLatency(events: RealTimeDataEvent[]): number {
    const now = Date.now();
    const totalLatency = events.reduce((sum, event) => sum + (now - event.timestamp), 0);
    return totalLatency / events.length;
  }

  private processAnalytics(events: RealTimeDataEvent[]): void {
    const analytics = {
      eventCounts: this.countEventTypes(events),
      averageLatency: this.calculateAverageLatency(events),
      throughput: events.length / (this.config.flushInterval / 1000)
    };

    this.emit('analytics_update', analytics);
  }

  private countEventTypes(events: RealTimeDataEvent[]): Record<string, number> {
    return events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  getCachedData(taskId: string): any {
    return this.dataCache.get(taskId);
  }

  getQueueSize(): number {
    return this.processingQueue.length;
  }

  getMetrics(): any {
    return {
      queueSize: this.processingQueue.length,
      cacheSize: this.dataCache.size,
      wsConnections: this.wsConnections.size,
      uptime: process.uptime()
    };
  }

  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    this.wsConnections.forEach(ws => ws.close());
    this.removeAllListeners();
  }
}
