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
  wrapMcpTool,
  generateRequestId
} from '../utils/error-handling';
import { z } from 'zod';

describe('Error Handling', () => {
  describe('createStructuredError', () => {
    it('should create a structured error with required fields', () => {
      const error = createStructuredError(ErrorType.VALIDATION, 'Test error');
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Test error');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeDefined();
    });

    it('should create a structured error with custom options', () => {
      const error = createStructuredError(ErrorType.API_ERROR, 'API failed', {
        severity: ErrorSeverity.HIGH,
        retryable: true,
        retryAfter: 30,
        code: '500'
      });
      
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30);
      expect(error.code).toBe('500');
    });
  });

  describe('errorToMcpResponse', () => {
    it('should convert structured error to MCP response', () => {
      const error = createStructuredError(ErrorType.VALIDATION, 'Validation failed');
      const response = errorToMcpResponse(error);
      
      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Validation failed');
      expect(response._meta?.errorType).toBe(ErrorType.VALIDATION);
    });
  });

  describe('handleClickUpApiError', () => {
    it('should handle 401 authentication error', () => {
      const mockError = {
        response: {
          status: 401,
          data: { err: 'Invalid token' }
        }
      };
      
      const error = handleClickUpApiError(mockError);
      
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Invalid token');
    });

    it('should handle 429 rate limit error', () => {
      const mockError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { err: 'Rate limited' }
        }
      };
      
      const error = handleClickUpApiError(mockError);
      
      expect(error.type).toBe(ErrorType.RATE_LIMIT);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60);
    });

    it('should handle network timeout error', () => {
      const mockError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      };
      
      const error = handleClickUpApiError(mockError);
      
      expect(error.type).toBe(ErrorType.TIMEOUT);
      expect(error.retryable).toBe(true);
    });
  });

  describe('handleValidationError', () => {
    it('should handle Zod validation error', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0)
      });
      
      try {
        schema.parse({ name: '', age: -1 });
      } catch (zodError) {
        const error = handleValidationError(zodError as z.ZodError);
        
        expect(error.type).toBe(ErrorType.VALIDATION);
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.retryable).toBe(false);
        expect(error.details?.errors).toBeDefined();
      }
    });
  });

  describe('RetryManager', () => {
    it('should execute operation successfully on first try', async () => {
      const retryManager = new RetryManager(3, 100);
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryManager = new RetryManager(2, 10);
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(createStructuredError(ErrorType.NETWORK_ERROR, 'Network failed', { retryable: true }))
        .mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });
});
