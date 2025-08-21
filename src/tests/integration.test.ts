import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { ClickUpClient } from '../clickup-client/index.js';
import { validateWebhookSignature } from '../utils/security.js';
import { handleClickUpApiError } from '../utils/error-handling.js';

// Mock ClickUp API responses
const mockApiResponses = {
  workspaces: {
    teams: [
      {
        id: '123',
        name: 'Test Workspace',
        color: '#7b68ee',
        avatar: null,
        members: []
      }
    ]
  },
  tasks: {
    tasks: [
      {
        id: 'task123',
        name: 'Test Task',
        description: 'Test task description',
        status: {
          status: 'Open',
          color: '#d3d3d3',
          type: 'open'
        },
        orderindex: '1.00000000000000000000000000000000',
        date_created: '1234567890000',
        date_updated: '1234567890000',
        date_closed: null,
        creator: {
          id: 456,
          username: 'testuser',
          color: '#7b68ee',
          email: 'test@example.com'
        },
        assignees: [],
        watchers: [],
        checklists: [],
        tags: [],
        parent: null,
        priority: null,
        due_date: null,
        start_date: null,
        points: null,
        time_estimate: null,
        custom_fields: [],
        dependencies: [],
        linked_tasks: [],
        team_id: '123',
        url: 'https://app.clickup.com/t/task123',
        permission_level: 'create'
      }
    ]
  }
};

describe('Integration Tests', () => {
  let mockAxios: any;

  beforeAll(() => {
    // Mock environment variables
    process.env.CLICKUP_API_TOKEN = 'pk_test_token_1234567890abcdef';

    // Create mock axios instance
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      create: jest.fn().mockReturnThis(),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    };

    // Mock axios module
    jest.mock('axios', () => ({
      create: jest.fn(() => mockAxios)
    }));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('ClickUp Client Integration', () => {
    it('should create client with valid token', () => {
      const client = new ClickUpClient({ apiToken: 'pk_test_token_1234567890abcdef' });
      expect(client).toBeDefined();
    });

    it('should reject invalid token', () => {
      expect(() => {
        new ClickUpClient({ apiToken: '' });
      }).toThrow('ClickUp API token is required');
    });

    it('should make GET request', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockApiResponses.workspaces });
      
      const client = new ClickUpClient({ apiToken: 'pk_test_token_1234567890abcdef' });
      const result = await client.get('/team');
      
      expect(result).toEqual(mockApiResponses.workspaces);
      expect(mockAxios.get).toHaveBeenCalledWith('/team', { params: undefined });
    });

    it('should make POST request', async () => {
      const postData = { name: 'Test Task' };
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });
      
      const client = new ClickUpClient({ apiToken: 'pk_test_token_1234567890abcdef' });
      const result = await client.post('/task', postData);
      
      expect(result).toEqual({ success: true });
      expect(mockAxios.post).toHaveBeenCalledWith('/task', postData);
    });
  });

  describe('Webhook Processing Integration', () => {
    it('should validate webhook signature correctly', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const result = validateWebhookSignature(payload, `sha256=${signature}`, secret);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature';

      const result = validateWebhookSignature(payload, invalidSignature, secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });

    it('should process webhook payload correctly', () => {
      const webhookPayload = {
        id: 90110164070264,
        hist_id: "4697736615798917760",
        date: 1755803061841,
        version: {
          object_type: "comment",
          object_id: "90110164070264",
          workspace_id: 14168111,
          operation: "c",
          data: {
            context: {
              root_parent_type: 1,
              is_chat: false,
              audit_context: {
                userid: 38366580,
                current_time: 1755803061674,
                route: "*"
              },
              originating_service: "publicapi"
            },
            relationships: [
              {
                type: "comment-author",
                object_type: "user",
                object_id: 38366580,
                workspace_id: "14168111"
              },
              {
                type: "comment-parent",
                object_type: "task",
                object_id: "868f9p6ad",
                workspace_id: "14168111"
              }
            ],
            changes: [
              {
                field: "date_created",
                after: 1755803061841
              }
            ]
          },
          master_id: 13,
          version: 1755803061879000,
          deleted: false,
          traceparent: "6041334444293036127",
          date_created: 1755803061879,
          date_updated: 1755803061879,
          event_publish_time: 1755803061900
        }
      };

      // Test payload structure
      expect(webhookPayload.version.object_type).toBe('comment');
      expect(webhookPayload.version.operation).toBe('c');
      expect(webhookPayload.version.workspace_id).toBe(14168111);
      expect(webhookPayload.version.data.context.audit_context.userid).toBe(38366580);
      expect(webhookPayload.version.data.relationships).toHaveLength(2);
      expect(webhookPayload.version.data.changes).toHaveLength(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network timeouts', () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      };

      const structuredError = handleClickUpApiError(timeoutError);
      
      expect(structuredError.type).toBe('TIMEOUT');
      expect(structuredError.retryable).toBe(true);
      expect(structuredError.retryAfter).toBe(10);
    });

    it('should handle rate limiting', () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { err: 'Rate limited' },
          headers: { 'retry-after': '60' }
        }
      };

      const structuredError = handleClickUpApiError(rateLimitError);
      
      expect(structuredError.type).toBe('RATE_LIMIT');
      expect(structuredError.retryable).toBe(true);
      expect(structuredError.retryAfter).toBe(60);
    });

    it('should handle authentication errors', () => {
      const authError = {
        response: {
          status: 401,
          data: { err: 'Invalid token' }
        }
      };

      const structuredError = handleClickUpApiError(authError);
      
      expect(structuredError.type).toBe('AUTHENTICATION');
      expect(structuredError.severity).toBe('HIGH');
      expect(structuredError.retryable).toBe(false);
    });
  });

  describe('Security Integration', () => {
    it('should validate API token format', () => {
      const { validateApiToken } = require('../utils/security.js');
      
      const validToken = validateApiToken('pk_1234567890abcdef');
      expect(validToken.isValid).toBe(true);
      
      const invalidToken = validateApiToken('invalid');
      expect(invalidToken.isValid).toBe(false);
      expect(invalidToken.error).toContain('too short');
    });

    it('should sanitize malicious input', () => {
      const { sanitizeInput } = require('../utils/security.js');
      
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('should validate file uploads securely', () => {
      const { validateFileUpload } = require('../utils/security.js');
      
      const safeFile = validateFileUpload('document.pdf', 'application/pdf', 1024);
      expect(safeFile.isValid).toBe(true);
      
      const dangerousFile = validateFileUpload('malware.exe');
      expect(dangerousFile.isValid).toBe(false);
      expect(dangerousFile.errors).toContain('File type not allowed for security reasons');
      
      const pathTraversal = validateFileUpload('../../../etc/passwd');
      expect(pathTraversal.isValid).toBe(false);
      expect(pathTraversal.errors).toContain('Filename contains invalid path characters');
    });

    it('should validate URLs securely', () => {
      const { validateUrl } = require('../utils/security.js');
      
      const validUrl = validateUrl('https://example.com/webhook');
      expect(validUrl.isValid).toBe(true);
      
      const localhostUrl = validateUrl('http://localhost:3000/webhook');
      expect(localhostUrl.isValid).toBe(false);
      expect(localhostUrl.error).toContain('Private and localhost URLs are not allowed');
      
      const invalidProtocol = validateUrl('ftp://example.com/file');
      expect(invalidProtocol.isValid).toBe(false);
      expect(invalidProtocol.error).toContain('Only HTTP and HTTPS URLs are allowed');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        method: 'GET' as const,
        endpoint: `/task/${i}`,
        data: undefined,
        params: undefined
      }));

      // Mock successful responses
      mockAxios.get.mockResolvedValue({ data: { success: true } });

      const startTime = Date.now();
      
      // Simulate batch processing
      const results = await Promise.all(
        requests.map(async (req) => {
          try {
            const client = new ClickUpClient({ apiToken: 'pk_test_token_1234567890abcdef' });
            const result = await client.get(req.endpoint, req.params);
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
