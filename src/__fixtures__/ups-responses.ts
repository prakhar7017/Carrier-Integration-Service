/**
 * Realistic UPS API response fixtures based on official UPS Rating API documentation
 * These fixtures mirror actual UPS API responses for comprehensive testing
 */

import { UPSRateResponse } from '../carriers/ups/types';

/**
 * Successful UPS OAuth token response
 * Based on UPS OAuth 2.0 client-credentials flow
 */
export interface UPSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  issued_at?: string;
}

/**
 * Standard OAuth token response (3600 seconds = 1 hour)
 */
export const oauthTokenResponse: UPSTokenResponse = {
  access_token: 'test-access-token-abc123xyz',
  token_type: 'Bearer',
  expires_in: 3600,
  issued_at: new Date().toISOString(),
};

/**
 * Short-lived token for testing expiry (1 second)
 */
export const oauthTokenResponseExpired: UPSTokenResponse = {
  access_token: 'expired-token-xyz789',
  token_type: 'Bearer',
  expires_in: 1,
  issued_at: new Date().toISOString(),
};

/**
 * Successful UPS Rating API response with multiple service options
 * Based on UPS Rating API v1 documentation
 */
export const successfulUPSRateResponse: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
      TransactionReference: {
        CustomerContext: 'CustomerContext123',
      },
    },
    RatedShipment: [
      {
        Service: {
          Code: '03',
          Description: 'Ground',
        },
        RatedShipmentAlert: [],
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '25.50',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '25.50',
        },
        GuaranteedDelivery: {
          Date: '2026-02-12',
        },
        RatedPackage: [
          {
            TransportationCharges: {
              CurrencyCode: 'USD',
              MonetaryValue: '25.50',
            },
            BaseServiceCharge: {
              CurrencyCode: 'USD',
              MonetaryValue: '25.50',
            },
          },
        ],
      },
      {
        Service: {
          Code: '01',
          Description: 'Next Day Air',
        },
        RatedShipmentAlert: [],
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '45.75',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '45.75',
        },
        GuaranteedDelivery: {
          Date: '2026-02-09',
          Time: '10:30:00',
        },
        RatedPackage: [
          {
            TransportationCharges: {
              CurrencyCode: 'USD',
              MonetaryValue: '45.75',
            },
            BaseServiceCharge: {
              CurrencyCode: 'USD',
              MonetaryValue: '45.75',
            },
          },
        ],
      },
      {
        Service: {
          Code: '02',
          Description: '2nd Day Air',
        },
        RatedShipmentAlert: [],
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '35.25',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '35.25',
        },
        GuaranteedDelivery: {
          Date: '2026-02-10',
        },
        RatedPackage: [
          {
            TransportationCharges: {
              CurrencyCode: 'USD',
              MonetaryValue: '35.25',
            },
            BaseServiceCharge: {
              CurrencyCode: 'USD',
              MonetaryValue: '35.25',
            },
          },
        ],
      },
      {
        Service: {
          Code: '12',
          Description: '3 Day Select',
        },
        RatedShipmentAlert: [],
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '30.00',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '30.00',
        },
        GuaranteedDelivery: {
          Date: '2026-02-11',
        },
      },
    ],
  },
};

/**
 * UPS API error response - Invalid Request
 * ResponseStatus Code '0' indicates failure
 */
export const upsErrorResponseInvalidRequest: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '0',
        Description: 'Failure',
      },
      Alert: [
        {
          Code: '110537',
          Description: 'Invalid Shipper Number',
        },
      ],
      TransactionReference: {
        CustomerContext: 'CustomerContext123',
      },
    },
  },
};

/**
 * UPS API error response - Missing Required Field
 */
export const upsErrorResponseMissingField: UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '0',
        Description: 'Failure',
      },
      Alert: [
        {
          Code: '110537',
          Description: 'Missing or invalid Ship To Address',
        },
      ],
    },
  },
};

/**
 * Malformed response - missing RateResponse
 */
export const upsMalformedResponse = {
  invalid: 'structure',
  missing: 'RateResponse',
};

/**
 * Malformed response - invalid JSON structure
 */
export const upsInvalidJsonResponse = 'invalid json{';

/**
 * HTTP 401 Unauthorized response (OAuth token invalid/expired)
 */
export const http401Unauthorized = {
  status: 401,
  headers: {
    'content-type': 'application/json',
    'www-authenticate': 'Bearer realm="UPS API"',
  },
  body: {
    response: {
      errors: [
        {
          code: '401',
          message: 'Unauthorized - Invalid or expired token',
        },
      ],
    },
  },
};

/**
 * HTTP 429 Rate Limited response
 */
export const http429RateLimited = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'retry-after': '60',
  },
  body: {
    response: {
      errors: [
        {
          code: '429',
          message: 'Rate limit exceeded. Please retry after 60 seconds',
        },
      ],
    },
  },
};

/**
 * HTTP 500 Internal Server Error
 */
export const http500ServerError = {
  status: 500,
  headers: {
    'content-type': 'application/json',
  },
  body: {
    response: {
      errors: [
        {
          code: '500',
          message: 'Internal Server Error',
        },
      ],
    },
  },
};

/**
 * HTTP 503 Service Unavailable
 */
export const http503ServiceUnavailable = {
  status: 503,
  headers: {
    'content-type': 'application/json',
    'retry-after': '30',
  },
  body: {
    response: {
      errors: [
        {
          code: '503',
          message: 'Service temporarily unavailable',
        },
      ],
    },
  },
};

/**
 * OAuth 401 Invalid Credentials
 */
export const oauth401InvalidCredentials = {
  status: 401,
  headers: {
    'content-type': 'application/json',
  },
  body: {
    error: 'invalid_client',
    error_description: 'Invalid client credentials',
  },
};

/**
 * OAuth 400 Bad Request
 */
export const oauth400BadRequest = {
  status: 400,
  headers: {
    'content-type': 'application/json',
  },
  body: {
    error: 'invalid_request',
    error_description: 'Missing required parameter: grant_type',
  },
};
