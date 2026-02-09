/**
 * HTTP client abstraction - can be stubbed for testing
 */

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface HttpClient {
  request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}

/**
 * Real HTTP client implementation using Node.js fetch
 */
export class NodeHttpClient implements HttpClient {
  constructor(private readonly defaultTimeout: number = 30000) {}

  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      req.timeout ?? this.defaultTimeout
    );

    try {
      // Determine content type and body format
      const contentType = req.headers?.['Content-Type'] || 'application/json';
      let body: string | undefined;
      
      if (req.body) {
        if (contentType === 'application/x-www-form-urlencoded') {
          body = typeof req.body === 'string' ? req.body : String(req.body);
        } else {
          body = JSON.stringify(req.body);
        }
      }

      const response = await fetch(req.url, {
        method: req.method,
        headers: {
          'Content-Type': contentType,
          ...req.headers,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let responseBody: T;
      const responseContentType = response.headers.get('content-type');
      if (responseContentType?.includes('application/json')) {
        responseBody = (await response.json()) as T;
      } else {
        responseBody = (await response.text()) as unknown as T;
      }

      return {
        status: response.status,
        headers,
        body: responseBody,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}
