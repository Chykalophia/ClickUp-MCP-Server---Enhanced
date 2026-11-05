import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';
import {
  validateApiToken,
  sanitizeInput,
  validateWebhookSignature,
  validateFileUpload,
  validateUrl,
  generateSecureToken,
  validateEnvironment,
  rateLimiter,
  safeJsonParse,
  secureLog,
  hashSensitiveData,
} from '../utils/security.js';

describe('Security Utilities', () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  describe('validateApiToken', () => {
    it('should validate correct API token', () => {
      const result = validateApiToken('pk_1234567890abcdef');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty token', () => {
      const result = validateApiToken('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API token is required');
    });

    it('should reject non-string token', () => {
      const result = validateApiToken(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API token must be a string');
    });

    it('should reject too short token', () => {
      const result = validateApiToken('short');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API token appears to be too short');
    });

    it('should reject token with invalid characters', () => {
      const result = validateApiToken('token with spaces');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API token contains invalid characters');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string input', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).toBe('scriptalert(xss)/script');
    });

    it('should sanitize object input', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        description: ['javascript', 'alert("xss")'].join(':'),
      };
      const result = sanitizeInput(input);
      expect(result.name).toBe('scriptalert(xss)/script');
      expect(result.description).toBe('alert(xss)');
    });

    it('should sanitize array input', () => {
      const input = ['<script>', ['javascript', 'alert()'].join(':')];
      const result = sanitizeInput(input);
      expect(result).toEqual(['script', 'alert()']);
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('validateWebhookSignature', () => {
    const secret = 'test-secret';
    const payload = '{"test": "data"}';

    it('should validate correct signature', () => {
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const result = validateWebhookSignature(payload, signature, secret);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate signature with sha256 prefix', () => {
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const result = validateWebhookSignature(payload, `sha256=${signature}`, secret);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const result = validateWebhookSignature(payload, 'invalid-signature', secret);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid signature format');
    });

    it('should reject missing parameters', () => {
      const result = validateWebhookSignature('', '', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing required parameters for signature validation');
    });
  });

  describe('validateFileUpload', () => {
    it('should validate safe file', () => {
      const result = validateFileUpload('document.pdf', 'application/pdf', 1024);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject dangerous file extension', () => {
      const result = validateFileUpload('malware.exe');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type not allowed for security reasons');
    });

    it('should reject path traversal attempts', () => {
      const result = validateFileUpload('../../../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename contains invalid path characters');
    });

    it('should reject oversized files', () => {
      const result = validateFileUpload('large.pdf', 'application/pdf', 200 * 1024 * 1024);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size too large (max 104857600 bytes)');
    });

    it('should reject disallowed mimetype', () => {
      const result = validateFileUpload('script.js', 'application/javascript');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Mimetype 'application/javascript' not allowed");
    });
  });

  describe('validateUrl', () => {
    it('should validate HTTPS URL', () => {
      const result = validateUrl('https://example.com/webhook');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate HTTP URL', () => {
      const result = validateUrl('http://example.com/webhook');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-HTTP protocols', () => {
      const result = validateUrl('ftp://example.com/file');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    it('should reject localhost URLs', () => {
      const result = validateUrl('http://localhost:3000/webhook');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Private and localhost URLs are not allowed');
    });

    it('should reject private IP addresses', () => {
      const result = validateUrl('http://192.168.1.1/webhook');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Private and localhost URLs are not allowed');
    });

    it.each([
      'http://127.0.0.2/',
      'http://0.0.0.0/',
      'http://0.1.2.3/',
      'http://[::ffff:127.0.0.1]/',
      'http://[::ffff:169.254.169.254]/',
      'http://169.254.169.254/latest/meta-data/',
      'http://100.64.0.1/',
      'http://100.127.255.255/',
      'http://[::1]/',
      'http://[fd12:3456::1]/',
      'http://[fe80::1]/',
    ])('should reject loopback, link-local, CGNAT and IPv6 private address %s', url => {
      expect(validateUrl(url).isValid).toBe(false);
    });

    it('should accept public addresses next to the blocked ranges', () => {
      expect(validateUrl('http://100.63.255.255/').isValid).toBe(true);
      expect(validateUrl('http://100.128.0.1/').isValid).toBe(true);
      expect(validateUrl('http://[fc::1]/').isValid).toBe(true);
      expect(validateUrl('http://[2001:db8::1]/').isValid).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate hex string', () => {
      const token = generateSecureToken();
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('validateEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate with required environment variables', () => {
      process.env.CLICKUP_API_TOKEN = 'pk_1234567890abcdef';
      const result = validateEnvironment();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing API token', () => {
      delete process.env.CLICKUP_API_TOKEN;
      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: CLICKUP_API_TOKEN');
    });

    it('should reject invalid API token', () => {
      process.env.CLICKUP_API_TOKEN = 'invalid';
      const result = validateEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid CLICKUP_API_TOKEN');
    });
  });

  describe('rateLimiter', () => {
    it('should allow requests under limit', () => {
      const config = { windowMs: 60000, maxRequests: 5 };

      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed('test-key', config)).toBe(true);
      }
    });

    it('should reject requests over limit', () => {
      const config = { windowMs: 60000, maxRequests: 2 };

      expect(rateLimiter.isAllowed('test-key', config)).toBe(true);
      expect(rateLimiter.isAllowed('test-key', config)).toBe(true);
      expect(rateLimiter.isAllowed('test-key', config)).toBe(false);
    });

    it('should reset limits after window', async () => {
      const config = { windowMs: 100, maxRequests: 1 };

      expect(rateLimiter.isAllowed('test-key', config)).toBe(true);
      expect(rateLimiter.isAllowed('test-key', config)).toBe(false);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(rateLimiter.isAllowed('test-key', config)).toBe(true);
    });

    it('should handle different keys separately', () => {
      const config = { windowMs: 60000, maxRequests: 1 };

      expect(rateLimiter.isAllowed('key1', config)).toBe(true);
      expect(rateLimiter.isAllowed('key2', config)).toBe(true);
      expect(rateLimiter.isAllowed('key1', config)).toBe(false);
      expect(rateLimiter.isAllowed('key2', config)).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('drops prototype-pollution keys at every depth', () => {
      const parsed = safeJsonParse(
        '{"a":{"__proto__":{"polluted":true},"constructor":1,"prototype":2,"b":1},' +
          '"__proto__":{"x":1},"constructor":{"y":1},"prototype":{"z":1}}'
      );
      for (const key of ['__proto__', 'constructor', 'prototype']) {
        expect(Object.prototype.hasOwnProperty.call(parsed, key)).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(parsed.a, key)).toBe(false);
      }
      expect(parsed.a.b).toBe(1);
      expect(({} as any).polluted).toBeUndefined();
    });
  });

  describe('secureLog', () => {
    it('never writes to stdout, which carries the MCP protocol stream', () => {
      const out = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
      const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      secureLog('info', 'hello');
      secureLog('warn', 'careful');
      secureLog('error', 'broken');
      expect(out).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
      expect(err).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('hashSensitiveData', () => {
    it('returns the generated salt so the hash can be verified later', () => {
      const first = hashSensitiveData('secret');
      expect(hashSensitiveData('secret', first.salt).hash).toBe(first.hash);
    });
  });
});
