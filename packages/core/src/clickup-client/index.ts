import axios, { AxiosInstance } from 'axios';

// ClickUp API base URL
const API_BASE_URL = 'https://api.clickup.com/api/v2';

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
        Authorization: config.apiToken
      }
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          // Format error message with status and data
          const message = `ClickUp API Error (${error.response.status}): ${
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

  // Basic API methods that can be used directly
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

  async delete<T = unknown>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.delete(endpoint);
    return response.data as T;
  }
}

// Singleton instance cache
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
