import { createHmac } from 'crypto';
import {
  isValidWebhookSignature,
  processWebhookEvent,
  processWebhookSchema,
  startRealTimeEngine,
  stopRealTimeEngine,
} from '../tools/real-time-tools';

// Mock WebSocket to avoid actual network connections in tests
jest.mock('ws', () => ({
  WebSocket: jest.fn(),
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

const secret = 'test-webhook-secret';
const payload = { event: 'taskCreated', task_id: 'task-123', webhook_id: 'wh-1' };
const rawBody = JSON.stringify(payload);
const sign = (body: string, key = secret) => createHmac('sha256', key).update(body).digest('hex');

const processed = (result: { content: { text: string }[]; isError?: boolean }) =>
  !result.isError && JSON.parse(result.content[0].text).processed === true;

describe('isValidWebhookSignature', () => {
  it('accepts the hex HMAC-SHA256 of the raw body', () => {
    expect(isValidWebhookSignature(rawBody, sign(rawBody), secret)).toBe(true);
  });

  it('accepts uppercase hex and a sha256= prefix', () => {
    expect(isValidWebhookSignature(rawBody, sign(rawBody).toUpperCase(), secret)).toBe(true);
    expect(isValidWebhookSignature(rawBody, `sha256=${sign(rawBody)}`, secret)).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    expect(isValidWebhookSignature(rawBody, sign(rawBody, 'other-secret'), secret)).toBe(false);
  });

  it('rejects a signature for a different body', () => {
    expect(isValidWebhookSignature(`${rawBody} `, sign(rawBody), secret)).toBe(false);
  });

  it('rejects malformed signatures without throwing', () => {
    expect(isValidWebhookSignature(rawBody, '', secret)).toBe(false);
    expect(isValidWebhookSignature(rawBody, 'not-hex', secret)).toBe(false);
    expect(isValidWebhookSignature(rawBody, sign(rawBody).slice(0, 62), secret)).toBe(false);
  });
});

describe('processWebhookEvent signature validation', () => {
  beforeAll(async () => {
    await startRealTimeEngine({
      enableWebSocket: false,
      enableCaching: false,
      enableAnalytics: false,
      wsPort: 8080,
      maxLatency: 2000,
      targetDeliveryRate: 0.999,
    });
  });

  afterAll(async () => {
    await stopRealTimeEngine();
  });

  it('processes an unsigned payload when validation is off (unchanged default)', async () => {
    const result = await processWebhookEvent(processWebhookSchema.parse({ payload }));
    expect(processed(result)).toBe(true);
  });

  it('processes a raw body string with a valid signature', async () => {
    const result = await processWebhookEvent({
      payload: rawBody,
      validateSignature: true,
      signature: sign(rawBody),
      secret,
    });
    expect(processed(result)).toBe(true);
  });

  it('processes an object payload signed over its JSON serialization', async () => {
    const result = await processWebhookEvent({
      payload,
      validateSignature: true,
      signature: sign(rawBody),
      secret,
    });
    expect(processed(result)).toBe(true);
  });

  it('rejects a forged signature', async () => {
    const result = await processWebhookEvent({
      payload: rawBody,
      validateSignature: true,
      signature: 'deadbeef'.repeat(8),
      secret,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/signature does not match/);
  });

  it('rejects a tampered body', async () => {
    const tampered = JSON.stringify({ ...payload, task_id: 'task-999' });
    const result = await processWebhookEvent({
      payload: tampered,
      validateSignature: true,
      signature: sign(rawBody),
      secret,
    });
    expect(result.isError).toBe(true);
  });

  it('fails closed when validation is requested without a signature or secret', async () => {
    const noSignature = await processWebhookEvent({ payload, validateSignature: true, secret });
    const noSecret = await processWebhookEvent({
      payload,
      validateSignature: true,
      signature: sign(rawBody),
    });
    expect(noSignature.isError).toBe(true);
    expect(noSecret.isError).toBe(true);
    expect(noSignature.content[0].text).toMatch(/not both provided/);
  });
});
