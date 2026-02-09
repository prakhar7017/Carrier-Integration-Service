/**
 * OAuth 2.0 client-credentials flow implementation
 * Handles token acquisition, caching, and refresh
 */

import { HttpClient, HttpRequest } from '../http/client';
import { ErrorCode, CarrierIntegrationError } from '../domain/errors';

export interface OAuthToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  tokenType: string;
}

export interface OAuthConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

/**
 * OAuth client that handles token lifecycle
 */
export class OAuthClient {
  private token: OAuthToken | null = null;
  private tokenRefreshPromise: Promise<OAuthToken> | null = null;

  constructor(
    private readonly config: OAuthConfig,
    private readonly httpClient: HttpClient
  ) {}

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.token && this.isTokenValid(this.token)) {
      return this.token.accessToken;
    }

    // If a refresh is already in progress, wait for it
    if (this.tokenRefreshPromise) {
      const refreshedToken = await this.tokenRefreshPromise;
      return refreshedToken.accessToken;
    }

    // Start a new token acquisition
    this.tokenRefreshPromise = this.acquireToken();
    try {
      const newToken = await this.tokenRefreshPromise;
      this.token = newToken;
      return newToken.accessToken;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Check if token is still valid (with 60 second buffer)
   */
  private isTokenValid(token: OAuthToken): boolean {
    const bufferMs = 60000; // 60 seconds
    return Date.now() < token.expiresAt - bufferMs;
  }

  /**
   * Acquire a new access token from the OAuth server
   */
  private async acquireToken(): Promise<OAuthToken> {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (this.config.scope) {
      params.append('scope', this.config.scope);
    }

    const request: HttpRequest = {
      url: this.config.tokenUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    };

    try {
      const response = await this.httpClient.request<{
        access_token: string;
        token_type: string;
        expires_in: number;
      }>(request);

      if (response.status !== 200) {
        throw new CarrierIntegrationError(
          ErrorCode.AUTH_FAILED,
          `OAuth token request failed with status ${response.status}`,
          new Error(`HTTP ${response.status}`)
        );
      }

      const { access_token, token_type, expires_in } = response.body;

      if (!access_token || !expires_in) {
        throw new CarrierIntegrationError(
          ErrorCode.MALFORMED_RESPONSE,
          'OAuth response missing required fields',
          new Error('Invalid OAuth response structure')
        );
      }

      return {
        accessToken: access_token,
        tokenType: token_type || 'Bearer',
        expiresAt: Date.now() + expires_in * 1000,
      };
    } catch (error) {
      if (error instanceof CarrierIntegrationError) {
        throw error;
      }
      throw new CarrierIntegrationError(
        ErrorCode.AUTH_FAILED,
        'Failed to acquire OAuth token',
        error as Error
      );
    }
  }

  /**
   * Clear cached token (useful for testing)
   */
  clearToken(): void {
    this.token = null;
  }
}
