/**
 * Structured error types for the carrier integration service
 */

export enum ErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  CARRIER_UNAVAILABLE = 'CARRIER_UNAVAILABLE',
  MALFORMED_RESPONSE = 'MALFORMED_RESPONSE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export class CarrierIntegrationError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CarrierIntegrationError';
  }
}
