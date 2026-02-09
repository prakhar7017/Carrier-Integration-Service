/**
 * Unit tests for OAuth client
 * Tests OAuth token management in isolation
 */

import { OAuthClient, OAuthConfig } from './oauth';
import { StubHttpClient } from '../http/stub-client';
import { ErrorCode } from '../domain/errors';

describe('OAuthClient Unit Tests', () => {
  let stubClient: StubHttpClient;
  let oauthClient: OAuthClient;
  const config: OAuthConfig = {
    tokenUrl: 'https://api.ups.com/oauth/token',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scope: 'rating',
  };

  beforeEach(() => {
    stubClient = new StubHttpClient();
    oauthClient = new OAuthClient(config, stubClient);
  });

  describe('Token Acquisition', () => {
    it('should acquire token successfully', async () => {
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 200,
        body: {
          access_token: 'test-token-123',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const token = await oauthClient.getAccessToken();

      expect(token).toBe('test-token-123');
    });

    it('should include scope in request when provided', async () => {
      let capturedBody: string | undefined;

      stubClient.onRequest((req) => {
        if (req.url === 'https://api.ups.com/oauth/token') {
          capturedBody = req.body as string;
          return {
            status: 200,
            body: {
              access_token: 'test-token',
              token_type: 'Bearer',
              expires_in: 3600,
            },
          };
        }
        return null;
      });

      await oauthClient.getAccessToken();

      expect(capturedBody).toContain('scope=rating');
      expect(capturedBody).toContain('grant_type=client_credentials');
      expect(capturedBody).toContain('client_id=test-client-id');
    });

    it('should handle token refresh on expiry', async () => {
      // First token with short expiry
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 200,
        body: {
          access_token: 'first-token',
          token_type: 'Bearer',
          expires_in: 1, // 1 second
        },
      });

      const firstToken = await oauthClient.getAccessToken();
      expect(firstToken).toBe('first-token');

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Stub new token response
      stubClient.clear();
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 200,
        body: {
          access_token: 'refreshed-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const refreshedToken = await oauthClient.getAccessToken();
      expect(refreshedToken).toBe('refreshed-token');
    });

    it('should reuse valid token', async () => {
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 200,
        body: {
          access_token: 'cached-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const token1 = await oauthClient.getAccessToken();
      const token2 = await oauthClient.getAccessToken();

      expect(token1).toBe('cached-token');
      expect(token2).toBe('cached-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication failure', async () => {
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 401,
        body: { error: 'Unauthorized' },
      });

      await expect(oauthClient.getAccessToken()).rejects.toThrow();
      await expect(oauthClient.getAccessToken()).rejects.toHaveProperty(
        'code',
        ErrorCode.AUTH_FAILED
      );
    });

    it('should handle non-200 status codes', async () => {
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 500,
        body: { error: 'Server Error' },
      });

      await expect(oauthClient.getAccessToken()).rejects.toThrow();
      await expect(oauthClient.getAccessToken()).rejects.toHaveProperty(
        'code',
        ErrorCode.AUTH_FAILED
      );
    });

    it('should handle malformed OAuth response', async () => {
      stubClient.stubUrl('https://api.ups.com/oauth/token', {
        status: 200,
        body: {
          // Missing access_token
          token_type: 'Bearer',
        },
      });

      await expect(oauthClient.getAccessToken()).rejects.toThrow();
      await expect(oauthClient.getAccessToken()).rejects.toHaveProperty(
        'code',
        ErrorCode.MALFORMED_RESPONSE
      );
    });

    it('should handle network errors', async () => {
      stubClient.onRequest(() => {
        throw new Error('Network error');
      });

      await expect(oauthClient.getAccessToken()).rejects.toThrow();
      await expect(oauthClient.getAccessToken()).rejects.toHaveProperty(
        'code',
        ErrorCode.AUTH_FAILED
      );
    });
  });

  describe('Concurrent Token Requests', () => {
    it('should handle concurrent requests without duplicate token calls', async () => {
      let callCount = 0;

      stubClient.onRequest((req) => {
        if (req.url === 'https://api.ups.com/oauth/token') {
          callCount++;
          return {
            status: 200,
            body: {
              access_token: 'concurrent-token',
              token_type: 'Bearer',
              expires_in: 3600,
            },
          };
        }
        return null;
      });

      // Make 5 concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        oauthClient.getAccessToken()
      );
      const tokens = await Promise.all(promises);

      // All should get the same token
      tokens.forEach((token) => {
        expect(token).toBe('concurrent-token');
      });

      // Should only make one HTTP call
      expect(callCount).toBe(1);
    });
  });
});
