// Centralized HTTP client with configuration and error handling
import { env } from '../config/env';

// HTTP client configuration
interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

// HTTP response wrapper
interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
}

// HTTP error class
class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// Default configuration
const defaultConfig: HttpClientConfig = {
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Create fetch with timeout
function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeout: number = defaultConfig.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

// Normalize fetch response
async function normalizeResponse<T>(response: Response): Promise<HttpResponse<T>> {
  let data: T;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as T;
    }
  } catch (error) {
    data = {} as T;
  }
  
  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    ok: response.ok,
  };
}

// HTTP client class
class HttpClient {
  private config: HttpClientConfig;
  
  constructor(config: Partial<HttpClientConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  // Update configuration
  updateConfig(config: Partial<HttpClientConfig>) {
    this.config = { ...this.config, ...config };
  }
  
  // Build full URL
  private buildURL(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const base = this.config.baseURL.endsWith('/') 
      ? this.config.baseURL.slice(0, -1) 
      : this.config.baseURL;
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  
  // Build request options
  private buildOptions(options: RequestInit = {}): RequestInit {
    return {
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
      ...options,
    };
  }
  
  // Generic request method
  async request<T>(
    method: string,
    path: string,
    options: RequestInit = {}
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(path);
    const requestOptions = this.buildOptions({
      method,
      ...options,
    });
    
    try {
      const response = await fetchWithTimeout(url, requestOptions, this.config.timeout);
      const normalized = await normalizeResponse<T>(response);
      
      if (!normalized.ok) {
        throw new HttpError(
          `HTTP ${normalized.status}: ${normalized.statusText}`,
          normalized.status,
          normalized.statusText,
          normalized.data
        );
      }
      
      return normalized;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError('Request timeout', 408, 'Request Timeout');
      }
      
      throw new HttpError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'Network Error'
      );
    }
  }
  
  // GET request
  async get<T>(path: string, options: RequestInit = {}): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, options);
  }
  
  // POST request
  async post<T>(path: string, data?: any, options: RequestInit = {}): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, {
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }
  
  // PUT request
  async put<T>(path: string, data?: any, options: RequestInit = {}): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, {
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }
  
  // DELETE request
  async delete<T>(path: string, options: RequestInit = {}): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }
  
  // PATCH request
  async patch<T>(path: string, data?: any, options: RequestInit = {}): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', path, {
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }
}

// Export default instance
export const http = new HttpClient();

// Export class for custom instances
export { HttpClient, HttpError };

// Export types
export type { HttpResponse, HttpClientConfig };
