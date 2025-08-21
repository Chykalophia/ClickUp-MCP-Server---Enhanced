import { z } from 'zod';

/**
 * Comprehensive error handling utilities for the ClickUp MCP Server
 */

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  WEBHOOK_ERROR = 'WEBHOOK_ERROR',
  FILE_ERROR = 'FILE_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Structured error interface
export interface StructuredError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  userId?: number;
  workspaceId?: string;
  stack?: string;
  retryable: boolean;
  retryAfter?: number;
}

// Error response for MCP tools
export interface McpErrorResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: true;
  _meta?: {
    errorType: ErrorType;
    severity: ErrorSeverity;
    retryable: boolean;
    retryAfter?: number;
  };
}

/**
 * Create a structured error
 */
export const createStructuredError = (
  type: ErrorType,
  message: string,
  options: {
    severity?: ErrorSeverity;
    code?: string;
    details?: Record<string, any>;
    requestId?: string;
    userId?: number;
    workspaceId?: string;
    originalError?: Error;
    retryable?: boolean;
    retryAfter?: number;
  } = {}
): StructuredError => {
  return {
    type,
    severity: options.severity || ErrorSeverity.MEDIUM,
    message,
    code: options.code,
    details: options.details,
    timestamp: new Date().toISOString(),
    requestId: options.requestId,
    userId: options.userId,
    workspaceId: options.workspaceId,
    stack: options.originalError?.stack,
    retryable: options.retryable || false,
    retryAfter: options.retryAfter
  };
};

/**
 * Convert structured error to MCP response
 */
export const errorToMcpResponse = (error: StructuredError): McpErrorResponse => {
  const userMessage = getUserFriendlyMessage(error);
  
  return {
    content: [{
      type: 'text',
      text: userMessage
    }],
    isError: true,
    _meta: {
      errorType: error.type,
      severity: error.severity,
      retryable: error.retryable,
      retryAfter: error.retryAfter
    }
  };
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: StructuredError): string => {
  const baseMessage = `Error: ${error.message}`;
  
  let additionalInfo = '';
  
  if (error.retryable && error.retryAfter) {
    additionalInfo += `\n\nThis operation can be retried after ${error.retryAfter} seconds.`;
  } else if (error.retryable) {
    additionalInfo += '\n\nThis operation can be retried.';
  }
  
  if (error.type === ErrorType.RATE_LIMIT) {
    additionalInfo += '\n\nPlease reduce the frequency of requests.';
  }
  
  if (error.type === ErrorType.AUTHENTICATION) {
    additionalInfo += '\n\nPlease check your ClickUp API token.';
  }
  
  if (error.type === ErrorType.VALIDATION && error.details?.errors) {
    const validationErrors = Array.isArray(error.details.errors) 
      ? error.details.errors.join(', ')
      : error.details.errors;
    additionalInfo += `\n\nValidation errors: ${validationErrors}`;
  }
  
  return baseMessage + additionalInfo;
};

/**
 * Handle ClickUp API errors
 */
export const handleClickUpApiError = (error: any, context?: {
  operation?: string;
  requestId?: string;
  userId?: number;
  workspaceId?: string;
}): StructuredError => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Map HTTP status codes to error types
    let errorType: ErrorType;
    let severity: ErrorSeverity;
    let retryable = false;
    let retryAfter: number | undefined;
    
    switch (status) {
      case 400:
        errorType = ErrorType.VALIDATION;
        severity = ErrorSeverity.LOW;
        break;
      case 401:
        errorType = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
        break;
      case 403:
        errorType = ErrorType.AUTHORIZATION;
        severity = ErrorSeverity.HIGH;
        break;
      case 404:
        errorType = ErrorType.NOT_FOUND;
        severity = ErrorSeverity.LOW;
        break;
      case 429:
        errorType = ErrorType.RATE_LIMIT;
        severity = ErrorSeverity.MEDIUM;
        retryable = true;
        retryAfter = parseInt(error.response.headers['retry-after']) || 60;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ErrorType.API_ERROR;
        severity = ErrorSeverity.HIGH;
        retryable = true;
        retryAfter = 30;
        break;
      default:
        errorType = ErrorType.API_ERROR;
        severity = ErrorSeverity.MEDIUM;
        retryable = status >= 500;
    }
    
    return createStructuredError(
      errorType,
      data?.err || data?.error || error.message || `HTTP ${status} error`,
      {
        severity,
        code: status.toString(),
        details: {
          status,
          data,
          operation: context?.operation
        },
        requestId: context?.requestId,
        userId: context?.userId,
        workspaceId: context?.workspaceId,
        originalError: error,
        retryable,
        retryAfter
      }
    );
  }
  
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return createStructuredError(
      ErrorType.TIMEOUT,
      'Request timed out',
      {
        severity: ErrorSeverity.MEDIUM,
        code: error.code,
        details: { operation: context?.operation },
        requestId: context?.requestId,
        userId: context?.userId,
        workspaceId: context?.workspaceId,
        originalError: error,
        retryable: true,
        retryAfter: 10
      }
    );
  }
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return createStructuredError(
      ErrorType.NETWORK_ERROR,
      'Network connection failed',
      {
        severity: ErrorSeverity.HIGH,
        code: error.code,
        details: { operation: context?.operation },
        requestId: context?.requestId,
        userId: context?.userId,
        workspaceId: context?.workspaceId,
        originalError: error,
        retryable: true,
        retryAfter: 30
      }
    );
  }
  
  return createStructuredError(
    ErrorType.INTERNAL_ERROR,
    error.message || 'Unknown error occurred',
    {
      severity: ErrorSeverity.HIGH,
      details: { operation: context?.operation },
      requestId: context?.requestId,
      userId: context?.userId,
      workspaceId: context?.workspaceId,
      originalError: error,
      retryable: false
    }
  );
};

/**
 * Handle validation errors
 */
export const handleValidationError = (
  error: z.ZodError,
  context?: {
    operation?: string;
    requestId?: string;
  }
): StructuredError => {
  const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
  
  return createStructuredError(
    ErrorType.VALIDATION,
    'Input validation failed',
    {
      severity: ErrorSeverity.LOW,
      details: {
        errors,
        operation: context?.operation
      },
      requestId: context?.requestId,
      retryable: false
    }
  );
};

/**
 * Handle webhook errors
 */
export const handleWebhookError = (
  error: any,
  context?: {
    webhookId?: string;
    eventType?: string;
    requestId?: string;
  }
): StructuredError => {
  return createStructuredError(
    ErrorType.WEBHOOK_ERROR,
    error.message || 'Webhook processing failed',
    {
      severity: ErrorSeverity.MEDIUM,
      details: {
        webhookId: context?.webhookId,
        eventType: context?.eventType
      },
      requestId: context?.requestId,
      originalError: error,
      retryable: true,
      retryAfter: 60
    }
  );
};

/**
 * Handle file operation errors
 */
export const handleFileError = (
  error: any,
  context?: {
    filename?: string;
    operation?: string;
    requestId?: string;
  }
): StructuredError => {
  let message = error.message || 'File operation failed';
  let severity = ErrorSeverity.MEDIUM;
  
  if (error.code === 'ENOENT') {
    message = 'File not found';
    severity = ErrorSeverity.LOW;
  } else if (error.code === 'EACCES') {
    message = 'Permission denied';
    severity = ErrorSeverity.HIGH;
  } else if (error.code === 'ENOSPC') {
    message = 'No space left on device';
    severity = ErrorSeverity.HIGH;
  }
  
  return createStructuredError(
    ErrorType.FILE_ERROR,
    message,
    {
      severity,
      code: error.code,
      details: {
        filename: context?.filename,
        operation: context?.operation
      },
      requestId: context?.requestId,
      originalError: error,
      retryable: error.code !== 'EACCES'
    }
  );
};

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  
  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: {
      operationName?: string;
      requestId?: string;
    }
  ): Promise<T> {
    let lastError: StructuredError | undefined;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const structuredError = error instanceof Error 
          ? handleClickUpApiError(error, { operation: context?.operationName, requestId: context?.requestId })
          : error as StructuredError;
        
        lastError = structuredError;
        
        // Don't retry if not retryable or on last attempt
        if (!structuredError.retryable || attempt === this.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          structuredError.retryAfter ? structuredError.retryAfter * 1000 : this.maxDelay
        );
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, structuredError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

/**
 * Global error logger
 */
export const logError = (error: StructuredError): void => {
  const logLevel = error.severity === ErrorSeverity.CRITICAL ? 'error' :
                   error.severity === ErrorSeverity.HIGH ? 'error' :
                   error.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';
  
  const logData = {
    timestamp: error.timestamp,
    type: error.type,
    severity: error.severity,
    message: error.message,
    code: error.code,
    details: error.details,
    requestId: error.requestId,
    userId: error.userId,
    workspaceId: error.workspaceId,
    retryable: error.retryable
  };
  
  console[logLevel](`[${error.type}] ${error.message}`, logData);
  
  // In production, send to monitoring service
  if (error.severity === ErrorSeverity.CRITICAL) {
    // Send alert to monitoring system
    console.error('CRITICAL ERROR - IMMEDIATE ATTENTION REQUIRED', logData);
  }
};

/**
 * Wrap MCP tool execution with error handling
 */
export const wrapMcpTool = <T extends any[], R>(
  toolName: string,
  schema: z.ZodSchema,
  handler: (...args: T) => Promise<R>
) => {
  return async (args: any): Promise<any> => {
    const requestId = generateRequestId();
    
    try {
      // Validate input
      const validatedArgs = schema.parse(args);
      
      // Execute handler with proper type casting
      const result = await (handler as any)(validatedArgs);
      
      // Return success response
      return {
        content: [{
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      let structuredError: StructuredError;
      
      if (error instanceof z.ZodError) {
        structuredError = handleValidationError(error, { operation: toolName, requestId });
      } else if (error instanceof Error) {
        structuredError = handleClickUpApiError(error, { operation: toolName, requestId });
      } else {
        structuredError = error as StructuredError;
      }
      
      // Log error
      logError(structuredError);
      
      // Return error response
      return errorToMcpResponse(structuredError);
    }
  };
};

/**
 * Generate unique request ID
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Health check utilities
 */
export const performHealthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
}> => {
  const checks: Record<string, any> = {};
  
  // Check environment variables
  const startTime = Date.now();
  try {
    const envValidation = require('../utils/security').validateEnvironment();
    checks.environment = {
      status: envValidation.isValid ? 'pass' : 'fail',
      message: envValidation.isValid ? 'All required environment variables present' : envValidation.errors.join(', '),
      duration: Date.now() - startTime
    };
  } catch (error) {
    checks.environment = {
      status: 'fail',
      message: 'Failed to validate environment',
      duration: Date.now() - startTime
    };
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryThreshold = 500 * 1024 * 1024; // 500MB
  checks.memory = {
    status: memoryUsage.heapUsed < memoryThreshold ? 'pass' : 'fail',
    message: `Heap used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    duration: 0
  };
  
  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length;
  const status = failedChecks === 0 ? 'healthy' : failedChecks <= 1 ? 'degraded' : 'unhealthy';
  
  return { status, checks };
};
