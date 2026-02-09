/**
 * Helper utilities for setting up realistic UPS API mocks
 * Handles OAuth token lifecycle and realistic response behavior
 */

import { StubHttpClient } from '../http/stub-client';
import {
  oauthTokenResponse,
  oauthTokenResponseExpired,
  successfulUPSRateResponse,
  upsErrorResponseInvalidRequest,
  upsMalformedResponse,
  http401Unauthorized,
  http429RateLimited,
  http500ServerError,
  http503ServiceUnavailable,
  oauth401InvalidCredentials,
  oauth400BadRequest,
  UPSTokenResponse,
} from './ups-responses';

export interface UPSMockConfig {
  baseUrl?: string;
  oauthTokenUrl?: string;
  ratingApiUrl?: string;
  tokenExpirySeconds?: number;
  simulateTokenExpiry?: boolean;
}

/**
 * Setup realistic UPS OAuth token endpoint mocks
 * Handles token acquisition, caching, and expiry
 */
export class UPSOAuthMock {
  private tokenIssuedAt: number = Date.now();
  private tokenExpirySeconds: number;
  private issuedTokens: Map<string, number> = new Map();

  constructor(private stubClient: StubHttpClient, config: UPSMockConfig = {}) {
    this.tokenExpirySeconds = config.tokenExpirySeconds || 3600;
    this.setupOAuthEndpoint(config.oauthTokenUrl || /\/security\/v1\/oauth\/token/);
  }

  private setupOAuthEndpoint(urlPattern: string | RegExp): void {
    this.stubClient.onRequest((req) => {
      const matches =
        typeof urlPattern === 'string'
          ? req.url === urlPattern
          : urlPattern.test(req.url);

      if (!matches || req.method !== 'POST') {
        return null;
      }

      // Verify OAuth request format
      const body = req.body as string;
      if (typeof body !== 'string') {
        return {
          status: 400,
          headers: { 'content-type': 'application/json' },
          body: oauth400BadRequest.body,
        };
      }

      // Check for invalid credentials
      if (!body.includes('test-client-id') || !body.includes('test-client-secret')) {
        return {
          status: 401,
          headers: { 'content-type': 'application/json' },
          body: oauth401InvalidCredentials.body,
        };
      }

      // Generate token based on expiry configuration
      const tokenId = Math.random().toString(36).substring(7);
      const tokenResponse: UPSTokenResponse = {
        access_token: `test-token-${Date.now()}-${tokenId}`,
        token_type: 'Bearer',
        expires_in: this.tokenExpirySeconds,
        issued_at: new Date().toISOString(),
      };

      this.tokenIssuedAt = Date.now();
      this.issuedTokens.set(tokenResponse.access_token, this.tokenIssuedAt);

      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: tokenResponse,
      };
    });
  }

  /**
   * Setup expired token response (for testing token refresh)
   */
  setupExpiredTokenResponse(urlPattern: string | RegExp = /\/security\/v1\/oauth\/token/): void {
    this.stubClient.onRequest((req) => {
      const matches =
        typeof urlPattern === 'string'
          ? req.url === urlPattern
          : urlPattern.test(req.url);

      if (!matches || req.method !== 'POST') {
        return null;
      }

      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: oauthTokenResponseExpired,
      };
    });
  }

  /**
   * Setup OAuth error responses
   */
  setupOAuthError(errorType: 'invalid_credentials' | 'bad_request'): void {
    this.stubClient.onRequest((req) => {
      if (!req.url.includes('/security/v1/oauth/token')) {
        return null;
      }

      if (errorType === 'invalid_credentials') {
        return {
          status: 401,
          headers: { 'content-type': 'application/json' },
          body: oauth401InvalidCredentials.body,
        };
      }

      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: oauth400BadRequest.body,
      };
    });
  }
}

/**
 * Setup realistic UPS Rating API endpoint mocks
 */
export class UPSRatingApiMock {
  constructor(private stubClient: StubHttpClient, config: UPSMockConfig = {}) {
    this.setupRatingEndpoint(
      config.ratingApiUrl || /\/api\/rating\/v1\/Rate/,
      config.baseUrl
    );
  }

  private setupRatingEndpoint(
    urlPattern: string | RegExp,
    baseUrl?: string
  ): void {
    this.stubClient.onRequest((req) => {
      const matches =
        typeof urlPattern === 'string'
          ? req.url === urlPattern
          : urlPattern.test(req.url);

      if (!matches || req.method !== 'POST') {
        return null;
      }

      // Verify Authorization header exists
      const authHeader = req.headers?.['Authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          status: 401,
          headers: http401Unauthorized.headers,
          body: http401Unauthorized.body,
        };
      }

      // Return successful response by default
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: successfulUPSRateResponse,
      };
    });
  }

  /**
   * Setup successful rate response
   */
  setupSuccessResponse(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: successfulUPSRateResponse,
    });
  }

  /**
   * Setup 401 Unauthorized response (for testing token refresh)
   */
  setup401Unauthorized(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 401,
      headers: http401Unauthorized.headers,
      body: http401Unauthorized.body,
    });
  }

  /**
   * Setup 429 Rate Limited response
   */
  setup429RateLimited(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 429,
      headers: http429RateLimited.headers,
      body: http429RateLimited.body,
    });
  }

  /**
   * Setup 5xx Server Error responses
   */
  setup500ServerError(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 500,
      headers: http500ServerError.headers,
      body: http500ServerError.body,
    });
  }

  setup503ServiceUnavailable(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 503,
      headers: http503ServiceUnavailable.headers,
      body: http503ServiceUnavailable.body,
    });
  }

  /**
   * Setup UPS API error response (200 status but error in body)
   */
  setupUPSApiError(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: upsErrorResponseInvalidRequest,
    });
  }

  /**
   * Setup malformed response
   */
  setupMalformedResponse(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: upsMalformedResponse,
    });
  }

  /**
   * Setup invalid JSON response
   */
  setupInvalidJsonResponse(): void {
    this.stubClient.stubUrl(/\/api\/rating\/v1\/Rate/, {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: 'invalid json{',
    });
  }

  /**
   * Setup timeout simulation
   */
  setupTimeout(): void {
    this.stubClient.simulateTimeoutForAllRequests();
  }
}

/**
 * Setup complete UPS API mocks for integration testing
 */
export function setupUPSMocks(
  stubClient: StubHttpClient,
  config: UPSMockConfig = {}
): {
  oauth: UPSOAuthMock;
  ratingApi: UPSRatingApiMock;
} {
  const oauth = new UPSOAuthMock(stubClient, config);
  const ratingApi = new UPSRatingApiMock(stubClient, config);

  return { oauth, ratingApi };
}
