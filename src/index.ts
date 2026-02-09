/**
 * Public API exports
 */

export { CarrierIntegrationService } from './service';
export { Carrier } from './carriers/carrier';
export { UPSAdapter } from './carriers/ups/adapter';
export { NodeHttpClient, HttpClient } from './http/client';
export { OAuthClient, OAuthConfig } from './auth/oauth';
export {
  RateRequest,
  RateQuote,
  Address,
  Package,
} from './domain/types';
export { ErrorCode, CarrierIntegrationError } from './domain/errors';
export { createUPSAdapter } from './config';
