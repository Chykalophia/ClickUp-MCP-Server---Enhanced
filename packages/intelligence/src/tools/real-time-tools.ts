/* eslint-disable no-console */
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { RealTimeProcessingEngine } from '../services/real-time-processing-engine.js';
import { ProcessingRule } from '../services/event-stream-processor.js';

let engineInstance: RealTimeProcessingEngine | null = null;

export const startRealTimeEngineSchema = z.object({
  enableWebSocket: z.boolean().optional().default(true),
  enableCaching: z.boolean().optional().default(true),
  enableAnalytics: z.boolean().optional().default(true),
  wsPort: z.number().optional().default(8080),
  maxLatency: z.number().optional().default(2000),
  targetDeliveryRate: z.number().optional().default(0.999),
});

export const processWebhookSchema = z.object({
  payload: z.any().describe('Webhook body; pass the raw request body string when validating signatures'),
  validateSignature: z.boolean().optional().default(false),
  signature: z.string().optional().describe("ClickUp's X-Signature header (hex HMAC-SHA256 of the raw body)"),
  secret: z.string().optional().describe('The webhook secret returned when the webhook was created'),
});

export const addProcessingRuleSchema = z.object({
  id: z.string(),
  eventType: z.enum(['task_update', 'task_created', 'task_deleted', 'comment_added', 'status_changed']),
  condition: z
    .object({
      field: z.string().min(1).describe('Dot path into the event data, e.g. "priority.priority" or "status.status"'),
      operator: z.enum(['equals', 'not_equals', 'contains', 'exists']),
      value: z.union([z.string(), z.number(), z.boolean()]).optional()
        .describe('Value to compare with; not used by "exists"'),
    })
    .optional()
    .describe('When to fire. Omit to fire on every event of this type.'),
  action: z
    .object({
      type: z.literal('log').describe('Write a line to the server log (stderr)'),
      message: z.string().max(500).optional(),
    })
    .default({ type: 'log' })
    .describe('What to do when the rule fires. Rules are declarative; code is never executed.'),
  priority: z.number().default(1),
});

type RuleCondition = z.infer<typeof addProcessingRuleSchema>['condition'];

function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function evaluateRuleCondition(condition: RuleCondition, data: unknown): boolean {
  if (!condition) {
    return true;
  }
  const actual = readPath(data, condition.field);
  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'equals':
      return actual === condition.value;
    case 'not_equals':
      return actual !== condition.value;
    case 'contains':
      if (typeof actual === 'string') {
        return condition.value !== undefined && actual.includes(String(condition.value));
      }
      return Array.isArray(actual) && actual.includes(condition.value);
  }
}

export const getRealTimeMetricsSchema = z.object({
  detailed: z.boolean().optional().default(false),
});

export async function startRealTimeEngine(params: z.infer<typeof startRealTimeEngineSchema>) {
  try {
    if (engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is already running',
        }],
      };
    }

    engineInstance = new RealTimeProcessingEngine({
      enableWebSocket: params.enableWebSocket,
      enableCaching: params.enableCaching,
      enableAnalytics: params.enableAnalytics,
      webhookEndpoint: '/webhook',
      wsPort: params.wsPort,
      maxLatency: params.maxLatency,
      targetDeliveryRate: params.targetDeliveryRate,
    });

    await engineInstance.start();

    engineInstance.on('event_received', (event) => {
      console.error(`[Real-Time Engine] Event received: ${event.type} for task ${event.taskId}`);
    });

    engineInstance.on('sla_violation', (violation) => {
      console.warn(`[Real-Time Engine] SLA violation: ${violation.latency}ms > ${violation.maxLatency}ms`);
    });

    engineInstance.on('high_priority_task', (event) => {
      console.error(`[Real-Time Engine] High priority task created: ${event.taskId}`);
    });

    const metrics = engineInstance.getMetrics();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'started',
          config: params,
          initialMetrics: metrics,
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error starting real-time engine: ${error.message}`,
      }],
      isError: true,
    };
  }
}

/**
 * Verify a ClickUp webhook signature: the X-Signature header is the lowercase hex
 * HMAC-SHA256 of the raw request body, keyed with the webhook secret.
 */
export function isValidWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const received = signature.trim().replace(/^sha256=/i, '');
  if (!/^[a-f0-9]{64}$/i.test(received)) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  return timingSafeEqual(expected, Buffer.from(received, 'hex'));
}

export async function processWebhookEvent(params: z.infer<typeof processWebhookSchema>) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.',
        }],
        isError: true,
      };
    }

    let payload = params.payload;

    if (params.validateSignature) {
      if (!params.signature || !params.secret) {
        return {
          content: [{
            type: 'text',
            text: 'Webhook rejected: validateSignature is true but signature and secret were not both provided.',
          }],
          isError: true,
        };
      }

      // ClickUp signs the raw request body; an object payload is signed as its JSON serialization.
      const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (!isValidWebhookSignature(rawBody ?? '', params.signature, params.secret)) {
        return {
          content: [{
            type: 'text',
            text: 'Webhook rejected: signature does not match the payload and secret.',
          }],
          isError: true,
        };
      }

      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }
    }

    const result = await engineInstance.processWebhookEvent(payload);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          processed: result.success,
          latency: result.latency,
          timestamp: new Date().toISOString(),
          slaCompliant: result.latency <= 2000,
        }, null, 2),
      }],
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error processing webhook: ${error.message}`,
      }],
      isError: true,
    };
  }
}

export async function addProcessingRule(params: z.infer<typeof addProcessingRuleSchema>) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.',
        }],
        isError: true,
      };
    }

    const { condition, action } = params;
    const rule: ProcessingRule = {
      id: params.id,
      eventType: params.eventType,
      condition: event => evaluateRuleCondition(condition, event.data),
      action: async event => {
        // eslint-disable-next-line no-control-regex
        const message = action?.message?.replace(/[\u0000-\u001f\u007f]+/g, ' ');
        const detail = message ? `: ${message}` : '';
        console.error(`[Real-Time Engine] Rule ${params.id} fired for task ${event.taskId}${detail}`);
      },
      priority: params.priority,
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
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error adding processing rule: ${error.message}`,
      }],
      isError: true,
    };
  }
}

export async function getRealTimeMetrics(params: z.infer<typeof getRealTimeMetricsSchema>) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.',
        }],
        isError: true,
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
            deliveryRateCompliant: metrics.deliverySuccessRate >= 0.999,
          },
        }, null, 2),
      }],
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting metrics: ${error.message}`,
      }],
      isError: true,
    };
  }
}

export async function stopRealTimeEngine() {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running',
        }],
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
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error stopping real-time engine: ${error.message}`,
      }],
      isError: true,
    };
  }
}

export async function getCachedTaskData(params: { taskId: string }) {
  try {
    if (!engineInstance) {
      return {
        content: [{
          type: 'text',
          text: 'Real-time processing engine is not running. Start it first with startRealTimeEngine.',
        }],
        isError: true,
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
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting cached data: ${error.message}`,
      }],
      isError: true,
    };
  }
}
