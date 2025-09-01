/* eslint-disable no-console */
import { z } from 'zod';
import { RealTimeProcessingEngine } from '../services/real-time-processing-engine.js';
import { ProcessingRule } from '../services/event-stream-processor.js';

// Global engine instance
let engineInstance: RealTimeProcessingEngine | null = null;

export const startRealTimeEngineSchema = z.object({
  enableWebSocket: z.boolean().optional().default(true),
  enableCaching: z.boolean().optional().default(true),
  enableAnalytics: z.boolean().optional().default(true),
  wsPort: z.number().optional().default(8080),
  maxLatency: z.number().optional().default(2000),
  targetDeliveryRate: z.number().optional().default(0.999)
});

export const processWebhookSchema = z.object({
  payload: z.any(),
  validateSignature: z.boolean().optional().default(false),
  signature: z.string().optional(),
  secret: z.string().optional()
});

export const addProcessingRuleSchema = z.object({
  id: z.string(),
  eventType: z.enum(['task_update', 'task_created', 'task_deleted', 'comment_added', 'status_changed']),
  condition: z.string().describe('JavaScript condition function as string'),
  action: z.string().describe('JavaScript action function as string'),
  priority: z.number().default(1)
});

export const getRealTimeMetricsSchema = z.object({
  detailed: z.boolean().optional().default(false)
});

export async function startRealTimeEngine(params: z.infer<typeof startRealTimeEngineSchema>) {
  try {
    if (engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is already running'
        }]
      };
    }

    engineInstance = new RealTimeProcessingEngine({
      enableWebSocket: params.enableWebSocket,
      enableCaching: params.enableCaching,
      enableAnalytics: params.enableAnalytics,
      webhookEndpoint: '/webhook',
      wsPort: params.wsPort,
      maxLatency: params.maxLatency,
      targetDeliveryRate: params.targetDeliveryRate
    });

    await engineInstance.start();

    // Set up event listeners for monitoring
    engineInstance.on('event_received', (event) => {
      console.log(`[Real-Time Engine] Event received: ${event.type} for task ${event.taskId}`);
    });

    engineInstance.on('sla_violation', (violation) => {
      console.warn(`[Real-Time Engine] SLA violation: ${violation.latency}ms > ${violation.maxLatency}ms`);
    });

    engineInstance.on('high_priority_task', (event) => {
      console.log(`[Real-Time Engine] High priority task created: ${event.taskId}`);
    });

    const metrics = engineInstance.getMetrics();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'started',
          config: params,
          initialMetrics: metrics,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error starting real-time engine: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function processWebhookEvent(params: z.infer<typeof processWebhookSchema>) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.'
        }],
        isError: true
      };
    }

    // TODO: Add signature validation if required
    if (params.validateSignature && params.signature && params.secret) {
      // Implement HMAC validation here
    }

    const result = await engineInstance.processWebhookEvent(params.payload);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          processed: result.success,
          latency: result.latency,
          timestamp: new Date().toISOString(),
          slaCompliant: result.latency <= 2000
        }, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error processing webhook: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function addProcessingRule(params: z.infer<typeof addProcessingRuleSchema>) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.'
        }],
        isError: true
      };
    }

    // Create the rule with safer function parsing
    // eslint-disable-next-line no-new-func
    const conditionFn = new Function('_event', `return ${params.condition}`) as any;
    // eslint-disable-next-line no-new-func
    const actionFn = new Function('_event', params.action) as any;

    const rule: ProcessingRule = {
      id: params.id,
      eventType: params.eventType,
      condition: conditionFn,
      action: actionFn,
      priority: params.priority
    };

    engineInstance.addProcessingRule(rule);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'rule_added',
          ruleId: params.id,
          eventType: params.eventType,
          priority: params.priority,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error adding processing rule: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function getRealTimeMetrics(params: z.infer<typeof getRealTimeMetricsSchema>) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.'
        }],
        isError: true
      };
    }

    const metrics = params.detailed 
      ? engineInstance.getDetailedMetrics()
      : engineInstance.getMetrics();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          metrics,
          timestamp: new Date().toISOString(),
          slaStatus: {
            latencyCompliant: metrics.averageLatency <= 2000,
            deliveryRateCompliant: metrics.deliverySuccessRate >= 0.999
          }
        }, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting metrics: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function stopRealTimeEngine() {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running'
        }]
      };
    }

    const finalMetrics = engineInstance.getMetrics();
    await engineInstance.stop();
    engineInstance = null;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'stopped',
          finalMetrics,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error stopping real-time engine: ${error.message}`
      }],
      isError: true
    };
  }
}

export async function getCachedTaskData(params: { taskId: string }) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.'
        }],
        isError: true
      };
    }

    const cachedData = engineInstance.getCachedData(params.taskId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          taskId: params.taskId,
          cached: cachedData !== null,
          data: cachedData,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting cached data: ${error.message}`
      }],
      isError: true
    };
  }
}
