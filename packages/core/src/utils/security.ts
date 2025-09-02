/* eslint-disable no-console */
import crypto from 'crypto';
import { z } from 'zod';

/**
 * Security utilities for the ClickUp MCP Server
 */

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Default rate limits
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  webhook: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  api: { windowMs: 60000, maxRequests: 1000 }, // 1000 requests per minute
  upload: { windowMs: 60000, maxRequests: 10 } // 10 uploads per minute
};

// Rate limiter implementation with memory leak prevention
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor() {
    // Only create cleanup interval in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      // Cleanup old entries every 5 minutes to prevent memory leaks
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
      
      // Cleanup interval on process exit to prevent Jest hanging
      if (typeof process !== 'undefined') {
        process.on('exit', () => this.destroy());
        process.on('SIGINT', () => this.destroy());
        process.on('SIGTERM', () => this.destroy());
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter(time => now - time < maxAge);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing requests for this key
    const keyRequests = this.requests.get(key) || [];

    // Filter out old requests
    const recentRequests = keyRequests.filter(time => time > windowStart);

    // Check if under limit
    if (recentRequests.length >= config.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Operation-specific rate limits
 */
export const OPERATION_RATE_LIMITS = {
  bulk_operations: { windowMs: 60000, maxRequests: 10 }, // 10 per minute
  file_uploads: { windowMs: 60000, maxRequests: 5 }, // 5 per minute
  webhook_processing: { windowMs: 60000, maxRequests: 50 }, // 50 per minute
  search_operations: { windowMs: 60000, maxRequests: 30 }, // 30 per minute
  default: { windowMs: 60000, maxRequests: 100 } // 100 per minute
} as const;

/**
 * Check operation-specific rate limit
 */
export const checkOperationRateLimit = (operation: keyof typeof OPERATION_RATE_LIMITS, identifier: string): boolean => {
  const limits = OPERATION_RATE_LIMITS[operation] || OPERATION_RATE_LIMITS.default;
  const key = `${operation}_${identifier}`;
  return rateLimiter.isAllowed(key, limits);
};

/**
 * Validate and sanitize API token
 */
export const validateApiToken = (token: string): { isValid: boolean; error?: string } => {
  if (!token) {
    return { isValid: false, error: 'API token is required' };
  }

  if (typeof token !== 'string') {
    return { isValid: false, error: 'API token must be a string' };
  }

  if (token.length < 10) {
    return { isValid: false, error: 'API token appears to be too short' };
  }

  if (token.length > 200) {
    return { isValid: false, error: 'API token appears to be too long' };
  }

  // Check for suspicious patterns
  if (token.includes(' ') || token.includes('\n') || token.includes('\t')) {
    return { isValid: false, error: 'API token contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Remove control characters from string
 */
const removeControlCharacters = (str: string): string => {
  return str.split('').filter(char => {
    const code = char.charCodeAt(0);
    return !(code >= 0 && code <= 31) && !(code >= 127 && code <= 159);
  }).join('');
};

/**
 * HTML encode user input to prevent XSS attacks
 */
export const htmlEncode = (input: string): string => {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters and patterns
    let sanitized = input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces to prevent log injection
      .replace(/['"`;\\]/g, '') // Remove SQL injection characters
      .replace(/\$\{.*?\}/g, '') // Remove template literals
      .replace(/eval\s*\(/gi, '') // Remove eval calls
      .replace(/Function\s*\(/gi, '') // Remove Function constructor
      .trim()
      .substring(0, 10000); // Limit length to prevent DoS
    
    // Remove control characters
    sanitized = removeControlCharacters(sanitized);
    
    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize both keys and values
      const sanitizedKey = typeof key === 'string' ? sanitizeInput(key) : key;
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};

/**
 * Validate webhook signature with timing-safe comparison
 */
export const validateWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): { isValid: boolean; error?: string } => {
  try {
    if (!payload || !signature || !secret) {
      return { isValid: false, error: 'Missing required parameters for signature validation' };
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Extract signature from header (remove 'sha256=' prefix if present)
    const receivedSignature = signature.replace(/^sha256=/, '');

    // Validate signature format
    if (!/^[a-f0-9]{64}$/i.test(receivedSignature)) {
      return { isValid: false, error: 'Invalid signature format' };
    }

    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    return { isValid };
  } catch (error) {
    return {
      isValid: false,
      error: `Signature validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Validate file upload security
 */
export const validateFileUpload = (
  filename: string,
  mimetype?: string,
  size?: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate filename
  if (!filename || typeof filename !== 'string') {
    errors.push('Filename is required and must be a string');
  } else {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.push('Filename contains invalid path characters');
    }

    // Check for dangerous extensions
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.com',
      '.pif',
      '.scr',
      '.vbs',
      '.js',
      '.jar',
      '.php',
      '.asp',
      '.aspx',
      '.jsp',
      '.sh',
      '.ps1',
      '.py',
      '.rb'
    ];

    const extension = filename.toLowerCase().split('.').pop();
    if (extension && dangerousExtensions.includes(`.${extension}`)) {
      errors.push('File type not allowed for security reasons');
    }

    // Check filename length
    if (filename.length > 255) {
      errors.push('Filename too long (max 255 characters)');
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      errors.push('Filename contains null bytes');
    }
  }

  // Validate mimetype if provided
  if (mimetype) {
    const allowedMimetypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documents
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      // Media
      'video/mp4',
      'video/webm',
      'audio/mp3',
      'audio/wav',
      'audio/ogg'
    ];

    if (!allowedMimetypes.includes(mimetype)) {
      errors.push(`Mimetype '${mimetype}' not allowed`);
    }
  }

  // Validate file size if provided (max 100MB)
  if (size !== undefined) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (size > maxSize) {
      errors.push(`File size too large (max ${maxSize} bytes)`);
    }
    if (size < 0) {
      errors.push('Invalid file size');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate URL for security
 */
export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Block localhost and private IPs for security (complete RFC 1918 ranges)
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      // Complete 172.16.0.0/12 range (172.16.0.0 - 172.31.255.255)
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      // IPv6 private ranges
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fd00:') ||
      hostname.startsWith('fe80:')
    ) {
      return { isValid: false, error: 'Private and localhost URLs are not allowed' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * Generate secure random string
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data
 */
export const hashSensitiveData = (data: string, salt?: string): string => {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  return crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
};

/**
 * Validate environment variables
 */
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required environment variables
  const requiredVars = ['CLICKUP_API_TOKEN'];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else {
      // Validate API token format
      if (varName === 'CLICKUP_API_TOKEN') {
        const validation = validateApiToken(value);
        if (!validation.isValid) {
          errors.push(`Invalid ${varName}: ${validation.error}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Security headers for HTTP responses
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

/**
 * Secure logging function that prevents log injection
 */
export const secureLog = (level: 'info' | 'warn' | 'error', message: string, data?: any): void => {
  // Sanitize message to prevent log injection
  let sanitizedMessage = message
    .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces
    .substring(0, 1000); // Limit length
  
  // Remove control characters
  sanitizedMessage = removeControlCharacters(sanitizedMessage);

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message: sanitizedMessage,
    data: data ? sanitizeInput(data) : undefined
  };

  // Use structured logging to prevent injection
  console[level](`[${level.toUpperCase()}] ${timestamp}:`, logEntry);
};

/**
 * Log security events
 */
export const logSecurityEvent = (
  event: string,
  details: Record<string, any>,
  level: 'info' | 'warn' | 'error' = 'info'
): void => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: sanitizeInput(event),
    level,
    details: sanitizeInput(details)
  };

  // Use secure logging to prevent log injection
  secureLog('error', `[SECURITY ${level.toUpperCase()}] ${event}`, logEntry);
};

/**
 * Prevent prototype pollution in objects
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Remove dangerous properties
  delete obj.__proto__;
  delete obj.constructor;
  delete obj.prototype;
  
  // Recursively sanitize nested objects
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
  }
  
  return obj;
};

/**
 * Safe object merge that prevents prototype pollution
 */
export const safeMerge = (target: any, source: any): any => {
  const sanitizedSource = sanitizeObject(source);
  return { ...target, ...sanitizedSource };
};

/**
 * Sanitize error messages for production to prevent information disclosure
 */
export const sanitizeErrorMessage = (error: any): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Generic error messages in production
    if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED')) {
      return 'Network connection failed';
    }
    if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      return 'Authentication failed';
    }
    if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      return 'Access denied';
    }
    if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
      return 'Resource not found';
    }
    if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      return 'Rate limit exceeded';
    }
    return 'An error occurred';
  }
  // Detailed error messages in development
  return error?.message || 'Unknown error';
};

/**
 * Input length limits for security
 */
export const INPUT_LIMITS = {
  COMMENT_TEXT: 10000,
  TASK_NAME: 500,
  DESCRIPTION: 50000,
  JSON_PAYLOAD: 100000,
  URL: 2000,
  GENERAL_TEXT: 1000
} as const;

/**
 * Validate input length to prevent DoS
 */
export const validateInputLength = (input: string, limit: number, fieldName: string): void => {
  if (typeof input !== 'string') {
    return; // Non-string inputs are handled elsewhere
  }
  
  if (input.length > limit) {
    throw new Error(`${fieldName} exceeds maximum length of ${limit} characters (got ${input.length})`);
  }
};

/**
 * Production-safe logging that prevents information disclosure
 */
export const productionSafeLog = (level: 'info' | 'warn' | 'error', message: string, data?: any): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Only log sanitized, non-sensitive information in production
    const sanitizedMessage = sanitizeInput(message).substring(0, 200);
    const sanitizedData = data ? { type: typeof data, hasData: !!data } : undefined;
    secureLog(level, sanitizedMessage, sanitizedData);
  } else {
    // Development logging can be more verbose
    secureLog(level, message, data);
  }
};

/**
 * Safe JSON parsing with validation and prototype pollution prevention
 */
export const safeJsonParse = (jsonString: string, maxLength = 100000): any => {
  if (typeof jsonString !== 'string') {
    throw new Error('Input must be a string');
  }
  
  if (jsonString.length > maxLength) {
    throw new Error(`JSON payload too large (${jsonString.length} > ${maxLength})`);
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Prevent prototype pollution
    if (parsed && typeof parsed === 'object') {
      delete parsed.__proto__;
      delete parsed.constructor;
      delete parsed.prototype;
    }
    
    return parsed;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};

/**
 * Validate MCP tool parameters
 */
export const validateMcpParameters = (
  schema: z.ZodSchema,
  params: any
): { isValid: boolean; data?: any; errors?: string[] } => {
  try {
    // Sanitize input first
    const sanitizedParams = sanitizeInput(params);

    // Validate with schema
    const data = schema.parse(sanitizedParams);

    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }

    return {
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};
