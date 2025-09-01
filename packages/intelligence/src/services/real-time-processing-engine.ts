import { EventEmitter } from 'events';
import { RealTimeDataService, RealTimeDataEvent } from './real-time-data-service';
import { EventStreamProcessor, ProcessingRule } from './event-stream-processor';
import { DataCacheService } from './data-cache-service';
import { WebSocketService } from './websocket-service';

export interface ProcessingEngineConfig {
  enableWebSocket: boolean;
  enableCaching: boolean;
  enableAnalytics: boolean;
  webhookEndpoint: string;
  wsPort: number;
  maxLatency: number;
  targetDeliveryRate: number;
}

export interface EngineMetrics {
  totalEventsProcessed: number;
  averageLatency: number;
  deliverySuccessRate: number;
  activeConnections: number;
  cacheHitRate: number;
  uptime: number;
  memoryUsage: number;
}

export class RealTimeProcessingEngine extends EventEmitter {
  private dataService: RealTimeDataService;
  private streamProcessor: EventStreamProcessor;
  private cacheService: DataCacheService;
  private wsService?: WebSocketService;
  private config: ProcessingEngineConfig;
  private startTime: number = Date.now();
  private totalEvents: number = 0;
  private successfulDeliveries: number = 0;
  private latencyMeasurements: number[] = [];

  constructor(config: ProcessingEngineConfig = {
    enableWebSocket: true,
    enableCaching: true,
    enableAnalytics: true,
    webhookEndpoint: '/webhook',
    wsPort: 8080,
    maxLatency: 2000,
    targetDeliveryRate: 0.999
  }) {
    super();
    this.config = config;
    
    this.dataService = new RealTimeDataService({
      batchSize: 100,
      flushInterval: 1000,
      maxRetries: 3,
      enableAnalytics: config.enableAnalytics
    });

    this.streamProcessor = new EventStreamProcessor();
    
    if (config.enableCaching) {
      this.cacheService = new DataCacheService({
        defaultTTL: 300000,
        maxSize: 10000,
        cleanupInterval: 60000,
        enableMetrics: true
      });
    } else {
      this.cacheService = new DataCacheService({ defaultTTL: 0, maxSize: 0, cleanupInterval: 0, enableMetrics: false });
    }

    if (config.enableWebSocket) {
      this.wsService = new WebSocketService({
        port: config.wsPort,
        pingInterval: 30000,
        connectionTimeout: 60000,
        maxConnections: 1000,
        enableCompression: true
      });
    }

    this.setupEventHandlers();
    this.setupDefaultRules();
  }

  async start(): Promise<void> {
    try {
      if (this.wsService) {
        await this.wsService.start();
        this.emit('websocket_started', { port: this.config.wsPort });
      }

      this.emit('engine_started', {
        config: this.config,
        timestamp: Date.now()
      });

    } catch (error) {
      this.emit('startup_error', error);
      throw error;
    }
  }

  async processWebhookEvent(payload: any): Promise<{ success: boolean; latency: number }> {
    const startTime = Date.now();
    
    try {
      // Process through data service
      await this.dataService.processWebhookEvent(payload);
      
      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      this.successfulDeliveries++;
      
      // Check if latency meets SLA
      if (latency > this.config.maxLatency) {
        this.emit('sla_violation', { latency, maxLatency: this.config.maxLatency });
      }

      return { success: true, latency };
    } catch (error) {
      this.emit('webhook_processing_error', { payload, error });
      return { success: false, latency: Date.now() - startTime };
    }
  }

  private setupEventHandlers(): void {
    // Data service events
    this.dataService.on('data_received', (event: RealTimeDataEvent) => {
      this.totalEvents++;
      this.streamProcessor.processEvent(event);
      this.emit('event_received', event);
    });

    this.dataService.on('batch_processed', (batchInfo) => {
      this.emit('batch_processed', batchInfo);
      
      // Broadcast to WebSocket clients if enabled
      if (this.wsService) {
        this.wsService.broadcast('batch_updates', batchInfo);
      }
    });

    this.dataService.on('analytics_update', (analytics) => {
      this.emit('analytics_update', analytics);
      
      // Cache analytics data
      if (this.config.enableCaching) {
        this.cacheService.cacheAnalytics('latest', analytics, 60000);
      }
    });

    // Stream processor events
    this.streamProcessor.on('event_processed', (event: RealTimeDataEvent) => {
      // Update cache with processed data
      if (this.config.enableCaching) {
        this.cacheService.cacheTask(event.taskId, event.data);
      }

      // Broadcast to WebSocket subscribers
      if (this.wsService) {
        this.wsService.broadcast(`task:${event.taskId}`, {
          type: event.type,
          data: event.data,
          timestamp: event.timestamp
        });
      }
    });

    this.streamProcessor.on('rule_error', (errorInfo) => {
      this.emit('processing_error', errorInfo);
    });

    // WebSocket service events
    if (this.wsService) {
      this.wsService.on('connection_established', (connInfo) => {
        this.emit('client_connected', connInfo);
      });

      this.wsService.on('connection_closed', (connInfo) => {
        this.emit('client_disconnected', connInfo);
      });
    }
  }

  private setupDefaultRules(): void {
    // High priority task notification rule
    this.streamProcessor.addRule({
      id: 'high_priority_notification',
      eventType: 'task_created',
      condition: (event) => event.data.priority?.priority === 'urgent',
      action: async (event) => {
        this.emit('high_priority_task', event);
        if (this.wsService) {
          this.wsService.broadcastToAll({
            type: 'urgent_task_created',
            task: event.data,
            timestamp: event.timestamp
          });
        }
      },
      priority: 10
    });

    // Task completion tracking rule
    this.streamProcessor.addRule({
      id: 'task_completion_tracking',
      eventType: 'status_changed',
      condition: (event) => event.data.status?.status === 'complete',
      action: async (event) => {
        this.emit('task_completed', event);
        
        // Update analytics cache
        if (this.config.enableCaching) {
          const completionData = {
            taskId: event.taskId,
            completedAt: event.timestamp,
            duration: event.data.time_spent || 0
          };
          this.cacheService.cacheAnalytics(`completion:${event.taskId}`, completionData);
        }
      },
      priority: 5
    });

    // Real-time analytics rule
    this.streamProcessor.addRule({
      id: 'realtime_analytics',
      eventType: 'task_update',
      condition: () => this.config.enableAnalytics,
      action: async (event) => {
        const analytics = this.generateTaskAnalytics(event);
        this.emit('analytics_generated', analytics);
        
        if (this.wsService) {
          this.wsService.broadcast('analytics', analytics);
        }
      },
      priority: 1
    });
  }

  private generateTaskAnalytics(event: RealTimeDataEvent): any {
    return {
      taskId: event.taskId,
      eventType: event.type,
      timestamp: event.timestamp,
      metrics: {
        processingLatency: Date.now() - event.timestamp,
        queueSize: this.dataService.getQueueSize(),
        cacheHitRate: this.config.enableCaching ? this.cacheService.getMetrics().hitRate : 0
      }
    };
  }

  private recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only last 1000 measurements
    if (this.latencyMeasurements.length > 1000) {
      this.latencyMeasurements.shift();
    }
  }

  // Public API methods
  addProcessingRule(rule: ProcessingRule): void {
    this.streamProcessor.addRule(rule);
  }

  removeProcessingRule(ruleId: string): boolean {
    return this.streamProcessor.removeRule(ruleId);
  }

  getCachedData(taskId: string): any {
    return this.config.enableCaching ? this.cacheService.getCachedTask(taskId) : null;
  }

  getMetrics(): EngineMetrics {
    const averageLatency = this.latencyMeasurements.length > 0 
      ? this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length 
      : 0;

    const deliveryRate = this.totalEvents > 0 ? this.successfulDeliveries / this.totalEvents : 0;

    return {
      totalEventsProcessed: this.totalEvents,
      averageLatency,
      deliverySuccessRate: deliveryRate,
      activeConnections: this.wsService?.getConnectionCount() || 0,
      cacheHitRate: this.config.enableCaching ? this.cacheService.getMetrics().hitRate : 0,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  getDetailedMetrics(): any {
    return {
      engine: this.getMetrics(),
      dataService: this.dataService.getMetrics(),
      streamProcessor: this.streamProcessor.getMetrics(),
      cache: this.config.enableCaching ? this.cacheService.getMetrics() : null,
      websocket: this.wsService?.getMetrics() || null
    };
  }

  async stop(): Promise<void> {
    try {
      if (this.wsService) {
        await this.wsService.stop();
      }

      this.dataService.destroy();
      this.cacheService.destroy();
      
      this.emit('engine_stopped');
    } catch (error) {
      this.emit('shutdown_error', error);
      throw error;
    }
  }
}
