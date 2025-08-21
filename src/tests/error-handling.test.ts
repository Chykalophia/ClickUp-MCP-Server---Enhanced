import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { z } from 'zod';
import {
  ErrorType,
  ErrorSeverity,
  createStructuredError,
  errorToMcpResponse,
  getUserFriendlyMessage,
  handleClickUpApiError,
  handleValidationError,
  handleWebhookError,
  handleFileError,
  RetryManager,
  generateRequestId,
  performHealthCheck
} from '../utils/error-handling.js';

describe('Error Handling Utilities', () => {
  describe('createStructuredError', () => {
    it('should create structured error with required fields', () => {
      const error = createStructuredError(ErrorType.VALIDATION, 'Test error');
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Test error');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.timestamp).toBeDefined();
      expect(error.retryable).toBe(false);
    });

    it('should create structured error with optional fields', () => {
      const error = createStructuredError(ErrorType.API_ERROR, 'Test error', {
        severity: ErrorSeverity.HIGH,
        code: '500',
        details: { test: 'data' },
        retryable: true,
        retryAfter: 30
      });
      
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.code).toBe('500');
      expect(error.details).toEqual({ test: 'data' });
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30);
    });
  });

  describe('errorToMcpResponse', () => {
    it('should convert structured error to MCP response', () => {
      const error = createStructuredError(ErrorType.VALIDATION, 'Test error', {
        severity: ErrorSeverity.HIGH,
        retryable: true,
        retryAfter: 60
      });
      
      const response = errorToMcpResponse(error);
      
      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Test error');
      expect(response._meta?.errorType).toBe(ErrorType.VALIDATION);
      expect(response._meta?.severity).toBe(ErrorSeverity.HIGH);
      expect(response._meta?.retryable).toBe(true);
      expect(response._meta?.retryAfter).toBe(60);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return basic error message', () => {
      const error = createStructuredError(ErrorType.INTERNAL_ERROR, 'Something went wrong');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Error: Something went wrong');
    });

    it('should add retry information for retryable errors', () => {
      const error = createStructuredError(ErrorType.RATE_LIMIT, 'Rate limited', {
        retryable: true,
        retryAfter: 60
      });
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('This operation can be retried after 60 seconds');
      expect(message).toContain('Please reduce the frequency of requests');
    });

    it('should add authentication help for auth errors', () => {
      const error = createStructuredError(ErrorType.AUTHENTICATION, 'Invalid token');
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Please check your ClickUp API token');
    });

    it('should add validation details for validation errors', () => {
      const error = createStructuredError(ErrorType.VALIDATION, 'Validation failed', {
        details: { errors: ['field1: required', 'field2: invalid'] }
      });
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Validation errors: field1: required, field2: invalid');
    });
  });

  describe('handleClickUpApiError', () => {
    it('should handle 400 Bad Request', () => {
      const apiError = {
        response: {
          status: 400,
          data: { err: 'Invalid request' }
        }
      };
      
      const error = handleClickUpApiError(apiError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.message).toBe('Invalid request');
      expect(error.retryable).toBe(false);
    });

    it('should handle 401 Unauthorized', () => {
      const apiError = {
        response: {
          status: 401,
          data: { err: 'Invalid token' }
        }
      };
      
      const error = handleClickUpApiError(apiError);
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(false);
    });

    it('should handle 429 Rate Limited', () => {
      const apiError = {
        response: {
          status: 429,
          data: { err: 'Rate limited' },
          headers: { 'retry-after': '120' }
        }
      };
      
      const error = handleClickUpApiError(apiError);
      expect(error.type).toBe(ErrorType.RATE_LIMIT);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(120);
    });

    it('should handle 500 Server Error', () => {
      const apiError = {
        response: {
          status: 500,
          data: { err: 'Internal server error' }
        }
      };
      
      const error = handleClickUpApiError(apiError);
      expect(error.type).toBe(ErrorType.API_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30);
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      };
      
      const error = handleClickUpApiError(timeoutError);
      expect(error.type).toBe(ErrorType.TIMEOUT);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(10);
    });

    it('should handle network errors', () => {
      const networkError = {
        code: 'ENOTFOUND',
        message: 'Network error'
      };
      
      const error = handleClickUpApiError(networkError);
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30);
    });
  });

  describe('handleValidationError', () => {
    it('should handle Zod validation error', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      try {
        schema.parse({ name: 123, age: 'invalid' });
      } catch (zodError) {
        const error = handleValidationError(zodError as z.ZodError);
        expect(error.type).toBe(ErrorType.VALIDATION);
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.retryable).toBe(false);
        expect(error.details?.errors).toBeDefined();
      }
    });
  });

  describe('handleWebhookError', () => {
    it('should handle webhook processing error', () => {
      const webhookError = new Error('Webhook processing failed');
      const error = handleWebhookError(webhookError, {
        webhookId: 'webhook_123',
        eventType: 'taskCreated'
      });
      
      expect(error.type).toBe(ErrorType.WEBHOOK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60);
      expect(error.details?.webhookId).toBe('webhook_123');
      expect(error.details?.eventType).toBe('taskCreated');
    });
  });

  describe('handleFileError', () => {
    it('should handle file not found error', () => {
      const fileError = { code: 'ENOENT', message: 'File not found' };
      const error = handleFileError(fileError, { filename: 'test.pdf' });
      
      expect(error.type).toBe(ErrorType.FILE_ERROR);
      expect(error.message).toBe('File not found');
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.details?.filename).toBe('test.pdf');
    });

    it('should handle permission denied error', () => {
      const fileError = { code: 'EACCES', message: 'Permission denied' };
      const error = handleFileError(fileError);
      
      expect(error.message).toBe('Permission denied');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(false);
    });
  });

  describe('RetryManager', () => {
    it('should succeed on first attempt', async () => {
      const retryManager = new RetryManager(3, 100);
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const retryManager = new RetryManager(2, 10);
      const operation = jest.fn()
        .mockRejectedValueOnce(createStructuredError(ErrorType.API_ERROR, 'Server error', { retryable: true }))
        .mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const retryManager = new RetryManager(3, 10);
      const error = createStructuredError(ErrorType.VALIDATION, 'Validation error', { retryable: false });
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryManager.executeWithRetry(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      const retryManager = new RetryManager(2, 10);
      const error = createStructuredError(ErrorType.API_ERROR, 'Server error', { retryable: true });
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryManager.executeWithRetry(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('performHealthCheck', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return healthy status with valid environment', async () => {
      process.env.CLICKUP_API_TOKEN = 'pk_1234567890abcdef';
      
      const health = await performHealthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.checks.environment.status).toBe('pass');
      expect(health.checks.memory.status).toBe('pass');
    });

    it('should return degraded status with some failures', async () => {
      delete process.env.CLICKUP_API_TOKEN;
      
      const health = await performHealthCheck();
      
      expect(health.status).toBe('degraded');
      expect(health.checks.environment.status).toBe('fail');
    });
  });
});
