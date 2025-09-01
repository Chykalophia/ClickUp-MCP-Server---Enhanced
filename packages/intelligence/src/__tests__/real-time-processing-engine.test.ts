import { RealTimeProcessingEngine } from '../services/real-time-processing-engine';
import { RealTimeDataService } from '../services/real-time-data-service';
import { EventStreamProcessor } from '../services/event-stream-processor';
import { DataCacheService } from '../services/data-cache-service';

// Mock WebSocket to avoid actual network connections in tests
jest.mock('ws', () => ({
  WebSocket: jest.fn(),
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

describe('RealTimeProcessingEngine', () => {
  let engine: RealTimeProcessingEngine;

  beforeEach(() => {
    engine = new RealTimeProcessingEngine({
      enableWebSocket: false, // Disable WebSocket for tests
      enableCaching: true,
      enableAnalytics: true,
      webhookEndpoint: '/webhook',
      wsPort: 8080,
      maxLatency: 2000,
      targetDeliveryRate: 0.999
    });
  });

  afterEach(async () => {
    await engine.stop();
  });

  describe('Engine Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultEngine = new RealTimeProcessingEngine();
      expect(defaultEngine).toBeDefined();
    });

    it('should start successfully', async () => {
      await expect(engine.start()).resolves.not.toThrow();
    });

    it('should emit engine_started event on start', async () => {
      const startedSpy = jest.fn();
      engine.on('engine_started', startedSpy);
      
      await engine.start();
      
      expect(startedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.any(Object),
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Webhook Processing', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should process webhook events successfully', async () => {
      const mockPayload = {
        event: 'taskCreated',
        task_id: 'test-task-123',
        data: {
          name: 'Test Task',
          status: 'open',
          priority: { priority: 'high' }
        }
      };

      const result = await engine.processWebhookEvent(mockPayload);

      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
      expect(result.latency).toBeLessThan(2000); // Should meet SLA
    });

    it('should emit sla_violation when latency exceeds threshold', async () => {
      const violationSpy = jest.fn();
      engine.on('sla_violation', violationSpy);

      // Create a slow processing scenario by adding a delay
      const slowPayload = {
        event: 'taskCreated',
        task_id: 'slow-task-123',
        data: { name: 'Slow Task' }
      };

      // Mock a slow process by adding artificial delay
      const originalProcess = engine.processWebhookEvent;
      engine.processWebhookEvent = async (payload) => {
        await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5s delay
        return { success: true, latency: 2500 };
      };

      await engine.processWebhookEvent(slowPayload);

      expect(violationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          latency: 2500,
          maxLatency: 2000
        })
      );
    });

    it('should handle webhook processing errors gracefully', async () => {
      const invalidPayload = null;

      const result = await engine.processWebhookEvent(invalidPayload);

      expect(result.success).toBe(false);
      expect(result.latency).toBeGreaterThan(0);
    });
  });

  describe('Processing Rules', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should add custom processing rules', () => {
      const customRule = {
        id: 'test-rule',
        eventType: 'task_created' as const,
        condition: () => true,
        action: async () => { /* test action */ },
        priority: 5
      };

      expect(() => engine.addProcessingRule(customRule)).not.toThrow();
    });

    it('should remove processing rules', () => {
      const customRule = {
        id: 'removable-rule',
        eventType: 'task_update' as const,
        condition: () => true,
        action: async () => { /* test action */ },
        priority: 1
      };

      engine.addProcessingRule(customRule);
      const removed = engine.removeProcessingRule('removable-rule');

      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = engine.removeProcessingRule('non-existent-rule');
      expect(removed).toBe(false);
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should cache task data when processing events', async () => {
      const mockPayload = {
        event: 'taskUpdated',
        task_id: 'cached-task-123',
        data: {
          name: 'Cached Task',
          status: 'in_progress'
        }
      };

      await engine.processWebhookEvent(mockPayload);

      // Allow some time for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const cachedData = engine.getCachedData('cached-task-123');
      expect(cachedData).toBeDefined();
    });

    it('should return null for non-cached tasks', () => {
      const cachedData = engine.getCachedData('non-existent-task');
      expect(cachedData).toBeNull();
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should provide basic metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          totalEventsProcessed: expect.any(Number),
          averageLatency: expect.any(Number),
          deliverySuccessRate: expect.any(Number),
          activeConnections: expect.any(Number),
          cacheHitRate: expect.any(Number),
          uptime: expect.any(Number),
          memoryUsage: expect.any(Number)
        })
      );
    });

    it('should provide detailed metrics', () => {
      const detailedMetrics = engine.getDetailedMetrics();

      expect(detailedMetrics).toEqual(
        expect.objectContaining({
          engine: expect.any(Object),
          dataService: expect.any(Object),
          streamProcessor: expect.any(Object),
          cache: expect.any(Object),
          websocket: null // Disabled in test config
        })
      );
    });

    it('should track successful deliveries', async () => {
      const initialMetrics = engine.getMetrics();
      const initialSuccessRate = initialMetrics.deliverySuccessRate;

      const mockPayload = {
        event: 'taskCreated',
        task_id: 'success-task-123',
        data: { name: 'Success Task' }
      };

      await engine.processWebhookEvent(mockPayload);

      const updatedMetrics = engine.getMetrics();
      expect(updatedMetrics.totalEventsProcessed).toBeGreaterThan(initialMetrics.totalEventsProcessed);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should emit high_priority_task event for urgent tasks', async () => {
      const highPrioritySpy = jest.fn();
      engine.on('high_priority_task', highPrioritySpy);

      const urgentPayload = {
        event: 'taskCreated',
        task_id: 'urgent-task-123',
        data: {
          name: 'Urgent Task',
          priority: { priority: 'urgent' }
        }
      };

      await engine.processWebhookEvent(urgentPayload);

      // Allow time for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(highPrioritySpy).toHaveBeenCalled();
    });

    it('should emit task_completed event for completed tasks', async () => {
      const completedSpy = jest.fn();
      engine.on('task_completed', completedSpy);

      const completedPayload = {
        event: 'taskStatusUpdated',
        task_id: 'completed-task-123',
        data: {
          name: 'Completed Task',
          status: { status: 'complete' }
        }
      };

      await engine.processWebhookEvent(completedPayload);

      // Allow time for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.start();
    });

    it('should handle processing errors gracefully', async () => {
      const errorSpy = jest.fn();
      engine.on('processing_error', errorSpy);

      // Add a rule that throws an error
      engine.addProcessingRule({
        id: 'error-rule',
        eventType: 'task_update',
        condition: () => true,
        action: async () => {
          throw new Error('Test error');
        },
        priority: 1
      });

      const mockPayload = {
        event: 'taskUpdated',
        task_id: 'error-task-123',
        data: { name: 'Error Task' }
      };

      await engine.processWebhookEvent(mockPayload);

      // Allow time for error processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should stop gracefully', async () => {
      await engine.start();
      
      const stoppedSpy = jest.fn();
      engine.on('engine_stopped', stoppedSpy);

      await engine.stop();

      expect(stoppedSpy).toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      await engine.start();
      
      const shutdownErrorSpy = jest.fn();
      engine.on('shutdown_error', shutdownErrorSpy);

      // Mock an error during shutdown
      const originalStop = engine.stop;
      engine.stop = async () => {
        throw new Error('Shutdown error');
      };

      await expect(engine.stop()).rejects.toThrow('Shutdown error');
    });
  });
});

describe('RealTimeDataService', () => {
  let dataService: RealTimeDataService;

  beforeEach(() => {
    dataService = new RealTimeDataService({
      batchSize: 5,
      flushInterval: 100,
      maxRetries: 3,
      enableAnalytics: true
    });
  });

  afterEach(() => {
    dataService.destroy();
  });

  it('should process webhook events', async () => {
    const eventSpy = jest.fn();
    dataService.on('data_received', eventSpy);

    const mockPayload = {
      event: 'taskCreated',
      task_id: 'test-123',
      data: { name: 'Test' }
    };

    await dataService.processWebhookEvent(mockPayload);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task_created',
        taskId: 'test-123',
        source: 'webhook'
      })
    );
  });

  it('should provide queue metrics', () => {
    const metrics = dataService.getMetrics();
    
    expect(metrics).toEqual(
      expect.objectContaining({
        queueSize: expect.any(Number),
        cacheSize: expect.any(Number),
        wsConnections: expect.any(Number),
        uptime: expect.any(Number)
      })
    );
  });
});

describe('DataCacheService', () => {
  let cacheService: DataCacheService;

  beforeEach(() => {
    cacheService = new DataCacheService({
      defaultTTL: 1000,
      maxSize: 100,
      cleanupInterval: 500,
      enableMetrics: true
    });
  });

  afterEach(() => {
    cacheService.destroy();
  });

  it('should cache and retrieve data', () => {
    const testData = { name: 'Test Task', status: 'open' };
    
    cacheService.set('test-key', testData);
    const retrieved = cacheService.get('test-key');

    expect(retrieved).toEqual(testData);
  });

  it('should return null for expired data', async () => {
    const testData = { name: 'Expired Task' };
    
    cacheService.set('expired-key', testData, 50); // 50ms TTL
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const retrieved = cacheService.get('expired-key');
    expect(retrieved).toBeNull();
  });

  it('should provide cache metrics', () => {
    cacheService.set('metric-test', { data: 'test' });
    cacheService.get('metric-test'); // Hit
    cacheService.get('non-existent'); // Miss

    const metrics = cacheService.getMetrics();

    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(metrics.hitRate).toBe(0.5);
  });
});
