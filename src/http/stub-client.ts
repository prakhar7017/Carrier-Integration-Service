/**
 * Stub HTTP client for testing - allows configuring responses
 * Captures requests for assertions and simulates realistic HTTP behavior
 */

import { HttpClient, HttpRequest, HttpResponse } from './client';

export interface StubResponse {
  status: number;
  headers?: Record<string, string>;
  body: unknown;
  delay?: number; // Simulate network delay in milliseconds
}

export type StubResponseMatcher = (
  req: HttpRequest
) => StubResponse | null | Promise<StubResponse | null>;

export interface CapturedRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: number;
}

/**
 * Stub HTTP client that returns configured responses
 * Captures all requests for inspection
 */
export class StubHttpClient implements HttpClient {
  private matchers: StubResponseMatcher[] = [];
  private capturedRequests: CapturedRequest[] = [];
  private simulateTimeout: boolean = false;

  /**
   * Add a response matcher
   */
  onRequest(matcher: StubResponseMatcher): void {
    this.matchers.push(matcher);
  }

  /**
   * Add a simple URL-based response
   */
  stubUrl(url: string | RegExp, response: StubResponse): void {
    this.onRequest((req) => {
      const matches =
        typeof url === 'string' ? req.url === url : url.test(req.url);
      return matches ? response : null;
    });
  }

  /**
   * Enable timeout simulation for all requests
   */
  simulateTimeoutForAllRequests(): void {
    this.simulateTimeout = true;
  }

  /**
   * Disable timeout simulation
   */
  disableTimeoutSimulation(): void {
    this.simulateTimeout = false;
  }

  /**
   * Get all captured requests
   */
  getCapturedRequests(): CapturedRequest[] {
    return [...this.capturedRequests];
  }

  /**
   * Get captured requests matching a URL pattern
   */
  getCapturedRequestsForUrl(urlPattern: string | RegExp): CapturedRequest[] {
    return this.capturedRequests.filter((req) => {
      if (typeof urlPattern === 'string') {
        return req.url === urlPattern;
      }
      return urlPattern.test(req.url);
    });
  }

  /**
   * Get the last captured request
   */
  getLastCapturedRequest(): CapturedRequest | undefined {
    return this.capturedRequests[this.capturedRequests.length - 1];
  }

  /**
   * Clear all matchers and captured requests
   */
  clear(): void {
    this.matchers = [];
    this.capturedRequests = [];
    this.simulateTimeout = false;
  }

  /**
   * Clear only captured requests (keep matchers)
   */
  clearCapturedRequests(): void {
    this.capturedRequests = [];
  }

  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    // Capture request for inspection
    this.capturedRequests.push({
      url: req.url,
      method: req.method,
      headers: req.headers ? { ...req.headers } : undefined,
      body: req.body,
      timestamp: Date.now(),
    });

    // Simulate timeout if enabled
    if (this.simulateTimeout) {
      throw new Error('Request timeout');
    }

    // Try matchers in reverse order (last added takes precedence)
    for (let i = this.matchers.length - 1; i >= 0; i--) {
      const matcher = this.matchers[i];
      const response = await matcher(req);
      
      if (response) {
        // Simulate network delay if specified
        if (response.delay) {
          await new Promise((resolve) => setTimeout(resolve, response.delay));
        }

        return {
          status: response.status,
          headers: response.headers || {},
          body: response.body as T,
        };
      }
    }

    throw new Error(
      `No stub response configured for ${req.method} ${req.url}`
    );
  }
}
