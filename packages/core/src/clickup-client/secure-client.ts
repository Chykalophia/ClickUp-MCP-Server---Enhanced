import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { validateApiToken, sanitizeInput, rateLimiter, DEFAULT_RATE_LIMITS } from '../utils/security.js';
import { handleClickUpApiError, RetryManager, generateRequestId } from '../utils/error-handling.js';

// ClickUp API base URL
const API_BASE_URL = 'https://api.clickup.com/api/v2';

export interface SecureClickUpClientConfig {
  apiToken: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  enableRateLimit?: boolean;
  userAgent?: string;
}

export class SecureClickUpClient {
  private axiosInstance: AxiosInstance;
  private retryManager: RetryManager;
  private enableRateLimit: boolean;
  private userAgent: string;
  
  constructor(config: SecureClickUpClientConfig) {
    // Validate API token
    const tokenValidation = validateApiToken(config.apiToken);
    if (!tokenValidation.isValid) {
      throw new Error(`Invalid API token: ${tokenValidation.error}`);
    }

    this.enableRateLimit = config.enableRateLimit ?? true;
    this.userAgent = config.userAgent || 'ClickUp-MCP-Server/3.0.0';
    this.retryManager = new RetryManager(config.maxRetries || 3);

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || API_BASE_URL,
      timeout: config.timeout || 30000, // 30 second timeout
      headers: {
        'Authorization': config.apiToken,
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    // Add request interceptor for security and rate limiting
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Generate request ID for tracking
        const requestId = generateRequestId();
        config.headers['X-Request-ID'] = requestId;
        
        // Rate limiting
        if (this.enableRateLimit) {
          const rateLimitKey = `api_${config.url}`;
          if (!rateLimiter.isAllowed(rateLimitKey, DEFAULT_RATE_LIMITS.api)) {
            throw new Error('Rate limit exceeded. Please slow down your requests.');
          }
        }

        // Sanitize request data
        if (config.data) {
          config.data = sanitizeInput(config.data);
        }

        // Sanitize query parameters
        if (config.params) {
          config.params = sanitizeInput(config.params);
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful requests in debug mode
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[${response.config.headers['X-Request-ID']}] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        }
        return response;
      },
      (error) => {
        const requestId = error.config?.headers?.['X-Request-ID'];
        const structuredError = handleClickUpApiError(error, {
          operation: `${error.config?.method?.toUpperCase()} ${error.config?.url}`,
          requestId
        });
        
        // Log error
        console.error(`[${requestId}] API Error:`, structuredError.message);
        
        return Promise.reject(structuredError);
      }
    );
  }

  /**
   * Secure GET request with retry logic
   */
  async get<T = any>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryManager.executeWithRetry(async () => {
      const response = await this.axiosInstance.get(endpoint, { 
        params: sanitizeInput(params), 
        ...config 
      });
      return response.data;
    }, { operationName: `GET ${endpoint}` });
  }

  /**
   * Secure POST request with retry logic
   */
  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryManager.executeWithRetry(async () => {
      const response = await this.axiosInstance.post(endpoint, sanitizeInput(data), config);
      return response.data;
    }, { operationName: `POST ${endpoint}` });
  }

  /**
   * Secure PUT request with retry logic
   */
  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryManager.executeWithRetry(async () => {
      const response = await this.axiosInstance.put(endpoint, sanitizeInput(data), config);
      return response.data;
    }, { operationName: `PUT ${endpoint}` });
  }

  /**
   * Secure DELETE request with retry logic
   */
  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.retryManager.executeWithRetry(async () => {
      const response = await this.axiosInstance.delete(endpoint, config);
      return response.data;
    }, { operationName: `DELETE ${endpoint}` });
  }

  /**
   * Secure PATCH request with retry logic
   */
  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryManager.executeWithRetry(async () => {
      const response = await this.axiosInstance.patch(endpoint, sanitizeInput(data), config);
      return response.data;
    }, { operationName: `PATCH ${endpoint}` });
  }

  /**
   * Upload file securely with validation
   */
  async uploadFile<T = any>(
    endpoint: string, 
    file: {
      filename: string;
      data: Buffer | string;
      mimetype?: string;
    },
    additionalData?: Record<string, any>
  ): Promise<T> {
    // Validate file upload
    const { validateFileUpload } = await import('../utils/security.js');
    const validation = validateFileUpload(file.filename, file.mimetype, 
      Buffer.isBuffer(file.data) ? file.data.length : file.data.length);
    
    if (!validation.isValid) {
      throw new Error(`File upload validation failed: ${validation.errors.join(', ')}`);
    }

    // Rate limit file uploads more strictly
    if (this.enableRateLimit) {
      const rateLimitKey = `upload_${endpoint}`;
      if (!rateLimiter.isAllowed(rateLimitKey, DEFAULT_RATE_LIMITS.upload)) {
        throw new Error('Upload rate limit exceeded. Please wait before uploading more files.');
      }
    }

    const formData = new FormData();
    
    // Add file
    const blob = new Blob([file.data], { type: file.mimetype });
    formData.append('file', blob, file.filename);
    
    // Add additional data
    if (additionalData) {
      Object.entries(sanitizeInput(additionalData)).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.retryManager.executeWithRetry(async () => {
      const response = await this.axiosInstance.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000 // 2 minute timeout for uploads
      });
      return response.data;
    }, { operationName: `UPLOAD ${endpoint}` });
  }

  /**
   * Batch requests with concurrency control
   */
  async batchRequests<T>(
    requests: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      endpoint: string;
      data?: any;
      params?: any;
    }>,
    options: {
      concurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: string }>> {
    const { concurrency = 5, failFast = false } = options;
    const results: Array<{ success: boolean; data?: T; error?: string }> = [];
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (request) => {
        try {
          let data: T;
          
          switch (request.method) {
          case 'GET':
            data = await this.get<T>(request.endpoint, request.params);
            break;
          case 'POST':
            data = await this.post<T>(request.endpoint, request.data);
            break;
          case 'PUT':
            data = await this.put<T>(request.endpoint, request.data);
            break;
          case 'DELETE':
            data = await this.delete<T>(request.endpoint);
            break;
          case 'PATCH':
            data = await this.patch<T>(request.endpoint, request.data);
            break;
          default:
            throw new Error(`Unsupported method: ${request.method}`);
          }
          
          return { success: true, data };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (failFast) {
            throw error;
          }
          
          return { success: false, error: errorMessage };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    timestamp: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Simple API call to check connectivity
      await this.get('/user');
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get client statistics
   */
  getStats(): {
    totalRequests: number;
    rateLimitEnabled: boolean;
    userAgent: string;
    baseUrl: string;
    } {
    return {
      totalRequests: 0, // Would need to implement request counting
      rateLimitEnabled: this.enableRateLimit,
      userAgent: this.userAgent,
      baseUrl: this.axiosInstance.defaults.baseURL || API_BASE_URL
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SecureClickUpClientConfig>): void {
    if (config.apiToken) {
      const tokenValidation = validateApiToken(config.apiToken);
      if (!tokenValidation.isValid) {
        throw new Error(`Invalid API token: ${tokenValidation.error}`);
      }
      this.axiosInstance.defaults.headers['Authorization'] = config.apiToken;
    }

    if (config.timeout) {
      this.axiosInstance.defaults.timeout = config.timeout;
    }

    if (config.userAgent) {
      this.userAgent = config.userAgent;
      this.axiosInstance.defaults.headers['User-Agent'] = config.userAgent;
    }

    if (config.enableRateLimit !== undefined) {
      this.enableRateLimit = config.enableRateLimit;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear any pending requests
    this.axiosInstance.defaults.timeout = 1;
    
    // Reset rate limiter
    rateLimiter.reset();
  }
}

// Create secure client factory
export const createSecureClickUpClient = (config?: Partial<SecureClickUpClientConfig>): SecureClickUpClient => {
  const apiToken = config?.apiToken || process.env.CLICKUP_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('CLICKUP_API_TOKEN environment variable is required');
  }
  
  return new SecureClickUpClient({
    apiToken,
    ...config
  });
};
