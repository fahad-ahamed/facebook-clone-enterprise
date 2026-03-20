/**
 * Base HTTP Client
 * Foundation for all service SDK clients with retry, timeout, and error handling
 * @module shared/sdk/base-client
 */

import { ApiResponse } from '../middlewares/error.middleware';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for all requests */
  baseUrl: string;
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to use exponential backoff for retries */
  exponentialBackoff?: boolean;
  /** Custom fetch function (for testing) */
  fetch?: typeof fetch;
}

/**
 * Request options
 */
export interface RequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Request timeout override */
  timeout?: number;
  /** Maximum retry attempts override */
  maxRetries?: number;
  /** Whether to include authentication */
  authenticate?: boolean;
  /** Custom signal for abort */
  signal?: AbortSignal;
}

/**
 * HTTP error
 */
export class HttpError extends Error {
  public statusCode: number;
  public responseBody?: unknown;
  public headers?: Headers;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      responseBody?: unknown;
      headers?: Headers;
    }
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.responseBody = options?.responseBody;
    this.headers = options?.headers;
  }
}

/**
 * Network error
 */
export class NetworkError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends Error {
  public timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Default configuration values
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Base HTTP client
 */
export class HttpClient {
  protected config: Required<HttpClientConfig>;
  private accessToken: string | null = null;

  constructor(config: HttpClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      defaultHeaders: config.defaultHeaders || {},
      timeout: config.timeout || DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries || DEFAULT_MAX_RETRIES,
      retryDelay: config.retryDelay || DEFAULT_RETRY_DELAY,
      exponentialBackoff: config.exponentialBackoff ?? true,
      fetch: config.fetch || fetch,
    };
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.config.baseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Build request headers
   */
  protected buildHeaders(options: RequestOptions): Headers {
    const headers = new Headers(this.config.defaultHeaders);

    // Add content type for JSON bodies
    if (options.body && typeof options.body === 'object') {
      headers.set('Content-Type', 'application/json');
    }

    // Add custom headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

    // Add authorization header
    if (options.authenticate !== false && this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    return headers;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(status: number): boolean {
    // Retry on 5xx errors and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  /**
   * Execute request with retry logic
   */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      query,
      timeout = this.config.timeout,
      maxRetries = this.config.maxRetries,
      signal,
    } = options;

    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders(options);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check if aborted
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Combine with external signal
        if (signal) {
          signal.addEventListener('abort', () => controller.abort());
        }

        const response = await this.config.fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse response
        const responseBody = await response.json().catch(() => null);

        // Check for error response
        if (!response.ok) {
          const error = new HttpError(
            response.status,
            responseBody?.error || response.statusText,
            {
              responseBody,
              headers: response.headers,
            }
          );

          // Retry if applicable
          if (this.isRetryable(response.status) && attempt < maxRetries) {
            lastError = error;
            const delay = this.config.exponentialBackoff
              ? this.config.retryDelay * Math.pow(2, attempt)
              : this.config.retryDelay;
            await this.sleep(delay);
            continue;
          }

          throw error;
        }

        return responseBody as ApiResponse<T>;
      } catch (error) {
        // Handle timeout
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimeoutError(timeout);
        }

        // Handle network errors
        if (error instanceof TypeError) {
          if (attempt < maxRetries) {
            lastError = new NetworkError('Network request failed', error);
            const delay = this.config.exponentialBackoff
              ? this.config.retryDelay * Math.pow(2, attempt)
              : this.config.retryDelay;
            await this.sleep(delay);
            continue;
          }
          throw new NetworkError('Network request failed after retries', error);
        }

        // Re-throw other errors
        throw error;
      }
    }

    // All retries exhausted
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET', query });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

/**
 * Create HTTP client instance
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}

export default {
  HttpClient,
  HttpError,
  NetworkError,
  TimeoutError,
  createHttpClient,
};
