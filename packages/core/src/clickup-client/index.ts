import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = 'https://api.clickup.com/api/v2';

// Maximum automatic retries after a 429 rate-limit response
const MAX_RATE_LIMIT_RETRIES = 2;
// Cap the wait on a single retry so a bad Retry-After header can't hang a request forever
const MAX_RETRY_AFTER_MS = 60000;

/**
 * How long to wait before retrying a 429. ClickUp documents X-RateLimit-Reset
 * (Unix seconds when the per-minute window resets); Retry-After is honoured too
 * when present. Falls back to one second when neither header is usable.
 */
export function computeRateLimitWaitMs(
  headers: Record<string, unknown> | undefined,
  now: number = Date.now()
): number {
  const retryAfterRaw = headers?.['retry-after'];
  if (retryAfterRaw !== undefined && retryAfterRaw !== null && retryAfterRaw !== '') {
    const raw = String(retryAfterRaw);
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
    const date = Date.parse(raw);
    if (!Number.isNaN(date)) {
      return Math.max(date - now, 1000);
    }
  }
  const reset = Number(headers?.['x-ratelimit-reset']);
  if (Number.isFinite(reset) && reset > 0) {
    // Seconds since epoch; tolerate a millisecond value as well.
    const resetMs = reset > 1e12 ? reset : reset * 1000;
    return Math.max(resetMs - now, 1000);
  }
  return 1000;
}

/**
 * Build the Authorization header value for a ClickUp token.
 * Personal API tokens (pk_...) are sent raw; OAuth access tokens require the Bearer prefix.
 */
export const formatAuthorizationHeader = (apiToken: string): string => {
  return apiToken.startsWith('pk_') ? apiToken : `Bearer ${apiToken}`;
};

export interface ClickUpClientConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ClickUpClient {
  private axiosInstance: AxiosInstance;

  constructor(config: ClickUpClientConfig) {
    if (!config.apiToken) {
      throw new Error('ClickUp API token is required');
    }

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || API_BASE_URL,
      timeout: 30000,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: formatAuthorizationHeader(config.apiToken),
      },
    });

    this.axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        // Retry 429s, honoring the server-mandated Retry-After wait (a minimum, per RFC 9110)
        const requestConfig = error.config as
          | (AxiosRequestConfig & { _retryCount?: number })
          | undefined;
        if (error.response?.status === 429 && requestConfig) {
          const retryCount = requestConfig._retryCount ?? 0;
          if (retryCount < MAX_RATE_LIMIT_RETRIES) {
            requestConfig._retryCount = retryCount + 1;
            // Retry-After may be delta-seconds or an HTTP-date (RFC 9110); the
            // computed wait is a minimum. Give up instead of retrying early
            // when the server asks for longer than we are willing to wait.
            const retryAfterMs = computeRateLimitWaitMs(error.response.headers);
            if (retryAfterMs <= MAX_RETRY_AFTER_MS) {
              await new Promise(resolve => setTimeout(resolve, retryAfterMs));
              return this.axiosInstance.request(requestConfig);
            }
          }
        }

        if (error.response) {
          const ecode = error.response.data?.ECODE;
          const message = `ClickUp API Error (${error.response.status}${ecode ? ` ${ecode}` : ''}): ${
            error.response.data?.err || error.message
          }`;
          error.message = message;
        }
        return Promise.reject(error);
      }
    );
  }

  // Helper method to get the axios instance for use in other modules
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = unknown>(endpoint: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get(endpoint, { params });
    return response.data as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async post<T = unknown>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post(endpoint, data);
    return response.data as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async put<T = unknown>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put(endpoint, data);
    return response.data as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async patch<T = unknown>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.patch(endpoint, data);
    return response.data as T;
  }

  async delete<T = unknown>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete(endpoint, config);
    return response.data as T;
  }
}

let _clientInstance: ClickUpClient | null = null;

// Create or return the singleton client instance
export const createClickUpClient = (): ClickUpClient => {
  if (_clientInstance) {
    return _clientInstance;
  }

  const apiToken = process.env.CLICKUP_API_TOKEN;

  if (!apiToken) {
    throw new Error('CLICKUP_API_TOKEN environment variable is required');
  }

  _clientInstance = new ClickUpClient({ apiToken });
  return _clientInstance;
};

// Get the API token with proper validation (use instead of process.env.CLICKUP_API_TOKEN!)
export const getApiToken = (): string => {
  const apiToken = process.env.CLICKUP_API_TOKEN;
  if (!apiToken) {
    throw new Error('CLICKUP_API_TOKEN environment variable is required');
  }
  return apiToken;
};
