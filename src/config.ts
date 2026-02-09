/**
 * Configuration helpers for creating service instances
 */

import { UPSAdapter, UPSConfig } from './carriers/ups/adapter';
import { OAuthClient, OAuthConfig } from './auth/oauth';
import { HttpClient } from './http/client';

export interface ServiceConfig {
  ups?: {
    baseUrl: string;
    oauth: OAuthConfig;
    shipperNumber?: string;
  };
}

/**
 * Create a UPS adapter with configuration from environment variables
 * 
 * @param httpClient - HTTP client implementation (real or stub)
 * @param config - Optional configuration override
 * @param requireCredentials - If true, validates credentials are present (default: true)
 */
export function createUPSAdapter(
  httpClient: HttpClient,
  config?: {
    baseUrl?: string;
    oauth?: OAuthConfig;
    shipperNumber?: string;
  },
  requireCredentials: boolean = true
): UPSAdapter {
  const baseUrl =
    config?.baseUrl || process.env.UPS_BASE_URL || 'https://wwwcie.ups.com';
  const oauthConfig: OAuthConfig = config?.oauth || {
    tokenUrl: process.env.UPS_OAUTH_TOKEN_URL || `${baseUrl}/security/v1/oauth/token`,
    clientId: process.env.UPS_CLIENT_ID || '',
    clientSecret: process.env.UPS_CLIENT_SECRET || '',
    scope: process.env.UPS_OAUTH_SCOPE,
  };

  // Only validate credentials if required (production mode)
  if (requireCredentials && (!oauthConfig.clientId || !oauthConfig.clientSecret)) {
    throw new Error(
      'UPS_CLIENT_ID and UPS_CLIENT_SECRET environment variables are required. ' +
      'Set CARRIER_MODE=mock to run without credentials.'
    );
  }

  // Use default test credentials in mock mode if not provided
  const finalOAuthConfig: OAuthConfig = {
    ...oauthConfig,
    clientId: oauthConfig.clientId || 'test-client-id',
    clientSecret: oauthConfig.clientSecret || 'test-client-secret',
  };

  const oauthClient = new OAuthClient(finalOAuthConfig, httpClient);

  return new UPSAdapter(
    {
      baseUrl,
      oauthClient,
      shipperNumber: config?.shipperNumber || process.env.UPS_SHIPPER_NUMBER,
    },
    httpClient
  );
}
