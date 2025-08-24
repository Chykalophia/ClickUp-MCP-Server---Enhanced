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

// Rate limiter implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

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
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
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
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb'
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
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Media
      'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/ogg'
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

    // Block localhost and private IPs for security
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
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
    event,
    level,
    details: sanitizeInput(details)
  };

  // In production, this should go to a proper logging system
  console.error(`[SECURITY ${level.toUpperCase()}] ${timestamp}: ${event}`, logEntry);
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
